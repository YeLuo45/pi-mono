/**
 * V90: MemoryEditDialog - Memory editing and deletion dialog
 * Allows users to view, edit, and delete persona memories
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react/i18next';
import { MyDialog as Dialog, MySlider as Slider , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyFormControl as FormControl, MyInputLabel as InputLabel, MyMenuItem as MenuItem } from '../MUI替代';
import { MyButton as Button, MyTextField as TextField, MyIconButton as IconButton, MyBox as Box, MyTypography as Typography, MyChip as Chip, MyStack as Stack, MySelect as Select, MyDivider as Divider } from '../MUI替代';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  getPersonaMemory,
  updatePersonaMemory,
  deletePersonaMemory,
  addPersonaMemory,
  queryPersonaMemories,
} from '../../services/persona/memoryStore';
import type { PersonaMemory, MemoryTypeV90 } from '../../services/persona/v90Types';

interface MemoryEditDialogProps {
  open: boolean;
  onClose: () => void;
  personaId: string;
  memoryId?: string | null; // null for new memory
  mode?: 'view' | 'edit' | 'create';
}

const TYPE_OPTIONS: Array<{ value: MemoryTypeV90; label: string; icon: string }> = [
  { value: 'event', label: '事件', icon: '📅' },
  { value: 'emotion', label: '情感', icon: '💝' },
  { value: 'preference', label: '偏好', icon: '⭐' },
  { value: 'fact', label: '事实', icon: '📚' },
];

export const MemoryEditDialog: React.FC<MemoryEditDialogProps> = ({
  open,
  onClose,
  personaId,
  memoryId,
  mode: propMode,
}) => {
  const { t } = useTranslation();
  const [memory, setMemory] = useState<PersonaMemory | null>(null);
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryTypeV90>('event');
  const [importance, setImportance] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mode = propMode || (memoryId ? 'edit' : 'create');

  useEffect(() => {
    if (open && memoryId) {
      loadMemory();
    } else if (open) {
      // Reset for new memory
      setMemory(null);
      setContent('');
      setType('event');
      setImportance(5);
      setTags([]);
    }
  }, [open, memoryId]);

  const loadMemory = async () => {
    if (!memoryId) return;
    setLoading(true);
    try {
      const m = await getPersonaMemory(memoryId);
      if (m) {
        setMemory(m);
        setContent(m.content);
        setType(m.type);
        setImportance(m.importance);
        setTags(m.tags);
      }
    } catch (err) {
      console.error('Failed to load memory:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      if (memoryId && memory) {
        await updatePersonaMemory(memoryId, {
          content: content.trim(),
          type,
          importance,
          tags,
        });
      } else {
        await addPersonaMemory({
          personaId,
          content: content.trim(),
          type,
          importance,
          tags,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!memoryId) return;
    if (window.confirm('确定要删除这条记忆吗？此操作不可撤销。')) {
      try {
        await deletePersonaMemory(memoryId);
        onClose();
      } catch (err) {
        console.error('Failed to delete memory:', err);
      }
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '添加新记忆' : mode === 'edit' ? '编辑记忆' : '记忆详情'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {/* Type Selection */}
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel>记忆类型</InputLabel>
          <Select
            value={type}
            label="记忆类型"
            onChange={(e) => setType(e.target.value as MemoryTypeV90)}
            disabled={mode === 'view'}
          >
            {TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{opt.icon}</span>
                  {opt.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Content */}
        <TextField
          fullWidth
          multiline
          rows={4}
          label="记忆内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={mode === 'view'}
          placeholder="描述这段记忆..."
          sx={{ mb: 2 }}
        />

        {/* Importance Slider */}
        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            重要性: <strong>{importance}</strong>/10
          </Typography>
          <Slider
            value={importance}
            onChange={(_, v) => setImportance(v as number)}
            min={0}
            max={10}
            step={1}
            marks={[
              { value: 0, label: '0' },
              { value: 5, label: '5' },
              { value: 10, label: '10' },
            ]}
            disabled={mode === 'view'}
          />
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">普通</Typography>
            <Typography variant="caption" color="text.secondary">重要</Typography>
          </Stack>
        </Box>

        {/* Tags */}
        <Box sx={{ mb: 2 }}>
          <Typography gutterBottom>标签</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', useFlexGap: true }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onDelete={mode !== 'view' ? () => handleRemoveTag(tag) : undefined}
              />
            ))}
          </Stack>
          {mode !== 'view' && (
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="添加标签..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                sx={{ flex: 1 }}
              />
              <IconButton onClick={handleAddTag} size="small">
                <AddIcon />
              </IconButton>
            </Stack>
          )}
        </Box>

        {/* Metadata (view mode only) */}
        {mode === 'view' && memory && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">创建时间</Typography>
                <Typography variant="body2">
                  {new Date(memory.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">最后访问</Typography>
                <Typography variant="body2">
                  {new Date(memory.lastAccessedAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">访问次数</Typography>
                <Typography variant="body2">{memory.accessCount}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">情感标签</Typography>
                <Typography variant="body2">{memory.emotion || '无'}</Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {mode !== 'view' && memoryId && (
          <Button color="error" onClick={handleDelete} sx={{ mr: 'auto' }}>
            删除
          </Button>
        )}
        <Button onClick={onClose}>取消</Button>
        {mode !== 'view' && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!content.trim() || saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        )}
        {mode === 'view' && (
          <Button variant="contained" onClick={() => {}}>
            编辑
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
