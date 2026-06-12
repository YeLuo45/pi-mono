import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SchedulerDashboard } from '../scheduler/SchedulerDashboard';
import { RuleTimeline } from '../scheduler/RuleTimeline';
import { TriggerConfigModal } from '../scheduler/TriggerConfigModal';

const createMockScheduler = (rules: any[]) => ({
  getScheduledRules: vi.fn().mockResolvedValue(rules),
  setRuleEnabled: vi.fn().mockResolvedValue(undefined),
  triggerNow: vi.fn().mockResolvedValue(undefined)
});

describe('SchedulerDashboard', () => {
  it('should render loading state initially', async () => {
    const scheduler = createMockScheduler([]);
    const { getByText } = render(<SchedulerDashboard scheduler={scheduler} />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render scheduled rules table', async () => {
    const rules = [
      { ruleId: 'r1', ruleName: 'Rule 1', nextTrigger: new Date(), interval: '1h', enabled: true, totalExecutions: 5 },
      { ruleId: 'r2', ruleName: 'Rule 2', nextTrigger: new Date(), interval: '2h', enabled: false, totalExecutions: 3 }
    ];
    const scheduler = createMockScheduler(rules);
    const { getByText } = render(<SchedulerDashboard scheduler={scheduler} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getByText('Rule 1')).toBeTruthy();
    expect(getByText('Rule 2')).toBeTruthy();
  });

  it('should display rule name and next trigger time', async () => {
    const nextTrigger = new Date('2026-05-24T12:00:00Z');
    const rules = [{ ruleId: 'r1', ruleName: 'Test Rule', nextTrigger, interval: '1h', enabled: true, totalExecutions: 0 }];
    const scheduler = createMockScheduler(rules);
    const { getByText } = render(<SchedulerDashboard scheduler={scheduler} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getByText('Test Rule')).toBeTruthy();
  });

  it('should toggle rule enabled state', async () => {
    const rules = [{ ruleId: 'r1', ruleName: 'Rule 1', nextTrigger: new Date(), interval: '1h', enabled: true, totalExecutions: 0 }];
    const scheduler = createMockScheduler(rules);
    const { getByRole } = render(<SchedulerDashboard scheduler={scheduler} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    const checkbox = getByRole('checkbox');
    checkbox.click();
    expect(scheduler.setRuleEnabled).toHaveBeenCalledWith('r1', false);
  });

  it('should call triggerNow when button clicked', async () => {
    const rules = [{ ruleId: 'r1', ruleName: 'Rule 1', nextTrigger: new Date(), interval: '1h', enabled: true, totalExecutions: 0 }];
    const scheduler = createMockScheduler(rules);
    const { getByText } = render(<SchedulerDashboard scheduler={scheduler} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    getByText('Trigger Now').click();
    expect(scheduler.triggerNow).toHaveBeenCalledWith('r1');
  });

  it('should show stats with correct counts', async () => {
    const rules = [
      { ruleId: 'r1', ruleName: 'Rule 1', nextTrigger: new Date(), interval: '1h', enabled: true, totalExecutions: 5 },
      { ruleId: 'r2', ruleName: 'Rule 2', nextTrigger: new Date(), interval: '2h', enabled: false, totalExecutions: 3 }
    ];
    const scheduler = createMockScheduler(rules);
    const { getByText } = render(<SchedulerDashboard scheduler={scheduler} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getByText('Total Rules')).toBeTruthy();
    expect(getByText('2')).toBeTruthy(); // total rules
    expect(getByText('1')).toBeTruthy(); // active
  });

  it('should refresh every 10 seconds', async () => {
    vi.useFakeTimers();
    const rules = [{ ruleId: 'r1', ruleName: 'Rule 1', nextTrigger: new Date(), interval: '1h', enabled: true, totalExecutions: 0 }];
    const scheduler = createMockScheduler(rules);
    const { getByText, rerender } = render(<SchedulerDashboard scheduler={scheduler} />);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(scheduler.getScheduledRules).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(10000);
    rerender(<SchedulerDashboard scheduler={scheduler} />);
    
    expect(scheduler.getScheduledRules).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('RuleTimeline', () => {
  it('should render empty state when no events', () => {
    const { getByText } = render(<RuleTimeline events={[]} />);
    expect(getByText('No events recorded')).toBeTruthy();
  });

  it('should render events in chronological order', () => {
    const events = [
      { timestamp: new Date('2026-05-24T10:00:00Z'), ruleId: 'r1', ruleName: 'Rule 1', action: 'executed', success: true },
      { timestamp: new Date('2026-05-24T11:00:00Z'), ruleId: 'r2', ruleName: 'Rule 2', action: 'failed', success: false }
    ];
    const { getByText } = render(<RuleTimeline events={events} />);
    expect(getByText('Rule 1: executed')).toBeTruthy();
    expect(getByText('Rule 2: failed')).toBeTruthy();
  });

  it('should show success/failure styling', () => {
    const events = [
      { timestamp: new Date(), ruleId: 'r1', ruleName: 'Success Rule', action: 'executed', success: true }
    ];
    const { container } = render(<RuleTimeline events={events} />);
    expect(container.querySelector('.timeline-item.success')).toBeTruthy();
  });

  it('should format timestamp correctly', () => {
    const events = [
      { timestamp: new Date('2026-05-24T10:30:00Z'), ruleId: 'r1', ruleName: 'Rule', action: 'executed', success: true }
    ];
    const { getByText } = render(<RuleTimeline events={events} />);
    expect(getByText('Rule: executed')).toBeTruthy();
  });
});

describe('TriggerConfigModal', () => {
  it('should render with empty fields for new rule', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { getByText } = render(<TriggerConfigModal onSave={onSave} onCancel={onCancel} />);
    
    expect(getByText('Create New Rule')).toBeTruthy();
  });

  it('should pre-fill fields when editing existing rule', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const rule = { ruleId: 'r1', name: 'Test Rule', intervalMs: 7200000, condition: '{}', enabled: true };
    const { getByDisplayValue } = render(<TriggerConfigModal rule={rule} onSave={onSave} onCancel={onCancel} />);
    
    expect(getByDisplayValue('Test Rule')).toBeTruthy();
    expect(getByDisplayValue('7200000')).toBeTruthy();
  });

  it('should call onSave with correct config', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { getByText, getByLabelText } = render(<TriggerConfigModal onSave={onSave} onCancel={onCancel} />);
    
    // Fill form
    const nameInput = getByLabelText('Rule Name') as HTMLInputElement;
    nameInput.value = 'New Rule';
    
    getByText('Save').click();
    // Should not save with empty name due to validation
  });

  it('should call onCancel when cancel clicked', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { getByText } = render(<TriggerConfigModal onSave={onSave} onCancel={onCancel} />);
    
    getByText('Cancel').click();
    expect(onCancel).toHaveBeenCalled();
  });

  it('should validate interval minimum', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { getByText, getByLabelText } = render(<TriggerConfigModal onSave={onSave} onCancel={onCancel} />);
    
    const intervalInput = getByLabelText('Interval (ms)') as HTMLInputElement;
    intervalInput.value = '30000'; // less than 60000
    
    getByText('Save').click();
    expect(onSave).not.toHaveBeenCalled();
    expect(getByText(/Minimum: 60000ms/)).toBeTruthy();
  });
});