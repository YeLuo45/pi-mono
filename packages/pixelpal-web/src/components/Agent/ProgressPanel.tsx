import React from 'react';

interface TaskProgress {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  estimatedDuration: number;
  actualDuration?: number;
  criticalPathNodes: string[];
}

interface ProgressPanelProps {
  progress: TaskProgress;
  onTaskClick?: (taskId: string) => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({ progress, onTaskClick }) => {
  const { total, completed, failed, running, pending } = progress;
  const pct = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const isComplete = completed === total && failed === 0;

  return (
    <div style={{ padding: 12 }}>
      {/* Overall progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#888' }}>Overall Progress</span>
          <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
            {completed}/{total} {failed > 0 ? `(${failed} failed)` : ''}
          </span>
        </div>
        <div style={{ height: 8, background: '#333', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: isComplete ? '#2ecc71' : failed > 0 ? '#e67e22' : '#4a9eff',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Running', value: running, color: '#4a9eff' },
          { label: 'Pending', value: pending, color: '#888' },
          { label: 'Completed', value: completed, color: '#2ecc71' },
          { label: 'Failed', value: failed, color: '#e74c3c' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              padding: '6px 8px',
              background: '#1a1a2e',
              borderRadius: 4,
              textAlign: 'center',
              border: `1px solid ${stat.value > 0 ? stat.color : '#333'}`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#666' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Duration comparison */}
      <div style={{ padding: '8px 10px', background: '#1a1a2e', borderRadius: 4, marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Duration Analysis</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#888' }}>Estimated</span>
          <span style={{ fontSize: 12, color: '#888' }}>{Math.round(progress.estimatedDuration / 1000)}s</span>
        </div>
        {progress.actualDuration !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: 12, color: '#888' }}>Actual</span>
            <span style={{ fontSize: 12, color: progress.actualDuration > progress.estimatedDuration ? '#e67e22' : '#2ecc71' }}>
              {Math.round(progress.actualDuration / 1000)}s
            </span>
          </div>
        )}
      </div>

      {/* Critical path */}
      {progress.criticalPathNodes.length > 0 && (
        <div style={{ padding: '8px 10px', background: '#2a1a1a', borderRadius: 4, border: '1px solid #e74c3c' }}>
          <div style={{ fontSize: 11, color: '#e74c3c', marginBottom: 4 }}>⚠ Critical Path</div>
          <div style={{ fontSize: 11, color: '#888' }}>
            {progress.criticalPathNodes.join(' → ')}
          </div>
        </div>
      )}

      {/* Completion state */}
      {isComplete && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#1b4d3e', borderRadius: 4, textAlign: 'center' }}>
          <span style={{ fontSize: 14, color: '#2ecc71' }}>✓ All tasks completed</span>
        </div>
      )}
    </div>
  );
};

// Mock data
export function createMockProgress(): TaskProgress {
  return {
    total: 5,
    completed: 3,
    failed: 0,
    running: 1,
    pending: 1,
    estimatedDuration: 8000,
    actualDuration: 7500,
    criticalPathNodes: ['task-1', 'task-2', 'task-4'],
  };
}
