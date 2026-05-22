/**
 * SearchPanel - Global memory search overlay with Cmd/Ctrl+K shortcut
 * 
 * Features:
 * - Overlay drawer search panel
 * - Cmd/Ctrl+K global keyboard shortcut
 * - Debounced search (200ms)
 * - Tag filtering
 * - Time sorting
 * - Result highlighting
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { MyAlpha } from '../MUI替代';
import { MyBox, MyPaper, MyTextField, MyInputAdornment, MyIconButton, MyChip, MyStack, MyTypography, MyList, MyListItem, MyListItemText, MySelect, MySelect, MySelect, MySelect, MyCircularProgress, MyDivider } from '../MUI替代';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Label as TagIcon,
  FlashOn as RelevanceIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useMemoryStore, type SearchResult, type SearchOptions } from '../../stores/memoryStore';
import { useStore } from '../../store';
import type { MemoryType } from '../../services/memory/memoryTypes';

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  conversation_summary: '#9B7FD4',
  user_preference: '#4DB6AC',
  pet_milestone: '#FFB74D',
  interaction_log: '#64B5F6',
  fact: '#E57373',
  preference: '#81C784',
  routine: '#BA68C8',
  custom: '#90A4AE',
  daily_summary: '#9B7FD4',
  weekly_summary: '#4DB6AC',
  monthly_summary: '#FFB74D',
  important_event: '#E57373',
};

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  conversation_summary: '对话',
  user_preference: '偏好',
  pet_milestone: '里程碑',
  interaction_log: '互动',
  fact: '事实',
  preference: '偏好',
  routine: '习惯',
  custom: '自定义',
  daily_summary: '日总结',
  weekly_summary: '周总结',
  monthly_summary: '月总结',
  important_event: '重要事件',
};

export const SearchPanel: React.FC = () => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Store state
  const isSearchOpen = useMemoryStore((s) => s.isSearchOpen);
  const searchQuery = useMemoryStore((s) => s.searchQuery);
  const searchResults = useMemoryStore((s) => s.searchResults);
  const isSearching = useMemoryStore((s) => s.isSearching);
  const availableTags = useMemoryStore((s) => s.availableTags);
  const isIndexReady = useMemoryStore((s) => s.isIndexReady);
  
  // Get activePersonaId from store for memory filtering
  const activePersonaId = useStore((s) => s.activePersonaId);
  
  // Actions
  const openSearch = useMemoryStore((s) => s.openSearch);
  const closeSearch = useMemoryStore((s) => s.closeSearch);
  const setSearchQuery = useMemoryStore((s) => s.setSearchQuery);
  const search = useMemoryStore((s) => s.search);
  
  // Local filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'relevance'>('recent');
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all');
  
  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // ===================================================================
  // Global keyboard shortcut (Cmd/Ctrl + K)
  // ===================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifier = e.metaKey || e.ctrlKey;
      
      if (isModifier && e.key === 'k') {
        e.preventDefault();
        if (isSearchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
      
      // Escape to close
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, openSearch, closeSearch]);
  
  // ===================================================================
  // Auto-focus input when panel opens
  // ===================================================================
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);
  
  // ===================================================================
  // Debounced search
  // ===================================================================
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      
      // Clear previous timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Debounce 200ms
      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          const options: Partial<SearchOptions> = {
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            types: selectedType !== 'all' ? [selectedType] : undefined,
            personaId: activePersonaId,  // Filter memories by current persona
            sortBy,
            limit: 30,
          };
          search(value, options);
        }
      }, 200);
    },
    [selectedTags, selectedType, sortBy, search, setSearchQuery]
  );
  
  // Re-search when filters change
  useEffect(() => {
    if (searchQuery.trim() && isSearchOpen) {
      const options: Partial<SearchOptions> = {
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        types: selectedType !== 'all' ? [selectedType] : undefined,
        personaId: activePersonaId,  // Filter memories by current persona
        sortBy,
        limit: 30,
      };
      search(searchQuery, options);
    }
  }, [selectedTags, selectedType, sortBy, activePersonaId]);
  
  // ===================================================================
  // Handle result click
  // ===================================================================
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      // Close search and navigate to memory
      closeSearch();
      
      // Emit event to navigate to memory detail
      window.dispatchEvent(
        new CustomEvent('navigate-memory', { detail: { id: result.id } })
      );
    },
    [closeSearch]
  );
  
  // ===================================================================
  // Render highlight
  // ===================================================================
  const renderHighlight = (text: string) => {
    // Split by ** markers and render with bold
    const parts = text.split(/\*\*(.*?)\*\*/g);
    
    return parts.map((part, i) => {
      // Check if this part was wrapped in **
      const isHighlight = parts[i - 1] === undefined && i === 0 ? false : !parts[i - 1]?.endsWith('**');
      
      if (isHighlight || (i > 0 && parts[i - 1]?.startsWith('**'))) {
        return (
          <Typography
            component="span"
            key={i}
            sx={{
              bgcolor: 'rgba(155, 127, 212, 0.3)',
              color: 'primary.main',
              borderRadius: 0.5,
              px: 0.25,
            }}
          >
            {part}
          </Typography>
        );
      }
      return part;
    });
  };
  
  // ===================================================================
  // Don't render if not open
  // ===================================================================
  if (!isSearchOpen) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: { xs: 8, sm: 12 },
        px: 2,
      }}
    >
      {/* Backdrop */}
      <Box
        onClick={closeSearch}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />
      
      {/* Search Panel */}
      <Paper
        elevation={24}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'rgba(20, 10, 40, 0.98)',
          border: '1px solid rgba(155, 127, 212, 0.3)',
          borderRadius: 2,
        }}
      >
        {/* Search Input */}
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            autoFocus
            placeholder={t('search.placeholder', '搜索记忆...')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleSearchChange('')}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                '& fieldset': {
                  borderColor: 'rgba(155, 127, 212, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(155, 127, 212, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
        </Box>
        
        {/* Filters */}
        <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {t('search.sortBy', '排序')}
            </InputLabel>
            <Select
              value={sortBy}
              label={t('search.sortBy', '排序')}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'relevance')}
              sx={{
                fontSize: 12,
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              <MenuItem value="recent">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimeIcon sx={{ fontSize: 14 }} />
                  {t('search.recent', '最新')}
                </Box>
              </MenuItem>
              <MenuItem value="relevance">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <RelevanceIcon sx={{ fontSize: 14 }} />
                  {t('search.relevance', '相关')}
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          
          {/* Type Filter */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
              {t('search.type', '类型')}
            </InputLabel>
            <Select
              value={selectedType}
              label={t('search.type', '类型')}
              onChange={(e) => setSelectedType(e.target.value as MemoryType | 'all')}
              sx={{
                fontSize: 12,
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              <MenuItem value="all">{t('search.allTypes', '全部')}</MenuItem>
              {(Object.keys(MEMORY_TYPE_LABELS) as MemoryType[]).map((type) => (
                <MenuItem key={type} value={type}>
                  {MEMORY_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TagIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              {availableTags.slice(0, 5).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter((t) => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  sx={{
                    height: 24,
                    fontSize: 11,
                    bgcolor: selectedTags.includes(tag)
                      ? 'rgba(155, 127, 212, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: selectedTags.includes(tag) ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      bgcolor: 'rgba(155, 127, 212, 0.2)',
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
        
        <Divider sx={{ opacity: 0.15 }} />
        
        {/* Results */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {!isIndexReady ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : isSearching ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : searchQuery && searchResults.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {t('search.noResults', '未找到相关记忆')}
              </Typography>
            </Box>
          ) : searchResults.length > 0 ? (
            <List dense disablePadding>
              {searchResults.map((result) => (
                <ListItem
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: 'pointer',
                    bgcolor: 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'rgba(155, 127, 212, 0.15)',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={MEMORY_TYPE_LABELS[result.memory.type]}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            bgcolor: alpha(MEMORY_TYPE_COLORS[result.memory.type], 0.2),
                            color: MEMORY_TYPE_COLORS[result.memory.type],
                          }}
                        />
                        {result.memory.tags.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              bgcolor: 'rgba(155, 127, 212, 0.1)',
                              color: 'primary.light',
                            }}
                          />
                        ))}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {result.highlights.slice(0, 2).map((highlight, i) => (
                          <Typography
                            key={i}
                            variant="body2"
                            sx={{
                              fontSize: 12,
                              color: 'text.secondary',
                              lineHeight: 1.4,
                              mb: 0.25,
                            }}
                          >
                            {renderHighlight(highlight)}
                          </Typography>
                        ))}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {t('search.hint', '输入关键词开始搜索记忆')}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                {t('search.shortcut', '按 Cmd/Ctrl+K 打开搜索')}
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Footer */}
        <Box
          sx={{
            p: 1,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="text.disabled">
            {searchResults.length > 0 && `${searchResults.length} ${t('search.results', '条结果')}`}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {t('search.esc', 'ESC')} {t('search.close', '关闭')}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default SearchPanel;
