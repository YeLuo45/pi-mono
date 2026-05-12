/**
 * V78: SkillDetailDialog Component
 * Full skill details with reviews in a modal dialog.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  Divider,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Star as StarIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import type { MarketplaceSkill, SkillRating } from '../../data/sampleMarketplaceSkills';
import type { SkillCategory } from '../../services/skills/types';
import { getSkillRatings } from '../../services/marketplace/marketplaceService';

interface SkillDetailDialogProps {
  open: boolean;
  onClose: () => void;
  skill: MarketplaceSkill | null;
  isInstalled?: boolean;
  onInstall?: (skill: MarketplaceSkill) => void;
  onReview?: (skill: MarketplaceSkill) => void;
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

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => {
  return (
    <Stack direction="row" spacing={0.25}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          sx={{
            fontSize: size,
            color: star <= rating ? '#F59E0B' : '#E5E7EB',
          }}
        />
      ))}
    </Stack>
  );
};

export const SkillDetailDialog: React.FC<SkillDetailDialogProps> = ({
  open,
  onClose,
  skill,
  isInstalled = false,
  onInstall,
  onReview,
}) => {
  const [ratings, setRatings] = useState<SkillRating[]>([]);

  useEffect(() => {
    if (skill && open) {
      setRatings(getSkillRatings(skill.id));
    }
  }, [skill, open]);

  if (!skill) return null;

  const categoryColor = CATEGORY_COLORS[skill.category] || '#607d8b';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#FFFFFF',
          borderRadius: 3,
          maxHeight: '85vh',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: alpha(categoryColor, 0.08),
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          position: 'relative',
        }}
      >
        <Typography variant="h3" sx={{ fontSize: 48, lineHeight: 1 }}>
          {skill.icon}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
            {skill.name}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, color: '#64748B', mb: 1 }}>
            by {skill.author} • v{skill.version}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <StarRating rating={Math.round(skill.avgRating)} />
            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>
              {skill.avgRating > 0 ? skill.avgRating.toFixed(1) : 'New'}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: '#94A3B8' }}>
              ({ratings.length} reviews)
            </Typography>
          </Stack>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: '#64748B',
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Actions */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant={isInstalled ? 'outlined' : 'contained'}
              startIcon={isInstalled ? <CheckIcon /> : <DownloadIcon />}
              disabled={isInstalled}
              onClick={() => onInstall?.(skill)}
              sx={{
                flex: 1,
                height: 40,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                ...(isInstalled
                  ? {
                      borderColor: '#10B981',
                      color: '#10B981',
                      bgcolor: alpha('#10B981', 0.05),
                    }
                  : {
                      bgcolor: '#6366F1',
                      '&:hover': { bgcolor: '#4F46E5' },
                    }),
              }}
            >
              {isInstalled ? '已安装' : '安装技能'}
            </Button>
            {!isInstalled && (
              <Button
                variant="outlined"
                startIcon={<StarIcon />}
                onClick={() => onReview?.(skill)}
                sx={{
                  height: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: '#E5E7EB',
                  color: '#64748B',
                  '&:hover': {
                    borderColor: '#CBD5E1',
                    bgcolor: '#F8FAFC',
                  },
                }}
              >
                评分
              </Button>
            )}
          </Stack>
        </Box>

        {/* Stats */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9', bgcolor: '#F8FAFC' }}>
          <Stack direction="row" spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                {skill.installCount.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: '#64748B' }}>
                安装次数
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                {ratings.length}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: '#64748B' }}>
                用户评分
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                label={CATEGORY_LABELS[skill.category]}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: alpha(categoryColor, 0.1),
                  color: categoryColor,
                }}
              />
            </Box>
          </Stack>
        </Box>

        {/* Description */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
          <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            描述
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            {skill.description}
          </Typography>
        </Box>

        {/* Example Prompts */}
        {skill.examplePrompts.length > 0 && (
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              示例提示
            </Typography>
            <Stack spacing={0.75}>
              {skill.examplePrompts.map((prompt, index) => (
                <Box
                  key={index}
                  sx={{
                    px: 1.5,
                    py: 1,
                    bgcolor: '#F8FAFC',
                    borderRadius: 1.5,
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                    "{prompt}"
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Tags */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
          <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            标签
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
            {skill.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  bgcolor: '#F1F5F9',
                  color: '#64748B',
                  border: '1px solid #E5E7EB',
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Reviews */}
        {ratings.length > 0 && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              用户评价 ({ratings.length})
            </Typography>
            <Stack spacing={1.5}>
              {ratings.slice(0, 5).map((rating, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1.5,
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>
                      @{rating.userId}
                    </Typography>
                    <StarRating rating={rating.rating} size={12} />
                  </Stack>
                  {rating.review && (
                    <Typography variant="body2" sx={{ fontSize: 12, color: '#475569' }}>
                      {rating.review}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SkillDetailDialog;
