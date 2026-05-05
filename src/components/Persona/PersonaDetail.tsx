/**
 * PersonaDetail.tsx — V25
 * Persona settings panel with stats, edit form, emoji avatar picker,
 * and live system prompt preview.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Switch,
  FormControlLabel,
  Snackbar,
  Slider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Timeline as TimelineIcon,
  Message as MessageIcon,
  Memory as MemoryIcon,
  BarChart as StatsIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Save as SaveIcon,
  Mail as MailIcon,
  CameraAlt as CameraAltIcon,
  Face as FaceIcon,
  VolumeUp as VolumeUpIcon,
} from '@mui/icons-material';
import { PersonaProfile } from './PersonaProfile';
import { encodeTemplate, copyToClipboard } from '../../services/template/templateShare';
import { getPersonaSystemPrompt, updatePersona, type Persona, type PersonaAppearance, AVATAR_PRESETS } from '../../services/persona';
import { useStore } from '../../store';
import { queryMemories } from '../../services/memory/memoryStorage';
import { getIntimacyLevel, getIntimacyColor } from '../../store';
import { exportPersonaData, downloadJSON } from '../../services/backup/personaBackup';

interface PersonaDetailProps {
  open: boolean;
  onClose: () => void;
  persona: Persona;
  onPersonaUpdated?: (persona: Persona) => void;
}

// Emoji categories for avatar picker
const EMOJI_CATEGORIES: Record<string, string[]> = {
  '表情': ['😊', '😄', '🥰', '😘', '🤗', '😇', '🤔', '😅', '😂', '🤣', '😍', '🥺', '😎', '🤩', '😋', '😜', '🙃', '😏', '🫠', '😌'],
  '人物': ['👤', '👥', '🧑', '👩', '👨', '🧒', '👴', '👵', '🧔', '👱', '🧑‍💻', '🧑‍🎓', '🧑‍🏫', '🧑‍⚕️', '🧑‍🍳', '🧑‍🔧', '🧑‍🎨', '🧑‍🚀', '🧑‍✈️', '🦸'],
  '动物': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆'],
  '自然': ['🌸', '🌺', '🌻', '🌹', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🍂', '🍃', '🌊', '⭐', '🌙', '☀️', '⚡', '🔥'],
  '物品': ['💎', '💰', '🎁', '🎀', '🎈', '🎨', '🎭', '🎪', '🎫', '🏆', '🥇', '🎯', '🎲', '🎮', '🎸', '🎺', '🎻', '📚', '📖', '✏️'],
  '食物': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭', '🍕', '🍔', '🍟', '🌭', '🍰', '🎂', '🍫', '🍬', '☕', '🧁'],
};

const VOICE_OPTIONS: Array<{ value: Persona['voice']; label: string }> = [
  { value: 'warm', label: '温暖' },
  { value: 'rational', label: '理性' },
  { value: 'humorous', label: '幽默' },
  { value: 'serious', label: '严肃' },
];

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

export const PersonaDetail: React.FC<PersonaDetailProps> = ({
  open,
  onClose,
  persona,
  onPersonaUpdated,
}) => {
  const [bio, setBio] = useState(persona.bio);
  const [voice, setVoice] = useState<Persona['voice']>(persona.voice);
  const [avatar, setAvatar] = useState(persona.avatar);
  const [appearance, setAppearance] = useState<PersonaAppearance>(persona.appearance);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exportSnackbar, setExportSnackbar] = useState<string>('');
  const [shareSnackbar, setShareSnackbar] = useState<string>('');
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const saveAsTemplate = useStore((s) => s.saveAsTemplate);

  // V36: Memo dialog state
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoTargetId, setMemoTargetId] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoSnackbar, setMemoSnackbar] = useState('');
  const sendMemo = useStore((s) => s.sendMemo);

  // Stats from store
  const messages = useStore((s) => s.messages);
  const personaUsageCount = useStore((s) => s.personaUsageCount);
  const personaFollowTheme = useStore((s) => s.personaFollowTheme);
  const setPersonaFollowTheme = useStore((s) => s.setPersonaFollowTheme);
  const setPersonaSystemPrompt = useStore((s) => s.personaSystemPrompt); // read-only, we need to update via setActivePersonaId
  const personaIntimacy = useStore((s) => s.personaIntimacy);

  // Reset form when persona changes
  useEffect(() => {
    setBio(persona.bio);
    setVoice(persona.voice);
    setAvatar(persona.avatar);
    setAppearance(persona.appearance);
  }, [persona]);

  // Memory count (async)
  const [memoryCount, setMemoryCount] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queryMemories({ personaId: persona.id, limit: 1 }).then((results) => {
      if (!cancelled) setMemoryCount(results.length);
    });
    return () => { cancelled = true; };
  }, [open, persona.id]);

  // Computed stats
  const personaMessages = messages.filter((m) => m.personaId === persona.id);
  const messageCount = personaMessages.length;
  const lastActiveTimestamp = personaMessages.length > 0
    ? Math.max(...personaMessages.map((m) => m.timestamp))
    : null;
  const usageCount = personaUsageCount[persona.id] || 0;

  // Preview prompt
  const previewPrompt = useMemo(
    () => getPersonaSystemPrompt({ ...persona, bio, voice, avatar } as Persona),
    [bio, voice, avatar, persona.id]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = updatePersona(persona.id, { bio, voice, avatar, appearance });
      if (updated && onPersonaUpdated) {
        onPersonaUpdated(updated);
      }
      // Update store personaSystemPrompt to reflect saved changes
      const { getActivePersona } = await import('../../services/persona/personaStorage');
      const { getPersonaSystemPrompt } = await import('../../services/persona/personaPrompt');
      const currentActiveId = useStore.getState().activePersonaId;
      if (currentActiveId === persona.id) {
        // Re-trigger setActivePersonaId to refresh the system prompt
        useStore.setState({
          personaSystemPrompt: getPersonaSystemPrompt(getActivePersona()),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportPersonaData(persona.id);
      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const filename = `pixelpal_${persona.name}_${dateStr}.json`;
      downloadJSON(data, filename);
      setExportSnackbar(`已导出: ${filename}`);
    } catch (err) {
      setExportSnackbar(`导出失败: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleShare = async () => {
    const code = encodeTemplate(persona);
    const success = await copyToClipboard(code);
    if (success) {
      setShareSnackbar('分享码已复制！');
    } else {
      setShareSnackbar('复制失败，请手动复制');
    }
  };

  const handleSaveAsTemplate = () => {
    saveAsTemplate(persona);
    setShareSnackbar('已保存到模板库！');
  };

  const handleClose = () => {
    // Reset to original values
    setBio(persona.bio);
    setVoice(persona.voice);
    setAvatar(persona.avatar);
    setAppearance(persona.appearance);
    onClose();
  };

  const isModified = bio !== persona.bio || voice !== persona.voice || avatar !== persona.avatar ||
    appearance.expression !== persona.appearance.expression ||
    appearance.accessory !== persona.appearance.accessory ||
    appearance.outfit !== persona.appearance.outfit;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          minHeight: 480,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Box sx={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
          {avatar.startsWith('data:image') || avatar.startsWith('http') ? (
            <img
              src={avatar}
              alt="avatar"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ fontSize: 32, lineHeight: 1 }}>{avatar}</Typography>
          )}
          <IconButton
            size="small"
            onClick={() => avatarInputRef.current?.click()}
            sx={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              bgcolor: 'primary.main',
              color: 'white',
              p: 0.25,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <CameraAltIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
        <Typography variant="h6" sx={{ flex: 1, fontSize: 16 }}>
          {persona.name}
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      {/* Hidden file input for avatar upload */}
      <input
        type="file"
        accept="image/*"
        ref={avatarInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setAvatar(base64);
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36 }}
        variant="fullWidth"
      >
        <Tab
          icon={<StatsIcon sx={{ fontSize: 14 }} />}
          iconPosition="start"
          label="统计"
          sx={{ minHeight: 36, fontSize: 12, gap: 0.5 }}
        />
        <Tab
          icon={<EditIcon sx={{ fontSize: 14 }} />}
          iconPosition="start"
          label="编辑"
          sx={{ minHeight: 36, fontSize: 12, gap: 0.5 }}
        />
        <Tab
          icon={<TimeIcon sx={{ fontSize: 14 }} />}
          iconPosition="start"
          label="预览"
          sx={{ minHeight: 36, fontSize: 12, gap: 0.5 }}
        />
        <Tab
          icon={<SettingsIcon sx={{ fontSize: 14 }} />}
          iconPosition="start"
          label="设置"
          sx={{ minHeight: 36, fontSize: 12, gap: 0.5 }}
        />
        <Tab
          icon={<VolumeUpIcon sx={{ fontSize: 14 }} />}
          iconPosition="start"
          label="声音"
          sx={{ minHeight: 36, fontSize: 12, gap: 0.5 }}
        />
        <Tab
          icon={<FaceIcon sx={{ fontSize: 14 }} />}
          iconPosition="start"
          label="外貌"
          sx={{ minHeight: 36, fontSize: 12, gap: 0.5 }}
        />
      </Tabs>

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {activeTab === 0 && (
          /* Stats tab */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <StatCard
                icon={<MessageIcon sx={{ fontSize: 16 }} />}
                label="消息数"
                value={String(messageCount)}
              />
              <StatCard
                icon={<MemoryIcon sx={{ fontSize: 16 }} />}
                label="记忆数"
                value={String(memoryCount)}
              />
              <StatCard
                icon={<TimeIcon sx={{ fontSize: 16 }} />}
                label="最后活跃"
                value={lastActiveTimestamp ? formatRelativeTime(lastActiveTimestamp) : '无记录'}
              />
              <StatCard
                icon={<StatsIcon sx={{ fontSize: 16 }} />}
                label="切换次数"
                value={String(usageCount)}
              />
            </Box>

            {/* Intimacy Progress */}
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  亲密度
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                  {(() => {
                    const intimacy = personaIntimacy[persona.id] || 0;
                    const level = getIntimacyLevel(intimacy);
                    const color = getIntimacyColor(intimacy);
                    return <span style={{ color }}>{level} ({intimacy})</span>;
                  })()}
                </Typography>
              </Box>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                    bgcolor: (() => {
                      const intimacy = personaIntimacy[persona.id] || 0;
                      return getIntimacyColor(intimacy);
                    })(),
                    width: `${Math.max(0, Math.min(100, personaIntimacy[persona.id] || 0))}%`,
                  }}
                />
              </Box>
            </Box>

            <Divider />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                人格 ID: {persona.id}
              </Typography>
              <br />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                类型: {persona.isDefault ? '预设人格' : '自定义人格'}
              </Typography>
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          /* Edit tab */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Avatar picker */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                头像
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 120, overflowY: 'auto' }}>
                {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) =>
                  emojis.map((emoji) => (
                    <Box
                      key={emoji}
                      component="button"
                      onClick={() => setAvatar(emoji)}
                      sx={{
                        border: avatar === emoji ? '2px solid' : '1px solid',
                        borderColor: avatar === emoji ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        bgcolor: avatar === emoji ? 'rgba(155,127,212,0.15)' : 'transparent',
                        cursor: 'pointer',
                        p: 0.5,
                        fontSize: 18,
                        lineHeight: 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {emoji}
                    </Box>
                  ))
                )}
              </Box>
            </Box>

            {/* Bio */}
            <TextField
              label="简介"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="描述这个人格的特点..."
            />

            {/* Voice */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                语气
              </Typography>
              <Select
                value={voice}
                onChange={(e) => setVoice(e.target.value as Persona['voice'])}
                size="small"
                fullWidth
              >
                {VOICE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Modified indicator */}
            {isModified && (
              <Chip
                label="已修改（未保存）"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {activeTab === 2 && (
          /* Preview tab */
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
              系统提示词预览
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                color: 'text.primary',
                minHeight: 80,
              }}
            >
              {previewPrompt}
            </Box>
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`语气: ${VOICE_OPTIONS.find((v) => v.value === voice)?.label}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`头像: ${avatar}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`简介: ${bio.slice(0, 20)}${bio.length > 20 ? '...' : ''}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        )}

        {activeTab === 3 && (
          /* Settings tab */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                主题设置
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={personaFollowTheme}
                    onChange={(e) => setPersonaFollowTheme(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label="跟随人格切换主题"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.04)',
                  borderRadius: 1.5,
                  border: '1px solid rgba(255,255,255,0.06)',
                  pr: 2,
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block', fontSize: 10 }}>
                开启后，切换人格将自动应用该人格的主题配色
              </Typography>
            </Box>
            {persona.theme && (
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                  当前主题色
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[
                    { label: '主色', color: persona.theme.primaryColor },
                    { label: '副色', color: persona.theme.secondaryColor },
                    { label: '强调', color: persona.theme.accentColor },
                    { label: '背景', color: persona.theme.backgroundColor },
                    { label: '文字', color: persona.theme.textColor },
                  ].map((swatch) => (
                    <Box
                      key={swatch.label}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          bgcolor: swatch.color,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{swatch.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Export Data */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                数据备份
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                onClick={handleExport}
                sx={{ fontSize: 11 }}
              >
                导出数据
              </Button>
              <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block', fontSize: 10 }}>
                导出该人格的聊天记录和记忆
              </Typography>
            </Box>

            {/* Share & Save Template */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                分享与模板
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ShareIcon sx={{ fontSize: 14 }} />}
                  onClick={handleShare}
                  sx={{ fontSize: 10 }}
                >
                  分享
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                  onClick={handleSaveAsTemplate}
                  sx={{ fontSize: 10 }}
                >
                  保存到模板库
                </Button>
              </Box>
            </Box>

            {/* Growth Diary */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                成长档案
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TimelineIcon sx={{ fontSize: 14 }} />}
                onClick={() => setProfileOpen(true)}
                sx={{ fontSize: 10 }}
              >
                查看成长档案
              </Button>
            </Box>

            {/* V36: Send Memo */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                便条
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<MailIcon sx={{ fontSize: 14 }} />}
                onClick={() => setMemoOpen(true)}
                sx={{ fontSize: 10 }}
              >
                写便条
              </Button>
            </Box>
          </Box>
        )}

        {activeTab === 4 && (
          /* Voice tab - V37 */
          <VoiceTab
            persona={persona}
            onSave={(voice) => {
              const updated = updatePersona(persona.id, { voice });
              if (updated && onPersonaUpdated) {
                onPersonaUpdated(updated);
              }
            }}
          />
        )}

        {activeTab === 5 && (
          /* Appearance tab - V38 */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Avatar presets */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                头像
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {AVATAR_PRESETS.map((emoji) => (
                  <Box
                    key={emoji}
                    component="button"
                    onClick={() => setAvatar(emoji)}
                    sx={{
                      border: avatar === emoji ? '2px solid' : '1px solid',
                      borderColor: avatar === emoji ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: avatar === emoji ? 'rgba(155,127,212,0.15)' : 'transparent',
                      cursor: 'pointer',
                      p: 0.5,
                      fontSize: 18,
                      lineHeight: 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {emoji}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Expression */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                表情
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {['😊', '😐', '😢', '🤔', '😠', '😄', '😎', '🤯', '😌'].map((e) => (
                  <IconButton
                    key={e}
                    onClick={() => setAppearance({ ...appearance, expression: e })}
                    size="small"
                    sx={{
                      border: appearance.expression === e ? '2px solid' : '1px solid gray',
                      borderColor: appearance.expression === e ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: appearance.expression === e ? 'rgba(155,127,212,0.15)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {e}
                  </IconButton>
                ))}
              </Box>
            </Box>

            {/* Accessory */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                配饰
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {['👓', '🎧', '🎀', '💎', '🤍', '👒', '🎩', '🧣'].map((a) => (
                  <IconButton
                    key={a}
                    onClick={() => setAppearance({ ...appearance, accessory: a })}
                    size="small"
                    sx={{
                      border: appearance.accessory === a ? '2px solid' : '1px solid gray',
                      borderColor: appearance.accessory === a ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: appearance.accessory === a ? 'rgba(155,127,212,0.15)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {a}
                  </IconButton>
                ))}
              </Box>
            </Box>

            {/* Outfit */}
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                服装
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {['👕', '👔', '🎽', '👗', '👟', '🩱', '🧥'].map((o) => (
                  <IconButton
                    key={o}
                    onClick={() => setAppearance({ ...appearance, outfit: o })}
                    size="small"
                    sx={{
                      border: appearance.outfit === o ? '2px solid' : '1px solid gray',
                      borderColor: appearance.outfit === o ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: appearance.outfit === o ? 'rgba(155,127,212,0.15)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {o}
                  </IconButton>
                ))}
              </Box>
            </Box>

            {/* Preview */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
              <Typography sx={{ fontSize: 32 }}>{avatar}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                  {appearance.expression} {appearance.accessory} {appearance.outfit}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                  表情:{appearance.expression} | 配饰:{appearance.accessory} | 服装:{appearance.outfit}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} size="small">
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          size="small"
          disabled={!isModified || saving}
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>

      <Snackbar
        open={!!exportSnackbar}
        autoHideDuration={3000}
        onClose={() => setExportSnackbar('')}
        message={exportSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={!!shareSnackbar}
        autoHideDuration={3000}
        onClose={() => setShareSnackbar('')}
        message={shareSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <PersonaProfile
        personaId={persona.id}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      {/* V36: Send Memo Dialog */}
      <Dialog
        open={memoOpen}
        onClose={() => {
          setMemoOpen(false);
          setMemoTargetId('');
          setMemoContent('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MailIcon sx={{ fontSize: 18 }} />
          写便条
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              发送给
            </Typography>
            <Select
              value={memoTargetId}
              onChange={(e) => setMemoTargetId(e.target.value)}
              size="small"
              fullWidth
              displayEmpty
            >
              <MenuItem value="" disabled>
                选择人格...
              </MenuItem>
              {(() => {
                const allP = getAllPersonas();
                return allP
                  .filter((p) => p.id !== persona.id)
                  .map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 16 }}>{p.avatar}</Typography>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {p.name}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ));
              })()}
            </Select>
          </Box>
          <TextField
            label="便条内容"
            value={memoContent}
            onChange={(e) => setMemoContent(e.target.value.slice(0, 100))}
            size="small"
            fullWidth
            multiline
            rows={3}
            placeholder="写下你想说的话..."
            helperText={`${memoContent.length}/100`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setMemoOpen(false);
              setMemoTargetId('');
              setMemoContent('');
            }}
            size="small"
          >
            取消
          </Button>
          <Button
            onClick={() => {
              if (!memoTargetId || !memoContent.trim()) return;
              sendMemo(memoTargetId, memoContent.trim());
              setMemoSnackbar('便条已发送！');
              setMemoOpen(false);
              setMemoTargetId('');
              setMemoContent('');
            }}
            variant="contained"
            size="small"
            disabled={!memoTargetId || !memoContent.trim()}
          >
            发送
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!memoSnackbar}
        autoHideDuration={3000}
        onClose={() => setMemoSnackbar('')}
        message={memoSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Dialog>
  );
};

// VoiceTab - V37: Voice personality differentiation settings
const VoiceTab: React.FC<{
  persona: Persona;
  onSave: (voice: Persona['voice']) => void;
}> = ({ persona, onSave }) => {
  const [rate, setRate] = useState(persona.voice.rate);
  const [pitch, setPitch] = useState(persona.voice.pitch);
  const [volume, setVolume] = useState(persona.voice.volume);
  const [voiceName, setVoiceName] = useState(persona.voice.voiceName || '');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [snackbar, setSnackbar] = useState('');

  const testVoice = useStore((s) => s.testVoice);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleTest = () => {
    testVoice({ rate, pitch, volume, voiceName: voiceName || undefined }, persona.name);
  };

  const handleSave = () => {
    onSave({ rate, pitch, volume, voiceName: voiceName || undefined });
    setSnackbar('声音设置已保存！');
  };

  const isModified =
    rate !== persona.voice.rate ||
    pitch !== persona.voice.pitch ||
    volume !== persona.voice.volume ||
    (voiceName || '') !== (persona.voice.voiceName || '');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Rate */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          语速: {rate.toFixed(1)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>慢</Typography>
          <Slider
            value={rate}
            min={0.5}
            max={2.0}
            step={0.1}
            onChange={(_, v) => setRate(v as number)}
            sx={{ flex: 1 }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>快</Typography>
        </Box>
      </Box>

      {/* Pitch */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          音调: {pitch.toFixed(1)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>低</Typography>
          <Slider
            value={pitch}
            min={0.5}
            max={2.0}
            step={0.1}
            onChange={(_, v) => setPitch(v as number)}
            sx={{ flex: 1 }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>高</Typography>
        </Box>
      </Box>

      {/* Volume */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          音量: {Math.round(volume * 100)}%
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>静音</Typography>
          <Slider
            value={volume}
            min={0}
            max={1}
            step={0.1}
            onChange={(_, v) => setVolume(v as number)}
            sx={{ flex: 1 }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>最大</Typography>
        </Box>
      </Box>

      {/* Voice selector */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          语音（可选）
        </Typography>
        <Select
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          size="small"
          fullWidth
          displayEmpty
        >
          <MenuItem value="">默认语音</MenuItem>
          {availableVoices.map((v) => (
            <MenuItem key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </MenuItem>
          ))}
        </Select>
        {availableVoices.length === 0 && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10, display: 'block', mt: 0.5 }}>
            加载中...
          </Typography>
        )}
      </Box>

      {/* Test button */}
      <Button
        variant="outlined"
        size="small"
        onClick={handleTest}
        startIcon={<VolumeUpIcon sx={{ fontSize: 14 }} />}
        sx={{ fontSize: 11 }}
      >
        测试声音
      </Button>

      {/* Save button */}
      <Button
        variant="contained"
        size="small"
        onClick={handleSave}
        disabled={!isModified}
        startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
        sx={{ fontSize: 11 }}
      >
        保存
      </Button>

      {isModified && (
        <Chip
          label="已修改（未保存）"
          size="small"
          color="warning"
          variant="outlined"
        />
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

// Stat card sub-component
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      p: 1.5,
      borderRadius: 1.5,
      bgcolor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <Box sx={{ color: 'primary.main', opacity: 0.7 }}>{icon}</Box>
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
        {value}
      </Typography>
    </Box>
  </Box>
);
