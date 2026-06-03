/**
 * V78: SkillCard Component
 * macOS-style marketplace skill card.
 */

import React from 'react';
import { MyAlpha, MyTypography as Typography, MyChip as Chip, MyButton as Button, MyStack as Stack } from '../MUI替代';
import { Box } from '../ui/Box';
import { Star as StarIcon, Download as DownloadIcon, Check as CheckIcon } from '@mui/icons-material';
import type { MarketplaceSkill } from '../../data/sampleMarketplaceSkills';
import type { SkillCategory } from '../../services/skills/types';

interface SkillCardProps {
  skill: MarketplaceSkill;
  variant?: 'store' | 'installed';
  isInstalled?: boolean;
  onInstall?: (skill: MarketplaceSkill) => void;
  onClick?: (skill: MarketplaceSkill) => void;
}

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  productivity: '#34C759',
  creative: '#AF52DE',
  analysis: '#007AFF',
  lifestyle: '#FF9500',
  developer: '#5AC8FA',
  entertainment: '#FF2D55',
  custom: '#8E8E93',
};

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  productivity: '效率工具',
  creative: '创意',
  analysis: '分析',
  lifestyle: '生活',
  developer: '开发者',
  entertainment: '娱乐',
  custom: '自定义',
};

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  isInstalled = false,
  onInstall,
  onClick,
}) => {
  const alpha = MyAlpha;
  const categoryColor = CATEGORY_COLORS[skill.category] || '#8E8E93';

  const handleInstall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInstalled && onInstall) {
      onInstall(skill);
    }
  };

  return (
    <Box
      onClick={() => onClick?.(skill)}
      sx={{
        bgcolor: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg, 10px)',
        overflow: 'hidden',
        border: '1px solid var(--separator)',
        cursor: 'pointer',
        transition: 'background var(--duration-short, 150ms) var(--ease-macOS, ease), border-color var(--duration-short, 150ms) var(--ease-macOS)',
        '&:hover': {
          bgcolor: 'var(--bg-hover)',
          borderColor: categoryColor,
        },
      }}
    >
      <Box
        sx={{
          bgcolor: alpha(categoryColor, 0.08),
          px: 2,
          py: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
        }}
      >
        <Typography variant="h4" sx={{ fontSize: 32, lineHeight: 1 }}>
          {skill.icon}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              mb: 0.5,
            }}
          >
            {skill.name}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            by {skill.author}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            mb: 1.5,
            height: 36,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {skill.description}
        </Typography>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mb={1.5}>
          {skill.tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: alpha(categoryColor, 0.12),
                color: categoryColor,
                border: 'none',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <Stack direction="row" spacing={0.3} alignItems="center">
            <StarIcon sx={{ fontSize: 14, color: '#FF9500' }} />
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
              {skill.avgRating > 0 ? skill.avgRating.toFixed(1) : 'New'}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            •
          </Typography>
          <Stack direction="row" spacing={0.3} alignItems="center">
            <DownloadIcon sx={{ fontSize: 12, color: 'var(--text-tertiary)' }} />
            <Typography variant="caption" sx={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {skill.installCount.toLocaleString()}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            •
          </Typography>
          <Chip
            label={CATEGORY_LABELS[skill.category]}
            size="small"
            sx={{
              height: 16,
              fontSize: 9,
              bgcolor: alpha(categoryColor, 0.12),
              color: categoryColor,
              border: 'none',
              '& .MuiChip-label': { px: 0.5 },
            }}
          />
        </Stack>

        <Button
          fullWidth
          variant={isInstalled ? 'outlined' : 'contained'}
          size="small"
          startIcon={isInstalled ? <CheckIcon /> : <DownloadIcon />}
          onClick={handleInstall}
          disabled={isInstalled}
          sx={{
            height: 32,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 'var(--control-radius, 6px)',
            textTransform: 'none',
            ...(isInstalled
              ? {
                  borderColor: 'var(--system-green)',
                  color: 'var(--system-green)',
                  bgcolor: alpha('#34C759', 0.08),
                  '&:hover': {
                    bgcolor: alpha('#34C759', 0.12),
                    borderColor: 'var(--system-green)',
                  },
                }
              : {
                  bgcolor: 'var(--system-blue)',
                  color: '#ffffff',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: 'color-mix(in srgb, var(--system-blue) 88%, black)',
                    boxShadow: 'none',
                  },
                }),
          }}
        >
          {isInstalled ? '已安装' : '安装'}
        </Button>
      </Box>
    </Box>
  );
};

export default SkillCard;
