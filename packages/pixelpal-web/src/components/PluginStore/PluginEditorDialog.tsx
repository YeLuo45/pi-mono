/**
 * V85: PluginEditorDialog
 * Enhanced modal for creating and editing plugins/skills with version history and dependencies.
 *
 * V62: Original plugin editing with manifest and actions.
 * V85: Added version bumping, version history, and dependency management.
 */

import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '../MUI替代/useMediaQuery';

import { MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyFormControl as FormControl, MyInputLabel as InputLabel, MyMenuItem as MenuItem } from '../MUI替代';
import { MyButton as Button, MyTextField as TextField, MyBox as Box, MyTypography as Typography, MyChip as Chip, MyStack as Stack, MyIconButton as IconButton, MyDivider as Divider, MyAlert as Alert, MyCollapse as Collapse, MyList, MyListItem, MyListItemText, MySelect as Select, MyTooltip } from '../MUI替代';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  CallSplit as DepsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Plugin, PluginAction } from '../../types/plugin';
import { pluginRegistry } from '../../services/plugins/pluginRegistry';
import * as pluginStorage from '../../services/storage/pluginStorage';
import { recordInitialVersion, getVersionHistory, bumpSkillVersion, updateSkillVersion } from '../../services/marketplace/SkillVersionManager';
import { getSkillDependencies, addSkillDependency, removeSkillDependency, validateNewDependency, detectCircularDependencies } from '../../services/marketplace/SkillDependencyResolver';
import type { SkillDependency } from '../../types/skill';
import { skillRegistry } from '../../services/skills/skillRegistry';

interface ActionInput {
  id: string;
  name: string;
  params: string;
}

interface DependencyInput {
  skillId: string;
  versionRange: string;
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

  // V85: Version & Dependencies
  const [version, setVersion] = useState('1.0.0');
  const [changelog, setChangelog] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<Array<{ version: string; changelog: string; createdAt: number }>>([]);
  const [dependencies, setDependencies] = useState<DependencyInput[]>([]);
  const [showDependencies, setShowDependencies] = useState(false);
  const [depInputSkillId, setDepInputSkillId] = useState('');
  const [depInputRange, setDepInputRange] = useState('^1.0.0');
  const [depError, setDepError] = useState('');

  // Error / saving state
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // All available skills for dependency dropdown
  const [availableSkills, setAvailableSkills] = useState<Array<{ id: string; name: string; version: string }>>([]);

