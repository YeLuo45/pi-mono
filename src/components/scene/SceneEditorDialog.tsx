import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControlLabel, Switch, useMediaQuery, Box, Chip,
} from '@mui/material';
import type { Scene, Trigger, Action } from '../../types/scene';
import { TriggerConfig } from './TriggerConfig';
import { ActionConfig } from './ActionConfig';
import { useTranslation } from 'react-i18next';

interface SceneEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (scene: Scene) => void;
  editingScene?: Scene | null;
}

export const SceneEditorDialog: React.FC<SceneEditorDialogProps> = ({ open, onClose, onSave, editingScene }) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 600px)');
  const [name, setName] = useState('');
  const [isQuick, setIsQuick] = useState(false);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const isValid = name.trim().length > 0 && triggers.length > 0 && actions.length > 0;

  useEffect(() => {
    if (editingScene) {
      setName(editingScene.name);
      setIsQuick(editingScene.isQuick);
      setTriggers([...editingScene.triggers]);
      setActions([...editingScene.actions]);
      setTags([...(editingScene.tags ?? [])]);
    } else {
      setName('');
      setIsQuick(false);
      setTriggers([]);
      setActions([]);
      setTags([]);
    }
    setTagInput('');
  }, [editingScene, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    const scene: Scene = {
      id: editingScene?.id || `scene-${Date.now()}`,
      name: name.trim(),
      enabled: editingScene?.enabled ?? true,
      isQuick,
      triggers,
      actions,
      tags,
      createdAt: editingScene?.createdAt ?? Date.now(),
    };
    onSave(scene);
    onClose();
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const isValid = name.trim().length > 0 && triggers.length > 0 && actions.length > 0;

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
      <DialogTitle sx={{ pb: 1, fontSize: isMobile ? 18 : undefined }}>
        {editingScene ? t('scene.editScene', '编辑场景') : t('scene.newScene', '新建场景')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: isMobile ? 'auto' : undefined }}>
        <TextField
          label={t('scene.sceneName', '场景名称')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          inputProps={{ maxLength: 20 }}
          helperText={`${name.length}/20 ${t('scene.chars', '字符')}`}
        />

        <FormControlLabel
          control={<Switch checked={isQuick} onChange={(e) => setIsQuick(e.target.checked)} />}
          label={t('scene.showInQuickBar', '显示在快捷栏')}
        />

        {/* Tags */}
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder={t('scene.tagPlaceholder', '输入标签，回车添加')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              sx={{ flex: 1 }}
            />
            <Button size="small" variant="outlined" onClick={addTag} disabled={!tagInput.trim()}>
              {t('scene.add', '添加')}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onDelete={() => removeTag(tag)}
                sx={{
                  bgcolor: 'rgba(155, 127, 212, 0.15)',
                  color: 'primary.light',
                }}
              />
            ))}
          </Box>
        </Box>

        <TriggerConfig triggers={triggers} onChange={setTriggers} />

        <ActionConfig actions={actions} onChange={setActions} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1 }}>
        <Button onClick={onClose} fullWidth={isMobile} variant="outlined">
          {t('common.cancel', '取消')}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid} fullWidth={isMobile}>
          {t('common.save', '保存')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
