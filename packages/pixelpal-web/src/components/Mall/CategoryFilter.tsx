/**
 * Category Filter Component - M4商城分类筛选
 */

import { css } from '@emotion/react';
import React from 'react';
import { Box } from '../ui/Box';
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

  return (
    <Box
      css={css`
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 8px 4px;
        &::-webkit-scrollbar {
          height: 4px;
        }
        &::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.1);
          border-radius: 8px;
        }
      `}
    >
      {CATEGORY_CONFIG.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const count = cat.id === 'all' 
          ? undefined 
          : getProductsByCategory(cat.id as ProductCategory).length;

        return (
          <Box
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            css={css`
              flex-shrink: 0;
              background: ${isSelected ? `${cat.color}22` : 'rgba(255,255,255,0.05)'};
              border: 1px solid ${isSelected ? cat.color : 'transparent'};
              color: ${isSelected ? cat.color : 'rgba(255,255,255,0.5)'};
              transition: all 0.2s ease;
              border-radius: 16px;
              padding: 4px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              &:hover {
                background: ${cat.color}15;
                transform: scale(1.02);
              }
            `}
          >
            <Box css={css`font-size: 16px; line-height: 1;`}>{cat.icon}</Box>
            <Box css={css`display: flex; align-items: center; gap: 4px;`}>
              <Box css={css`font-size: 12px; font-weight: ${isSelected ? 600 : 400};`}>
                {language === 'zh' ? cat.name : cat.nameEn}
              </Box>
              {count !== undefined && (
                <Box css={css`font-size: 10px; opacity: 0.7; display: none; @media (min-width: 600px) { display: inline; }`}>
                  ({count})
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default CategoryFilter;