  // Reset form when dialog opens with a plugin (or for new)
  useEffect(() => {
    if (open) {
      setError('');
      setSaving(false);
      setChangelog('');
      setShowVersionHistory(false);
      setShowDependencies(false);
      setDepError('');

      // Get all available skills for dependency selection
      const allSkills = skillRegistry.getAllSkills();
      setAvailableSkills(allSkills.map((s) => ({ id: s.id, name: s.name, version: s.version })));

      if (editingPlugin) {
        setName(editingPlugin.name);
        setIcon(editingPlugin.icon);
        setDescription(editingPlugin.description);
        setAuthor(editingPlugin.author);
        setPermissions([...editingPlugin.permissions]);
        setVersion(editingPlugin.version);
        setActions(
          editingPlugin.actions.map((a) => ({
            id: a.id,
            name: a.name,
            params: a.params.join(', '),
          }))
        );

        // Load version history
        const history = getVersionHistory(editingPlugin.id);
        setVersionHistory(history);

        // Load dependencies
        const deps = getSkillDependencies(editingPlugin.id);
        setDependencies(deps.map((d) => ({ skillId: d.skillId, versionRange: d.versionRange })));
      } else {
        setName('');
        setIcon('🧩');
        setDescription('');
        setAuthor('');
        setPermissions([]);
        setVersion('1.0.0');
        setActions([{ ...DEFAULT_ACTION }]);
        setVersionHistory([]);
        setDependencies([]);
      }
      setPermInput('');
      setDepInputSkillId('');
      setDepInputRange('^1.0.0');
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

  // --- V85: Dependencies ---
  const addDependency = () => {
    if (!depInputSkillId.trim()) {
      setDepError('请选择依赖的技能');
      return;
    }

    // Check for circular dependency
    const validation = validateNewDependency(editingPlugin?.id ?? `temp-${Date.now()}`, depInputSkillId);
    if (!validation.valid) {
      setDepError(`循环依赖检测: ${validation.circularPath?.join(' → ')}`);
      return;
    }

    // Check if already added
    if (dependencies.some((d) => d.skillId === depInputSkillId)) {
      setDepError('该依赖已添加');
      return;
    }

    setDependencies([...dependencies, { skillId: depInputSkillId, versionRange: depInputRange }]);
    setDepInputSkillId('');
    setDepInputRange('^1.0.0');
    setDepError('');
  };

  const removeDependency = (skillId: string) => {
    setDependencies(dependencies.filter((d) => d.skillId !== skillId));
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
        version: version,
        author: author.trim() || 'User',
        description: description.trim(),
        enabled: editingPlugin?.enabled ?? true,
        permissions,
        actions: parsedActions,
      };

      // Save to IndexedDB
      await pluginStorage.savePlugin(plugin);

      // Register in memory
      pluginRegistry.registerUserPlugin(plugin);

      // V85: Record version and save dependencies
      const isNew = !editingPlugin;
      if (isNew) {
        await recordInitialVersion({
          ...plugin,
          systemPrompt: '',
          examplePrompts: [],
          requiredContext: [],
          optionalContext: [],
          maxSteps: 5,
          showSteps: false,
          chatTriggerable: false,
          chatKeywords: [],
          order: 999,
        } as any);
      } else if (changelog.trim()) {
        // Record version bump/update
        await updateSkillVersion(plugin.id, version, changelog.trim());
      }

      // Save dependencies
      for (const dep of dependencies) {
        addSkillDependency(plugin.id, dep);
      }

      onSaved?.(plugin);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // --- Version Bump ---
  const handleVersionBump = (type: 'major' | 'minor' | 'patch') => {
    const parts = version.split('.').map(Number);
    const [maj, min, pat] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    let newVersion = version;
    switch (type) {
      case 'major':
        newVersion = `${maj + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${maj}.${min + 1}.0`;
        break;
      case 'patch':
        newVersion = `${maj}.${min}.${pat + 1}`;
        break;
    }
    setVersion(newVersion);
    setChangelog(`${type === 'major' ? 'Breaking changes' : type === 'minor' ? 'New features' : 'Bug fixes'}`);
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

        {depError && (
          <Alert severity="warning" onClose={() => setDepError('')}>
            {depError}
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

        {/* V85: Version Management */}
        {editingPlugin && (
          <>
            <Box>
              <Box
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  py: 0.5,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                  borderRadius: 1,
                  px: 1,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
                    版本管理
                  </Typography>
                  <Chip label={`v${version}`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(99,102,241,0.1)', color: '#6366F1' }} />
                </Stack>
                {showVersionHistory ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
              </Box>

              <Collapse in={showVersionHistory}>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Version bump buttons */}
                  <Stack direction="row" spacing={1}>
                    {(['patch', 'minor', 'major'] as const).map((type) => (
                      <Button
                        key={type}
                        size="small"
                        variant="outlined"
                        onClick={() => handleVersionBump(type)}
                        sx={{
                          flex: 1,
                          height: 28,
                          fontSize: 10,
                          borderColor: '#E5E7EB',
                          color: '#64748B',
                          textTransform: 'none',
                          '&:hover': { borderColor: '#CBD5E1' },
                        }}
                      >
                        +{type === 'major' ? '1.0.0' : type === 'minor' ? '0.1.0' : '0.0.1'}
                      </Button>
                    ))}
                  </Stack>

                  {/* Current version display */}
                  <TextField
                    label="版本号"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    size="small"
                    fullWidth
                    inputProps={{ maxLength: 20 }}
                    helperText="语义化版本号，如 1.0.0"
                    sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                  />

                  {/* Changelog */}
                  <TextField
                    label="更新日志"
                    value={changelog}
                    onChange={(e) => setChangelog(e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    placeholder="描述此版本的更新内容..."
                    inputProps={{ maxLength: 500 }}
                  />

                  {/* Version history list */}
                  {versionHistory.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        历史版本
                      </Typography>
                      <Stack spacing={0.5}>
                        {[...versionHistory].reverse().slice(0, 5).map((v) => (
                          <Box
                            key={v.version}
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: 'rgba(0,0,0,0.02)',
                              borderRadius: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                              v{v.version}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                              {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>

            <Divider />
          </>
        )}

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

        {/* V85: Dependencies */}
        <Box>
          <Box
            onClick={() => setShowDependencies(!showDependencies)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
              borderRadius: 1,
              px: 1,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <DepsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
                技能依赖
              </Typography>
              {dependencies.length > 0 && (
                <Chip label={`${dependencies.length}`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(99,102,241,0.1)', color: '#6366F1' }} />
              )}
            </Stack>
            {showDependencies ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
          </Box>

          <Collapse in={showDependencies}>
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Add dependency row */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ flex: 2 }}>
                  <InputLabel>技能</InputLabel>
                  <Select
                    value={depInputSkillId}
                    onChange={(e) => setDepInputSkillId(e.target.value)}
                    label="技能"
                  >
                    {availableSkills.map((s) => (
                      <MenuItem key={s.id} value={s.id} dense>
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>{s.name}</Typography>
                          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>v{s.version}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="版本范围"
                  value={depInputRange}
                  onChange={(e) => setDepInputRange(e.target.value)}
                  sx={{ flex: 1 }}
                  inputProps={{ maxLength: 20 }}
                  placeholder="^1.0.0"
                />
                <Button size="small" variant="outlined" onClick={addDependency} sx={{ alignSelf: 'center' }}>
                  添加
                </Button>
              </Box>

              {/* Circular dependency warning */}
              {dependencies.length > 0 && editingPlugin && (
                (() => {
                  const circular = detectCircularDependencies(editingPlugin.id);
                  if (circular.length === 0) return null;
                  return (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: 11 }}>
                        循环依赖: {circular.join(' → ')}
                      </Typography>
                    </Alert>
                  );
                })()
              )}

              {/* Dependency list */}
              {dependencies.length > 0 && (
                <Stack spacing={0.5}>
                  {dependencies.map((dep) => (
                    <Box
                      key={dep.skillId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        bgcolor: 'rgba(0,0,0,0.02)',
                        borderRadius: 1,
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, flex: 1 }}>
                        {dep.skillId}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace' }}>
                        {dep.versionRange}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => removeDependency(dep.skillId)}
                        sx={{ color: 'error.main', p: 0.25 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Collapse>
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
