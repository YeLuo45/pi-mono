/**
 * V78: SkillStoreHeader Component
 * Search bar and header for the Skill Marketplace.
 */

import React, { useState } from 'react';
import { Box, TextField, InputAdornment, Typography, IconButton } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

interface SkillStoreHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  skillCount?: number;
}

export const SkillStoreHeader: React.FC<SkillStoreHeaderProps> = ({
  searchQuery,
  onSearchChange,
  skillCount = 0,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    onSearchChange(value);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        px: 3,
        py: 2,
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5" sx={{ fontSize: 20, fontWeight: 700, color: '#1E293B' }}>
            🏪 技能商店
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: 12,
              color: '#64748B',
              bgcolor: '#F1F5F9',
              px: 1,
              py: 0.25,
              borderRadius: 1,
            }}
          >
            {skillCount} 个技能
          </Typography>
        </Box>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="搜索技能名称、描述或标签..."
        value={localSearch}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
            </InputAdornment>
          ),
          endAdornment: localSearch && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear} sx={{ p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
              </IconButton>
            </InputAdornment>
          ),
          sx: {
            bgcolor: '#F8FAFC',
            borderRadius: 2,
            fontSize: 13,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#E5E7EB',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#CBD5E1',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6366F1',
              borderWidth: 1.5,
            },
          },
        }}
      />
    </Box>
  );
};

export default SkillStoreHeader;
