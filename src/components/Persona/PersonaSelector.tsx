import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  getAllPersonas,
  createPersona,
  deletePersona,
  getActivePersona,
  type Persona,
  type PersonaAppearance,
} from '../../services/persona';
import { useStore } from '../../store';
import { PersonaDetail } from './PersonaDetail';
import { getIntimacyLevel, getIntimacyColor } from '../../store';

interface PersonaSelectorProps {
  collapsed?: boolean;
}

const VOICE_LABELS: Record<string, string> = {
  warm: 'warm',
  rational: 'rational',
  humorous: 'humorous',
  serious: 'serious',
};

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({ collapsed }) => {
  const { t } = useTranslation?.() || { t: (k: string) => k };
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersona, setActive] = useState<Persona | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('😊');
  const [newBio, setNewBio] = useState('');
  const [newVoice, setNewVoice] = useState<'warm' | 'rational' | 'humorous' | 'serious'>('warm');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPersona, setDetailPersona] = useState<Persona | null>(null);
  const setActivePersonaId = useStore((s) => s.setActivePersonaId);
  const personaIntimacy = useStore((s) => s.personaIntimacy);
  const getUnreadMemosCount = useStore((s) => s.getUnreadMemosCount);

  useEffect(() => {
    setPersonas(getAllPersonas());
    setActive(getActivePersona());
  }, []);

  const handleSelect = (persona: Persona) => {
    setActivePersonaId(persona.id);
    setActive(persona);
    setAnchorEl(null);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const created = createPersona({
      name: newName.trim(),
      avatar: newAvatar,
      bio: newBio.trim(),
      voice: newVoice,
    });
    setPersonas(getAllPersonas());
    setActive(created);
    setActivePersonaId(created.id);
    setCreateOpen(false);
    setNewName('');
    setNewAvatar('😊');
    setNewBio('');
    setNewVoice('warm');
  };

  const handleDelete = (e: React.MouseEvent, persona: Persona) => {
    e.stopPropagation();
    if (deletePersona(persona.id)) {
      setPersonas(getAllPersonas());
      const next = getActivePersona();
      setActive(next);
      setActivePersonaId(next.id);
    }
  };

  const handleOpenDetail = (e: React.MouseEvent, persona: Persona) => {
    e.stopPropagation();
    setDetailPersona(persona);
    setDetailOpen(true);
    setAnchorEl(null);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailPersona(null);
  };

  const handleDetailUpdated = (updated: Persona) => {
    setPersonas(getAllPersonas());
    if (activePersona?.id === updated.id) {
      setActive(updated);
    }
  };

  const activeIntimacy = personaIntimacy[activePersona?.id || ''] || 0;
  const activeLevel = getIntimacyLevel(activeIntimacy);
  const activeColor = getIntimacyColor(activeIntimacy);

  if (collapsed) {
    return (
      <Tooltip
        title={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 120 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 14 }}>{activePersona?.avatar}</Typography>
              <Typography sx={{ fontSize: 12 }}>{activePersona?.name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 10, color: activeColor }}>{activeLevel}</Typography>
              <LinearProgress
                variant="determinate"
                value={activeIntimacy}
                sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)' }}
              />
              <Typography sx={{ fontSize: 10 }}>{activeIntimacy}</Typography>
            </Box>
          </Box>
        }
        placement="right"
      >
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="small"
          sx={{ mx: 'auto', my: 1 }}
        >
          <Box sx={{ position: 'relative' }}>
            <Typography
              sx={{
                fontSize: 18,
                lineHeight: 1,
                ...((personaIntimacy[activePersona?.id || ''] || 0) >= 61
                  ? {
                      filter: 'drop-shadow(0 0 6px #FFD700)',
                      borderRadius: '50%',
                      boxShadow: '0 0 8px 2px rgba(255, 215, 0, 0.6)',
                      p: 0.5,
                    }
                  : {}),
              }}
            >
              {activePersona?.avatar || '🧑'}
            </Typography>
            {activePersona?.appearance && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -2,
                  right: -4,
                  fontSize: 8,
                  lineHeight: 1,
                }}
              >
                {activePersona.appearance.expression}
              </Box>
            )}
          </Box>
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ px: 1, py: 1 }}>
      {/* Current persona button */}
      <Button
        fullWidth
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={
          <Box sx={{ position: 'relative', display: 'flex' }}>
            <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{activePersona?.avatar || '🧑'}</Typography>
            {activePersona?.appearance && (
              <Box sx={{ position: 'absolute', bottom: -3, right: -5, fontSize: 7, lineHeight: 1 }}>
                {activePersona.appearance.expression}
              </Box>
            )}
          </Box>
        }
        endIcon={<PersonIcon sx={{ fontSize: 14, opacity: 0.5 }} />}
        sx={{
          justifyContent: 'flex-start',
          textAlign: 'left',
          bgcolor: 'rgba(255,255,255,0.05)',
          borderRadius: 1.5,
          py: 0.75,
          px: 1.5,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
        }}
      >
        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
          {activePersona?.name || t('persona.selectPersona', '选择人格')}
        </Typography>
      </Button>
      <Box sx={{ px: 1.5, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: 9, color: activeColor }}>{activeLevel}</Typography>
          <LinearProgress
            variant="determinate"
            value={activeIntimacy}
            sx={{
              flex: 1,
              height: 3,
              borderRadius: 1.5,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: activeColor },
            }}
          />
          <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{activeIntimacy}</Typography>
        </Box>
      </Box>

      {/* Dropdown menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { minWidth: 220, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('persona.persona', '人格')}
          </Typography>
        </Box>
        {personas.map((p) => {
          const intimacy = personaIntimacy[p.id] || 0;
          const level = getIntimacyLevel(intimacy);
          const color = getIntimacyColor(intimacy);
          return (
            <MenuItem
              key={p.id}
              selected={p.id === activePersona?.id}
              onClick={() => handleSelect(p)}
              sx={{ gap: 1, py: 1 }}
            >
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Typography
                  sx={{
                    fontSize: 18,
                    lineHeight: 1,
                    ...((personaIntimacy[p.id] || 0) >= 61
                      ? {
                          filter: 'drop-shadow(0 0 6px #FFD700)',
                          borderRadius: '50%',
                          boxShadow: '0 0 8px 2px rgba(255, 215, 0, 0.6)',
                          p: 0.5,
                        }
                      : {}),
                  }}
                >
                  {p.avatar}
                </Typography>
                {p.appearance && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -4,
                      fontSize: 7,
                      lineHeight: 1,
                      bgcolor: 'background.paper',
                      borderRadius: '50%',
                      p: 0.25,
                    }}
                  >
                    {p.appearance.expression}
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: 13, fontWeight: p.id === activePersona?.id ? 600 : 400 }}>
                  {p.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <Typography variant="caption" sx={{ fontSize: 9, color }}>{level}</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={intimacy}
                    sx={{
                      flex: 1,
                      height: 2,
                      borderRadius: 1,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: color },
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>{intimacy}</Typography>
                </Box>
              </Box>
              {getUnreadMemosCount(p.id) > 0 && (
                <Box
                  sx={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: '9px',
                    bgcolor: 'primary.main',
                    color: 'white',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 0.5,
                  }}
                >
                  {getUnreadMemosCount(p.id)}
                </Box>
              )}
              {!p.isDefault && (
                <IconButton
                  size="small"
                  onClick={(e) => handleDelete(e, p)}
                  sx={{ p: 0.5 }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={(e) => handleOpenDetail(e, p)}
                sx={{ p: 0.5 }}
              >
                <SettingsIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem onClick={() => { setCreateOpen(true); setAnchorEl(null); }} sx={{ gap: 1 }}>
          <AddIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2" sx={{ fontSize: 13 }}>{t('persona.createNew', '创建新人格')}</Typography>
        </MenuItem>
      </Menu>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('persona.createTitle', '创建新人格')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label={t('persona.avatar', '头像')}
              value={newAvatar}
              onChange={(e) => setNewAvatar(e.target.value.slice(0, 2))}
              size="small"
              sx={{ width: 80 }}
              placeholder="😊"
            />
            <TextField
              label={t('persona.name', '名称')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              size="small"
              fullWidth
              autoFocus
            />
          </Box>
          <TextField
            label={t('persona.bio', '简介')}
            value={newBio}
            onChange={(e) => setNewBio(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
          />
          <Box>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary' }}>{t('persona.voice', '语气')}</Typography>
            <Select
              value={newVoice}
              onChange={(e) => setNewVoice(e.target.value as typeof newVoice)}
              size="small"
              fullWidth
            >
              <MenuItem value="warm">{t('persona.voice.warm', '温暖')}</MenuItem>
              <MenuItem value="rational">{t('persona.voice.rational', '理性')}</MenuItem>
              <MenuItem value="humorous">{t('persona.voice.humorous', '幽默')}</MenuItem>
              <MenuItem value="serious">{t('persona.voice.serious', '严肃')}</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel', '取消')}</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newName.trim()}>{t('common.add', '创建')}</Button>
        </DialogActions>
      </Dialog>

      {/* Persona Detail dialog */}
      {detailPersona && (
        <PersonaDetail
          open={detailOpen}
          onClose={handleDetailClose}
          persona={detailPersona}
          onPersonaUpdated={handleDetailUpdated}
        />
      )}
    </Box>
  );
};
