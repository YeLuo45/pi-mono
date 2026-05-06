/**
 * Category Filter Component - M4商城分类筛选
 */

import React from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import { useMallStore } from '../../stores/mallStore';
import type { ProductCategory } from '../../types/mall';

const CATEGORY_CONFIG = [
  { id: 'all' as const, name: '全部', nameEn: 'All', icon: '🛍️', color: '#9B7FD4' },
  { id: 'avatar' as const, name: '头像', nameEn: 'Avatar', icon: '😊', color: '#FF6B9D' },
  { id: 'skin' as const, name: '皮肤', nameEn: 'Skin', icon: '✨', color: '#9B7FD4' },
  { id: 'item' as const, name: '道具', nameEn: 'Item', icon: '🎁', color: '#4ECDC4' },
  { id: 'badge' as const, name: '徽章', nameEn: 'Badge', icon: '🏅', color: '#FFB84D' },
  { id: 'frame' as const, name: '头像框', nameEn: 'Frame', icon: '🖼️', color: '#A8E6CF' },
  { id: 'effect' as const, name: '特效', nameEn: 'Effect', icon: '💫', color: '#DDA0DD' },
  { id: 'theme' as const, name: '主题', nameEn: 'Theme', icon: '🎨', color: '#87CEEB' },
];

interface CategoryFilterProps {
  language?: 'zh' | 'en';
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ 
  language = 'zh' 
}) => {
  const selectedCategory = useMallStore(s => s.selectedCategory);
  const setSelectedCategory = useMallStore(s => s.setSelectedCategory);
  const getProductsByCategory = useMallStore(s => s.getProductsByCategory);
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        py: 1,
        px: 0.5,
        '&::-webkit-scrollbar': {
          height: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
        },
      }}
    >
      {CATEGORY_CONFIG.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const count = cat.id === 'all' 
          ? undefined 
          : getProductsByCategory(cat.id as ProductCategory).length;

        return (
          <Chip
            key={cat.id}
            icon={
              <Typography sx={{ fontSize: 16, lineHeight: 1 }}>
                {cat.icon}
              </Typography>
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: isSelected ? 600 : 400 }}>
                  {language === 'zh' ? cat.name : cat.nameEn}
                </Typography>
                {count !== undefined && (
                  <Typography 
                    sx={{ 
                      fontSize: 10, 
                      opacity: 0.7,
                      display: { xs: 'none', sm: 'inline' }
                    }}
                  >
                    ({count})
                  </Typography>
                )}
              </Box>
            }
            onClick={() => setSelectedCategory(cat.id)}
            sx={{
              flexShrink: 0,
              bgcolor: isSelected 
                ? `${cat.color}22` 
                : 'rgba(255,255,255,0.05)',
              borderColor: isSelected 
                ? cat.color 
                : 'transparent',
              border: '1px solid',
              color: isSelected ? cat.color : 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: `${cat.color}15`,
                transform: 'scale(1.02)',
              },
              '& .MuiChip-icon': {
                color: 'inherit',
              },
            }}
          />
        );
      })}
    </Box>
  );
};

export default CategoryFilter;
