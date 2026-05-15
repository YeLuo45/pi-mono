/**
 * V85: SkillStorePage
 * Main Skill Marketplace page with enhanced rating, version, and dependency features.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Stack, Grid, Chip, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Box } from '../components/ui/Box';
import { useTheme } from '../components/ui/ThemeProvider';
import { useNavigate } from 'react-router-dom';
import { SkillStoreHeader } from '../components/SkillStore/SkillStoreHeader';
import { CategoryTabs } from '../components/SkillStore/CategoryTabs';
import { SkillCard } from '../components/SkillStore/SkillCard';
import { SkillDetailDialog } from '../components/SkillStore/SkillDetailDialog';
import { SkillReviewDialog } from '../components/SkillStore/SkillReviewDialog';
import type { MarketplaceSkill, SkillRating } from '../data/sampleMarketplaceSkills';
import type { SkillCategory } from '../services/skills/types';
import {
  getCommunitySkills,
  installMarketplaceSkill,
  isSkillInstalled,
  searchCommunitySkills,
  sortCommunitySkills,
  addSkillRating,
} from '../services/marketplace/marketplaceService';
import { getAverageRating, getRatingsCount, getCallCount, incrementCallCount } from '../services/marketplace/SkillRatingService';
import { useStore } from '../store';

export const SkillStorePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<MarketplaceSkill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [installedSkillIds, setInstalledSkillIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [selectedSkill, setSelectedSkill] = useState<MarketplaceSkill | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load skills on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const communitySkills = getCommunitySkills();
        setSkills(communitySkills);

        // Check which skills are installed
        const installed = new Set<string>();
        for (const skill of communitySkills) {
          if (await isSkillInstalled(skill.id)) {
            installed.add(skill.id);
          }
        }
        setInstalledSkillIds(installed);
      } catch (err) {
        console.error('Failed to load marketplace skills:', err);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  // Filter and sort skills when search/category/sort changes
  useEffect(() => {
    let result = searchCommunitySkills(searchQuery, activeCategory);
    result = sortCommunitySkills(result, sortBy);
    setFilteredSkills(result);
  }, [searchQuery, activeCategory, sortBy, skills]);

  const handleInstall = useCallback(async (skill: MarketplaceSkill) => {
    const result = await installMarketplaceSkill(skill);
    if (result.success) {
      setInstalledSkillIds((prev) => new Set([...prev, skill.id]));
      setToast({ open: true, message: `${skill.name} 安装成功！`, severity: 'success' });
    } else {
      setToast({ open: true, message: result.error || '安装失败', severity: 'error' });
    }
  }, []);

  const handleSkillClick = useCallback((skill: MarketplaceSkill) => {
    setSelectedSkill(skill);
    setDetailDialogOpen(true);
  }, []);

  const handleReviewClick = useCallback((skill: MarketplaceSkill) => {
    setSelectedSkill(skill);
    setDetailDialogOpen(false);
    setReviewDialogOpen(true);
  }, []);

  const handleReviewSubmit = useCallback((rating: SkillRating) => {
    if (selectedSkill) {
      addSkillRating(selectedSkill.id, rating);
      setToast({ open: true, message: '感谢你的评价！', severity: 'success' });
    }
  }, [selectedSkill]);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
    setSelectedSkill(null);
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewDialogOpen(false);
    setSelectedSkill(null);
  }, []);

  const handleCategoryChange = useCallback((category: SkillCategory | 'all') => {
    setActiveCategory(category);
  }, []);

  const handleSortChange = useCallback((sort: 'popular' | 'rating' | 'newest') => {
    setSortBy(sort);
  }, []);

  // Reload skills after version change (rollback, etc.)
  const handleVersionChange = useCallback(() => {
    // Force refresh the installed skill states
    const loadData = async () => {
      const communitySkills = getCommunitySkills();
      setSkills(communitySkills);
      const installed = new Set<string>();
      for (const skill of communitySkills) {
        if (await isSkillInstalled(skill.id)) {
          installed.add(skill.id);
        }
      }
      setInstalledSkillIds(installed);
    };
    void loadData();
  }, []);

  // Get enhanced stats for display
  const getSkillDisplayRating = (skillId: string, avgRating: number) => {
    const userRating = getAverageRating(skillId);
    return userRating > 0 ? userRating : avgRating;
  };

  const theme = useTheme();
  const shop = theme.palette.shop || {};

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: shop.bgPage || '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ bgcolor: '#FFFFFF', borderBottom: `1px solid ${shop.border || '#E5E7EB'}` }}>
        <SkillStoreHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          skillCount={filteredSkills.length}
        />

        {/* Sort Tabs */}
        <Box sx={{ px: 3, py: 1, bgcolor: '#FFFFFF', borderBottom: `1px solid ${shop.borderLight || '#F1F5F9'}` }}>
          <Stack direction="row" spacing={2}>
            {[
              { key: 'popular', label: '最热门', icon: '🔥' },
              { key: 'rating', label: '评分最高', icon: '⭐' },
              { key: 'newest', label: '最新', icon: '✨' },
            ].map((sort) => (
              <Box
                key={sort.key}
                onClick={() => handleSortChange(sort.key as 'popular' | 'rating' | 'newest')}
                sx={{
                  cursor: 'pointer',
                  pb: 0.75,
                  borderBottom: sortBy === sort.key ? `2px solid ${shop.accent || '#6366F1'}` : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: 12,
                    fontWeight: sortBy === sort.key ? 600 : 500,
                    color: sortBy === sort.key ? (shop.accent || '#6366F1') : (shop.textMuted || '#64748B'),
                  }}
                >
                  {sort.icon} {sort.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Category Tabs */}
        <CategoryTabs activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: shop.accent || '#6366F1' }} />
          </Box>
        ) : filteredSkills.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ fontSize: 16, color: shop.textMuted || '#64748B', mb: 1 }}>
              没有找到匹配的技能
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13, color: shop.textLight || '#94A3B8' }}>
              尝试调整搜索条件或浏览其他分类
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredSkills.map((skill) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={skill.id}>
                <SkillCard
                  skill={skill}
                  variant="store"
                  isInstalled={installedSkillIds.has(skill.id)}
                  onInstall={handleInstall}
                  onClick={handleSkillClick}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Featured Section (if showing all and not filtered) */}
      {!searchQuery && activeCategory === 'all' && filteredSkills.length > 0 && (
        <Box sx={{ px: 3, pb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 700, color: shop.textDark || '#1E293B', mb: 2 }}>
            ⭐ 热门推荐
          </Typography>
          <Grid container spacing={2}>
            {filteredSkills.slice(0, 4).map((skill) => (
              <Grid item xs={12} sm={6} md={3} key={skill.id}>
                <SkillCard
                  skill={skill}
                  variant="store"
                  isInstalled={installedSkillIds.has(skill.id)}
                  onInstall={handleInstall}
                  onClick={handleSkillClick}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Skill Detail Dialog */}
      <SkillDetailDialog
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        skill={selectedSkill}
        isInstalled={selectedSkill ? installedSkillIds.has(selectedSkill.id) : false}
        onInstall={handleInstall}
        onReview={handleReviewClick}
        onVersionChange={handleVersionChange}
      />

      {/* Review Dialog */}
      <SkillReviewDialog
        open={reviewDialogOpen}
        onClose={handleCloseReview}
        skill={selectedSkill}
        onSubmit={handleReviewSubmit}
      />

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SkillStorePage;
