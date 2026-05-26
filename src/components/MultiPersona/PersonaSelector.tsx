/**
 * Persona Selector Component V21
 * 
 * UI for selecting and managing personas with visual role indicators
 * and team collaboration features.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MyMenu as Menu, MyListItemIcon as ListItemIcon, MyBadge , MyMenuItem as MenuItem, MySwitch as Switch , MyAvatar as Avatar } from '../MUI替代';
import { MyBox as Box, MyPaper as Paper, MyTypography as Typography, MyButton, MyIconButton as IconButton, MyChip as Chip, MySelect as Select, MyListItemText as ListItemText, MyDivider as Divider, MyTooltip as Tooltip } from '../MUI替代';
import {
  Person as PersonIcon,
  Star as StarIcon,
  Psychology as SpecialistIcon,
  Analytics as AnalystIcon,
  Balance as MediatorIcon,
  Visibility as ObserverIcon,
  Group as GroupIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Close as CloseIcon,
  SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import { getAvailablePersonasForTeam, addPersonaToTeam, removePersonaFromTeam } from '../../services/companion/multiPersonaService';
import { getPersona, type PersonaId } from '../../services/companion/personalityTypes';

interface PersonaSelectorProps {
  compact?: boolean;
}

const personaRoleIcons: Record<string, React.ReactNode> = {
  primary: <StarIcon sx={{ fontSize: 14, color: 'gold' }} />,
  specialist: <SpecialistIcon sx={{ fontSize: 14, color: '#FF9800' }} />,
  analyst: <AnalystIcon sx={{ fontSize: 14, color: '#2196F3' }} />,
  mediator: <MediatorIcon sx={{ fontSize: 14, color: '#E91E63' }} />,
  observer: <ObserverIcon sx={{ fontSize: 14, opacity: 0.6 }} />,
};

const personaRoleLabels: Record<string, string> = {
  primary: 'Team Lead',
  specialist: 'Specialist',
  analyst: 'Analyst',
  mediator: 'Mediator',
  observer: 'Observer',
};

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({ compact = false }) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addAnchorEl, setAddAnchorEl] = useState<null | HTMLElement>(null);

  const companion = useStore((s) => s.companion);
  const setPersona = useStore((s) => s.setPersona);

  const currentPersona = getPersona(companion.personaId);
  const availablePersonas = getAvailablePersonasForTeam();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAddOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAddAnchorEl(event.currentTarget);
  };

  const handleAddClose = () => {
    setAddAnchorEl(null);
  };

  const handleSelectPersona = (personaId: PersonaId) => {
    setPersona(personaId);
    handleClose();
  };

  const handleAddPersona = (personaId: PersonaId) => {
    addPersonaToTeam(personaId);
    handleAddClose();
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={currentPersona.description || currentPersona.name}>
          <IconButton
            size="small"
            onClick={handleOpen}
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: currentPersona.color,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {currentPersona.name[0]}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: { minWidth: 200, bgcolor: 'rgba(30, 20, 55, 0.98)' },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('persona.selectPersona')}
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          {availablePersonas.map((p) => (
            <MenuItem
              key={p.id}
              onClick={() => handleSelectPersona(p.id)}
              selected={p.id === companion.personaId}
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                <Avatar sx={{ width: 24, height: 24, bgcolor: p.color, fontSize: 11 }}>
                  {p.name[0]}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={p.name}
                secondary={p.description}
                primaryTypographyProps={{ fontSize: 13 }}
                secondaryTypographyProps={{ fontSize: 11 }}
              />
              {p.id === companion.personaId && (
                <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, bgcolor: 'rgba(30, 20, 55, 0.95)', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 600 }}>
            {t('persona.title') || 'AI Persona'}
          </Typography>
        </Box>
        <Tooltip title={t('persona.teamView')}>
          <IconButton size="small" onClick={handleOpen}>
            <GroupIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Current Persona Display */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.5,
          bgcolor: 'rgba(0,0,0,0.2)',
          borderRadius: 2,
          mb: 1.5,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' },
        }}
        onClick={handleOpen}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: currentPersona.color,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {currentPersona.name[0]}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {currentPersona.name}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {currentPersona.description}
          </Typography>
        </Box>
        <IconButton size="small">
          <SwapIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Personality Traits */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
          {t('persona.traits') || 'Personality Traits'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {currentPersona.traits.slice(0, 4).map((trait) => (
            <Chip
              key={trait.id}
              label={`${trait.id}: ${Math.round(trait.value * 100)}%`}
              size="small"
              sx={{
                height: 20,
                fontSize: 9,
                bgcolor: 'rgba(155, 127, 212, 0.2)',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Quick Switch */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {availablePersonas.slice(0, 3).map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            size="small"
            avatar={
              <Avatar sx={{ bgcolor: p.color, fontSize: 10, width: 18, height: 18 }}>
                {p.name[0]}
              </Avatar>
            }
            onClick={() => handleSelectPersona(p.id)}
            variant={p.id === companion.personaId ? 'filled' : 'outlined'}
            sx={{
              height: 24,
              fontSize: 11,
              borderColor: p.id === companion.personaId ? p.color : 'rgba(255,255,255,0.2)',
              bgcolor: p.id === companion.personaId ? `${p.color}22` : 'transparent',
            }}
          />
        ))}
        {availablePersonas.length > 3 && (
          <Chip
            label={`+${availablePersonas.length - 3}`}
            size="small"
            onClick={handleOpen}
            sx={{ height: 24, fontSize: 10 }}
          />
        )}
      </Box>

      {/* Persona Selection Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 280, bgcolor: 'rgba(30, 20, 55, 0.98)' },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('persona.allPersonas') || 'All Personas'}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        {availablePersonas.map((p) => (
          <MenuItem
            key={p.id}
            onClick={() => handleSelectPersona(p.id)}
            selected={p.id === companion.personaId}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <Avatar sx={{ width: 32, height: 32, bgcolor: p.color, fontSize: 13 }}>
                {p.name[0]}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 14 }}>{p.name}</Typography>
                  {p.id === companion.personaId && (
                    <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  )}
                </Box>
              }
              secondary={p.description}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
          </MenuItem>
        ))}
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <MenuItem onClick={handleAddOpen} sx={{ py: 1 }}>
          <ListItemIcon>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.active', fontSize: 13 }}>
              <AddIcon />
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={t('persona.addToTeam') || 'Add to Team'}
            secondary={t('persona.addToTeamHint') || 'Build a multi-persona team'}
            secondaryTypographyProps={{ fontSize: 11 }}
          />
        </MenuItem>
      </Menu>

      {/* Add Persona Submenu */}
      <Menu
        anchorEl={addAnchorEl}
        open={Boolean(addAnchorEl)}
        onClose={handleAddClose}
        PaperProps={{
          sx: { minWidth: 240, bgcolor: 'rgba(30, 20, 55, 0.98)' },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('persona.selectToAdd') || 'Select Persona to Add'}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        {availablePersonas
          .filter((p) => p.id !== companion.personaId)
          .map((p) => (
            <MenuItem key={p.id} onClick={() => handleAddPersona(p.id)} sx={{ py: 1 }}>
              <ListItemIcon>
                <Avatar sx={{ width: 28, height: 28, bgcolor: p.color, fontSize: 11 }}>
                  {p.name[0]}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={p.name}
                primaryTypographyProps={{ fontSize: 13 }}
              />
              <AddIcon sx={{ fontSize: 18, color: 'action.active' }} />
            </MenuItem>
          ))}
      </Menu>
    </Paper>
  );
};

export default PersonaSelector;
