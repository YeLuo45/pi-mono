// WebhookService — scheduled execution + event triggering + HTTP dispatch
import type { Webhook, WebhookExecutionLog } from './types';
import { WebhookStore } from './WebhookStore';
import { getNextCronTime } from './cronParser';

const webhookCache = new Map<string, Webhook>();
const PENDING_BACKFILL_LIMIT = 10;
// Simple event emitter for memory events
const memoryEventEmitter = new (class {
  private handlers: Map<string, Array<(data: unknown) => void>[]> = new Map();
  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push([handler]);
    return () => { this.handlers.set(event, this.handlers.get(event)!.filter(h => h[0] !== handler)); };
  }
  emit(event: string, data: unknown): void {
    (this.handlers.get(event) || []).forEach(([h]) => h(data));
  }
})();

// Export so memory storage can emit events
export { memoryEventEmitter as memoryEvents };

class WebhookServiceImpl {
  private isRunning = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  // Map: next execution timestamp → webhook ids scheduled at that time
  private schedule = new Map<number, string[]>();
  private memoryUnsubs: Array<() => void> = [];

  // --- Initialization ---
  async init(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    await this.buildSchedule();
    this.startScheduler();
    this.registerMemoryEvents();
    // Backfill any missed executions from when page was hidden
    this.backfillMissed();
    console.log('[WebhookService] Initialized');
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    if (this.checkInterval) clearInterval(this.checkInterval);
    for (const unsub of this.memoryUnsubs) unsub();
    this.memoryUnsubs = [];
    this.schedule.clear();
    console.log('[WebhookService] Shutdown');
  }

