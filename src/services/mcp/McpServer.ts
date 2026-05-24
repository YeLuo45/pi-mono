/**
 * MCP Server - V145
 * HTTP + SSE MCP Server exposing pixel-pal-web skills/tools to external AI clients
 * Endpoints:
 *   GET  /mcp/tools         → JSON-RPC 2.0 tools/list response
 *   POST /mcp/tools/:name/call → JSON-RPC 2.0 tools/call
 *   GET  /mcp/events       → SSE event stream (text/event-stream), 30s heartbeat
 */

import http from 'node:http';
import { URL } from 'node:url';
import { handleToolRoute } from './ToolRouter';
import {
  createSession,
  heartbeatSession,
  removeSession,
  getSessionCount,
  listSessions,
  startSessionCleanup,
  stopSessionCleanup,
} from './McpSession';

// SSE heartbeat interval: 30 seconds
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

// Active SSE connections
const _sseConnections: Map<string, http.ServerResponse> = new Map();

// Cleanup interval reference
let _cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Parse tool name from pathname
 */
function parseToolNameFromPath(pathname: string): string | null {
  // /mcp/tools/:name/call → extract :name
  const match = pathname.match(/^\/mcp\/tools\/([^/]+)\/call$/);
  return match ? match[1] : null;
}

/**
 * Send an SSE event to a specific client
 */
export function sendSseEvent(sessionId: string, event: string, data: unknown): void {
  const res = _sseConnections.get(sessionId);
  if (!res) return;
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Connection may have closed
    _sseConnections.delete(sessionId);
  }
}

/**
 * Broadcast an event to all SSE clients
 */
export function broadcastSseEvent(event: string, data: unknown): void {
  for (const res of _sseConnections.values()) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Connection may have closed
    }
  }
}

/**
 * Handle incoming HTTP requests
 */
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;

  // CORS headers for browser clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /mcp/events → SSE stream
  if (req.method === 'GET' && pathname === '/mcp/events') {
    const userAgent = req.headers['user-agent'];
    const session = createSession(userAgent);
    const sessionId = session.id;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Store the connection
    _sseConnections.set(sessionId, res);

    // Send initial connected event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ sessionId, connectedAt: session.connectedAt })}\n\n`);

    // Set up heartbeat interval for this connection
    const heartbeatInterval = setInterval(() => {
      heartbeatSession(sessionId);
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        // Connection closed
        clearInterval(heartbeatInterval);
        _sseConnections.delete(sessionId);
        removeSession(sessionId);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Clean up on close
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      _sseConnections.delete(sessionId);
      removeSession(sessionId);
    });

    return;
  }

  // GET /mcp/tools → list tools (JSON-RPC format)
  if (req.method === 'GET' && pathname === '/mcp/tools') {
    await handleToolRoute(req, res, pathname);
    return;
  }

  // POST /mcp/tools/:name/call → call tool
  if (req.method === 'POST' && pathname.startsWith('/mcp/tools/') && pathname.endsWith('/call')) {
    const toolName = parseToolNameFromPath(pathname);
    await handleToolRoute(req, res, pathname, { name: toolName ?? '' });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Create and start the MCP HTTP server
 */
export function createMcpServer(port: number = 3100): http.Server {
  const server = http.createServer(handleRequest);

  // Start session cleanup
  _cleanupInterval = startSessionCleanup();

  server.listen(port, () => {
    console.log(`[MCP] Server started on port ${port}`);
  });

  return server;
}

/**
 * Stop the MCP server
 */
export function stopMcpServer(server: http.Server): void {
  if (_cleanupInterval) {
    stopSessionCleanup(_cleanupInterval);
    _cleanupInterval = null;
  }

  // Close all SSE connections
  for (const res of _sseConnections.values()) {
    try {
      res.end();
    } catch {
      // Already closed
    }
  }
  _sseConnections.clear();

  server.close(() => {
    console.log('[MCP] Server stopped');
  });
}

/**
 * Get MCP server status
 */
export function getMcpStatus(): {
  sessionCount: number;
  sseConnectionCount: number;
  sessions: Array<{ id: string; connectedAt: number; lastHeartbeat: number }>;
} {
  return {
    sessionCount: getSessionCount(),
    sseConnectionCount: _sseConnections.size,
    sessions: listSessions().map((s) => ({
      id: s.id,
      connectedAt: s.connectedAt,
      lastHeartbeat: s.lastHeartbeat,
    })),
  };
}
