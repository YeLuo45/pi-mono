/**
 * RoomManager.ts — V93 Multi-User Collaboration Room Management
 * 
 * Handles:
 * - Room CRUD operations
 * - Invite link generation
 * - WebSocket connection management
 * - Offline message queue
 */

import type {
  CollabRoom,
  Participant,
  RoomSettings,
  CollabWSMessage,
  CollabEvent,
  CollabEventType,
  OfflineQueueItem,
  VersionEntry,
  SkillTemplate,
  CollabStats,
} from '../../types/collab';
import { useStore } from '../../store';

// ============================================================================
// Constants
// ============================================================================

const WS_RECONNECT_INTERVAL = 3000;
const WS_MAX_RECONNECT = 5;
const OFFLINE_QUEUE_MAX = 100;
const INVITE_CODE_LENGTH = 8;

const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  allowVoice: false,
  allowFileShare: true,
  maxParticipants: 10,
  isPublic: false,
};

// ============================================================================
// Event Bus for Collab Events
// ============================================================================

type CollabEventHandler = (event: CollabEvent) => void;
const eventHandlers = new Map<CollabEventType, Set<CollabEventHandler>>();

function emitEvent(event: CollabEvent) {
  const handlers = eventHandlers.get(event.type);
  if (handlers) {
    handlers.forEach((handler) => handler(event));
  }
  // Also call global handlers
  const globalHandlers = eventHandlers.get('*' as CollabEventType);
  if (globalHandlers) {
    globalHandlers.forEach((handler) => handler(event));
  }
}

export const roomEventBus = {
  on(eventType: CollabEventType, handler: CollabEventHandler) {
    if (!eventHandlers.has(eventType)) {
      eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)!.add(handler);
  },
  off(eventType: CollabEventType, handler: CollabEventHandler) {
    eventHandlers.get(eventType)?.delete(handler);
  },
  emit,
};

// ============================================================================
// Offline Queue Manager
// ============================================================================

class OfflineQueue {
  private queue: OfflineQueueItem[] = [];
  private storageKey = 'pixelpal_collab_offline_queue';

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
  }

  add(message: CollabWSMessage): void {
    if (this.queue.length >= OFFLINE_QUEUE_MAX) {
      this.queue.shift(); // Remove oldest
    }
    this.queue.push({
      id: crypto.randomUUID(),
      message,
      attempts: 0,
      addedAt: Date.now(),
    });
    this.persist();
  }

  getAll(): OfflineQueueItem[] {
    return [...this.queue];
  }

  markSent(itemId: string): void {
    this.queue = this.queue.filter((item) => item.id !== itemId);
    this.persist();
  }

  incrementAttempts(itemId: string): number {
    const item = this.queue.find((i) => i.id === itemId);
    if (item) {
      item.attempts++;
      this.persist();
      return item.attempts;
    }
    return 0;
  }

  clear(): void {
    this.queue = [];
    this.persist();
  }
}

const offlineQueue = new OfflineQueue();

// ============================================================================
// Room Manager
// ============================================================================

export class RoomManager {
  private ws: WebSocket | null = null;
  private room: CollabRoom | null = null;
  private currentUserId: string = '';
  private currentUserName: string = '';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  private pendingMessages: CollabWSMessage[] = [];
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCursorUpdate = 0;
  private stats: CollabStats | null = null;

  // ============================================================================
  // Room CRUD
  // ============================================================================

  /**
   * Create a new collaboration room
   */
  createRoom(name: string, settings: Partial<RoomSettings> = {}): CollabRoom {
    const userId = this.getCurrentUserId();
    const userName = this.getCurrentUserName();

    const room: CollabRoom = {
      id: this.generateRoomId(),
      name,
      ownerId: userId,
      participants: [
        {
          id: crypto.randomUUID(),
          userId,
          name: userName,
          role: 'owner',
          joinedAt: Date.now(),
          lastActive: Date.now(),
          isOnline: true,
        },
      ],
      settings: { ...DEFAULT_ROOM_SETTINGS, ...settings },
      createdAt: Date.now(),
    };

    this.room = room;
    this.stats = {
      roomId: room.id,
      totalMessages: 0,
      totalParticipants: 1,
      activeParticipants: 1,
      skillUsage: {},
      startTime: Date.now(),
    };

    // Persist to localStorage
    this.persistRooms();

    emitEvent({
      type: 'room_created',
      roomId: room.id,
      userId,
      data: room,
      timestamp: Date.now(),
    });

    return room;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): CollabRoom | null {
    if (this.room?.id === roomId) {
      return this.room;
    }
    // Try to load from storage
    const stored = this.loadRooms();
    return stored.find((r) => r.id === roomId) || null;
  }

