// DAGTimeline - Timeline view for Agent DAG Visualization

import React, { useMemo } from 'react';
import { MyBox } from '../MUI替代/基础组件/MyBox';
import { MyTypography } from '../MUI替代/基础组件/MyTypography';
import { useDAGContext } from './DAGGraph';
import { STATUS_COLORS, AGENT_ROLE_COLORS } from './DAGGraph';
import type { DAGNode } from './DAGGraph';

interface TimeSlice {
  startTime: number;
  endTime: number;
  nodes: DAGNode[];
}

export const DAGTimeline: React.FC = () => {
  const { state, getExecutionOrder, getCriticalPath } = useDAGContext();
  const { nodes } = state;

  const timeSlices = useMemo<TimeSlice[]>(() => {
    if (nodes.length === 0) return [];

    // Sort nodes by start time
    const sortedNodes = [...nodes]
      .filter(n => n.startTime)
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    if (sortedNodes.length === 0) {
      // No timing info - show all as parallel
      return [{
        startTime: 0,
        endTime: 1,
        nodes: nodes,
      }];
    }

    // Group nodes into time slices (1 second windows)
    const slices: TimeSlice[] = [];
    const minTime = sortedNodes[0].startTime || 0;
    const maxTime = Math.max(
      ...nodes.map(n => n.endTime || n.startTime || Date.now())
    );

    for (let t = minTime; t <= maxTime; t += 1000) {
      const sliceNodes = nodes.filter(n => {
        const start = n.startTime || 0;
        const end = n.endTime || Date.now();
        return start <= t && end >= t;
      });

      if (sliceNodes.length > 0) {
        slices.push({
          startTime: t,
          endTime: t + 1000,
          nodes: sliceNodes,
        });
      }
    }

    return slices;
  }, [nodes]);

  const criticalPathIds = useMemo(() => new Set(getCriticalPath()), [getCriticalPath]);

  if (nodes.length === 0) {
    return (
      <MyBox sx={{ p: 2 }}>
        <MyTypography variant="body2" color="secondary">
          No tasks in timeline yet
        </MyTypography>
      </MyBox>
    );
  }

  return (
    <div className="dag-timeline" data-testid="dag-timeline">
      <MyBox sx={{ p: 2 }}>
        <MyTypography variant="h6" gutterBottom>
          Execution Timeline
        </MyTypography>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '16px',
        }}>
          {/* Timeline track */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            height: '40px',
            borderLeft: '2px solid #5e6ad2',
            marginLeft: '20px',
            position: 'relative',
          }}>
            {timeSlices.map((slice, index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${(slice.startTime - (timeSlices[0]?.startTime || 0)) / 100}px`,
                  display: 'flex',
                  gap: '8px',
                }}
              >
                {slice.nodes.map(node => (
                  <div
                    key={node.id}
                    className="timeline-node"
                    data-node-id={node.id}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      backgroundColor: STATUS_COLORS[node.status],
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: criticalPathIds.has(node.id) ? '2px solid #ff9800' : 'none',
                      boxShadow: criticalPathIds.has(node.id) ? '0 0 8px rgba(255,152,0,0.5)' : 'none',
                    }}
                  >
                    {node.label}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '8px',
            paddingLeft: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: '#5e6ad2',
              }} />
              <MyTypography variant="caption" color="secondary">
                Time slice
              </MyTypography>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                border: '2px solid #ff9800',
                boxSizing: 'border-box',
              }} />
              <MyTypography variant="caption" color="secondary">
                Critical path
              </MyTypography>
            </div>
          </div>

          {/* Status summary */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#252536',
            borderRadius: '8px',
          }}>
            {(['pending', 'running', 'success', 'failed', 'skipped'] as const).map(status => {
              const count = nodes.filter(n => n.status === status).length;
              return (
                <div
                  key={status}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: STATUS_COLORS[status],
                  }} />
                  <MyTypography variant="caption" color="secondary">
                    {status}: {count}
                  </MyTypography>
                </div>
              );
            })}
          </div>
        </div>
      </MyBox>
    </div>
  );
};

export default DAGTimeline;