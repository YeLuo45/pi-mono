/**
 * MCP Tool Router - V145
 * Routes HTTP requests to JSON-RPC 2.0 handlers
 * GET  /mcp/tools         → list tools
 * POST /mcp/tools/:name/call → call tool
 */

import http from 'node:http';
import { URL } from 'node:url';
import { listToolsJsonRpc, callTool } from './McpToolRegistry';

// JSON-RPC 2.0 constants
const JSONRPC_VERSION = '2.0';

// JSON-RPC error codes
const JSONRPC_ERROR_PARSE = -32700;
const JSONRPC_ERROR_INVALID_REQUEST = -32600;
const JSONRPC_ERROR_METHOD_NOT_FOUND = -32601;
const JSONRPC_ERROR_INVALID_PARAMS = -32602;
const JSONRPC_ERROR_INTERNAL = -32603;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: number | string | null;
}

interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  result: unknown;
  id: number | string | null;
}

interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number | string | null;
}

type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/**
 * Parse JSON body from request
 */
async function parseRequestBody(req: http.IncomingMessage): Promise<JsonRpcRequest | null> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed as JsonRpcRequest);
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Send JSON response
 */
function sendJsonResponse(
  res: http.ServerResponse,
  statusCode: number,
  body: JsonRpcResponse
): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(body));
}

/**
 * Validate JSON-RPC request
 */
function validateJsonRpcRequest(req: JsonRpcRequest): JsonRpcErrorResponse | null {
  if (!req || typeof req !== 'object') {
    return {
      jsonrpc: JSONRPC_VERSION,
      error: { code: JSONRPC_ERROR_INVALID_REQUEST, message: 'Invalid request' },
      id: null,
    };
  }
  if (req.jsonrpc !== JSONRPC_VERSION) {
    return {
      jsonrpc: JSONRPC_VERSION,
      error: { code: JSONRPC_ERROR_INVALID_REQUEST, message: 'Invalid jsonrpc version' },
      id: req.id ?? null,
    };
  }
  if (typeof req.method !== 'string' || !req.method) {
    return {
      jsonrpc: JSONRPC_VERSION,
      error: { code: JSONRPC_ERROR_INVALID_REQUEST, message: 'Method must be a string' },
      id: req.id ?? null,
    };
  }
  return null;
}

/**
 * Route handler for MCP tool endpoints
 */
export async function handleToolRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  params?: Record<string, string>
): Promise<void> {
  const method = req.method ?? 'GET';

  // GET /mcp/tools → list tools
  if (method === 'GET' && pathname === '/mcp/tools') {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const typeFilter = url.searchParams.get('type') as 'skill' | 'role' | 'memory' | 'persona' | null;

    const tools = listToolsJsonRpc(typeFilter ? { type: typeFilter } : undefined);

    const response: JsonRpcSuccessResponse = {
      jsonrpc: JSONRPC_VERSION,
      result: { tools },
      id: null,
    };
    sendJsonResponse(res, 200, response);
    return;
  }

  // POST /mcp/tools/:name/call → call tool
  if (method === 'POST' && pathname.startsWith('/mcp/tools/') && pathname.endsWith('/call')) {
    const toolName = params?.name;
    if (!toolName) {
      const errorResponse: JsonRpcErrorResponse = {
        jsonrpc: JSONRPC_VERSION,
        error: { code: JSONRPC_ERROR_INVALID_REQUEST, message: 'Tool name required' },
        id: null,
      };
      sendJsonResponse(res, 400, errorResponse);
      return;
    }

    const body = await parseRequestBody(req);
    if (!body) {
      const errorResponse: JsonRpcErrorResponse = {
        jsonrpc: JSONRPC_VERSION,
        error: { code: JSONRPC_ERROR_INVALID_REQUEST, message: 'Request body required' },
        id: null,
      };
      sendJsonResponse(res, 400, errorResponse);
      return;
    }

    const validationError = validateJsonRpcRequest(body);
    if (validationError) {
      sendJsonResponse(res, 400, validationError);
      return;
    }

    try {
      const result = await callTool(toolName, body.params);
      const successResponse: JsonRpcSuccessResponse = {
        jsonrpc: JSONRPC_VERSION,
        result,
        id: body.id,
      };
      sendJsonResponse(res, 200, successResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorResponse: JsonRpcErrorResponse = {
        jsonrpc: JSONRPC_VERSION,
        error: { code: JSONRPC_ERROR_METHOD_NOT_FOUND, message: errorMessage },
        id: body.id ?? null,
      };
      sendJsonResponse(res, 200, errorResponse);
    }
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}