  /**
   * Get current room
   */
  getCurrentRoom(): CollabRoom | null {
    return this.room;
  }

  /**
   * Update room settings (owner only)
   */
  updateRoomSettings(updates: Partial<RoomSettings>): boolean {
    if (!this.room) return false;
    if (!this.isOwner()) return false;

    this.room.settings = { ...this.room.settings, ...updates };
    this.persistRooms();

    this.broadcast({
      type: 'room_update',
      roomId: this.room.id,
      senderId: this.currentUserId,
      payload: { settings: this.room.settings },
      timestamp: Date.now(),
      messageId: crypto.randomUUID(),
    });

    return true;
  }

  /**
   * Delete room (owner only)
   */
  deleteRoom(roomId: string): boolean {
    if (!this.room || this.room.id !== roomId) return false;
    if (!this.isOwner()) return false;

    this.leaveRoom();
    this.room = null;
    this.stats = null;
    this.persistRooms();
    return true;
  }

  // ============================================================================
  // Participant Management
  // ============================================================================

  /**
   * Join an existing room
   */
  joinRoom(roomId: string, userName?: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    // Check participant limit
    if (room.participants.length >= room.settings.maxParticipants) {
      return false;
    }

    const userId = this.getCurrentUserId();
    const name = userName || this.getCurrentUserName();

    // Check if already in room
    const existingParticipant = room.participants.find((p) => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.isOnline = true;
      existingParticipant.lastActive = Date.now();
    } else {
      // Determine role - only owner can assign roles
      const role: 'editor' | 'viewer' = room.participants.length === 0 ? 'owner' : 'viewer';

      room.participants.push({
        id: crypto.randomUUID(),
        userId,
        name,
        role,
        joinedAt: Date.now(),
        lastActive: Date.now(),
        isOnline: true,
      });
    }

    this.room = room;
    this.reconnectAttempts = 0;

    // Update stats
    if (this.stats) {
      this.stats.totalParticipants = room.participants.length;
      this.stats.activeParticipants = room.participants.filter((p) => p.isOnline).length;
    }

    this.persistRooms();

    emitEvent({
      type: 'room_joined',
      roomId,
      userId,
      data: { participant: room.participants.find((p) => p.userId === userId) },
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    if (!this.room) return;

    const userId = this.getCurrentUserId();
    const participant = this.room.participants.find((p) => p.userId === userId);

    if (participant) {
      participant.isOnline = false;
    }

    emitEvent({
      type: 'room_left',
      roomId: this.room.id,
      userId,
      data: { participant },
      timestamp: Date.now(),
    });

    this.disconnect();
    this.room = null;
    this.stats = null;
    this.persistRooms();
  }

  /**
   * Update participant role (owner only)
   */
  updateParticipantRole(participantId: string, newRole: 'editor' | 'viewer'): boolean {
    if (!this.room || !this.isOwner()) return false;

    const participant = this.room.participants.find((p) => p.id === participantId);
    if (!participant || participant.role === 'owner') return false;

    participant.role = newRole;
    participant.lastActive = Date.now();
    this.persistRooms();

    this.broadcast({
      type: 'participant_update',
      roomId: this.room.id,
      senderId: this.currentUserId,
      payload: { participant },
      timestamp: Date.now(),
      messageId: crypto.randomUUID(),
    });

    emitEvent({
      type: 'participant_updated',
      roomId: this.room.id,
      userId: participant.userId,
      data: { participant },
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Remove participant (owner only)
   */
  removeParticipant(participantId: string): boolean {
    if (!this.room || !this.isOwner()) return false;

    const participantIndex = this.room.participants.findIndex((p) => p.id === participantId);
    if (participantIndex === -1) return false;

    const participant = this.room.participants[participantIndex];
    if (participant.role === 'owner') return false;

    this.room.participants.splice(participantIndex, 1);
    this.persistRooms();

    this.broadcast({
      type: 'room_update',
      roomId: this.room.id,
      senderId: this.currentUserId,
      payload: { removedParticipantId: participantId },
      timestamp: Date.now(),
      messageId: crypto.randomUUID(),
    });

    return true;
  }

  // ============================================================================
  // Invite Link Management
  // ============================================================================

  /**
   * Generate an invite link for the room
   */
  generateInviteLink(roomId?: string): string {
    const targetRoomId = roomId || this.room?.id;
    if (!targetRoomId) return '';

    const inviteCode = this.generateInviteCode();
    const baseUrl = window.location.origin;
    return `${baseUrl}/collab/join/${targetRoomId}?code=${inviteCode}`;
  }

  /**
   * Parse invite link and extract room ID and code
   */
  parseInviteLink(url: string): { roomId: string; code: string } | null {
    try {
      const parsed = new URL(url);
      const pathMatch = parsed.pathname.match(/\/collab\/join\/([^/]+)/);
      const roomId = pathMatch?.[1];
      const code = parsed.searchParams.get('code');

      if (roomId && code) {
        return { roomId, code };
      }
    } catch {
      // Invalid URL
    }
    return null;
  }

  /**
   * Validate invite code
   */
  validateInviteCode(roomId: string, code: string): boolean {
    // In a real app, this would validate against a server
    // For now, we just check if the room exists
    const room = this.getRoom(roomId);
    return room !== null && code.length === INVITE_CODE_LENGTH;
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // ============================================================================
  // WebSocket Connection
  // ============================================================================

  /**
   * Connect to collaboration WebSocket server
   */
  connect(wsUrl?: string): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    const url = wsUrl || this.getWebSocketUrl();
    if (!url) return false;

    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.flushPendingMessages();

        // Send offline queue
        this.sendOfflineQueue();

        emitEvent({
          type: 'connection_restored',
          roomId: this.room?.id || '',
          timestamp: Date.now(),
        });
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        if (!this.isIntentionallyClosed) {
          this.handleDisconnect();
        }
      };

      this.ws.onerror = () => {
        // Error handling - will trigger onclose
      };

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message through WebSocket
   */
  send(message: Omit<CollabWSMessage, 'messageId' | 'timestamp'>): boolean {
    const fullMessage: CollabWSMessage = {
      ...message,
      messageId: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
      return true;
    } else {
      // Queue for later
      this.pendingMessages.push(fullMessage);
      offlineQueue.add(fullMessage);
      return false;
    }
  }

  /**
   * Broadcast message to all room participants
   */
  broadcast(message: Omit<CollabWSMessage, 'messageId' | 'timestamp'>): boolean {
    return this.send({
      ...message,
      senderId: this.currentUserId,
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: CollabWSMessage = JSON.parse(data);

      switch (message.type) {
        case 'room_join':
          this.handleRoomJoin(message);
          break;
        case 'room_leave':
          this.handleRoomLeave(message);
          break;
        case 'participant_update':
          this.handleParticipantUpdate(message);
          break;
        case 'cursor_move':
          this.handleCursorMove(message);
          break;
        case 'chat_message':
          this.handleChatMessage(message);
          break;
        case 'persona_update':
          this.handlePersonaUpdate(message);
          break;
        case 'skill_update':
          this.handleSkillUpdate(message);
          break;
        case 'sync_response':
          this.handleSyncResponse(message);
          break;
        case 'conflict_detected':
          this.handleConflictDetected(message);
          break;
        case 'conflict_resolved':
          this.handleConflictResolved(message);
          break;
      }
    } catch {
      // Invalid message
    }
  }

  private handleRoomJoin(message: CollabWSMessage) {
    if (!this.room) return;
    const payload = message.payload as { participant: Participant };

    const existing = this.room.participants.find((p) => p.id === payload.participant.id);
    if (existing) {
      existing.isOnline = true;
      existing.lastActive = Date.now();
    } else {
      this.room.participants.push(payload.participant);
    }

    this.persistRooms();

    emitEvent({
      type: 'participant_joined',
      roomId: this.room.id,
      userId: payload.participant.userId,
      data: { participant: payload.participant },
      timestamp: Date.now(),
    });
  }

  private handleRoomLeave(message: CollabWSMessage) {
    if (!this.room) return;
    const payload = message.payload as { participantId: string };

    const participant = this.room.participants.find((p) => p.id === payload.participantId);
    if (participant) {
      participant.isOnline = false;
    }

    this.persistRooms();

    emitEvent({
      type: 'participant_left',
      roomId: this.room.id,
      userId: participant?.userId,
      data: { participantId: payload.participantId },
      timestamp: Date.now(),
    });
  }

  private handleParticipantUpdate(message: CollabWSMessage) {
    if (!this.room) return;
    const payload = message.payload as { participant: Participant };

    const index = this.room.participants.findIndex((p) => p.id === payload.participant.id);
    if (index !== -1) {
      this.room.participants[index] = payload.participant;
    }

    this.persistRooms();

    emitEvent({
      type: 'participant_updated',
      roomId: this.room.id,
      userId: payload.participant.userId,
      data: { participant: payload.participant },
      timestamp: Date.now(),
    });
  }

  private handleCursorMove(message: CollabWSMessage) {
    if (!this.room) return;
    const payload = message.payload as { participantId: string; position: { x: number; y: number; elementId?: string } };

    const participant = this.room.participants.find((p) => p.id === payload.participantId);
    if (participant) {
      participant.cursorPosition = payload.position;
    }

    emitEvent({
      type: 'cursor_moved',
      roomId: this.room.id,
      userId: payload.participantId,
      data: { position: payload.position },
      timestamp: Date.now(),
    });
  }

  private handleChatMessage(message: CollabWSMessage) {
    if (!this.room) return;

    if (this.stats) {
      this.stats.totalMessages++;
    }

    emitEvent({
      type: 'message_received',
      roomId: this.room.id,
      userId: message.senderId,
      data: { message },
      timestamp: Date.now(),
    });
  }

  private handlePersonaUpdate(message: CollabWSMessage) {
    if (!this.room) return;

    emitEvent({
      type: 'persona_changed',
      roomId: this.room.id,
      userId: message.senderId,
      data: { payload: message.payload },
      timestamp: Date.now(),
    });
  }

  private handleSkillUpdate(message: CollabWSMessage) {
    if (!this.room) return;

    const payload = message.payload as { skillId: string };
    if (this.stats && payload.skillId) {
      this.stats.skillUsage[payload.skillId] = (this.stats.skillUsage[payload.skillId] || 0) + 1;
    }

    emitEvent({
      type: 'skill_shared',
      roomId: this.room.id,
      userId: message.senderId,
      data: { payload: message.payload },
      timestamp: Date.now(),
    });
  }

  private handleSyncResponse(message: CollabWSMessage) {
    // Handle sync response - update local state
    const payload = message.payload as {
      room?: CollabRoom;
      messages?: CollabWSMessage[];
    };

    if (payload.room) {
      this.room = payload.room;
      this.persistRooms();
    }
  }

  private handleConflictDetected(message: CollabWSMessage) {
    emitEvent({
      type: 'connection_lost',
      roomId: this.room?.id || '',
      data: { message },
      timestamp: Date.now(),
    });
  }

  private handleConflictResolved(message: CollabWSMessage) {
    emitEvent({
      type: 'connection_restored',
      roomId: this.room?.id || '',
      data: { message },
      timestamp: Date.now(),
    });
  }

  private handleDisconnect(): void {
    if (this.isIntentionallyClosed) return;

    this.reconnectAttempts++;

    emitEvent({
      type: 'connection_lost',
      roomId: this.room?.id || '',
      timestamp: Date.now(),
    });

    if (this.reconnectAttempts <= WS_MAX_RECONNECT) {
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, WS_RECONNECT_INTERVAL);
    }
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private sendOfflineQueue(): void {
    const items = offlineQueue.getAll();
    items.forEach((item) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(item.message));
        offlineQueue.markSent(item.id);

        emitEvent({
          type: 'offline_queue_sent',
          roomId: this.room?.id || '',
          data: { messageId: item.message.messageId },
          timestamp: Date.now(),
        });
      }
    });
  }

  // ============================================================================
  // Cursor Updates (throttled)
  // ============================================================================

  updateCursor(x: number, y: number, elementId?: string): void {
    const now = Date.now();
    if (now - this.lastCursorUpdate < 50) {
      // Throttle to 20fps
      return;
    }
    this.lastCursorUpdate = now;

    this.broadcast({
      type: 'cursor_move',
      roomId: this.room?.id || '',
      payload: {
        participantId: this.room?.participants.find((p) => p.userId === this.currentUserId)?.id,
        position: { x, y, elementId },
      },
    });
  }

  // ============================================================================
  // Version History
  // ============================================================================

  private versionHistory: Map<string, VersionEntry[]> = new Map();

  addVersionEntry(
    entityType: 'persona' | 'skill',
    entityId: string,
    entry: Omit<VersionEntry, 'id' | 'timestamp'>
  ): void {
    const key = `${entityType}:${entityId}`;
    if (!this.versionHistory.has(key)) {
      this.versionHistory.set(key, []);
    }

    const entries = this.versionHistory.get(key)!;
    entries.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });

    // Keep only last 50 entries
    if (entries.length > 50) {
      entries.shift();
    }
  }

  getVersionHistory(entityType: 'persona' | 'skill', entityId: string): VersionEntry[] {
    const key = `${entityType}:${entityId}`;
    return this.versionHistory.get(key) || [];
  }

  // ============================================================================
  // Skill Templates
  // ============================================================================

  private skillTemplates: SkillTemplate[] = [];

  addSkillTemplate(template: Omit<SkillTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating'>): SkillTemplate {
    const newTemplate: SkillTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      rating: 0,
    };
    this.skillTemplates.push(newTemplate);
    this.persistSkillTemplates();
    return newTemplate;
  }

