/**
 * UnifiedDashboard - Combined metrics and monitoring dashboard
 */

import React from 'react';
import type { AgentStatus } from '../../services/agent/v114/types';
import type { AgentMetrics } from '../../services/agent/v118/metrics/AgentMetrics';

interface UnifiedDashboardProps {
  agentStatuses: { id: string; name: string; status: AgentStatus }[];
  metrics: AgentMetrics[];
  onAgentClick?: (agentId: string) => void;
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  speaking: 'Speaking',
  acting: 'Acting',
  waiting: 'Waiting',
  error: 'Error',
};

export function UnifiedDashboard({ agentStatuses, metrics, onAgentClick }: UnifiedDashboardProps) {
  const activeCount = agentStatuses.filter(a => !['idle', 'waiting'].includes(a.status)).length;
  const errorCount = agentStatuses.filter(a => a.status === 'error').length;
  
  const avgSuccessRate = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
    : 0;

  const totalTasks = metrics.reduce((sum, m) => sum + m.totalTasks, 0);
  const completedTasks = metrics.reduce((sum, m) => sum + m.completedTasks, 0);

  return (
    <div className="unified-dashboard">
      <div className="dashboard-header">
        <h2>Agent Dashboard</h2>
        <div className="header-actions">
          <span className={`status-indicator ${errorCount > 0 ? 'warning' : 'healthy'}`}>
            {errorCount > 0 ? `⚠ ${errorCount} errors` : 'All systems normal'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{agentStatuses.length}</div>
          <div className="kpi-label">Total Agents</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-label">Active Now</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{avgSuccessRate.toFixed(1)}%</div>
          <div className="kpi-label">Avg Success Rate</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{completedTasks}/{totalTasks}</div>
          <div className="kpi-label">Tasks Completed</div>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="agent-status-grid">
        {agentStatuses.map(agent => (
          <div
            key={agent.id}
            className={`agent-status-card status-${agent.status}`}
            onClick={() => onAgentClick?.(agent.id)}
          >
            <div className="agent-avatar">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="agent-info">
              <div className="agent-name">{agent.name}</div>
              <div className="agent-status">
                {STATUS_LABELS[agent.status]}
              </div>
            </div>
            <div className={`status-dot ${agent.status}`} />
          </div>
        ))}
      </div>

      {/* Metrics Table */}
      {metrics.length > 0 && (
        <div className="metrics-table">
          <h3>Performance Metrics</h3>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Success Rate</th>
                <th>Avg Response</th>
                <th>Total Tasks</th>
                <th>Load</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => (
                <tr key={metric.agentId}>
                  <td>{metric.agentId.slice(0, 8)}</td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${metric.successRate}%` }}
                      />
                      <span>{metric.successRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>{metric.avgResponseTime.toFixed(0)}ms</td>
                  <td>{metric.totalTasks}</td>
                  <td>
                    <div className="load-indicator" data-load={metric.loadLevel}>
                      {metric.loadLevel}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
