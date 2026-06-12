/**
 * AgentTimeline - Agent execution timeline visualization
 */

import React, { useMemo } from 'react';
import type { AgentExecution, AgentStatus } from '../../services/agent/v114/types';

interface TimelineEvent {
  id: string;
  agentId: string;
  agentName: string;
  taskTitle: string;
  startTime: number;
  endTime?: number;
  status: AgentStatus;
}

interface AgentTimelineProps {
  executions: AgentExecution[];
  timeRange?: { start: number; end: number };
  onEventClick?: (event: TimelineEvent) => void;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#6B7280',
  thinking: '#F59E0B',
  speaking: '#3B82F6',
  acting: '#8B5CF6',
  waiting: '#9CA3AF',
  error: '#EF4444',
};

export function AgentTimeline({ executions, timeRange, onEventClick }: AgentTimelineProps) {
  const { events, timeSpan, agents } = useMemo(() => {
    const evts: TimelineEvent[] = executions.map(ex => ({
      id: ex.id,
      agentId: ex.agentId,
      agentName: ex.agentName || ex.agentId.slice(0, 8),
      taskTitle: ex.taskTitle || 'Unknown Task',
      startTime: ex.startTime,
      endTime: ex.endTime,
      status: ex.status,
    }));

    const allTimes = evts.flatMap(e => [e.startTime, e.endTime].filter(Boolean)) as number[];
    const minTime = timeRange?.start || Math.min(...allTimes);
    const maxTime = timeRange?.end || Math.max(...allTimes);

    const agentIds = [...new Set(evts.map(e => e.agentId))];

    return { events: evts, timeSpan: { start: minTime, end: maxTime }, agents: agentIds };
  }, [executions, timeRange]);

  const totalDuration = timeSpan.end - timeSpan.start || 1;

  const getEventPosition = (time: number) => {
    return ((time - timeSpan.start) / totalDuration) * 100;
  };

  const getEventWidth = (event: TimelineEvent) => {
    if (!event.endTime) return 2; // Ongoing event
    const duration = event.endTime - event.startTime;
    return Math.max(2, (duration / totalDuration) * 100);
  };

  const rows = agents.map(agentId => {
    const agentEvents = events.filter(e => e.agentId === agentId);
    return { agentId, events: agentEvents };
  });

  return (
    <div className="agent-timeline">
      <div className="timeline-header">
        <div className="timeline-y-axis">Agents</div>
        <div className="timeline-x-axis">
          <span>{new Date(timeSpan.start).toLocaleTimeString()}</span>
          <span>Duration: {Math.round(totalDuration / 1000)}s</span>
          <span>{new Date(timeSpan.end).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="timeline-body">
        {rows.map((row, rowIndex) => (
          <div key={row.agentId} className="timeline-row" style={{ animationDelay: rowIndex * 50 }}>
            <div className="timeline-agent-label">
              <span className="agent-name">{row.events[0]?.agentName || row.agentId.slice(0, 8)}</span>
            </div>

            <div className="timeline-track">
              {/* Grid lines */}
              <div className="timeline-grid" />

              {/* Events */}
              {row.events.map(event => (
                <div
                  key={event.id}
                  className={`timeline-event status-${event.status}`}
                  style={{
                    left: `${getEventPosition(event.startTime)}%`,
                    width: `${getEventWidth(event)}%`,
                    backgroundColor: STATUS_COLORS[event.status],
                  }}
                  onClick={() => onEventClick?.(event)}
                  title={`${event.taskTitle} (${event.status})`}
                >
                  <div className="event-tooltip">
                    <strong>{event.agentName}</strong>
                    <span>{event.taskTitle}</span>
                    <span className="event-status">{event.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="timeline-legend">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: color }} />
            <span className="legend-label">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