  // --- CRUD operations ---
  async createWebhook(webhook: Omit<Webhook, 'id' | 'createdAt'>): Promise<Webhook> {
    const w: Webhook = {
      ...webhook,
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    await WebhookStore.save(w);
    webhookCache.set(w.id, w);
    if (w.enabled && w.triggerType === 'scheduled' && w.cron) {
      this.scheduleWebhook(w);
    }
    return w;
  }

  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook | null> {
    const existing = webhookCache.get(id) ?? await WebhookStore.get(id);
    if (!existing) return null;
    const updated: Webhook = { ...existing, ...updates };
    await WebhookStore.save(updated);
    webhookCache.set(id, updated);
    this.rescheduleWebhook(id);
    return updated;
  }

  async deleteWebhook(id: string): Promise<void> {
    this.unscheduleWebhook(id);
    webhookCache.delete(id);
    await WebhookStore.delete(id);
  }

  async getWebhook(id: string): Promise<Webhook | undefined> {
    return webhookCache.get(id) ?? WebhookStore.get(id);
  }

  async listWebhooks(): Promise<Webhook[]> {
    const fromStore = await WebhookStore.getAll();
    for (const w of fromStore) webhookCache.set(w.id, w);
    return fromStore;
  }

  async toggleWebhook(id: string, enabled: boolean): Promise<void> {
    const webhook = webhookCache.get(id) ?? await WebhookStore.get(id);
    if (!webhook) return;
    webhook.enabled = enabled;
    await WebhookStore.save(webhook);
    webhookCache.set(id, webhook);
    if (enabled) this.scheduleWebhook(webhook);
    else this.unscheduleWebhook(id);
  }

  // --- Schedule management ---
  private async buildSchedule(): Promise<void> {
    const webhooks = await WebhookStore.getAll();
    for (const w of webhooks) {
      webhookCache.set(w.id, w);
      if (w.enabled && w.triggerType === 'scheduled' && w.cron) {
        this.scheduleWebhook(w);
      }
    }
  }

  private scheduleWebhook(webhook: Webhook): void {
    if (!webhook.cron) return;
    try {
      const next = getNextCronTime(webhook.cron, Date.now());
      if (next === null) return;
      const existing = this.schedule.get(next) ?? [];
      if (!existing.includes(webhook.id)) {
        this.schedule.set(next, [...existing, webhook.id]);
      }
    } catch (err) {
      console.error(`[WebhookService] Invalid cron "${webhook.cron}" for ${webhook.id}:`, err);
    }
  }

  private rescheduleWebhook(id: string): void {
    this.unscheduleWebhook(id);
    const webhook = webhookCache.get(id);
    if (webhook?.enabled && webhook.triggerType === 'scheduled' && webhook.cron) {
      this.scheduleWebhook(webhook);
    }
  }

  private unscheduleWebhook(id: string): void {
    for (const [time, ids] of this.schedule.entries()) {
      const filtered = ids.filter((wid) => wid !== id);
      if (filtered.length !== ids.length) {
        if (filtered.length === 0) this.schedule.delete(time);
        else this.schedule.set(time, filtered);
        break;
      }
    }
  }

  private startScheduler(): void {
    // Check every 60 seconds
    this.checkInterval = setInterval(() => this.onScheduleTick(), 60_000);
    // Also kick off an immediate tick
    this.onScheduleTick();
  }

  private async onScheduleTick(): Promise<void> {
    if (!this.isRunning) return;
    const now = Date.now();
    const toRun: string[] = [];

    for (const [time, ids] of this.schedule.entries()) {
      if (time <= now) {
        toRun.push(...ids);
        this.schedule.delete(time);
      }
    }

    if (toRun.length === 0) return;

    // Record missed executions before running (for backfill tracking)
    for (const id of toRun) {
      const webhook = webhookCache.get(id);
      if (webhook?.triggerType === 'scheduled') {
        await WebhookStore.addPending(id, now);
      }
    }

    for (const id of toRun) {
      this.executeWebhook(id);
      // Reschedule next occurrence
      const webhook = webhookCache.get(id);
      if (webhook?.enabled && webhook?.cron) {
        this.scheduleWebhook(webhook);
      }
    }
  }

  // --- Page visibility backfill ---
  private async backfillMissed(): Promise<void> {
    if (!document) return;
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        const pending = await WebhookStore.getPending(PENDING_BACKFILL_LIMIT);
        if (pending.length === 0) return;
        console.log(`[WebhookService] Backfilling ${pending.length} missed execution(s)`);
        for (const p of pending) {
          const webhook = webhookCache.get(p.webhookId) ?? await WebhookStore.get(p.webhookId);
          if (!webhook?.enabled) {
            await WebhookStore.deletePending(p.id);
            continue;
          }
          await this.executeWebhook(p.webhookId);
          await WebhookStore.deletePending(p.id);
        }
      }
    });
  }

  // --- Execute webhook HTTP request ---
  private async executeWebhook(webhookId: string): Promise<void> {
    const webhook = webhookCache.get(webhookId) ?? await WebhookStore.get(webhookId);
    if (!webhook || !webhook.enabled) return;

    const startTime = Date.now();
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let logEntry: WebhookExecutionLog = {
      id: logId,
      webhookId,
      timestamp: startTime,
      status: 'failure',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      // Use executeUrl if provided, otherwise fall back to url
      const targetUrl = webhook.executeUrl ?? webhook.url;

      const fetchOptions: RequestInit = {
        method: webhook.method,
        headers: webhook.headers,
        signal: controller.signal,
      };

      const hasBody = ['POST', 'PUT', 'PATCH'].includes(webhook.method);
      if (hasBody && webhook.body) {
        fetchOptions.body = webhook.body;
      }

      const response = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');
      logEntry.statusCode = response.status;
      logEntry.responseBody = responseBody.slice(0, 500);
      logEntry.status = response.ok ? 'success' : 'failure';
      logEntry.durationMs = Date.now() - startTime;

      webhook.lastRunAt = startTime;
      webhook.lastStatus = response.ok ? 'success' : 'failure';
      webhook.lastError = response.ok ? undefined : `HTTP ${response.status}`;
    } catch (err: unknown) {
      logEntry.durationMs = Date.now() - startTime;
      logEntry.status = 'failure';
      logEntry.error = err instanceof Error ? err.message : String(err);
      webhook.lastRunAt = startTime;
      webhook.lastStatus = 'failure';
      webhook.lastError = logEntry.error;
    }

    await WebhookStore.save(webhook);
    webhookCache.set(webhookId, webhook);
    await WebhookStore.addLog(logEntry);
    console.log(`[WebhookService] Executed ${webhook.name} (${webhookId}): ${logEntry.status}`);
  }

  // --- Memory event integration ---
  private registerMemoryEvents(): void {
    // Listen to our own event emitter (memory events are emitted by memoryStorage)
    const events: Array<{ event: string; webhookEventType: 'memory_created' | 'memory_updated' | 'memory_accessed' }> = [
      { event: 'memory:created', webhookEventType: 'memory_created' },
      { event: 'memory:updated', webhookEventType: 'memory_updated' },
      { event: 'memory:accessed', webhookEventType: 'memory_accessed' },
    ];

    for (const { event, webhookEventType } of events) {
      const unsub = memoryEventEmitter.on(event, (data: unknown) => {
        this.onMemoryEvent(webhookEventType, data);
      });
      if (unsub) this.memoryUnsubs.push(unsub);
    }
  }

  private async onMemoryEvent(eventType: string, _data: unknown): Promise<void> {
    const webhooks = await WebhookStore.getAll();
    const matching = webhooks.filter(
      (w) => w.enabled && w.triggerType === 'event' && w.eventType === eventType
    );
    for (const w of matching) {
      this.executeWebhook(w.id);
    }
  }

  // --- Logs ---
  async getLogs(webhookId: string): Promise<WebhookExecutionLog[]> {
    return WebhookStore.getLogs(webhookId);
  }

  async clearLogs(webhookId: string): Promise<void> {
    return WebhookStore.clearLogs(webhookId);
  }

  // --- Manual trigger ---
  async triggerNow(webhookId: string): Promise<void> {
    await this.executeWebhook(webhookId);
  }
}

export const WebhookService = new WebhookServiceImpl();
