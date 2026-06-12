/**
 * V85: SkillDetailDialog Component
 * Full skill details with reviews, version history, and dependencies.
 */

import React, { useEffect, useState } from 'react';
import { MyDialog as Dialog, MyAlpha , MyDialogContent as DialogContent } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MyButton as Button, MyStack as Stack, MyChip as Chip, MyIconButton as IconButton, MyDivider as Divider, MyAlert as Alert, MyCollapse as Collapse, MyList, MyListItem, MyListItemText } from '../MUI替代';
import {
  Close as CloseIcon,
  Star as StarIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  History as HistoryIcon,
  Update as UpdateIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  CallSplit as DepsIcon,
} from '@mui/icons-material';
import type { MarketplaceSkill, SkillRating } from '../../data/sampleMarketplaceSkills';
import type { SkillCategory } from '../../services/skills/types';
import { getSkillRatings } from '../../services/marketplace/marketplaceService';
import { getVersionHistory, hasNewerVersion, rollbackSkillVersion, getRollbackVersions } from '../../services/marketplace/SkillVersionManager';
import { getSkillDependencies, areDependenciesSatisfied } from '../../services/marketplace/SkillDependencyResolver';
import type { SkillVersion } from '../../types/skill';

interface SkillDetailDialogProps {
  open: boolean;
  onClose: () => void;
  skill: MarketplaceSkill | null;
  isInstalled?: boolean;
  onInstall?: (skill: MarketplaceSkill) => void;
  onReview?: (skill: MarketplaceSkill) => void;
  onVersionChange?: () => void;
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

const StarRating: React.FC<{ rating: number; size?: number; interactive?: boolean; onRate?: (r: number) => void }> = ({
  rating,
  size = 16,
  interactive = false,
  onRate,
}) => {
  return (
    <Stack direction="row" spacing={0.25}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Box
          key={star}
          onClick={() => interactive && onRate?.(star)}
          sx={{ cursor: interactive ? 'pointer' : 'default' }}
        >
          <StarIcon
            sx={{
              fontSize: size,
              color: star <= rating ? '#F59E0B' : '#E5E7EB',
              transition: 'color 0.15s',
            }}
          />
        </Box>
      ))}
    </Stack>
  );
};

// Rating distribution bar
const RatingBar: React.FC<{ star: number; count: number; total: number }> = ({ star, count, total }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 11 }}>
      <Typography variant="caption" sx={{ fontSize: 11, color: '#64748B', width: 12 }}>
        {star}★
      </Typography>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#E5E7EB', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: '#F59E0B', borderRadius: 1 }} />
      </Box>
      <Typography variant="caption" sx={{ fontSize: 10, color: '#94A3B8', width: 24, textAlign: 'right' }}>
        {count}
      </Typography>
    </Box>
  );
};

