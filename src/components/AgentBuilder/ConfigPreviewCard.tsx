/**
 * Config Preview Card Component - V99
 * 
 * Displays the generated Agent configuration in a card format.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Collapse,
  IconButton,
  Chip,
  Stack,
  Divider,
  Button,
  TextField,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { GeneratedAgent } from '../../types/agentBuilder';
import { ROLE_ICONS, TEMPLATE_ICONS } from '../../types/agentBuilder';

interface ConfigPreviewCardProps {
  agent: GeneratedAgent;
  onUpdate?: (agent: GeneratedAgent) => void;
  readOnly?: boolean;
}

const EXPERTISE_COLORS = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  expert: '#ef4444',
};

const TONE_COLORS = {
  formal: '#6366f1',
  casual: '#8b5cf6',
  friendly: '#ec4899',
};

export const ConfigPreviewCard: React.FC<ConfigPreviewCardProps> = ({
  agent,
  onUpdate,
  readOnly = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState(agent);

  const handleToggleEdit = () => {
    if (isEditing) {
      // Save changes
      onUpdate?.(editedAgent);
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setEditedAgent(agent);
    setIsEditing(false);
  };

  const updateField = <K extends keyof GeneratedAgent>(
    field: K,
    value: GeneratedAgent[K]
  ) => {
    setEditedAgent({ ...editedAgent, [field]: value });
  };

  return (
    <Paper
      sx={{
        bgcolor: 'rgba(20, 22, 30, 0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
        }}
        onClick={() => !isEditing && setExpanded(!expanded)}
      >
        {/* Agent Icon */}
        <Typography variant="h4" sx={{ fontSize: 32 }}>
          {agent.icon || ROLE_ICONS[agent.role]}
        </Typography>

        {/* Agent Info */}
        <Box sx={{ flex: 1 }}>
          {isEditing ? (
            <TextField
              value={editedAgent.name}
              onChange={(e) => updateField('name', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{ mb: 0.5 }}
            />
          ) : (
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
              {agent.name}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            {agent.description}
          </Typography>
        </Box>

        {/* Meta chips */}
        <Stack direction="row" spacing={0.5}>
          <Chip
            label={agent.role}
            size="small"
            sx={{
              bgcolor: `${ROLE_ICONS[agent.role]}20`,
              color: ROLE_ICONS[agent.role],
            }}
          />
          <Chip
            label={TEMPLATE_ICONS[agent.workflowTemplate]}
            size="small"
            variant="outlined"
          />
        </Stack>

        {/* Expand/Edit toggle */}
        {!readOnly && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                handleCancelEdit();
              } else if (expanded) {
                setExpanded(false);
              } else {
                setExpanded(true);
              }
            }}
          >
            {isEditing ? <CloseIcon fontSize="small" /> : expanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
          </IconButton>
        )}
        {!readOnly && onUpdate && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleEdit();
            }}
          >
            {isEditing ? <CheckIcon fontSize="small" color="primary" /> : <EditIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      {/* Quick stats */}
      <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: TONE_COLORS[agent.personality.tone],
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {agent.personality.tone}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: EXPERTISE_COLORS[agent.personality.expertise],
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {agent.personality.expertise}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Creativity: {Math.round(agent.personality.creativity * 100)}%
        </Typography>
      </Box>

      <Divider sx={{ opacity: 0.1 }} />

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Capabilities */}
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Capabilities
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 2 }}>
            {agent.capabilities.map((cap, idx) => (
              <Chip
                key={idx}
                label={cap}
                size="small"
                sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: 'rgba(59, 130, 246, 0.9)' }}
              />
            ))}
          </Box>

          {/* Required Tools */}
          {agent.requiredTools.length > 0 && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Required Tools
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 2 }}>
                {agent.requiredTools.map((tool, idx) => (
                  <Chip
                    key={idx}
                    label={tool}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: 'rgba(139, 92, 246, 0.5)', color: 'rgba(139, 92, 246, 0.9)' }}
                  />
                ))}
              </Box>
            </>
          )}

          {/* Constraints */}
          {agent.constraints.length > 0 && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Constraints
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 2 }}>
                {agent.constraints.map((constraint, idx) => (
                  <Chip
                    key={idx}
                    label={constraint}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}

          {/* Skills */}
          {agent.skills.length > 0 && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Skills
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 2 }}>
                {agent.skills.map((skillId, idx) => (
                  <Chip
                    key={idx}
                    label={skillId}
                    size="small"
                    sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: 'rgba(16, 185, 129, 0.9)' }}
                  />
                ))}
              </Box>
            </>
          )}

          {/* Config Details */}
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Technical Config
          </Typography>
          <Paper sx={{ mt: 0.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.2)' }}>
            <Stack spacing={0.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Max Retries</Typography>
                <Typography variant="caption">{agent.config.maxRetries}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Timeout</Typography>
                <Typography variant="caption">{agent.config.timeout / 1000}s</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Temperature</Typography>
                <Typography variant="caption">{agent.config.temperature.toFixed(2)}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ConfigPreviewCard;