  getSkillTemplates(includePublic = true): SkillTemplate[] {
    if (includePublic) {
      return this.skillTemplates.filter((t) => t.isPublic || t.authorId === this.currentUserId);
    }
    return this.skillTemplates.filter((t) => t.authorId === this.currentUserId);
  }

  incrementSkillUsage(templateId: string): void {
    const template = this.skillTemplates.find((t) => t.id === templateId);
    if (template) {
      template.usageCount++;
      this.persistSkillTemplates();
    }
  }

  private persistSkillTemplates(): void {
    localStorage.setItem('pixelpal_collab_skill_templates', JSON.stringify(this.skillTemplates));
  }

  private loadSkillTemplates(): SkillTemplate[] {
    try {
      const stored = localStorage.getItem('pixelpal_collab_skill_templates');
      if (stored) {
        this.skillTemplates = JSON.parse(stored);
      }
    } catch {
      this.skillTemplates = [];
    }
    return this.skillTemplates;
  }

  // ============================================================================
  // Stats
  // ============================================================================

  getStats(): CollabStats | null {
    return this.stats;
  }

  // ============================================================================
  // Permission Helpers
  // ============================================================================

  isOwner(): boolean {
    if (!this.room) return false;
    const participant = this.room.participants.find((p) => p.userId === this.currentUserId);
    return participant?.role === 'owner';
  }

