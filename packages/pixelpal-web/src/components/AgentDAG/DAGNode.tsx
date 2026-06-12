// DAGNode - Individual node rendering for Agent DAG Visualization

import React, { useState } from 'react';
import { MyBox } from '../MUI替代/基础组件/MyBox';
import { MyTypography } from '../MUI替代/基础组件/MyTypography';
import { MyChip } from '../MUI替代/基础组件/MyChip';
import { AGENT_ROLE_COLORS, STATUS_COLORS } from './DAGGraph';
import type { DAGNodeStatus, AgentRole } from './DAGGraph';

export interface DAGNodeProps {
  id: string;
  label: string;
  agentRole: AgentRole;
  status: DAGNodeStatus;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  dependencies?: string[];
  startTime?: number;
  endTime?: number;
  duration?: number;
  error?: string;
  onClick?: (nodeId: string) => void;
  isCritical?: boolean;
  x?: number;
  y?: number;
}

const StatusIcon: React.FC<{ status: DAGNodeStatus; isRunning?: boolean }> = ({ status, isRunning }) => {
  const color = STATUS_COLORS[status];
  
  const iconStyles: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: status === 'pending' ? 'transparent' : color,
    border: `2px solid ${color}`,
    position: 'relative',
  };

  const pulseAnimation = isRunning ? {
    animation: 'pulse 1.5s infinite',
  } : {};

  if (status === 'success') {
    return (
      <div style={{ ...iconStyles, backgroundColor: color }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ ...iconStyles, backgroundColor: color }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div style={{ ...iconStyles, opacity: 0.6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div style={{ ...iconStyles, backgroundColor: 'transparent', ...pulseAnimation }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: color,
          animation: 'pulse 1.5s infinite',
        }} />
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
          }
        `}</style>
      </div>
    );
  }

  // pending
  return (
    <div style={iconStyles}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
      }} />
    </div>
  );
};

const formatDuration = (ms?: number): string => {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const DAGNode: React.FC<DAGNodeProps> = ({
  id,
  label,
  agentRole,
  status,
  inputs = {},
  outputs = {},
  dependencies = [],
  startTime,
  endTime,
  duration,
  error,
  onClick,
  isCritical = false,
  x = 0,
  y = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onClick?.(id);
  };

  const roleColor = AGENT_ROLE_COLORS[agentRole] || AGENT_ROLE_COLORS.planner;
  const isRunning = status === 'running';

  const nodeStyles: React.CSSProperties = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    minWidth: '180px',
    maxWidth: '240px',
    backgroundColor: '#1e1e2e',
    border: `2px solid ${isCritical ? '#ff9800' : roleColor}`,
    borderRadius: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: isCritical ? '0 0 12px rgba(255, 152, 0, 0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const labelStyles: React.CSSProperties = {
    flex: 1,
    fontWeight: 500,
    fontSize: '14px',
    color: '#f7f8f8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      className="dag-node"
      data-status={status}
      data-agent-role={agentRole}
      data-node-id={id}
      onClick={handleClick}
      role="button"
      aria-expanded={isExpanded}
      style={nodeStyles}
    >
      <div style={headerStyles}>
        <StatusIcon status={status} isRunning={isRunning} />
        <span className="dag-node-label" style={labelStyles}>
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <MyChip
          label={agentRole}
          size="small"
          sx={{
            backgroundColor: roleColor,
            color: 'white',
            fontSize: '10px',
            height: '20px',
          }}
        />
        {duration && (
          <MyChip
            label={formatDuration(duration)}
            size="small"
            variant="outlined"
            sx={{
              borderColor: '#666',
              color: '#aaa',
              fontSize: '10px',
              height: '20px',
            }}
          />
        )}
        {isCritical && (
          <MyChip
            label="critical"
            size="small"
            sx={{
              backgroundColor: '#ff9800',
              color: 'white',
              fontSize: '10px',
              height: '20px',
            }}
          />
        )}
      </div>

      {isExpanded && (
        <div className="dag-node-details" style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '12px' }}>
          {error && (
            <div style={{ marginBottom: '8px' }}>
              <MyTypography variant="caption" color="error" gutterBottom>
                Error
              </MyTypography>
              <div style={{
                backgroundColor: '#2a1a1a',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '12px',
                color: '#ef5350',
                fontFamily: 'monospace',
              }}>
                {error}
              </div>
            </div>
          )}

          <div className="dag-node-inputs" style={{ marginBottom: '8px' }}>
            <MyTypography variant="caption" color="secondary" gutterBottom>
              Inputs ({Object.keys(inputs).length})
            </MyTypography>
            {Object.keys(inputs).length > 0 ? (
              <div style={{
                backgroundColor: '#252536',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}>
                {Object.entries(inputs).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#7170ff' }}>{key}</span>: {String(value)}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#666' }}>No inputs</div>
            )}
          </div>

          <div className="dag-node-outputs">
            <MyTypography variant="caption" color="secondary" gutterBottom>
              Outputs ({Object.keys(outputs).length})
            </MyTypography>
            {Object.keys(outputs).length > 0 ? (
              <div style={{
                backgroundColor: '#252536',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}>
                {Object.entries(outputs).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#4caf50' }}>{key}</span>: {String(value)}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#666' }}>No outputs</div>
            )}
          </div>

          {dependencies.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <MyTypography variant="caption" color="secondary" gutterBottom>
                Dependencies
              </MyTypography>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {dependencies.map(depId => (
                  <MyChip
                    key={depId}
                    label={depId}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#555',
                      color: '#888',
                      fontSize: '10px',
                      height: '18px',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {(startTime || endTime) && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
              {startTime && <span>Started: {new Date(startTime).toLocaleTimeString()}</span>}
              {startTime && endTime && <span> | </span>}
              {endTime && <span>Ended: {new Date(endTime).toLocaleTimeString()}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DAGNode;