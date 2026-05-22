/**
 * V78: SkillUploadDialog Component
 * Upload/share a skill to the marketplace.
 */

import React, { useState } from 'react';
import { MyDialog, MyAlpha } from '../MUI替代';
import { MyBox, MyTypography, MyButton, MyStack, MyTextField, MyIconButton, MySelect, MySelect, MySelect, MySelect, MyChip } from '../MUI替代';
import {
  Close as CloseIcon,
  Upload as UploadIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import type { SkillDefinition, SkillCategory } from '../../services/skills/types';
import { SkillCard } from './SkillCard';
import { MarketplaceSkill } from '../../data/sampleMarketplaceSkills';

interface SkillUploadDialogProps {
  open: boolean;
  onClose: () => void;
  skill?: SkillDefinition | null;
  onSubmit?: (skill: MarketplaceSkill) => void;
}

const CATEGORY_OPTIONS: { value: SkillCategory; label: string }[] = [
  { value: 'productivity', label: '效率工具' },
  { value: 'creative', label: '创意' },
  { value: 'analysis', label: '分析' },
  { value: 'lifestyle', label: '生活' },
  { value: 'developer', label: '开发者' },
  { value: 'entertainment', label: '娱乐' },
];

export const SkillUploadDialog: React.FC<SkillUploadDialogProps> = ({
  open,
  onClose,
  skill,
  onSubmit,
}) => {
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [icon, setIcon] = useState(skill?.icon || '🎯');
  const [category, setCategory] = useState<SkillCategory>(skill?.category || 'productivity');
  const [tags, setTags] = useState<string[]>(skill?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [examplePrompts, setExamplePrompts] = useState<string[]>(skill?.examplePrompts || []);
  const [promptInput, setPromptInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleClose = () => {
    setPreviewMode(false);
    setErrors({});
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: { name?: string; description?: string } = {};
    if (!name.trim()) {
      newErrors.name = '技能名称不能为空';
    }
    if (!description.trim()) {
      newErrors.description = '描述不能为空';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleAddPrompt = () => {
    const trimmed = promptInput.trim();
    if (trimmed && !examplePrompts.includes(trimmed)) {
      setExamplePrompts([...examplePrompts, trimmed]);
    }
    setPromptInput('');
  };

  const handleRemovePrompt = (prompt: string) => {
    setExamplePrompts(examplePrompts.filter((p) => p !== prompt));
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const marketplaceSkill: MarketplaceSkill = {
      id: skill?.id || `custom-${Date.now()}`,
      name,
      description,
      icon,
      version: skill?.version || '1.0.0',
      author: skill?.author || '@me',
      category,
      tags,
      chatTriggerable: skill?.chatTriggerable || true,
      chatKeywords: skill?.chatKeywords || [],
      order: skill?.order || 99,
      enabled: true,
      systemPrompt: skill?.systemPrompt || '',
      examplePrompts,
      requiredContext: skill?.requiredContext || [],
      optionalContext: skill?.optionalContext || [],
      maxSteps: skill?.maxSteps || 5,
      showSteps: skill?.showSteps || false,
      installCount: 0,
      avgRating: 0,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit?.(marketplaceSkill);
    handleClose();
  };

  // Build preview skill
  const previewSkill: MarketplaceSkill = {
    id: skill?.id || 'preview',
    name,
    description,
    icon,
    version: skill?.version || '1.0.0',
    author: skill?.author || '@me',
    category,
    tags,
    chatTriggerable: true,
    chatKeywords: [],
    order: 99,
    enabled: true,
    systemPrompt: '',
    examplePrompts,
    requiredContext: [],
    optionalContext: [],
    maxSteps: 5,
    showSteps: false,
    installCount: 0,
    avgRating: 0,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#FFFFFF',
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
            分享技能到商店
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewMode(!previewMode)}
            sx={{
              fontSize: 12,
              color: previewMode ? '#6366F1' : '#64748B',
              bgcolor: previewMode ? alpha('#6366F1', 0.1) : 'transparent',
            }}
          >
            {previewMode ? '编辑' : '预览'}
          </Button>
          <IconButton size="small" onClick={handleClose} sx={{ color: '#64748B' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {previewMode ? (
          // Preview Mode
          <Box>
            <Typography variant="body2" sx={{ fontSize: 12, color: '#64748B', mb: 2 }}>
              预览技能在商店中的展示效果
            </Typography>
            <SkillCard skill={previewSkill} variant="store" isInstalled={false} />
          </Box>
        ) : (
          // Edit Mode
          <Stack spacing={2.5}>
            {/* Icon */}
            <Box>
              <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', mb: 0.5, display: 'block' }}>
                图标
              </Typography>
              <TextField
                size="small"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="输入emoji"
                sx={{
                  width: 80,
                  '& .MuiOutlinedInput-root': {
                    fontSize: 24,
                    textAlign: 'center',
                  },
                }}
              />
            </Box>

            {/* Name */}
            <TextField
              label="技能名称"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { fontSize: 13 },
                '& .MuiOutlinedInput-root': { fontSize: 13 },
              }}
            />

            {/* Description */}
            <TextField
              label="描述"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              multiline
              rows={2}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { fontSize: 13 },
                '& .MuiOutlinedInput-root': { fontSize: 13 },
              }}
            />

            {/* Category */}
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: 13 }}>分类</InputLabel>
              <Select
                value={category}
                label="分类"
                onChange={(e) => setCategory(e.target.value as SkillCategory)}
                sx={{ fontSize: 13 }}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tags */}
            <Box>
              <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', mb: 0.5, display: 'block' }}>
                标签
              </Typography>
              <Stack direction="row" spacing={1} mb={1}>
                <TextField
                  size="small"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="输入标签后按回车"
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': { fontSize: 13 },
                  }}
                />
                <Button size="small" onClick={handleAddTag} variant="outlined" sx={{ fontSize: 12 }}>
                  添加
                </Button>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => handleRemoveTag(tag)}
                    sx={{
                      height: 22,
                      fontSize: 11,
                      bgcolor: '#F1F5F9',
                      '& .MuiChip-deleteIcon': { fontSize: 14 },
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Example Prompts */}
            <Box>
              <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', mb: 0.5, display: 'block' }}>
                示例提示
              </Typography>
              <Stack direction="row" spacing={1} mb={1}>
                <TextField
                  size="small"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPrompt())}
                  placeholder="输入示例提示"
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': { fontSize: 13 },
                  }}
                />
                <Button size="small" onClick={handleAddPrompt} variant="outlined" sx={{ fontSize: 12 }}>
                  添加
                </Button>
              </Stack>
              <Stack spacing={0.5}>
                {examplePrompts.map((prompt) => (
                  <Box
                    key={prompt}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.5,
                      py: 0.75,
                      bgcolor: '#F8FAFC',
                      borderRadius: 1,
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: 12, color: '#475569' }}>
                      {prompt}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemovePrompt(prompt)}
                      sx={{ p: 0.25, color: '#94A3B8' }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>

      {/* Footer */}
      {!previewMode && (
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid #E5E7EB',
            bgcolor: '#F8FAFC',
          }}
        >
          <Stack direction="row" spacing={1.5}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleClose}
              sx={{
                height: 40,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                borderColor: '#E5E7EB',
                color: '#64748B',
              }}
            >
              取消
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleSubmit}
              sx={{
                height: 40,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: '#6366F1',
                '&:hover': { bgcolor: '#4F46E5' },
              }}
            >
              分享到商店
            </Button>
          </Stack>
        </Box>
      )}
    </Dialog>
  );
};

export default SkillUploadDialog;
