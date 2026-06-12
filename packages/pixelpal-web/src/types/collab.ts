/**
 * V93 Collaboration Types
 * Multi-user collaboration room system
 */

// ============================================================================
// Room & Participant Types
// ============================================================================

export interface CollabRoom {
  id: string;
  name: string;
  ownerId: string;
  participants: Participant[];
  settings: RoomSettings;
  createdAt: number;
}

export interface Participant {
  id: string;
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: number;
  lastActive: number;
  isOnline: boolean;
  cursorPosition?: CursorPosition;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

export interface RoomSettings {
  allowVoice: boolean;
  allowFileShare: boolean;
  maxParticipants: number;
  isPublic: boolean;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type CollabMessageType =
  | 'room_create'
  | 'room_join'
  | 'room_leave'
  | 'room_update'
  | 'participant_update'
  | 'cursor_move'
  | 'chat_message'
  | 'persona_update'
  | 'skill_update'
  | 'sync_request'
  | 'sync_response'
  | 'conflict_detected'
  | 'conflict_resolved';

export interface CollabWSMessage {
  type: CollabMessageType;
  roomId: string;
  senderId: string;
  payload: unknown;
  timestamp: number;
  messageId: string;
}

// ============================================================================
// Collaboration Events
// ============================================================================

export type CollabEventType =
  | 'room_created'
  | 'room_joined'
  | 'room_left'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_updated'
  | 'cursor_moved'
  | 'message_received'
  | 'persona_changed'
  | 'skill_shared'
  | 'connection_lost'
  | 'connection_restored'
  | 'offline_queue_sent';

export interface CollabEvent {
  type: CollabEventType;
  roomId: string;
  userId?: string;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Offline Queue
// ============================================================================

export interface OfflineQueueItem {
  id: string;
  message: CollabWSMessage;
  attempts: number;
  addedAt: number;
}

// ============================================================================
// Version History (for Persona/Skill collaboration)
// ============================================================================

export interface VersionEntry {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: number;
  changeType: 'create' | 'update' | 'delete';
  previousValue?: unknown;
  newValue?: unknown;
  description: string;
}

// ============================================================================
// Skill Template
// ============================================================================

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  config: Record<string, unknown>;
  usageCount: number;
  rating: number;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
}

// ============================================================================
// Collaboration Stats
// ============================================================================

export interface CollabStats {
  roomId: string;
  totalMessages: number;
  totalParticipants: number;
  activeParticipants: number;
  skillUsage: Record<string, number>;
  startTime: number;
}
