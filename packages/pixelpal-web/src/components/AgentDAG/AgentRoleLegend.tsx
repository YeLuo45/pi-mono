// AgentRoleLegend - Agent role legend for DAG Visualization

import React, { useMemo } from 'react';
import { MyBox } from '../MUI替代/基础组件/MyBox';
import { MyTypography } from '../MUI替代/基础组件/MyTypography';
import { useDAGContext } from './DAGGraph';
import { AGENT_ROLE_COLORS } from './DAGGraph';
import type { AgentRole } from './DAGGraph';

interface RoleInfo {
  role: AgentRole;
  count: number;
  description: string;
}

const ROLE_DESCRIPTIONS: Record<AgentRole, string> = {
  planner: 'Plans and decomposes tasks into subtasks',
  executor: 'Executes the actual work on subtasks',
  reviewer: 'Reviews and validates executor outputs',
  summarizer: 'Aggregates results and summarizes findings',
};

export const AgentRoleLegend: React.FC = () => {
  const { state } = useDAGContext();
  const { nodes } = state;

  const roleStats = useMemo(() => {
    const counts: Record<AgentRole, number> = {
      planner: 0,
      executor: 0,
      reviewer: 0,
      summarizer: 0,
    };

    nodes.forEach(node => {
      if (counts[node.agentRole] !== undefined) {
        counts[node.agentRole]++;
      }
    });

    return Object.entries(counts)
      .map(([role, count]) => ({
        role: role as AgentRole,
        count,
        description: ROLE_DESCRIPTIONS[role as AgentRole],
      }))
      .filter(info => info.count > 0);
  }, [nodes]);

  return (
    <div className="agent-role-legend" data-testid="agent-role-legend">
      <MyBox
        sx={{
          backgroundColor: '#1e1e2e',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #333',
        }}
      >
        <MyTypography variant="subtitle1" color="textPrimary" gutterBottom>
          Agent Roles
        </MyTypography>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          {roleStats.length > 0 ? (
            roleStats.map(({ role, count, description }) => (
              <div
                key={role}
                className="role-item"
                data-role={role}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                {/* Color indicator */}
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    backgroundColor: AGENT_ROLE_COLORS[role],
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                />

                {/* Role info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <MyTypography
                      variant="subtitle2"
                      color="textPrimary"
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {role}
                    </MyTypography>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: '#252536',
                        color: '#aaa',
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <MyTypography variant="caption" color="secondary">
                    {description}
                  </MyTypography>
                </div>
              </div>
            ))
          ) : (
            <MyTypography variant="body2" color="secondary">
              No agents have been assigned yet
            </MyTypography>
          )}
        </div>

        {/* Role color bar */}
        {roleStats.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#252536',
              borderRadius: '8px',
            }}
          >
            <MyTypography variant="caption" color="secondary" gutterBottom>
              Role Color Coding
            </MyTypography>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: '8px',
              }}
            >
              {(Object.keys(AGENT_ROLE_COLORS) as AgentRole[]).map(role => (
                <div
                  key={role}
                  style={{
                    flex: 1,
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: AGENT_ROLE_COLORS[role],
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '4px',
              }}
            >
              {(Object.keys(AGENT_ROLE_COLORS) as AgentRole[]).map(role => (
                <span
                  key={role}
                  style={{
                    fontSize: '9px',
                    color: '#666',
                    textTransform: 'capitalize',
                  }}
                >
                  {role.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>
        )}
      </MyBox>
    </div>
  );
};

export default AgentRoleLegend;