import React from 'react';

export interface TimelineEvent {
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  action: string;
  success: boolean;
}

interface Props {
  events: TimelineEvent[];
}

export function RuleTimeline({ events }: Props) {
  if (events.length === 0) {
    return <div className="timeline-empty">No events recorded</div>;
  }

  return (
    <div className="rule-timeline">
      {events.map((event, index) => (
        <div key={index} className={`timeline-item ${event.success ? 'success' : 'failure'}`}>
          <div className="timeline-marker" />
          <div className="timeline-content">
            <div className="timeline-time">
              {event.timestamp instanceof Date ? event.timestamp.toLocaleString() : String(event.timestamp)}
            </div>
            <div className="timeline-action">
              <strong>{event.ruleName}</strong>: {event.action}
            </div>
            <div className={`timeline-status ${event.success ? 'success' : 'failure'}`}>
              {event.success ? '✓ Success' : '✗ Failed'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}