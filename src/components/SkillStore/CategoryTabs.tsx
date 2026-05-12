/**
 * V78: CategoryTabs Component
 * Horizontal scrollable category filter tabs for the marketplace.
 */

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import type { SkillCategory } from '../../services/skills/types';

interface CategoryTab {
  id: SkillCategory | 'all';
  label: string;
  icon: string;
}

const CATEGORIES: CategoryTab[] = [
  { id: 'all', label: '全部', icon: '🏪' },
  { id: 'productivity', label: '效率工具', icon: '⚡' },
  { id: 'developer', label: '开发者', icon: '💻' },
  { id: 'lifestyle', label: '生活', icon: '🌿' },
  { id: 'creative', label: '创意', icon: '🎨' },
  { id: 'analysis', label: '分析', icon: '📈' },
  { id: 'entertainment', label: '娱乐', icon: '🎮' },
];

interface CategoryTabsProps {
  activeCategory: SkillCategory | 'all';
  onCategoryChange: (category: SkillCategory | 'all') => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        px: 3,
        py: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 0 },
          gap: 0.5,
        }}
      >
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <Box
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 1,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                bgcolor: isActive ? '#6366F1' : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                '&:hover': {
                  bgcolor: isActive ? '#4F46E5' : '#F1F5F9',
                },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: 14 }}>
                {category.icon}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {category.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default CategoryTabs;
