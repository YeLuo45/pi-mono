// Webhook Types — V14

export type WebhookTriggerType = 'scheduled' | 'event';
export type WebhookEventType = 'memory_created' | 'memory_updated' | 'memory_accessed';
export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  method: WebhookMethod;
  headers: Record<string, string>;
  body?: string;
  triggerType: WebhookTriggerType;
  cron?: string; // for scheduled trigger, e.g. "*/5 * * * *"
  eventType?: WebhookEventType; // for event trigger
  enabled: boolean;
  createdAt: number;
  lastRunAt?: number;
  lastStatus?: 'success' | 'failure';
  lastError?: string;
  // Execute URL: optional secondary URL for actual payload delivery
  executeUrl?: string;
}

export interface WebhookExecutionLog {
  id: string;
  webhookId: string;
  timestamp: number;
  status: 'success' | 'failure' | 'skipped';
  statusCode?: number;
  responseBody?: string;
  error?: string;
  durationMs?: number;
}

export const WEBHOOK_EVENT_TYPES: { value: WebhookEventType; label: string; description: string }[] = [
  { value: 'memory_created', label: 'Memory Created', description: 'Fires when a new memory is created' },
  { value: 'memory_updated', label: 'Memory Updated', description: 'Fires when a memory is updated' },
  { value: 'memory_accessed', label: 'Memory Accessed', description: 'Fires when a memory is accessed' },
];
