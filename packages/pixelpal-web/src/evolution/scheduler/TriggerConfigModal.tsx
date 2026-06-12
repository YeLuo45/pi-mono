import React, { useState } from 'react';

export interface RuleConfig {
  ruleId: string;
  name: string;
  intervalMs: number;
  condition: string;
  enabled: boolean;
}

interface EvolutionRule {
  ruleId: string;
  name: string;
  intervalMs: number;
  condition: string;
  enabled: boolean;
}

interface Props {
  rule?: EvolutionRule;
  onSave: (config: RuleConfig) => void;
  onCancel: () => void;
}

export function TriggerConfigModal({ rule, onSave, onCancel }: Props) {
  const [name, setName] = useState(rule?.name || '');
  const [intervalMs, setIntervalMs] = useState(rule?.intervalMs || 3600000);
  const [condition, setCondition] = useState(rule?.condition || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (intervalMs < 60000) {
      setError('Interval must be at least 60000ms (1 minute)');
      return;
    }
    setError(null);
    onSave({
      ruleId: rule?.ruleId || `rule-${Date.now()}`,
      name: name.trim(),
      intervalMs,
      condition,
      enabled: rule?.enabled ?? true
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{rule ? 'Edit Rule' : 'Create New Rule'}</h3>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label>Rule Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Daily Evolution Check"
          />
        </div>

        <div className="form-group">
          <label>Interval (ms)</label>
          <input
            type="number"
            value={intervalMs}
            onChange={e => setIntervalMs(parseInt(e.target.value) || 0)}
            min="60000"
            step="60000"
          />
          <small>Minimum: 60000ms (1 minute)</small>
        </div>

        <div className="form-group">
          <label>Condition (JSON)</label>
          <textarea
            value={condition}
            onChange={e => setCondition(e.target.value)}
            placeholder='{"minEvents": 10, "healthStatus": "healthy"}'
            rows={4}
          />
        </div>

        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleSave} className="primary">Save</button>
        </div>
      </div>
    </div>
  );
}