/**
 * ChainListItem — displays a single chain in the chain list (V79)
 */

import React, { useState } from 'react';
import { MyAlpha } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MySwitch as Switch, MyIconButton as IconButton, MyChip as Chip, MyStack as Stack, MyTooltip as Tooltip } from '../MUI替代';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import type { ChainDefinition } from '../../services/skills/types';

interface ChainListItemProps {
  chain: ChainDefinition;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (chain: ChainDefinition) => void;
  onDelete: (id: string) => void;
  onRun?: (chain: ChainDefinition) => void;
}

export const ChainListItem: React.FC<ChainListItemProps> = ({
  chain,
  onToggle,
  onEdit,
  onDelete,
  onRun,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'rgba(94,106,210,0.4)' },
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Chain icon */}
        <Typography variant="h6" sx={{ fontSize: 18, flexShrink: 0 }}>
          ⛓️
        </Typography>

        {/* Name + meta */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
            {chain.name}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" mt={0.3}>
            <Chip
              label={`${chain.steps.length} steps`}
              size="small"
              sx={{
                height: 16,
                fontSize: 9,
                bgcolor: alpha('#9c27b0', 0.2),
                color: '#9c27b0',
                border: 'none',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
              {chain.description.slice(0, 40)}
              {chain.description.length > 40 ? '…' : ''}
            </Typography>
          </Stack>
        </Box>

        {/* Run button */}
        {onRun && (
          <Tooltip title="Run chain">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRun(chain);
              }}
              sx={{
                color: '#9c27b0',
                '&:hover': { bgcolor: alpha('#9c27b0', 0.15) },
              }}
            >
              <PlayIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Edit button */}
        <Tooltip title="Edit chain">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(chain);
            }}
            sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Delete button */}
        <Tooltip title="Delete chain">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(chain.id);
            }}
            sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(244,67,54,0.1)' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Switch */}
        <Switch
          size="small"
          checked={chain.enabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle(chain.id, e.target.checked)}
        />

        {/* Expand icon */}
        {expanded ? (
          <CollapseIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
        ) : (
          <ExpandIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
        )}
      </Box>

      {/* Expanded content */}
      {expanded && (
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Trigger keywords */}
          {chain.triggerKeywords.length > 0 && (
            <Box mb={1}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  color: 'text.disabled',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Trigger Keywords
              </Typography>
              <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                {chain.triggerKeywords.map((kw) => (
                  <Chip
                    key={kw}
                    label={kw}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: 'rgba(94,106,210,0.15)',
                      color: 'rgba(94,106,210,0.9)',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Steps preview */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                color: 'text.disabled',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Steps
            </Typography>
            <Stack spacing={0.5} mt={0.5}>
              {chain.steps.map((step, idx) => (
                <Box
                  key={step.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', width: 16 }}>
                    {idx + 1}.
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', flex: 1 }}>
                    {step.skillId}
                  </Typography>
                  <Chip
                    label={step.condition === 'always' ? 'always' : step.condition.slice(0, 15)}
                    size="small"
                    sx={{
                      height: 14,
                      fontSize: 8,
                      bgcolor: step.condition === 'always' ? 'rgba(76,175,80,0.2)' : 'rgba(255,152,0,0.2)',
                      color: step.condition === 'always' ? '#4caf50' : '#ff9800',
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
};
