/**
 * Intent Parsing Panel Component - V99
 * 
 * Displays streaming parsing progress and editable results.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Slider,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Check as CheckIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { parseIntent } from '../../services/agentBuilder/intentParser';
import type { ParsedAgentConfig, ParsingProgress, AgentRole, ToneStyle, ExpertiseLevel } from '../../types/agentBuilder';

interface IntentParsingPanelProps {
  userInput: string;
  onConfirm: (config: ParsedAgentConfig) => void;
  onCancel: () => void;
}

const ROLE_LABELS: Record<AgentRole, string> = {
  planner: '📋 Planner',
  executor: '⚡ Executor',
  critic: '🔍 Critic',
  creative: '💡 Creative',
  general: '🤖 General',
};

const TONE_LABELS: Record<ToneStyle, string> = {
  formal: 'Formal',
  casual: 'Casual',
  friendly: 'Friendly',
};

const EXPERTISE_LABELS: Record<ExpertiseLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
};

export const IntentParsingPanel: React.FC<IntentParsingPanelProps> = ({
  userInput,
  onConfirm,
  onCancel,
}) => {
  const [progress, setProgress] = useState<ParsingProgress | null>(null);
  const [parsedConfig, setParsedConfig] = useState<ParsedAgentConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<ParsedAgentConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userInput.trim()) return;

    const parse = async () => {
      setError(null);
      try {
        const result = await parseIntent(userInput, setProgress);
        setParsedConfig(result);
        setEditedConfig(result);
      } catch (err) {
        setError('Failed to parse intent. Please try again.');
        console.error(err);
      }
    };

    void parse();
  }, [userInput]);

  const handleConfirm = () => {
    if (editedConfig) {
      onConfirm(editedConfig);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleRefresh = () => {
    setIsEditing(false);
    setEditedConfig(parsedConfig);
  };

  const updateField = <K extends keyof ParsedAgentConfig>(
    field: K,
    value: ParsedAgentConfig[K]
  ) => {
    if (editedConfig) {
      setEditedConfig({ ...editedConfig, [field]: value });
    }
  };

  const updatePersonality = <K extends keyof ParsedAgentConfig['personality']>(
    field: K,
    value: ParsedAgentConfig['personality'][K]
  ) => {
    if (editedConfig) {
      setEditedConfig({
        ...editedConfig,
        personality: { ...editedConfig.personality, [field]: value },
      });
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={onCancel} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Parsing Progress */}
      {progress && progress.progress < 100 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {progress.message}
            </Typography>
          </Box>
          <Slider
            value={progress.progress}
            max={100}
            disabled
            sx={{ width: 200 }}
          />
        </Box>
      )}

      {/* Parsing Complete */}
      {editedConfig && (
        <Stack spacing={3}>
          {/* Basic Info */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Basic Information
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Agent Name"
                value={editedConfig.name}
                onChange={(e) => updateField('name', e.target.value)}
                disabled={!isEditing}
                size="small"
                fullWidth
              />
              
              <TextField
                label="Description"
                value={editedConfig.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={!isEditing}
                size="small"
                multiline
                rows={2}
                fullWidth
              />
              
              <FormControl size="small" fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editedConfig.role}
                  label="Role"
                  onChange={(e) => updateField('role', e.target.value as AgentRole)}
                  disabled={!isEditing}
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          {/* Capabilities */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Capabilities
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {editedConfig.capabilities.map((cap, idx) => (
                <Chip
                  key={idx}
                  label={cap}
                  size="small"
                  onDelete={isEditing ? () => {
                    const newCaps = [...editedConfig.capabilities];
                    newCaps.splice(idx, 1);
                    updateField('capabilities', newCaps);
                  } : undefined}
                />
              ))}
            </Box>
            {isEditing && (
              <TextField
                placeholder="Add capability..."
                size="small"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    updateField('capabilities', [...editedConfig.capabilities, e.currentTarget.value.trim()]);
                    e.currentTarget.value = '';
                  }
                }}
              />
            )}
          </Paper>

          {/* Required Tools */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Required Tools
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {editedConfig.requiredTools.map((tool, idx) => (
                <Chip
                  key={idx}
                  label={tool}
                  size="small"
                  variant="outlined"
                  onDelete={isEditing ? () => {
                    const newTools = [...editedConfig.requiredTools];
                    newTools.splice(idx, 1);
                    updateField('requiredTools', newTools);
                  } : undefined}
                />
              ))}
            </Box>
            {isEditing && (
              <TextField
                placeholder="Add tool..."
                size="small"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    updateField('requiredTools', [...editedConfig.requiredTools, e.currentTarget.value.trim()]);
                    e.currentTarget.value = '';
                  }
                }}
              />
            )}
          </Paper>

          {/* Personality */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Personality
            </Typography>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Tone</InputLabel>
                <Select
                  value={editedConfig.personality.tone}
                  label="Tone"
                  onChange={(e) => updatePersonality('tone', e.target.value as ToneStyle)}
                  disabled={!isEditing}
                >
                  {Object.entries(TONE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Expertise</InputLabel>
                <Select
                  value={editedConfig.personality.expertise}
                  label="Expertise"
                  onChange={(e) => updatePersonality('expertise', e.target.value as ExpertiseLevel)}
                  disabled={!isEditing}
                >
                  {Object.entries(EXPERTISE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Typography variant="caption" gutterBottom>
                  Creativity: {Math.round(editedConfig.personality.creativity * 100)}%
                </Typography>
                <Slider
                  value={editedConfig.personality.creativity}
                  onChange={(_, value) => updatePersonality('creativity', value as number)}
                  disabled={!isEditing}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </Box>
            </Stack>
          </Paper>

          {/* Constraints */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Constraints
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {editedConfig.constraints.map((constraint, idx) => (
                <Chip
                  key={idx}
                  label={constraint}
                  size="small"
                  color="warning"
                  onDelete={isEditing ? () => {
                    const newConstraints = [...editedConfig.constraints];
                    newConstraints.splice(idx, 1);
                    updateField('constraints', newConstraints);
                  } : undefined}
                />
              ))}
            </Box>
            {isEditing && (
              <TextField
                placeholder="Add constraint..."
                size="small"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    updateField('constraints', [...editedConfig.constraints, e.currentTarget.value.trim()]);
                    e.currentTarget.value = '';
                  }
                }}
              />
            )}
          </Paper>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {!isEditing ? (
              <>
                <Button onClick={onCancel}>Cancel</Button>
                <Button startIcon={<EditIcon />} onClick={handleEdit} variant="outlined">
                  Edit
                </Button>
                <Button startIcon={<CheckIcon />} onClick={handleConfirm} variant="contained">
                  Confirm
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleRefresh}>Reset</Button>
                <Button startIcon={<CheckIcon />} onClick={() => setIsEditing(false)} variant="contained">
                  Done Editing
                </Button>
              </>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default IntentParsingPanel;
