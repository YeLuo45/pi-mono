export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export class AlertManager {
  private alerts: Alert[] = [];
  private thresholds: Map<string, number> = new Map();

  constructor() {
    // Empty constructor - initialization happens in field declarations
  }

  createAlert(severity: AlertSeverity, message: string): Alert {
    const alert: Alert = {
      id: this.generateId(),
      severity,
      message,
      timestamp: Date.now(),
      acknowledged: false,
    };
    
    this.alerts.push(alert);
    return alert;
  }

  private generateId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }
    alert.acknowledged = true;
    return true;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts
      .filter(a => !a.acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getAlertsBySeverity(severity: string): Alert[] {
    return this.alerts
      .filter(a => a.severity === severity && !a.acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  setThreshold(metric: string, value: number): void {
    this.thresholds.set(metric, value);
  }

  checkThreshold(metric: string, value: number): boolean {
    const threshold = this.thresholds.get(metric);
    if (threshold === undefined) {
      return false;
    }
    // Threshold is exceeded when value >= threshold
    return value >= threshold;
  }

  clearAcknowledged(): void {
    this.alerts = this.alerts.filter(a => !a.acknowledged);
  }

  clearAll(): void {
    this.alerts = [];
  }
}