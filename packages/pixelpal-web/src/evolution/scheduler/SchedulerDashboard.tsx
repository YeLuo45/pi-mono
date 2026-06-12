import React, { useState, useEffect } from 'react';

interface ScheduledRuleInfo {
  ruleId: string;
  ruleName: string;
  nextTrigger: Date;
  interval: string;
  enabled: boolean;
  totalExecutions: number;
}

interface RuleScheduler {
  getScheduledRules(): Promise<ScheduledRuleInfo[]>;
  setRuleEnabled(ruleId: string, enabled: boolean): Promise<void>;
  triggerNow(ruleId: string): Promise<void>;
}

interface Props {
  scheduler: RuleScheduler;
}

export function SchedulerDashboard({ scheduler }: Props) {
  const [scheduledRules, setScheduledRules] = useState<ScheduledRuleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScheduledRules();
    const interval = setInterval(loadScheduledRules, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadScheduledRules = async () => {
    try {
      const rules = await scheduler.getScheduledRules();
      setScheduledRules(rules);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    await scheduler.setRuleEnabled(ruleId, enabled);
    loadScheduledRules();
  };

  const triggerNow = async (ruleId: string) => {
    await scheduler.triggerNow(ruleId);
    loadScheduledRules();
  };

  return (
    <div className="scheduler-dashboard">
      <h2>Evolution Scheduler</h2>
      
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <table className="scheduler-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Next Trigger</th>
                <th>Interval</th>
                <th>Executions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scheduledRules.map(rule => (
                <tr key={rule.ruleId}>
                  <td>{rule.ruleName}</td>
                  <td>{rule.nextTrigger instanceof Date ? rule.nextTrigger.toLocaleString() : String(rule.nextTrigger)}</td>
                  <td>{rule.interval}</td>
                  <td>{rule.totalExecutions}</td>
                  <td>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={e => toggleRule(rule.ruleId, e.target.checked)}
                      />
                      <span>{rule.enabled ? 'Active' : 'Paused'}</span>
                    </label>
                  </td>
                  <td>
                    <button onClick={() => triggerNow(rule.ruleId)} disabled={!rule.enabled}>
                      Trigger Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="scheduler-stats">
            <div className="stat">
              <span className="stat-label">Total Rules</span>
              <span className="stat-value">{scheduledRules.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Active</span>
              <span className="stat-value">{scheduledRules.filter(r => r.enabled).length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Executions</span>
              <span className="stat-value">{scheduledRules.reduce((sum, r) => sum + r.totalExecutions, 0)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}