export const SkillDetailDialog: React.FC<SkillDetailDialogProps> = ({
  open,
  onClose,
  skill,
  isInstalled = false,
  onInstall,
  onReview,
  onVersionChange,
}) => {
  const [ratings, setRatings] = useState<SkillRating[]>([]);
  const [versions, setVersions] = useState<SkillVersion[]>([]);
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; latestVersion?: string; changelog?: string }>({ available: false });
  const [rollbackVersions, setRollbackVersions] = useState<SkillVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    if (skill && open) {
      setRatings(getSkillRatings(skill.id));
      if (isInstalled) {
        const history = getVersionHistory(skill.id);
        setVersions(history);
        setUpdateInfo(hasNewerVersion(skill.id, skill.version));
        setRollbackVersions(getRollbackVersions(skill.id));
      } else {
        setVersions([]);
        setUpdateInfo({ available: false });
        setRollbackVersions([]);
      }
    }
  }, [skill, open, isInstalled]);

  const handleRollback = async (targetVersion: string) => {
    if (!skill) return;
    setRollingBack(true);
    const result = await rollbackSkillVersion(skill.id, targetVersion);
    setRollingBack(false);
    if (result.success) {
      setVersions(getVersionHistory(skill.id));
      setRollbackVersions(getRollbackVersions(skill.id));
      setUpdateInfo(hasNewerVersion(skill.id, skill.version));
      onVersionChange?.();
    }
  };

  const getRatingDistribution = () => {
    const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[r.rating as 1 | 2 | 3 | 4 | 5]++;
      }
    }
    return dist;
  };

  const ratingDist = getRatingDistribution();
  const totalRatings = ratings.length;
  const deps = skill ? getSkillDependencies(skill.id) : [];
  const depStatus = skill ? areDependenciesSatisfied(skill.id) : null;

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
            {updateInfo.available && (
              <Chip
                label={`v${updateInfo.latestVersion} 可用`}
                size="small"
                icon={<UpdateIcon sx={{ fontSize: 12 }} />}
                sx={{
                  ml: 1,
                  height: 18,
                  fontSize: 9,
                  bgcolor: alpha('#6366F1', 0.1),
                  color: '#6366F1',
                  '& .MuiChip-icon': { color: '#6366F1' },
                }}
              />
            )}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <StarRating rating={Math.round(skill.avgRating)} />
            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>
              {skill.avgRating > 0 ? skill.avgRating.toFixed(1) : 'New'}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: '#94A3B8' }}>
              ({totalRatings} reviews)
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

        {/* Update Available Alert */}
        {isInstalled && updateInfo.available && (
          <Alert
            severity="info"
            icon={<UpdateIcon />}
            sx={{
              mx: 3,
              mt: 2,
              borderRadius: 2,
              bgcolor: alpha('#6366F1', 0.08),
              color: '#4338CA',
              '& .MuiAlert-icon': { color: '#6366F1' },
            }}
          >
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
              新版本可用: v{updateInfo.latestVersion}
            </Typography>
            {updateInfo.changelog && (
              <Typography variant="caption" sx={{ fontSize: 11, color: '#64748B', display: 'block', mt: 0.25 }}>
                {updateInfo.changelog}
              </Typography>
            )}
          </Alert>
        )}

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
                {totalRatings}
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

        {/* Rating Distribution (if has ratings) */}
        {totalRatings > 0 && (
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 11, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                评分分布
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: '#64748B' }}>
                {skill.avgRating.toFixed(1)} / 5.0
              </Typography>
            </Box>
            <Stack spacing={0.5}>
              {[5, 4, 3, 2, 1].map((star) => (
                <RatingBar key={star} star={star} count={ratingDist[star as 1 | 2 | 3 | 4 | 5]} total={totalRatings} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Description */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
          <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            描述
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            {skill.description}
          </Typography>
        </Box>

        {/* Dependencies (if installed and has deps) */}
        {isInstalled && deps.length > 0 && (
          <Box sx={{ borderBottom: '1px solid #F1F5F9' }}>
            <Box
              onClick={() => setShowDependencies(!showDependencies)}
              sx={{
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <DepsIcon sx={{ fontSize: 16, color: '#64748B' }} />
                <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  依赖 ({deps.length})
                </Typography>
                {depStatus && !depStatus.satisfied && (
                  <Chip
                    label="有问题"
                    size="small"
                    color="warning"
                    sx={{ height: 16, fontSize: 9 }}
                  />
                )}
              </Stack>
              {showDependencies ? <ExpandLessIcon sx={{ fontSize: 18, color: '#64748B' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: '#64748B' }} />}
            </Box>
            <Collapse in={showDependencies}>
              <Box sx={{ px: 3, pb: 2 }}>
                <Stack spacing={0.75}>
                  {deps.map((dep) => {
                    const resolved = depStatus?.resolutions.find((r) => r.skillId === dep.skillId);
                    const isOk = resolved?.status === 'resolved';
                    return (
                      <Box
                        key={dep.skillId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.5,
                          py: 0.75,
                          bgcolor: '#F8FAFC',
                          borderRadius: 1,
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: '#1E293B', flex: 1 }}>
                          {dep.skillId}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 10, color: '#64748B' }}>
                          {dep.versionRange}
                        </Typography>
                        {isOk ? (
                          <CheckIcon sx={{ fontSize: 14, color: '#10B981' }} />
                        ) : (
                          <WarningIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Version History (if installed and has versions) */}
        {isInstalled && versions.length > 1 && (
          <Box sx={{ borderBottom: '1px solid #F1F5F9' }}>
            <Box
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              sx={{
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <HistoryIcon sx={{ fontSize: 16, color: '#64748B' }} />
                <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  版本历史 ({versions.length})
                </Typography>
              </Stack>
              {showVersionHistory ? <ExpandLessIcon sx={{ fontSize: 18, color: '#64748B' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: '#64748B' }} />}
            </Box>
            <Collapse in={showVersionHistory}>
              <Box sx={{ px: 3, pb: 2 }}>
                <Stack spacing={0.5}>
                  {versions.map((v, idx) => {
                    const isCurrent = idx === versions.length - 1;
                    const isRollback = rollbackVersions.some((r) => r.version === v.version);
                    return (
                      <Box
                        key={v.version}
                        sx={{
                          px: 1.5,
                          py: 1,
                          bgcolor: isCurrent ? alpha('#6366F1', 0.05) : '#F8FAFC',
                          borderRadius: 1,
                          border: isCurrent ? '1px solid #6366F1' : '1px solid #E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>
                              v{v.version}
                            </Typography>
                            {isCurrent && (
                              <Chip label="当前" size="small" sx={{ height: 14, fontSize: 8, bgcolor: '#6366F1', color: '#FFF' }} />
                            )}
                          </Stack>
                          <Typography variant="caption" sx={{ fontSize: 10, color: '#64748B', display: 'block' }}>
                            {new Date(v.createdAt).toLocaleDateString('zh-CN')} — {v.changelog}
                          </Typography>
                        </Box>
                        {!isCurrent && isRollback && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleRollback(v.version)}
                            disabled={rollingBack}
                            sx={{
                              height: 24,
                              fontSize: 10,
                              borderColor: '#E5E7EB',
                              color: '#64748B',
                              textTransform: 'none',
                              '&:hover': { borderColor: '#CBD5E1' },
                            }}
                          >
                            回滚
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        )}

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
