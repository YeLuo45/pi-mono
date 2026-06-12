import React from 'react';
import type { TaskGraph, TaskNode } from '../../services/agent/v115/types';

interface TaskTreeVizProps {
  graph: TaskGraph | null;
  onTaskClick?: (taskId: string) => void;
}

export const TaskTreeViz: React.FC<TaskTreeVizProps> = ({ graph, onTaskClick }) => {
  if (!graph) {
    return (
      <div style={{ padding: 16, color: '#888' }}>
        No task decomposition yet
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        {graph.parallelGroups.length} parallel groups · {graph.nodes.length} tasks · ~{Math.round(graph.estimatedDuration / 1000)}s
      </div>

      {graph.parallelGroups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#4a9eff', marginBottom: 4 }}>
            {gi === 0 ? 'First' : gi === graph.parallelGroups.length - 1 ? 'Final' : 'Parallel'} Group ({group.length} tasks)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {group.map(taskId => {
              const node = graph.nodes.find(n => n.id === taskId);
              if (!node) return null;
              return (
                <div
                  key={taskId}
                  onClick={() => onTaskClick?.(taskId)}
                  style={{
                    padding: '6px 10px',
                    background: node.status === 'completed' ? '#1b4d3e' :
                      node.status === 'running' ? '#2a4a6b' :
                        node.status === 'failed' ? '#4a2a2a' : '#2a2a3e',
                    border: `1px solid ${node.status === 'running' ? '#4a9eff' : '#444'}`,
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer',
                    maxWidth: 180,
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{node.description.slice(0, 30)}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>
                    {node.agentType} · {node.parallelizable ? '⚡' : '🔒'}
                  </div>
                </div>
              );
            })}
          </div>
          {gi < graph.parallelGroups.length - 1 && (
            <div style={{ fontSize: 10, color: '#555', marginLeft: 8, marginTop: 4 }}>↓</div>
          )}
        </div>
      ))}
    </div>
  );
};