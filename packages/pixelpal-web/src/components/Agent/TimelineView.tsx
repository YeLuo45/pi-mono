import React from 'react';

interface TimelineNode {
  id: string;
  taskId: string;
  description: string;
  agentType: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  isCriticalPath?: boolean;
}

interface TimelineViewProps {
  nodes: TimelineNode[];
  onNodeClick?: (nodeId: string) => void;
}

const STATUS_COLORS = {
  pending: '#555',
  running: '#4a9eff',
  completed: '#2ecc71',
  failed: '#e74c3c',
};

export const TimelineView: React.FC<TimelineViewProps> = ({ nodes, onNodeClick }) => {
  if (nodes.length === 0) {
    return (
      <div style={{ padding: 16, color: '#888', textAlign: 'center' }}>
        No tasks executed yet
      </div>
    );
  }

  // Group by parallel groups
  const maxDuration = Math.max(...nodes.map(n => n.duration || 0));
  
  return (
    <div style={{ padding: 8, overflowX: 'auto' }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        Task Timeline · {nodes.filter(n => n.status === 'completed').length}/{nodes.length} completed
      </div>
      
      {/* Time axis */}
      <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 100, minWidth: 400 }}>
        {[0, 25, 50, 75, 100].map(pct => (
          <div key={pct} style={{ flex: 1, fontSize: 10, color: '#555', textAlign: 'center' }}>
            {Math.round(maxDuration * pct / 100)}ms
          </div>
        ))}
      </div>
      
      {/* Timeline tracks */}
      <div style={{ position: 'relative' }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(pct => (
          <div
            key={pct}
            style={{
              position: 'absolute',
              left: `${100 + pct * 4}px`,
              top: 0,
              bottom: 0,
              width: 1,
              background: '#222',
            }}
          />
        ))}
        
        {/* Nodes */}
        {nodes.map((node, idx) => {
          const startPct = node.startTime ? (node.startTime / maxDuration) * 400 : 0;
          const width = node.duration ? (node.duration / maxDuration) * 400 : 80;
          const color = STATUS_COLORS[node.status];
          
          return (
            <div
              key={node.id}
              onClick={() => onNodeClick?.(node.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 6,
                minHeight: 36,
              }}
            >
              {/* Agent label */}
              <div style={{ width: 96, fontSize: 11, color: '#888', paddingRight: 8, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.agentName}
              </div>
              
              {/* Task bar */}
              <div
                style={{
                  position: 'relative',
                  height: 28,
                  width: Math.max(width, 40),
                  background: color + '33',
                  border: `2px solid ${node.isCriticalPath ? '#e74c3c' : color}`,
                  borderRadius: 4,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  marginLeft: startPct > 0 ? startPct : 0,
                }}
              >
                <div style={{ fontSize: 11, color: color, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.description.slice(0, 20)}
                </div>
                {node.duration && (
                  <div style={{ fontSize: 10, color: '#666' }}>{node.duration}ms</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: color + '33', border: `2px solid ${color}`, borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#888' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mock data generator
export function createMockTimeline(): TimelineNode[] {
  return [
    { id: 't1', taskId: 'task-1', description: 'Analyze user intent', agentName: 'MainAgent', status: 'completed', startTime: 0, duration: 450, isCriticalPath: true },
    { id: 't2', taskId: 'task-2', description: 'Search knowledge base', agentName: 'MemoryAgent', status: 'completed', startTime: 450, duration: 320, isCriticalPath: true },
    { id: 't3', taskId: 'task-3', description: 'Web search', agentName: 'SearchAgent', status: 'completed', startTime: 450, duration: 890 },
    { id: 't4', taskId: 'task-4', description: 'Execute tools', agentName: 'ToolAgent', status: 'running', startTime: 1340, duration: 0 },
    { id: 't5', taskId: 'task-5', description: 'Compile results', agentName: 'MainAgent', status: 'pending', startTime: 1340, duration: 0 },
  ];
}
