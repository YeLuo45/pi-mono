// WebhookSettings — Webhook management panel for Settings page
import React, { useState, useEffect } from 'react';
import { MyDialog } from '../MUI替代';
import { MyBox, MyTypography, MyTextField, MyButton, MyPaper, MyStack, MySwitch, MyDivider, MyList, MyListItem, MyChip, MyIconButton, MySelect, MySelect, MySelect, MySelect, MyTooltip, MyCircularProgress } from '../MUI替代';
import {
  Add as AddIcon, Delete as DeleteIcon, PlayArrow as RunIcon,
  ExpandMore as MoreIcon, Edit as EditIcon,
} from '@mui/icons-material';
import { WebhookService } from '../../services/webhook/WebhookService';
import type { Webhook, WebhookExecutionLog } from '../../services/webhook/types';

const CRON_PRESETS = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every Monday', value: '0 0 * * 1' },
];

const STATUS_COLORS: Record<string, string> = {
  success: '#4CAF50',
  failure: '#F44336',
  skipped: '#FF9800',
};

export const WebhookSettings: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Partial<Webhook> | null>(null);
  const [logs, setLogs] = useState<Record<string, WebhookExecutionLog[]>>({});
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  const loadWebhooks = async () => {
    setLoading(true);
    const list = await WebhookService.listWebhooks();
    setWebhooks(list);
    setLoading(false);
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    await WebhookService.toggleWebhook(id, enabled);
    loadWebhooks();
  };

  const handleDelete = async (id: string) => {
    await WebhookService.deleteWebhook(id);
    loadWebhooks();
  };

  const handleRun = async (id: string) => {
    setRunningIds((prev) => new Set(prev).add(id));
    await WebhookService.triggerNow(id);
    setRunningIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    loadWebhooks();
  };

  const openAddDialog = () => {
    setEditingWebhook({
      name: '',
      url: 'https://',
      method: 'POST',
      headers: {},
      body: '',
      triggerType: 'scheduled',
      cron: '*/5 * * * *',
      eventType: 'memory_created',
      enabled: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (wh: Webhook) => {
    setEditingWebhook({ ...wh });
    setDialogOpen(true);
  };

  const handleSaveDialog = async () => {
    if (!editingWebhook) return;
    if (!editingWebhook.name?.trim() || !editingWebhook.url?.trim()) return;

    if (editingWebhook.id) {
      await WebhookService.updateWebhook(editingWebhook.id, editingWebhook);
    } else {
      await WebhookService.createWebhook({
        name: editingWebhook.name,
        url: editingWebhook.url,
        method: editingWebhook.method || 'GET',
        headers: editingWebhook.headers || {},
        body: editingWebhook.body,
        triggerType: editingWebhook.triggerType || 'scheduled',
        cron: editingWebhook.cron,
        eventType: editingWebhook.eventType,
        enabled: editingWebhook.enabled ?? true,
      });
    }
    setDialogOpen(false);
    setEditingWebhook(null);
    loadWebhooks();
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWebhook(null);
  };

  const viewLogs = async (webhookId: string) => {
    if (logs[webhookId]) {
      const newLogs = { ...logs };
      delete newLogs[webhookId];
      setLogs(newLogs);
    } else {
      const wLogs = await WebhookService.getLogs(webhookId);
      setLogs((prev) => ({ ...prev, [webhookId]: wLogs }));
    }
  };

  return (
    <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
            🔗 Webhooks
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            {webhooks.length} webhook(s) configured
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={openAddDialog}
          sx={{ fontSize: 11 }}
        >
          Add Webhook
        </Button>
      </Box>

      {loading && <CircularProgress size={16} />}

      {!loading && webhooks.length === 0 && (
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', textAlign: 'center', py: 2 }}>
          No webhooks configured. Add one to get started.
        </Typography>
      )}

      <List dense disablePadding>
        {webhooks.map((wh) => (
          <React.Fragment key={wh.id}>
            <ListItem
              disablePadding
              sx={{ bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 1, mb: 0.5, flexDirection: 'column', alignItems: 'stretch' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5 }}>
                <Switch
                  size="small"
                  checked={wh.enabled}
                  onChange={(e) => handleToggle(wh.id, e.target.checked)}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {wh.name}
                    </Typography>
                    <Chip
                      label={wh.method}
                      size="small"
                      sx={{ height: 14, fontSize: 8, bgcolor: wh.method === 'POST' ? 'rgba(76,175,80,0.2)' : 'rgba(33,150,243,0.2)' }}
                    />
                    <Chip
                      label={wh.triggerType === 'scheduled' ? '⏰' : '⚡'}
                      size="small"
                      sx={{ height: 14, fontSize: 8 }}
                    />
                    {wh.lastStatus && (
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS_COLORS[wh.lastStatus] || 'grey' }} />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wh.url}
                  </Typography>
                </Box>
                <Stack direction="row" gap={0.25}>
                  <Tooltip title="Run now">
                    <IconButton size="small" onClick={() => handleRun(wh.id)} disabled={runningIds.has(wh.id)} sx={{ p: 0.25 }}>
                      {runningIds.has(wh.id) ? <CircularProgress size={12} /> : <RunIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="View logs">
                    <IconButton size="small" onClick={() => viewLogs(wh.id)} sx={{ p: 0.25 }}>
                      <MoreIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEditDialog(wh)} sx={{ p: 0.25 }}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(wh.id)} sx={{ p: 0.25, color: 'error.main' }}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Expanded logs */}
              {logs[wh.id] && (
                <Box sx={{ px: 1, pb: 1 }}>
                  <Divider sx={{ mb: 0.5 }} />
                  {logs[wh.id].length === 0 && (
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>No execution logs yet</Typography>
                  )}
                  {logs[wh.id].map((log) => (
                    <Box key={log.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.1 }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: STATUS_COLORS[log.status] || 'grey', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                        {new Date(log.timestamp).toLocaleString()} · {log.status} {log.statusCode ? `(HTTP ${log.statusCode})` : ''} {log.durationMs ? `· ${log.durationMs}ms` : ''}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', display: 'block', mt: 1 }}>
        Webhooks are executed locally. URLs must allow CORS requests from this origin.
      </Typography>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14 }}>
          {editingWebhook?.id ? 'Edit Webhook' : 'Add Webhook'}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              size="small"
              fullWidth
              value={editingWebhook?.name || ''}
              onChange={(e) => setEditingWebhook((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="My Webhook"
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <InputLabel>Method</InputLabel>
                <Select
                  value={editingWebhook?.method || 'GET'}
                  label="Method"
                  onChange={(e) => setEditingWebhook((prev) => ({ ...prev, method: e.target.value as 'GET' | 'POST' }))}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="URL"
                size="small"
                fullWidth
                value={editingWebhook?.url || ''}
                onChange={(e) => setEditingWebhook((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/webhook"
              />
            </Box>

            {/* Trigger Type */}
            <FormControl size="small" fullWidth>
              <InputLabel>Trigger Type</InputLabel>
              <Select
                value={editingWebhook?.triggerType || 'scheduled'}
                label="Trigger Type"
                onChange={(e) => setEditingWebhook((prev) => ({ ...prev, triggerType: e.target.value as 'scheduled' | 'event' }))}
              >
                <MenuItem value="scheduled">⏰ Scheduled (Cron)</MenuItem>
                <MenuItem value="event">⚡ Event-based</MenuItem>
              </Select>
            </FormControl>

            {editingWebhook?.triggerType === 'scheduled' && (
              <Box>
                <FormControl size="small" fullWidth>
                  <InputLabel>Cron Expression</InputLabel>
                  <Select
                    value={CRON_PRESETS.find((p) => p.value === editingWebhook?.cron) ? editingWebhook?.cron : 'custom'}
                    label="Cron Expression"
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setEditingWebhook((prev) => ({ ...prev, cron: e.target.value }));
                      }
                    }}
                  >
                    {CRON_PRESETS.map((preset) => (
                      <MenuItem key={preset.value} value={preset.value}>{preset.label}</MenuItem>
                    ))}
                    <MenuItem value="custom">Custom...</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder="*/5 * * * *"
                  value={editingWebhook?.cron || ''}
                  onChange={(e) => setEditingWebhook((prev) => ({ ...prev, cron: e.target.value }))}
                  sx={{ mt: 1, '& input': { fontSize: 11, fontFamily: 'monospace' } }}
                />
                <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', display: 'block', mt: 0.25 }}>
                  Format: minute hour day month weekday
                </Typography>
              </Box>
            )}

            {editingWebhook?.triggerType === 'event' && (
              <FormControl size="small" fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={editingWebhook?.eventType || 'memory_created'}
                  label="Event Type"
                  onChange={(e) => setEditingWebhook((prev) => ({ ...prev, eventType: e.target.value as 'memory_created' | 'memory_updated' | 'memory_accessed' }))}
                >
                  <MenuItem value="memory_created">Memory Created</MenuItem>
                  <MenuItem value="memory_updated">Memory Updated</MenuItem>
                  <MenuItem value="memory_accessed">Memory Accessed</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Headers */}
            <Box>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                Headers (one per line, format: Key: Value)
              </Typography>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={2}
                placeholder="Content-Type: application/json&#10;Authorization: Bearer ***"
                value={Object.entries(editingWebhook?.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}
                onChange={(e) => {
                  const headers: Record<string, string> = {};
                  for (const line of e.target.value.split('\n')) {
                    const idx = line.indexOf(':');
                    if (idx > 0) {
                      headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
                    }
                  }
                  setEditingWebhook((prev) => ({ ...prev, headers }));
                }}
                sx={{ '& textarea': { fontSize: 10, fontFamily: 'monospace' } }}
              />
            </Box>

            {editingWebhook?.method === 'POST' && (
              <TextField
                label="Request Body"
                size="small"
                fullWidth
                multiline
                rows={3}
                placeholder='{"key": "value"}'
                value={editingWebhook?.body || ''}
                onChange={(e) => setEditingWebhook((prev) => ({ ...prev, body: e.target.value }))}
                sx={{ '& textarea': { fontSize: 10, fontFamily: 'monospace' } }}
              />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch
                size="small"
                checked={editingWebhook?.enabled ?? true}
                onChange={(e) => setEditingWebhook((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              <Typography variant="caption" sx={{ fontSize: 11 }}>
                Enabled
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} size="small">Cancel</Button>
          <Button
            onClick={handleSaveDialog}
            variant="contained"
            size="small"
            disabled={!editingWebhook?.name?.trim() || !editingWebhook?.url?.trim()}
          >
            {editingWebhook?.id ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
