/**
 * V78: SkillCard Component
 * Reusable card for displaying marketplace skills.
 */

import React from 'react';
import { Box, Typography, Chip, Button, Stack, alpha } from '@mui/material';
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
  productivity: '#4caf50',
  creative: '#9c27b0',
  analysis: '#2196f3',
  lifestyle: '#ff9800',
  developer: '#00bcd4',
  entertainment: '#e91e63',
  custom: '#607d8b',
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
  variant = 'store',
  isInstalled = false,
  onInstall,
  onClick,
}) => {
  const categoryColor = CATEGORY_COLORS[skill.category] || '#607d8b';

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
        bgcolor: '#FFFFFF',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        border: '1px solid #E5E7EB',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.08)',
          borderColor: categoryColor,
        },
      }}
    >
      {/* Header with Icon */}
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
              fontWeight: 700,
              color: '#1E293B',
              lineHeight: 1.3,
              mb: 0.5,
            }}
          >
            {skill.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontSize: 11, color: '#64748B' }}
          >
            by {skill.author}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ px: 2, py: 1.5 }}>
        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            color: '#64748B',
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

        {/* Tags */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mb={1.5}>
          {skill.tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: alpha(categoryColor, 0.1),
                color: categoryColor,
                border: 'none',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}
        </Stack>

        {/* Rating & Install Count */}
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <Stack direction="row" spacing={0.3} alignItems="center">
            <StarIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>
              {skill.avgRating > 0 ? skill.avgRating.toFixed(1) : 'New'}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ fontSize: 10, color: '#94A3B8' }}>
            •
          </Typography>
          <Stack direction="row" spacing={0.3} alignItems="center">
            <DownloadIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
            <Typography variant="caption" sx={{ fontSize: 11, color: '#64748B' }}>
              {skill.installCount.toLocaleString()}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ fontSize: 10, color: '#94A3B8' }}>
            •
          </Typography>
          <Chip
            label={CATEGORY_LABELS[skill.category]}
            size="small"
            sx={{
              height: 16,
              fontSize: 9,
              bgcolor: alpha(categoryColor, 0.1),
              color: categoryColor,
              border: 'none',
              '& .MuiChip-label': { px: 0.5 },
            }}
          />
        </Stack>

        {/* Install Button */}
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
            borderRadius: 1.5,
            textTransform: 'none',
            ...(isInstalled
              ? {
                  borderColor: '#10B981',
                  color: '#10B981',
                  bgcolor: alpha('#10B981', 0.05),
                  '&:hover': {
                    bgcolor: alpha('#10B981', 0.1),
                    borderColor: '#10B981',
                  },
                }
              : {
                  bgcolor: '#6366F1',
                  color: '#FFFFFF',
                  '&:hover': {
                    bgcolor: '#4F46E5',
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