  canEdit(): boolean {
    if (!this.room) return false;
    const participant = this.room.participants.find((p) => p.userId === this.currentUserId);
    return participant?.role === 'owner' || participant?.role === 'editor';
  }

  canView(): boolean {
    if (!this.room) return false;
    const participant = this.room.participants.find((p) => p.userId === this.currentUserId);
    return participant !== undefined;
  }

  // ============================================================================
  // Utility
  // ============================================================================

  private getCurrentUserId(): string {
    if (!this.currentUserId) {
      this.currentUserId = localStorage.getItem('pixelpal_user_id') || crypto.randomUUID();
      localStorage.setItem('pixelpal_user_id', this.currentUserId);
    }
    return this.currentUserId;
  }

  private getCurrentUserName(): string {
    if (!this.currentUserName) {
      this.currentUserName = localStorage.getItem('pixelpal_user_name') || 'Anonymous';
    }
    return this.currentUserName;
  }

  setCurrentUser(name: string): void {
    this.currentUserName = name;
    localStorage.setItem('pixelpal_user_name', name);
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }

  private getWebSocketUrl(): string {
    // In production, this would be the actual WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/collab`;
  }

  private persistRooms(): void {
    if (!this.room) return;
    const rooms = this.loadRooms();
    const index = rooms.findIndex((r) => r.id === this.room!.id);
    if (index !== -1) {
      rooms[index] = this.room;
    } else {
      rooms.push(this.room);
    }
    localStorage.setItem('pixelpal_collab_rooms', JSON.stringify(rooms));
  }

  private loadRooms(): CollabRoom[] {
    try {
      const stored = localStorage.getItem('pixelpal_collab_rooms');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Invalid data
    }
    return [];
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const roomManager = new RoomManager();
