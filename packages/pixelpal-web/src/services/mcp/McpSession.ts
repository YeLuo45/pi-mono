/**
 * MCP Session Manager - V145
 * Manages MCP client sessions with heartbeat and timeout cleanup
 */

export interface McpSession {
  id: string;
  connectedAt: number;
  lastHeartbeat: number;
  userAgent?: string;
}

// Session storage
const _sessions: Map<string, McpSession> = new Map();

// Session timeout: 5 minutes
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

// Heartbeat interval: 30 seconds (matches SSE heartbeat)
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

/**
 * Create a new MCP session
 */
export function createSession(userAgent?: string): McpSession {
  const session: McpSession = {
    id: `mcp-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    connectedAt: Date.now(),
    lastHeartbeat: Date.now(),
    userAgent,
  };
  _sessions.set(session.id, session);
  return session;
}

/**
 * Get a session by ID
 */
export function getSession(id: string): McpSession | undefined {
  return _sessions.get(id);
}

/**
 * Get all active sessions
 */
export function listSessions(): McpSession[] {
  return Array.from(_sessions.values());
}

/**
 * Get active session count
 */
export function getSessionCount(): number {
  return _sessions.size;
}

/**
 * Extend a session's timeout (heartbeat)
 */
export function heartbeatSession(id: string): boolean {
  const session = _sessions.get(id);
  if (!session) return false;
  session.lastHeartbeat = Date.now();
  return true;
}

/**
 * Remove a session
 */
export function removeSession(id: string): boolean {
  return _sessions.delete(id);
}

/**
 * Clean up stale sessions (auto-cleanup after timeout)
 * Returns number of sessions cleaned up
 */
export function cleanupStaleSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of _sessions) {
    if (now - session.lastHeartbeat > SESSION_TIMEOUT_MS) {
      _sessions.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}

/**
 * Start automatic cleanup interval
 * Returns the interval ID for cleanup
 */
export function startSessionCleanup(): NodeJS.Timeout {
  return setInterval(cleanupStaleSessions, HEARTBEAT_INTERVAL_MS);
}

/**
 * Stop automatic cleanup interval
 */
export function stopSessionCleanup(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}

/**
 * Clear all sessions (for testing)
 */
export function clearAllSessions(): void {
  _sessions.clear();
}
