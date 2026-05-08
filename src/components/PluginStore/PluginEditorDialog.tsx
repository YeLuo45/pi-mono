/**
 * PluginEditorDialog — V62 Plugin Market Editor
 *
 * Modal dialog for creating and editing user-installed plugins.
 * Allows setting manifest fields (name, icon, description, author, permissions)
 * and managing actions (id, name, params).
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Divider,
  useMediaQuery,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Plugin, PluginAction } from '../../types/plugin';
import { pluginRegistry } from '../../services/plugins/pluginRegistry';
import * as pluginStorage from '../../services/storage/pluginStorage';

interface ActionInput {
  id: string;
  name: string;
  params: string;
}

interface PluginEditorDialogProps {
  open: boolean;
  onClose: () => void;
  editingPlugin?: Plugin | null;
  /** Called after a plugin is successfully saved */
  onSaved?: (plugin: Plugin) => void;
}

const DEFAULT_ACTION: ActionInput = { id: '', name: '', params: '' };

export const PluginEditorDialog: React.FC<PluginEditorDialogProps> = ({
  open,
  onClose,
  editingPlugin,
  onSaved,
}) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 600px)');

  // Manifest fields
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧩');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permInput, setPermInput] = useState('');

  // Actions
  const [actions, setActions] = useState<ActionInput[]>([]);

  // Error / saving state
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens with a plugin (or for new)
  useEffect(() => {
    if (open) {
      setError('');
      setSaving(false);
      if (editingPlugin) {
        setName(editingPlugin.name);
        setIcon(editingPlugin.icon);
        setDescription(editingPlugin.description);
        setAuthor(editingPlugin.author);
        setPermissions([...editingPlugin.permissions]);
        setActions(
          editingPlugin.actions.map((a) => ({
            id: a.id,
            name: a.name,
            params: a.params.join(', '),
          }))
        );
      } else {
        setName('');
        setIcon('🧩');
        setDescription('');
        setAuthor('');
        setPermissions([]);
        setActions([{ ...DEFAULT_ACTION }]);
      }
      setPermInput('');
    }
  }, [open, editingPlugin]);

  // --- Permissions ---
  const addPermission = () => {
    const p = permInput.trim();
    if (p && !permissions.includes(p)) {
      setPermissions([...permissions, p]);
    }
    setPermInput('');
  };

  const removePermission = (p: string) => {
    setPermissions(permissions.filter((x) => x !== p));
  };

  // --- Actions ---
  const addAction = () => {
    setActions([...actions, { ...DEFAULT_ACTION }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof ActionInput, value: string) => {
    setActions(
      actions.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  // --- Validation ---
  const isValid =
    name.trim().length > 0 &&
    icon.trim().length > 0 &&
    actions.every((a) => a.id.trim().length > 0 && a.name.trim().length > 0);

  const duplicateActionIds = actions
    .map((a) => a.id.trim())
    .filter((id, idx, arr) => arr.indexOf(id) !== idx);

  // --- Save ---
  const handleSave = async () => {
    if (!isValid) return;
    setError('');
    setSaving(true);

    try {
      const parsedActions: PluginAction[] = actions
        .filter((a) => a.id.trim() && a.name.trim())
        .map((a) => ({
          id: a.id.trim(),
          name: a.name.trim(),
          params: a.params
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
          handler: async () => `Action ${a.name} not implemented`,
        }));

      const plugin: Plugin = {
        id: editingPlugin?.id ?? `user-plugin-${Date.now()}`,
        name: name.trim(),
        icon: icon.trim(),
        version: editingPlugin?.version ?? '1.0.0',
        author: author.trim() || 'User',
        description: description.trim(),
        enabled: editingPlugin?.enabled ?? true,
        permissions,
        actions: parsedActions,
      };

      // Save to IndexedDB
      await pluginStorage.savePlugin(plugin);

      // Register in memory (if not already from loadPlugins)
      pluginRegistry.registerUserPlugin(plugin);

      onSaved?.(plugin);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          minHeight: isMobile ? '100%' : undefined,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
          fontSize: isMobile ? 18 : undefined,
        }}
      >
        <span style={{ fontSize: 20 }}>{editingPlugin ? '✏️' : '🧩'}</span>
        {editingPlugin
          ? t('plugin.editor.editPlugin', 'Edit Plugin')
          : t('plugin.editor.newPlugin', 'New Plugin')}
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: isMobile ? 'auto' : undefined,
        }}
      >
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Icon + Name row */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <TextField
            label={t('plugin.editor.icon', 'Icon')}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            size="small"
            sx={{ width: 72, flexShrink: 0, '& input': { fontSize: 20, textAlign: 'center' } }}
            inputProps={{ maxLength: 4 }}
          />
          <TextField
            label={t('plugin.editor.name', 'Name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            required
            inputProps={{ maxLength: 30 }}
            helperText={`${name.length}/30`}
          />
        </Box>

        {/* Author */}
        <TextField
          label={t('plugin.editor.author', 'Author')}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          fullWidth
          size="small"
          inputProps={{ maxLength: 30 }}
        />

        {/* Description */}
        <TextField
          label={t('plugin.editor.description', 'Description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={4}
          inputProps={{ maxLength: 200 }}
          helperText={`${description.length}/200`}
        />

        <Divider />

        {/* Permissions */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            {t('plugin.editor.permissions', 'Permissions')} ({t('plugin.editor.optional', 'optional')})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder={t('plugin.editor.permPlaceholder', 'e.g. network, storage')}
              value={permInput}
              onChange={(e) => setPermInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPermission();
                }
              }}
              sx={{ flex: 1 }}
            />
            <Button size="small" variant="outlined" onClick={addPermission} disabled={!permInput.trim()}>
              {t('common.add', 'Add')}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {permissions.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                onDelete={() => removePermission(p)}
                sx={{ bgcolor: 'rgba(255,152,0,0.12)', color: 'text.secondary' }}
              />
            ))}
          </Box>
        </Box>

        <Divider />

        {/* Actions */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            {t('plugin.editor.actions', 'Actions')}
          </Typography>
          <Stack gap={1.5}>
            {actions.map((action, index) => (
              <Box
                key={index}
                sx={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 1,
                  p: 1.5,
                  bgcolor: 'rgba(255,255,255,0.02)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
                    #{index + 1}
                  </Typography>
                  <TextField
                    label={t('plugin.editor.actionId', 'Action ID')}
                    value={action.id}
                    onChange={(e) => updateAction(index, 'id', e.target.value)}
                    size="small"
                    required
                    sx={{ flex: 1 }}
                    inputProps={{ maxLength: 30 }}
                    error={duplicateActionIds.includes(action.id.trim())}
                    helperText={
                      duplicateActionIds.includes(action.id.trim())
                        ? t('plugin.editor.duplicateId', 'Duplicate ID')
                        : undefined
                    }
                  />
                  <TextField
                    label={t('plugin.editor.actionName', 'Display Name')}
                    value={action.name}
                    onChange={(e) => updateAction(index, 'name', e.target.value)}
                    size="small"
                    required
                    sx={{ flex: 1 }}
                    inputProps={{ maxLength: 30 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeAction(index)}
                    disabled={actions.length === 1}
                    sx={{ color: 'error.main', mt: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <TextField
                  label={t('plugin.editor.actionParams', 'Parameters')}
                  value={action.params}
                  onChange={(e) => updateAction(index, 'params', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder={t('plugin.editor.paramsPlaceholder', 'param1, param2, ...')}
                  inputProps={{ maxLength: 100 }}
                  helperText={t('plugin.editor.paramsHint', 'Comma-separated parameter names')}
                />
              </Box>
            ))}
          </Stack>
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={addAction}
            sx={{ mt: 1, fontSize: 12 }}
          >
            {t('plugin.editor.addAction', 'Add Action')}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 2,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: 1,
        }}
      >
        <Button onClick={onClose} fullWidth={isMobile} variant="outlined" disabled={saving}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isValid || duplicateActionIds.length > 0 || saving}
          fullWidth={isMobile}
          startIcon={saving ? undefined : <EditIcon sx={{ fontSize: 14 }} />}
        >
          {saving ? t('plugin.editor.saving', 'Saving...') : t('common.save', 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
