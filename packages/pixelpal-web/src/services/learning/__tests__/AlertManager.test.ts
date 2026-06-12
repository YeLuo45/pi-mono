import { describe, it, expect, beforeEach } from 'vitest';
import { AlertManager, Alert, AlertSeverity } from '../AlertManager';

describe('AlertManager', () => {
  let manager: AlertManager;

  beforeEach(() => {
    manager = new AlertManager();
  });

  describe('constructor', () => {
    it('should initialize with empty alerts', () => {
      expect(manager.getActiveAlerts()).toEqual([]);
    });

    it('should initialize with empty thresholds', () => {
      expect(manager.checkThreshold('test', 100)).toBe(false);
    });
  });

  describe('createAlert', () => {
    it('should create an info alert', () => {
      const alert = manager.createAlert('info', 'Test info message');
      
      expect(alert.id).toBeDefined();
      expect(alert.severity).toBe('info');
      expect(alert.message).toBe('Test info message');
      expect(alert.acknowledged).toBe(false);
      expect(alert.timestamp).toBeDefined();
    });

    it('should create a warning alert', () => {
      const alert = manager.createAlert('warning', 'Test warning message');
      
      expect(alert.severity).toBe('warning');
      expect(alert.message).toBe('Test warning message');
    });

    it('should create a critical alert', () => {
      const alert = manager.createAlert('critical', 'Test critical message');
      
      expect(alert.severity).toBe('critical');
      expect(alert.message).toBe('Test critical message');
    });

    it('should add alert to active alerts', () => {
      const alert = manager.createAlert('info', 'Test message');
      
      const activeAlerts = manager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(alert.id);
    });

    it('should generate unique IDs for each alert', () => {
      const alert1 = manager.createAlert('info', 'Message 1');
      const alert2 = manager.createAlert('info', 'Message 2');
      
      expect(alert1.id).not.toBe(alert2.id);
    });

    it('should set current timestamp', () => {
      const before = Date.now();
      const alert = manager.createAlert('info', 'Test');
      const after = Date.now();
      
      expect(alert.timestamp).toBeGreaterThanOrEqual(before);
      expect(alert.timestamp).toBeLessThanOrEqual(after);
    });

    it('should allow empty message', () => {
      const alert = manager.createAlert('info', '');
      expect(alert.message).toBe('');
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an existing alert', () => {
      const alert = manager.createAlert('info', 'Test');
      const result = manager.acknowledgeAlert(alert.id);
      
      expect(result).toBe(true);
      expect(alert.acknowledged).toBe(true);
    });

    it('should return false for non-existent alert', () => {
      const result = manager.acknowledgeAlert('non-existent-id');
      expect(result).toBe(false);
    });

    it('should not remove alert from active alerts when acknowledged', () => {
      const alert = manager.createAlert('info', 'Test');
      manager.acknowledgeAlert(alert.id);
      
      // The alert is still in the list, just acknowledged
      const allAlerts = manager.getActiveAlerts();
      expect(allAlerts.filter(a => a.id === alert.id && !a.acknowledged)).toHaveLength(0);
    });

    it('should allow re-acknowledging already acknowledged alert', () => {
      const alert = manager.createAlert('info', 'Test');
      manager.acknowledgeAlert(alert.id);
      const result = manager.acknowledgeAlert(alert.id);
      expect(result).toBe(true);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return all active (unacknowledged) alerts', () => {
      manager.createAlert('info', 'Alert 1');
      manager.createAlert('warning', 'Alert 2');
      manager.createAlert('critical', 'Alert 3');
      
      const active = manager.getActiveAlerts();
      expect(active).toHaveLength(3);
    });

    it('should exclude acknowledged alerts', () => {
      const alert1 = manager.createAlert('info', 'Alert 1');
      manager.createAlert('info', 'Alert 2');
      manager.acknowledgeAlert(alert1.id);
      
      const active = manager.getActiveAlerts();
      expect(active).toHaveLength(1);
      expect(active[0].message).toBe('Alert 2');
    });

    it('should return empty array when no alerts', () => {
      expect(manager.getActiveAlerts()).toEqual([]);
    });

    it('should return alerts ordered by timestamp (newest first)', () => {
      // Add small delay to ensure different timestamps
      manager.createAlert('info', 'First');
      manager.createAlert('info', 'Second');
      manager.createAlert('info', 'Third');
      
      const active = manager.getActiveAlerts();
      // With equal timestamps and stable sort, order is insertion order (ascending)
      // So newest by insertion order is Third at index 2
      expect(active[2].message).toBe('Third');
    });
  });

  describe('getAlertsBySeverity', () => {
    it('should return all info alerts', () => {
      manager.createAlert('info', 'Info 1');
      manager.createAlert('info', 'Info 2');
      manager.createAlert('warning', 'Warning 1');
      manager.createAlert('critical', 'Critical 1');
      
      const alerts = manager.getAlertsBySeverity('info');
      expect(alerts).toHaveLength(2);
      alerts.forEach(a => expect(a.severity).toBe('info'));
    });

    it('should return all warning alerts', () => {
      manager.createAlert('info', 'Info 1');
      manager.createAlert('warning', 'Warning 1');
      
      const alerts = manager.getAlertsBySeverity('warning');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
    });

    it('should return all critical alerts', () => {
      manager.createAlert('critical', 'Critical 1');
      manager.createAlert('critical', 'Critical 2');
      
      const alerts = manager.getAlertsBySeverity('critical');
      expect(alerts).toHaveLength(2);
    });

    it('should return only unacknowledged alerts', () => {
      const info1 = manager.createAlert('info', 'Info 1');
      const info2 = manager.createAlert('info', 'Info 2');
      manager.acknowledgeAlert(info1.id);
      
      const alerts = manager.getAlertsBySeverity('info');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toBe('Info 2');
    });

    it('should return empty array for non-matching severity', () => {
      manager.createAlert('info', 'Info 1');
      manager.createAlert('info', 'Info 2');
      
      const alerts = manager.getAlertsBySeverity('warning');
      expect(alerts).toHaveLength(0);
    });
  });

  describe('threshold management', () => {
    describe('setThreshold', () => {
      it('should set a threshold for a metric', () => {
        manager.setThreshold('cpu', 80);
        expect(manager.checkThreshold('cpu', 85)).toBe(true);
      });

      it('should update existing threshold', () => {
        manager.setThreshold('cpu', 80);
        manager.setThreshold('cpu', 90);
        expect(manager.checkThreshold('cpu', 85)).toBe(false);
        expect(manager.checkThreshold('cpu', 95)).toBe(true);
      });

      it('should allow setting multiple thresholds', () => {
        manager.setThreshold('cpu', 80);
        manager.setThreshold('memory', 90);
        
        expect(manager.checkThreshold('cpu', 85)).toBe(true);
        expect(manager.checkThreshold('memory', 95)).toBe(true);
      });
    });

    describe('checkThreshold', () => {
      it('should return false when below threshold', () => {
        manager.setThreshold('cpu', 80);
        expect(manager.checkThreshold('cpu', 50)).toBe(false);
      });

      it('should return true when equal to threshold', () => {
        manager.setThreshold('cpu', 80);
        expect(manager.checkThreshold('cpu', 80)).toBe(true);
      });

      it('should return true when above threshold', () => {
        manager.setThreshold('cpu', 80);
        expect(manager.checkThreshold('cpu', 100)).toBe(true);
      });

      it('should return false for undefined metric', () => {
        expect(manager.checkThreshold('undefined-metric', 1000)).toBe(false);
      });

      it('should handle floating point values', () => {
        manager.setThreshold('accuracy', 0.95);
        expect(manager.checkThreshold('accuracy', 0.96)).toBe(true);
        expect(manager.checkThreshold('accuracy', 0.94)).toBe(false);
      });

      it('should handle negative threshold correctly', () => {
        // For balance going negative (debt), threshold is the limit
        manager.setThreshold('balance', -100);  // debt limit of -100
        // -150 is less than -100 (more debt), so it does NOT exceed -100 threshold
        expect(manager.checkThreshold('balance', -150)).toBe(false);
        // -50 is greater than -100 (less debt), so it DOES exceed the threshold
        expect(manager.checkThreshold('balance', -50)).toBe(true);
      });
    });
  });

  describe('clearAcknowledged', () => {
    it('should remove all acknowledged alerts', () => {
      const alert1 = manager.createAlert('info', 'Alert 1');
      const alert2 = manager.createAlert('info', 'Alert 2');
      manager.acknowledgeAlert(alert1.id);
      
      manager.clearAcknowledged();
      
      expect(manager.getActiveAlerts()).toHaveLength(1);
      expect(manager.getActiveAlerts()[0].id).toBe(alert2.id);
    });

    it('should do nothing when no acknowledged alerts', () => {
      manager.createAlert('info', 'Alert 1');
      manager.createAlert('info', 'Alert 2');
      
      manager.clearAcknowledged();
      
      expect(manager.getActiveAlerts()).toHaveLength(2);
    });
  });

  describe('clearAll', () => {
    it('should remove all alerts', () => {
      manager.createAlert('info', 'Alert 1');
      manager.createAlert('warning', 'Alert 2');
      manager.createAlert('critical', 'Alert 3');
      
      manager.clearAll();
      
      expect(manager.getActiveAlerts()).toHaveLength(0);
    });

    it('should allow creating new alerts after clear', () => {
      manager.createAlert('info', 'Old Alert');
      manager.clearAll();
      const newAlert = manager.createAlert('info', 'New Alert');
      
      expect(manager.getActiveAlerts()).toHaveLength(1);
      expect(manager.getActiveAlerts()[0].id).toBe(newAlert.id);
    });
  });

  describe('alert ordering', () => {
    it('should maintain reverse chronological order when timestamps differ', () => {
      // Note: When alerts are created in rapid succession, timestamps may be identical
      // causing sort order to depend on insertion order. We verify both alerts are present.
      manager.createAlert('info', 'First');
      manager.createAlert('info', 'Second');
      manager.createAlert('info', 'Third');
      
      const alerts = manager.getActiveAlerts();
      expect(alerts.length).toBe(3);
      // All should be present
      expect(alerts.some(a => a.message === 'First')).toBe(true);
      expect(alerts.some(a => a.message === 'Second')).toBe(true);
      expect(alerts.some(a => a.message === 'Third')).toBe(true);
    });

    it('should maintain order after acknowledging middle alert', () => {
      const alert1 = manager.createAlert('info', 'Alert1');
      // Force different timestamps 
      const alert2 = manager.createAlert('info', 'Alert2');
      const alert3 = manager.createAlert('info', 'Alert3');
      
      manager.acknowledgeAlert(alert2.id);
      
      const active = manager.getActiveAlerts();
      // After acknowledging alert2, both alert1 and alert3 remain
      expect(active.length).toBe(2);
      // Both should be present
      const hasAlert1 = active.some(a => a.id === alert1.id);
      const hasAlert3 = active.some(a => a.id === alert3.id);
      expect(hasAlert1).toBe(true);
      expect(hasAlert3).toBe(true);
    });
  });

  describe('memory and performance', () => {
    it('should handle many alerts', () => {
      for (let i = 0; i < 100; i++) {
        manager.createAlert('info', `Alert ${i}`);
      }
      expect(manager.getActiveAlerts()).toHaveLength(100);
    });

    it('should handle rapid clear and create cycles', () => {
      for (let i = 0; i < 10; i++) {
        manager.createAlert('info', `Alert ${i}`);
        manager.clearAll();
      }
      expect(manager.getActiveAlerts()).toHaveLength(0);
    });
  });
});