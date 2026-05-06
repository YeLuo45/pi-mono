/**
 * Memory Panel - Advanced Memory Management UI
 * 
 * Provides a dedicated UI for:
 * - Memory statistics and overview
 * - Memory search and retrieval with filters
 * - Timeline view of memories
 * - Word cloud insights
 * - Export/Import memories
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import WordCloud from 'wordcloud';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Button,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Divider,
  Collapse,
  Slider,
  Popper,
  ClickAwayListener,
  List as MuiList,
  ListItem as MuiListItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  PushPin as PinIcon,
  PushPin as UnpinIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Lightbulb as InsightIcon,
  AccountTree as GraphIcon,
  TrendingUp as TrendingUpIcon,
  Upload as UploadIcon,
  CalendarMonth as CalendarIcon,
  EmojiEmotions as EmotionIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import {
  getMemoryStats,
  queryMemories,
  getMemory,
  deleteMemory,
  addMemory,
} from '../../services/memory/memoryStorage';
import { type MemoryEntry, type MemoryType, type MemoryStats } from '../../services/memory/memoryTypes';
import {
  getEntityStats,
  getEntitiesByType,
  searchEntities,
  type Entity,
  type EntityType,
} from '../../services/memory/entityGraph';
import {
  smartRetrieve,
  retrieveRecentImportant,
  retrieveFrequent,
  type ScoredMemory,
} from '../../services/memory/smartRetrieval';
import { generateMemoryInsights } from '../../services/memory/summarization';
import {
  getEmotionLogs,
  getEmotionLogsForDay,
  getRecentEmotionLogs,
  downloadEmotionLogs,
  getEmotionStats,
  type EmotionLogEntry,
  type TextEmotion,
  getTextEmotionEmoji,
  getTextEmotionColor,
  getTextEmotionLabel,
  groupEmotionLogsByDate,
  calculateEmotionDistribution,
  checkPersistentNegativeEmotion,
} from '../../services/emotion';
import { getAllPersonas, type Persona } from '../../services/persona';
import { useStore } from '../../store';
import { RelationGraph } from '../Graph/RelationGraph';

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  conversation_summary: '#9B7FD4',
  user_preference: '#4DB6AC',
  pet_milestone: '#FFB74D',
  interaction_log: '#64B5F6',
  fact: '#E57373',
  preference: '#81C784',
  routine: '#BA68C8',
  custom: '#90A4AE',
  // V32: Summary types
  daily_summary: '#FFD54F',
  weekly_summary: '#FF8A65',
  monthly_summary: '#EF5350',
  important_event: '#F44336',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return i18next.t('time.justNow');
  if (minutes < 60) return i18next.t('time.minutesAgo', { count: minutes });
  if (hours < 24) return i18next.t('time.hoursAgo', { count: hours });
  if (days < 7) return i18next.t('time.daysAgo', { count: days });
  return new Date(timestamp).toLocaleDateString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(i18next.language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const MemoryPanel: React.FC = () => {
  const { t } = useTranslation();

  // Active persona from store
  const activePersonaId = useStore((s) => s.activePersonaId);

  // Personas list (loaded once)
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Tab state
  const [tab, setTab] = useState(0);

  // Emotion state
  const [emotionLogs, setEmotionLogs] = useState<EmotionLogEntry[]>([]);
  const [emotionWarning, setEmotionWarning] = useState<string | null>(null);

  // Load emotion logs
  const loadEmotionLogs = useCallback(() => {
    const logs = getEmotionLogs();
    setEmotionLogs(logs);
    
    // Check for persistent negative emotion (P1 feature)
    if (checkPersistentNegativeEmotion(logs, 3)) {
      const recentLogs = getRecentEmotionLogs(3);
      const lastEmotion = recentLogs[0]?.emotion;
      if (lastEmotion === 'anxious') {
        setEmotionWarning(t('emotionPanel.anxiousWarning'));
      } else if (lastEmotion === 'sad') {
        setEmotionWarning(t('emotionPanel.sadWarning'));
      }
    } else {
      setEmotionWarning(null);
    }
  }, [t]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScoredMemory[]>([]);
  const [, setIsSearching] = useState(false);

  // Memory list state
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [entityStats, setEntityStats] = useState<{
    totalEntities: number;
    byType: Record<EntityType, number>;
    totalRelationships: number;
    mostConnected: Entity[];
  } | null>(null);

  // Insights state
  const [insights, setInsights] = useState<string[]>([]);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'importance' | 'frequency'>('recent');

  // Search/filter state for AllMemoriesTab
  const [keywordFilter, setKeywordFilter] = useState('');
  const [dateRange, setDateRange] = useState<[number | null, number | null]>([null, null]);
  const [importanceRange, setImportanceRange] = useState<[number, number]>([0, 100]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagSearchAnchor, setTagSearchAnchor] = useState<HTMLElement | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // Collect all unique tags from memories for autocomplete
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const m of memories) {
      for (const t of m.tags) {
        tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [memories]);

  // Filtered tag suggestions based on tagSearchQuery
  const tagSuggestions = useMemo(() => {
    if (!tagSearchQuery.trim()) return [];
    const q = tagSearchQuery.toLowerCase();
    return allTags.filter(t => t.toLowerCase().includes(q) && !tagFilter.includes(t)).slice(0, 8);
  }, [tagSearchQuery, allTags, tagFilter]);

  // Tag filter stats (count per tag among filtered memories)
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of memories) {
      for (const t of m.tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }, [memories]);

  // Add tag to filter
  const addTagFilter = (tag: string) => {
    if (!tagFilter.includes(tag)) {
      setTagFilter(prev => [...prev, tag]);
    }
    setTagSearchQuery('');
    setTagSearchAnchor(null);
  };

  // Remove tag from filter
  const removeTagFilter = (tag: string) => {
    setTagFilter(prev => prev.filter(t => t !== tag));
  };

  // Stats card data
  const statsCard = useMemo(() => {
    if (!stats) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayMs = today.getTime();
    const yesterdayMs = yesterday.getTime();
    const weekAgoMs = weekAgo.getTime();

    const todayCount = memories.filter(m => m.createdAt >= todayMs).length;
    const yesterdayCount = memories.filter(m => m.createdAt >= yesterdayMs && m.createdAt < todayMs).length;
    const weekCount = memories.filter(m => m.createdAt >= weekAgoMs).length;
    const highImportanceCount = memories.filter(m => m.importance >= 70).length;
    const avgAccessCount = memories.length > 0 ? Math.round(memories.reduce((sum, m) => sum + m.accessCount, 0) / memories.length) : 0;

    return {
      total: stats.totalEntries,
      avgImportance: stats.averageImportance.toFixed(1),
      todayCount,
      yesterdayCount,
      weekCount,
      highImportanceCount,
      avgAccessCount,
      oldestMonths: stats.oldestEntry ? Math.floor((Date.now() - stats.oldestEntry) / (86400000 * 30)) : 0,
    };
  }, [stats, memories]);

  // Selected memory for detail view
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Pinned memories
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Export dialog
  const [exportOpen, setExportOpen] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Relation graph dialog
  const [relationGraphOpen, setRelationGraphOpen] = useState(false);

  // Load memories
  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const results = await queryMemories({
        type: typeFilter === 'all' ? undefined : typeFilter,
        personaId: activePersonaId,
        limit: 100,
      });
      setMemories(results);
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
    setLoading(false);
  }, [typeFilter, activePersonaId]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const [memoryStats, entStats] = await Promise.all([
        getMemoryStats(),
        getEntityStats(),
      ]);
      setStats(memoryStats);
      setEntityStats(entStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Load insights
  const loadInsights = useCallback(async () => {
    try {
      const allMemories = await queryMemories({ limit: 100 });
      const memoryInsights = await generateMemoryInsights(allMemories);
      setInsights(memoryInsights);
    } catch (err) {
      console.error('Failed to load insights:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMemories();
    loadStats();
    loadInsights();
    loadEmotionLogs();
    setPersonas(getAllPersonas());
  }, [loadMemories, loadStats, loadInsights, loadEmotionLogs]);

  // Listen for emotion updates
  useEffect(() => {
    const handleEmotionUpdate = () => loadEmotionLogs();
    window.addEventListener('emotion:logAdded', handleEmotionUpdate);
    window.addEventListener('emotion:logsCleared', handleEmotionUpdate);
    return () => {
      window.removeEventListener('emotion:logAdded', handleEmotionUpdate);
      window.removeEventListener('emotion:logsCleared', handleEmotionUpdate);
    };
  }, [loadEmotionLogs]);

  // Sort memories
  const sortedMemories = [...memories].sort((a, b) => {
    if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1;
    if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1;

    switch (sortBy) {
      case 'importance':
        return b.importance - a.importance;
      case 'frequency':
        return b.accessCount - a.accessCount;
      default:
        return b.createdAt - a.createdAt;
    }
  });

  // Filter memories by keyword, date range, importance, tags, and starred
  const filteredMemories = sortedMemories.filter((m) => {
    if (keywordFilter.trim()) {
      const kw = keywordFilter.toLowerCase();
      // Support #tag syntax in keyword filter
      const tagMatch = kw.startsWith('#') ? m.tags.some((t) => t.toLowerCase().includes(kw.slice(1))) : false;
      if (!m.content.toLowerCase().includes(kw) && !m.tags.some((t) => t.toLowerCase().includes(kw)) && !tagMatch) {
        return false;
      }
    }
    if (m.importance < importanceRange[0] || m.importance > importanceRange[1]) {
      return false;
    }
    if (dateRange[0] !== null && m.createdAt < dateRange[0]) {
      return false;
    }
    if (dateRange[1] !== null && m.createdAt > dateRange[1]) {
      return false;
    }
    if (tagFilter.length > 0 && !tagFilter.some((t) => m.tags.includes(t))) {
      return false;
    }
    if (showStarredOnly && m.importance < 70) {
      return false;
    }
    return true;
  });

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await smartRetrieve({ query: searchQuery, limit: 30 });
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setIsSearching(false);
  };

  // Quick filters
  const handleQuickFilter = async (filter: 'important' | 'frequent' | 'recent') => {
    setIsSearching(true);
    try {
      let results: ScoredMemory[];
      switch (filter) {
        case 'important':
          results = await retrieveRecentImportant(7, 20);
          break;
        case 'frequent':
          results = await retrieveFrequent(20);
          break;
        default:
          results = await smartRetrieve({ limit: 20 });
      }
      setSearchResults(results);
    } catch (err) {
      console.error('Quick filter failed:', err);
    }
    setIsSearching(false);
  };

  // Pin/unpin memory
  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Delete memory
  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    await loadMemories();
    await loadStats();
  };

  // Export memories
  const handleExport = () => {
    const data = JSON.stringify(memories, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixelpal-memories-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  // Import memories
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const imported = JSON.parse(text) as MemoryEntry[];
      let count = 0;
      for (const entry of imported) {
        if (entry.id && entry.type && entry.content) {
          await addMemory({
            type: entry.type,
            content: entry.content,
            importance: entry.importance || 50,
            tags: entry.tags || [],
            metadata: entry.metadata,
            personaId: activePersonaId,
          });
          count++;
        }
      }
      alert(t('memoryPanel.importSuccess', { count }));
      setImportOpen(false);
      setImportFile(null);
      loadMemories();
      loadStats();
    } catch (err) {
      console.error('Import failed:', err);
      alert(t('memoryPanel.importFailed'));
    }
    setImporting(false);
  };

  // Memory detail view
  const openDetail = async (id: string) => {
    const memory = await getMemory(id);
    if (memory) {
      setSelectedMemory(memory);
      setDetailOpen(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, mb: 1.5 }}>
          🧠 {t('memoryPanel.title')}
        </Typography>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder={t('memoryPanel.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5 }}
        />

        {/* Quick filters */}
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
          <Button size="small" variant="outlined" onClick={() => handleQuickFilter('recent')} sx={{ fontSize: 10, py: 0.25, px: 1 }}>
            {t('memoryPanel.recent')}
          </Button>
          <Button size="small" variant="outlined" onClick={() => handleQuickFilter('important')} sx={{ fontSize: 10, py: 0.25, px: 1 }}>
            <StarIcon sx={{ fontSize: 12, mr: 0.5 }} /> {t('memoryPanel.important')}
          </Button>
          <Button size="small" variant="outlined" onClick={() => handleQuickFilter('frequent')} sx={{ fontSize: 10, py: 0.25, px: 1 }}>
            <TrendingUpIcon sx={{ fontSize: 12, mr: 0.5 }} /> {t('memoryPanel.frequent')}
          </Button>
          <Button size="small" variant="outlined" onClick={() => setExportOpen(true)} sx={{ fontSize: 10, py: 0.25, px: 1 }}>
            <DownloadIcon sx={{ fontSize: 12, mr: 0.5 }} /> {t('memoryPanel.export')}
          </Button>
          <Button size="small" variant="outlined" onClick={() => setImportOpen(true)} sx={{ fontSize: 10, py: 0.25, px: 1 }}>
            <UploadIcon sx={{ fontSize: 12, mr: 0.5 }} /> {t('memoryPanel.import')}
          </Button>
          <Button size="small" variant="contained" onClick={() => setRelationGraphOpen(true)} sx={{ fontSize: 10, py: 0.25, px: 1, bgcolor: '#6366f1' }}>
            🔗 关系图谱
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<MemoryIcon sx={{ fontSize: 16 }} />} label={t('memoryPanel.all')} iconPosition="start" sx={{ minHeight: 48, fontSize: 12 }} />
          <Tab icon={<GraphIcon sx={{ fontSize: 16 }} />} label={t('memoryPanel.entities')} iconPosition="start" sx={{ minHeight: 48, fontSize: 12 }} />
          <Tab icon={<TimelineIcon sx={{ fontSize: 16 }} />} label={t('memoryPanel.timeline')} iconPosition="start" sx={{ minHeight: 48, fontSize: 12 }} />
          <Tab icon={<InsightIcon sx={{ fontSize: 16 }} />} label={t('memoryPanel.insights')} iconPosition="start" sx={{ minHeight: 48, fontSize: 12 }} />
          <Tab icon={<EmotionIcon sx={{ fontSize: 16 }} />} label={t('emotionPanel.title')} iconPosition="start" sx={{ minHeight: 48, fontSize: 12 }} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {tab === 0 && (
          <AllMemoriesTab
            memories={filteredMemories}
            loading={loading}
            pinnedIds={pinnedIds}
            stats={stats}
            personas={personas}
            onPin={togglePin}
            onDelete={handleDelete}
            onOpen={openDetail}
            sortBy={sortBy}
            onSortChange={setSortBy}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            keywordFilter={keywordFilter}
            onKeywordFilterChange={setKeywordFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            importanceRange={importanceRange}
            onImportanceRangeChange={setImportanceRange}
            tagFilter={tagFilter}
            tagCounts={tagCounts}
            onAddTag={addTagFilter}
            onRemoveTag={removeTagFilter}
            tagSuggestions={tagSuggestions}
            onTagSearchQueryChange={setTagSearchQuery}
            tagSearchAnchor={tagSearchAnchor}
            onTagSearchAnchorChange={setTagSearchAnchor}
            showStarredOnly={showStarredOnly}
            onShowStarredOnlyChange={setShowStarredOnly}
            statsCard={statsCard}
            allTags={allTags}
          />
        )}

        {tab === 1 && (
          <EntitiesTab
            entityStats={entityStats}
            onRefresh={loadStats}
          />
        )}

        {tab === 2 && (
          <TimelineTab
            onRefresh={loadMemories}
          />
        )}

        {tab === 3 && (
          <InsightsTab
            insights={insights}
            stats={stats}
            entityStats={entityStats}
            memories={memories}
          />
        )}

        {tab === 4 && (
          <EmotionTimelineTab
            logs={emotionLogs}
            warning={emotionWarning}
            onRefresh={loadEmotionLogs}
          />
        )}
      </Box>

      {/* Search Results Overlay */}
      {searchResults.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: 60,
            left: 16,
            right: 16,
            maxHeight: '60%',
            overflow: 'auto',
            zIndex: 100,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontSize: 12 }}>
              {t('memoryPanel.searchResults')} ({searchResults.length})
            </Typography>
            <IconButton size="small" onClick={() => setSearchResults([])}>
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <List dense>
            {searchResults.map(({ memory, score }) => (
              <ListItem
                key={memory.id}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                onClick={() => { openDetail(memory.id); setSearchResults([]); }}
              >
                <ListItemText
                  primary={memory.content.slice(0, 80) + (memory.content.length > 80 ? '...' : '')}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={i18next.t('memory.memoryTypes.' + memory.type)}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 9,
                          bgcolor: MEMORY_TYPE_COLORS[memory.type] + '33',
                          color: MEMORY_TYPE_COLORS[memory.type],
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                        {t('memoryPanel.score')}: {score.toFixed(2)}
                      </Typography>
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14 }}>
          {t('memoryPanel.memoryDetail')}
        </DialogTitle>
        <DialogContent>
          {selectedMemory && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={i18next.t('memory.memoryTypes.' + selectedMemory.type)}
                  size="small"
                  sx={{ bgcolor: MEMORY_TYPE_COLORS[selectedMemory.type] + '33', color: MEMORY_TYPE_COLORS[selectedMemory.type] }}
                />
                <Chip label={`${t('memoryPanel.importance')}: ${selectedMemory.importance}/100`} size="small" variant="outlined" />
                <Chip label={`${t('memoryPanel.accessed')}: ${selectedMemory.accessCount}x`} size="small" variant="outlined" />
              </Box>

              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                {selectedMemory.content}
              </Typography>

              <Divider />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedMemory.tags.map(tag => (
                  <Chip key={tag} label={tag} size="small" sx={{ fontSize: 10 }} />
                ))}
              </Box>

              <Stack direction="row" spacing={1}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  {t('memoryPanel.created')}: {new Date(selectedMemory.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  {t('memoryPanel.updated')}: {new Date(selectedMemory.updatedAt).toLocaleString()}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} size="small">{t('memoryPanel.close')}</Button>
          {selectedMemory && (
            <Button
              color="error"
              onClick={() => { handleDelete(selectedMemory.id); setDetailOpen(false); }}
              size="small"
            >
              {t('memoryPanel.delete')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontSize: 14 }}>{t('memoryPanel.exportMemories')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            {t('memoryPanel.exportCount', { count: memories.length })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)} size="small">{t('memoryPanel.cancel')}</Button>
          <Button onClick={handleExport} size="small" variant="contained">{t('memoryPanel.export')}</Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontSize: 14 }}>{t('memoryPanel.importMemories')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 12, mb: 2 }}>
            {t('memoryPanel.importHint')}
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            size="small"
            startIcon={<UploadIcon />}
          >
            {importFile ? importFile.name : t('memoryPanel.selectFile')}
            <input
              type="file"
              accept=".json"
              hidden
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </Button>
          {importing && <LinearProgress sx={{ mt: 1 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportOpen(false); setImportFile(null); }} size="small">{t('memoryPanel.cancel')}</Button>
          <Button onClick={handleImport} size="small" variant="contained" disabled={!importFile || importing}>{t('memoryPanel.import')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// All Memories Tab
interface AllMemoriesTabProps {
  memories: MemoryEntry[];
  loading: boolean;
  pinnedIds: Set<string>;
  stats: MemoryStats | null;
  personas: Persona[];
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  sortBy: 'recent' | 'importance' | 'frequency';
  onSortChange: (sort: 'recent' | 'importance' | 'frequency') => void;
  typeFilter: MemoryType | 'all';
  onTypeFilterChange: (filter: MemoryType | 'all') => void;
  keywordFilter: string;
  onKeywordFilterChange: (v: string) => void;
  dateRange: [number | null, number | null];
  onDateRangeChange: (v: [number | null, number | null]) => void;
  importanceRange: [number, number];
  onImportanceRangeChange: (v: [number, number]) => void;
  tagFilter: string[];
  tagCounts: Record<string, number>;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  tagSearchQuery: string;
  tagSuggestions: string[];
  onTagSearchQueryChange: (v: string) => void;
  tagSearchAnchor: HTMLElement | null;
  onTagSearchAnchorChange: (el: HTMLElement | null) => void;
  showStarredOnly: boolean;
  onShowStarredOnlyChange: (v: boolean) => void;
  statsCard: {
    total: number;
    avgImportance: string;
    todayCount: number;
    yesterdayCount: number;
    weekCount: number;
    highImportanceCount: number;
    avgAccessCount: number;
    oldestMonths: number;
  } | null;
  allTags: string[];
}

function AllMemoriesTab({
  memories,
  loading,
  pinnedIds,
  stats,
  personas,
  onPin,
  onDelete,
  onOpen,
  sortBy,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  keywordFilter,
  onKeywordFilterChange,
  dateRange,
  onDateRangeChange,
  importanceRange,
  onImportanceRangeChange,
  tagFilter,
  tagCounts,
  onAddTag,
  onRemoveTag,
  tagSearchQuery,
  tagSuggestions,
  onTagSearchQueryChange,
  tagSearchAnchor,
  onTagSearchAnchorChange,
  showStarredOnly,
  onShowStarredOnlyChange,
  statsCard,
  allTags,
}: AllMemoriesTabProps) {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  // Timeline grouping state: 'today' | 'yesterday' | 'thisWeek' | 'older'
  const [timelineGroup, setTimelineGroup] = useState<'all' | 'today' | 'yesterday' | 'thisWeek' | 'older'>('all');

  // Helper to get persona avatar by id
  const getPersonaAvatar = (personaId?: string): string => {
    if (!personaId) return '🧠';
    const persona = personas.find(p => p.id === personaId);
    return persona?.avatar || '🧠';
  };

  // Group memories into timeline buckets
  const timelineGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const todayMs = today.getTime();
    const yesterdayMs = yesterday.getTime();
    const weekMs = weekStart.getTime();

    return {
      today: memories.filter(m => m.createdAt >= todayMs),
      yesterday: memories.filter(m => m.createdAt >= yesterdayMs && m.createdAt < todayMs),
      thisWeek: memories.filter(m => m.createdAt >= weekMs && m.createdAt < yesterdayMs),
      older: memories.filter(m => m.createdAt < weekMs),
    };
  }, [memories]);

  // Get memories to display based on timeline group
  const displayMemories = useMemo(() => {
    if (timelineGroup === 'all') return memories;
    return timelineGroups[timelineGroup] || [];
  }, [timelineGroup, timelineGroups, memories]);

  // Render importance stars
  const renderStars = (importance: number) => {
    const stars = Math.ceil(importance / 25); // 0-4 stars based on importance
    return (
      <Stack direction="row" spacing={0.25}>
        {[1, 2, 3, 4].map(level => (
          <IconButton
            key={level}
            size="small"
            sx={{ p: 0.1 }}
          >
            {importance >= level * 25 ? (
              <StarIcon sx={{ fontSize: 12, color: 'warning.main' }} />
            ) : (
              <StarBorderIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            )}
          </IconButton>
        ))}
      </Stack>
    );
  };

  return (
    <Stack spacing={2}>
      {/* Stats Card */}
      {statsCard && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" gap={1} alignItems="center">
            <Box sx={{ textAlign: 'center', minWidth: 56 }}>
              <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 700 }}>
                {statsCard.total}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                {t('memoryPanel.totalMemories')}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Box sx={{ textAlign: 'center', minWidth: 56 }}>
              <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 700 }}>
                {statsCard.avgImportance}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                {t('memoryPanel.avgImportance')}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Box sx={{ textAlign: 'center', minWidth: 44 }}>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700, color: 'success.main' }}>
                {statsCard.todayCount}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                {t('memoryPanel.today')}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 44 }}>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700 }}>
                {statsCard.yesterdayCount}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                {t('memoryPanel.yesterday')}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', minWidth: 44 }}>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700 }}>
                {statsCard.weekCount}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                {t('memoryPanel.thisWeek')}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Box sx={{ textAlign: 'center', minWidth: 44 }}>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700, color: 'warning.main' }}>
                {statsCard.highImportanceCount}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                ⭐ {t('memoryPanel.important')}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Search + Filter toggle */}
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder={t('memoryPanel.filterKeyword') + ' (try #tag)'}
          value={keywordFilter}
          onChange={(e) => onKeywordFilterChange(e.target.value)}
          sx={{ flex: 1, fontSize: 12 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16 }} />
              </InputAdornment>
            ),
            endAdornment: keywordFilter && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onKeywordFilterChange('')}>
                  <ClearIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button size="small" variant="outlined" onClick={() => setShowFilters(!showFilters)} sx={{ fontSize: 10 }}>
          <CalendarIcon sx={{ fontSize: 14, mr: 0.5 }} /> {t('memoryPanel.filters')}
        </Button>
        <Button
          size="small"
          variant={showStarredOnly ? 'contained' : 'outlined'}
          onClick={() => onShowStarredOnlyChange(!showStarredOnly)}
          sx={{ fontSize: 10 }}
          startIcon={<StarIcon sx={{ fontSize: 12 }} />}
        >
          ⭐
        </Button>
      </Stack>

      {/* Tag Filter Row */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
        <TagIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        {tagFilter.map(tag => (
          <Chip
            key={tag}
            label={`#${tag}`}
            size="small"
            onDelete={() => onRemoveTag(tag)}
            sx={{ fontSize: 10, height: 20, bgcolor: 'primary.main', color: 'white' }}
          />
        ))}
        <TextField
          size="small"
          placeholder={t('memoryPanel.addTag') || 'Add tag...'}
          value={tagSearchQuery}
          onChange={(e) => {
            onTagSearchQueryChange(e.target.value);
            if (!tagSearchAnchor) {
              onTagSearchAnchorChange(document.activeElement);
            }
          }}
          onFocus={(e) => onTagSearchAnchorChange(e.currentTarget)}
          sx={{ fontSize: 11, width: 100 }}
        />
        {tagSuggestions.length > 0 && (
          <Popper
            open={!!tagSearchAnchor && tagSuggestions.length > 0}
            anchorEl={tagSearchAnchor}
            placement="bottom-start"
          >
            <Paper sx={{ p: 0.5, minWidth: 120 }}>
              <MuiList dense disablePadding>
                {tagSuggestions.map(tag => (
                  <MuiListItem
                    key={tag}
                    button
                    dense
                    onClick={() => onAddTag(tag)}
                    sx={{ fontSize: 11, py: 0.25 }}
                  >
                    <Typography variant="caption" sx={{ fontSize: 11 }}>#{tag}</Typography>
                    {tagCounts[tag] && (
                      <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 'auto' }}>
                        {tagCounts[tag]}
                      </Typography>
                    )}
                  </MuiListItem>
                ))}
              </MuiList>
            </Paper>
          </Popper>
        )}
        <ClickAwayListener onClickAway={() => { onTagSearchAnchorChange(null); onTagSearchQueryChange(''); }}>
          <Box />
        </ClickAwayListener>
      </Stack>

      {/* Popular Tags */}
      {allTags.length > 0 && tagFilter.length === 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} alignItems="center">
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', mr: 0.5 }}>
            {t('memoryPanel.popularTags')}:
          </Typography>
          {allTags.slice(0, 10).map(tag => (
            <Chip
              key={tag}
              label={`#${tag}`}
              size="small"
              onClick={() => onAddTag(tag)}
              sx={{
                fontSize: 9,
                height: 16,
                bgcolor: 'rgba(255,255,255,0.05)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            />
          ))}
        </Stack>
      )}

      {/* Timeline Grouping */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
        {([
          { key: 'all', label: t('memoryPanel.all') },
          { key: 'today', label: t('memoryPanel.today') },
          { key: 'yesterday', label: t('memoryPanel.yesterday') },
          { key: 'thisWeek', label: t('memoryPanel.thisWeek') },
          { key: 'older', label: t('memoryPanel.older') },
        ] as const).map(({ key, label }) => {
          const count = key === 'all' ? undefined : (timelineGroups[key]?.length || 0);
          return (
            <Chip
              key={key}
              label={count !== undefined ? `${label} (${count})` : label}
              size="small"
              onClick={() => setTimelineGroup(key)}
              sx={{
                fontSize: 10,
                height: 22,
                bgcolor: timelineGroup === key ? 'primary.main' : 'rgba(255,255,255,0.08)',
              }}
            />
          );
        })}
      </Stack>

      {/* Advanced filters */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
          <Stack spacing={1.5}>
            {/* Date range */}
            <Box>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5 }}>
                {t('memoryPanel.dateRange')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  type="date"
                  label={t('memoryPanel.startDate')}
                  value={dateRange[0] ? new Date(dateRange[0]).toISOString().split('T')[0] : ''}
                  onChange={(e) => onDateRangeChange([e.target.value ? new Date(e.target.value).getTime() : null, dateRange[1]])}
                  sx={{ flex: 1, fontSize: 12 }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  type="date"
                  label={t('memoryPanel.endDate')}
                  value={dateRange[1] ? new Date(dateRange[1]).toISOString().split('T')[0] : ''}
                  onChange={(e) => onDateRangeChange([dateRange[0], e.target.value ? new Date(e.target.value).getTime() : null])}
                  sx={{ flex: 1, fontSize: 12 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>

            {/* Importance range */}
            <Box>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {t('memoryPanel.importanceRange')}: {importanceRange[0]} - {importanceRange[1]}
              </Typography>
              <Slider
                value={importanceRange}
                onChange={(_, v) => onImportanceRangeChange(v as [number, number])}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                size="small"
                valueLabelFormat={(v) => `${v}`}
              />
            </Box>
          </Stack>
        </Paper>
      </Collapse>

      {/* Type filter */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
        <Chip
          label={t('memoryPanel.all')}
          size="small"
          onClick={() => onTypeFilterChange('all')}
          sx={{
            fontSize: 10,
            height: 22,
            bgcolor: typeFilter === 'all' ? 'primary.main' : 'rgba(255,255,255,0.08)',
          }}
        />
        {(['conversation_summary', 'user_preference', 'pet_milestone', 'interaction_log', 'fact', 'preference', 'routine', 'custom'] as MemoryType[]).map(type => (
          <Chip
            key={type}
            label={i18next.t('memory.memoryTypes.' + type)}
            size="small"
            onClick={() => onTypeFilterChange(type)}
            sx={{
              fontSize: 10,
              height: 22,
              bgcolor: typeFilter === type ? MEMORY_TYPE_COLORS[type] : 'rgba(255,255,255,0.08)',
              color: typeFilter === type ? 'white' : 'inherit',
            }}
          />
        ))}
      </Stack>

      {/* Sort controls */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
          {t('memory.sortBy')}:
        </Typography>
        {(['recent', 'importance', 'frequency'] as const).map(sort => (
          <Chip
            key={sort}
            label={t(`memory.${sort}`)}
            size="small"
            onClick={() => onSortChange(sort)}
            sx={{
              fontSize: 10,
              height: 20,
              bgcolor: sortBy === sort ? 'primary.main' : 'transparent',
              border: sortBy === sort ? 'none' : '1px solid rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </Stack>

      {/* Memory list */}
      {loading ? (
        <LinearProgress />
      ) : displayMemories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <MemoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('memoryPanel.noMemories')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11 }}>
            {t('memoryPanel.noMemoriesHint')}
          </Typography>
        </Box>
      ) : (
        <List dense sx={{ p: 0 }}>
          {displayMemories.map(memory => (
            <ListItem
              key={memory.id}
              sx={{
                px: 1.5,
                py: 1,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: pinnedIds.has(memory.id) ? 'rgba(155,127,212,0.1)' : 'transparent',
                border: '1px solid',
                borderColor: pinnedIds.has(memory.id) ? 'primary.main' : 'transparent',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
              onClick={() => onOpen(memory.id)}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: 12 }}>
                    {getPersonaAvatar(memory.personaId)}
                  </Typography>
                  <Chip
                    label={i18next.t('memory.memoryTypes.' + memory.type)}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 8,
                      bgcolor: MEMORY_TYPE_COLORS[memory.type] + '33',
                      color: MEMORY_TYPE_COLORS[memory.type],
                    }}
                  />
                  {/* Importance Stars */}
                  {renderStars(memory.importance)}
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 'auto' }}>
                    {formatRelativeTime(memory.createdAt)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {memory.content}
                </Typography>
                {memory.tags.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                    {memory.tags.slice(0, 3).map(tag => (
                      <Typography key={tag} variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                        #{tag}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </Box>
              <ListItemSecondaryAction sx={{ right: 0 }}>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPin(memory.id); }}>
                    {pinnedIds.has(memory.id) ? <PinIcon sx={{ fontSize: 14, color: 'primary.main' }} /> : <UnpinIcon sx={{ fontSize: 14 }} />}
                  </IconButton>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(memory.id); }}>
                    <DeleteIcon sx={{ fontSize: 14, color: 'error.main' }} />
                  </IconButton>
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}

// Entities Tab
interface EntitiesTabProps {
  entityStats: {
    totalEntities: number;
    byType: Record<EntityType, number>;
    totalRelationships: number;
    mostConnected: Entity[];
  } | null;
  onRefresh: () => void;
}

function EntitiesTab({ entityStats, onRefresh }: EntitiesTabProps) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<EntityType | 'all'>('all');
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    loadEntities();
  }, [selectedType]);

  const loadEntities = async () => {
    try {
      if (selectedType === 'all') {
        const all = await searchEntities('');
        setEntities(all.slice(0, 50));
      } else {
        const byType = await getEntitiesByType(selectedType);
        setEntities(byType);
      }
    } catch (err) {
      console.error('Failed to load entities:', err);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" sx={{ fontSize: 12 }}>
          {t('memoryPanel.entityGraph')}
        </Typography>
        <IconButton size="small" onClick={() => { onRefresh(); loadEntities(); }}>
          <RefreshIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>

      {/* Stats */}
      {entityStats && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700 }}>
                {entityStats.totalEntities}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {t('memoryPanel.totalEntities')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700 }}>
                {entityStats.totalRelationships}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {t('memoryPanel.relationships')}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Type filter */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
        <Chip
          label={t('memoryPanel.allTypes')}
          size="small"
          onClick={() => setSelectedType('all')}
          sx={{ fontSize: 10, height: 22, bgcolor: selectedType === 'all' ? 'primary.main' : 'rgba(255,255,255,0.08)' }}
        />
        {Object.keys(entityStats?.byType || {}).map(type => (
          <Chip
            key={type}
            label={`${type} (${entityStats?.byType[type as EntityType] || 0})`}
            size="small"
            onClick={() => setSelectedType(type as EntityType)}
            sx={{ fontSize: 10, height: 22, bgcolor: selectedType === type ? 'primary.main' : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </Stack>

      {/* Entity list */}
      <List dense>
        {entities.map(entity => (
          <ListItem key={entity.id} sx={{ px: 1, py: 0.5 }}>
            <ListItemText
              primary={entity.name}
              secondary={`${entity.type} • ${entity.accessCount} ${t('memoryPanel.accesses')} • ${entity.memoryIds.length} ${t('memoryPanel.memories')}`}
              primaryTypographyProps={{ sx: { fontSize: 12 } }}
              secondaryTypographyProps={{ sx: { fontSize: 10 } }}
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

// Timeline Tab - shows memories sorted by createdAt descending as a timeline
interface TimelineTabProps {
  onRefresh: () => void;
}

function TimelineTab({ onRefresh }: TimelineTabProps) {
  const { t } = useTranslation();
  const [timelineMemories, setTimelineMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const all = await queryMemories({ limit: 100 });
      // Sort by createdAt descending (newest first)
      const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt);
      setTimelineMemories(sorted);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    }
    setLoading(false);
  };

  // Group memories by date (year-month-day)
  const groupedByDate: Record<string, MemoryEntry[]> = {};
  for (const m of timelineMemories) {
    const dateKey = new Date(m.createdAt).toISOString().split('T')[0];
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(m);
  }
  const dateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" sx={{ fontSize: 12 }}>
          {t('memoryPanel.timelineView')}
        </Typography>
        <IconButton size="small" onClick={() => { loadTimeline(); onRefresh(); }}>
          <RefreshIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>

      {loading ? (
        <LinearProgress />
      ) : timelineMemories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
            {t('memoryPanel.noMemories')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative', pl: 2 }}>
          {/* Vertical timeline line */}
          <Box sx={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, bgcolor: 'divider' }} />
          
          <Stack spacing={2}>
            {dateKeys.map(dateKey => (
              <Box key={dateKey} sx={{ position: 'relative' }}>
                {/* Date marker */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: -2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mr: 1, zIndex: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: 'primary.main' }}>
                    {formatDate(new Date(dateKey).getTime())}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 0.5 }}>
                    ({groupedByDate[dateKey].length} {t('memoryPanel.entries')})
                  </Typography>
                </Box>

                {/* Memories for this date */}
                <Stack spacing={0.5} sx={{ ml: 2 }}>
                  {groupedByDate[dateKey].map(memory => (
                    <Paper
                      key={memory.id}
                      sx={{
                        p: 1,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                      }}
                      onClick={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Chip
                          label={i18next.t('memory.memoryTypes.' + memory.type)}
                          size="small"
                          sx={{
                            height: 14,
                            fontSize: 7,
                            bgcolor: MEMORY_TYPE_COLORS[memory.type] + '33',
                            color: MEMORY_TYPE_COLORS[memory.type],
                          }}
                        />
                        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>
                          {new Date(memory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 9, color: 'primary.main', ml: 'auto' }}>
                          {memory.importance}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 11,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: expandedId === memory.id ? 'pre-wrap' : 'nowrap',
                          maxHeight: expandedId === memory.id ? 'none' : 40,
                        }}
                      >
                        {memory.content}
                      </Typography>
                      {memory.tags.length > 0 && expandedId === memory.id && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                          {memory.tags.map(tag => (
                            <Typography key={tag} variant="caption" sx={{ fontSize: 8, color: 'text.secondary' }}>
                              #{tag}
                            </Typography>
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

// Insights Tab - word cloud + memory distribution
interface InsightsTabProps {
  insights: string[];
  stats: MemoryStats | null;
  entityStats: {
    totalEntities: number;
    byType: Record<EntityType, number>;
    totalRelationships: number;
    mostConnected: Entity[];
  } | null;
  memories: MemoryEntry[];
}

function InsightsTab({ insights, stats, entityStats, memories }: InsightsTabProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate word cloud from memory content
  useEffect(() => {
    if (!canvasRef.current || memories.length === 0) return;

    // Extract words from memory content
    const wordCounts: Record<string, number> = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if', 'about', 'after', 'before', 'above', 'below', 'between', 'into', 'through', 'during', 'under', 'again', 'further', 'because', 'as', 'until', 'while', 'out', 'over', 'up', 'down', 'from', 'like', 'get', 'got', 'go', 'went', 'come', 'came', 'make', 'made', 'take', 'took', 'see', 'saw', 'know', 'knew', 'think', 'thought', 'want', 'use', 'find', 'give', 'tell', 'try', 'leave', 'call']);

    for (const memory of memories) {
      const words = memory.content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));
      
      for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    // Get top 20 words
    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => [word, Math.max(12, Math.min(48, count * 4))] as [string, number]);

    if (topWords.length === 0) return;

    // Draw word cloud
    try {
      const colors = Object.values(MEMORY_TYPE_COLORS);
      WordCloud(canvasRef.current, {
        list: topWords,
        gridSize: 6,
        weightFactor: 1,
        fontFamily: 'Roboto, sans-serif',
        color: () => colors[Math.floor(Math.random() * colors.length)] || '#9B7FD4',
        backgroundColor: 'transparent',
        rotateRatio: 0.3,
        minSize: 10,
        maxSpeed: 3,
      });
    } catch (err) {
      console.error('Word cloud error:', err);
    }
  }, [memories]);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontSize: 12 }}>
        {t('memoryPanel.memoryInsights')}
      </Typography>

      {/* Word Cloud */}
      {memories.length > 0 && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 1, display: 'block' }}>
            {t('memoryPanel.wordCloud')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
            <canvas ref={canvasRef} width={400} height={180} style={{ maxWidth: '100%' }} />
          </Box>
        </Paper>
      )}

      {/* Generated insights */}
      {insights.length > 0 ? (
        <Stack spacing={1}>
          {insights.map((insight, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 1.5,
                bgcolor: 'rgba(155,127,212,0.1)',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <InsightIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {insight}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <InsightIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
            {t('memoryPanel.chatMoreForInsights')}
          </Typography>
        </Box>
      )}

      {/* Memory distribution */}
      {stats && stats.totalEntries > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ fontSize: 12, mt: 1 }}>
            {t('memoryPanel.memoryDistribution')}
          </Typography>
          <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
            <Stack spacing={1}>
              {(Object.entries(stats.byType) as [MemoryType, number][]).map(([type, count]) => (
                <Box key={type}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {i18next.t('memory.memoryTypes.' + type)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10 }}>
                      {count}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(count / stats.totalEntries) * 100}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: MEMORY_TYPE_COLORS[type],
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </>
      )}

      {/* Most connected entities */}
      {entityStats && entityStats.mostConnected.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ fontSize: 12, mt: 1 }}>
            {t('memoryPanel.mostConnected')}
          </Typography>
          <Stack spacing={0.5}>
            {entityStats.mostConnected.slice(0, 5).map((entity, idx) => (
              <Paper
                key={entity.id}
                sx={{
                  p: 1,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', width: 16 }}>
                  {idx + 1}.
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 11, flex: 1 }}>
                  {entity.name}
                </Typography>
                <Chip label={entity.type} size="small" sx={{ height: 16, fontSize: 8 }} />
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}

// Emotion Timeline Tab - shows emotion logs with trend visualization
interface EmotionTimelineTabProps {
  logs: EmotionLogEntry[];
  warning: string | null;
  onRefresh: () => void;
}

function EmotionTimelineTab({ logs, warning, onRefresh }: EmotionTimelineTabProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group logs by date
  const groupedByDate = groupEmotionLogsByDate(logs);
  const dateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Get current (most recent) emotion
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

  // Calculate emotion distribution
  const distribution = calculateEmotionDistribution(logs);

  // Emotion colors
  const emotionColors: Record<TextEmotion, string> = {
    happy: '#FFD700',
    calm: '#4CAF50',
    anxious: '#FF9800',
    angry: '#F44336',
    sad: '#2196F3',
    excited: '#E91E63',
    exhausted: '#9E9E9E',
    unknown: '#757575',
  };

  const handleExport = () => {
    downloadEmotionLogs();
    alert(t('emotionPanel.exportSuccess'));
  };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" sx={{ fontSize: 12 }}>
          {t('emotionPanel.emotionTrend')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleExport}
            startIcon={<DownloadIcon sx={{ fontSize: 12 }} />}
            sx={{ fontSize: 10, py: 0.25, px: 1 }}
          >
            {t('emotionPanel.exportEmotions')}
          </Button>
          <IconButton size="small" onClick={onRefresh}>
            <RefreshIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      </Stack>

      {/* Current Emotion Card */}
      {latestLog && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h4" sx={{ fontSize: 32 }}>
              {getTextEmotionEmoji(latestLog.emotion)}
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {t('emotionPanel.currentEmotion')}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 14, fontWeight: 600 }}>
                {getTextEmotionLabel(latestLog.emotion, (key) => t(key))}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {t('emotionPanel.intensity')}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 14, fontWeight: 600 }}>
                {latestLog.intensity}%
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Emotion Warning (P1 feature) */}
      {warning && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1, border: '1px solid rgba(33, 150, 243, 0.3)' }}>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            {warning}
          </Typography>
        </Paper>
      )}

      {/* Emotion Distribution (Simple Bar Chart) */}
      {logs.length > 0 && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 1, display: 'block' }}>
            {t('emotionPanel.emotionDistribution')}
          </Typography>
          <Stack spacing={0.5}>
            {Object.entries(distribution)
              .filter(([_, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([emotion, count]) => {
                const percentage = logs.length > 0 ? Math.round((count / logs.length) * 100) : 0;
                return (
                  <Box key={emotion} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: 10, width: 60 }}>
                      {getTextEmotionEmoji(emotion as TextEmotion)} {t('emotion.' + emotion)}
                    </Typography>
                    <Box sx={{ flex: 1, height: 8, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          width: `${percentage}%`,
                          height: '100%',
                          bgcolor: emotionColors[emotion as TextEmotion],
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', width: 30, textAlign: 'right' }}>
                      {percentage}%
                    </Typography>
                  </Box>
                );
              })}
          </Stack>
        </Paper>
      )}

      {/* Emotion Timeline */}
      {logs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <EmotionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
            {t('emotionPanel.noEmotionData')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
            {t('emotionPanel.startChatHint')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative', pl: 2 }}>
          {/* Vertical timeline line */}
          <Box sx={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, bgcolor: 'divider' }} />

          <Stack spacing={2}>
            {dateKeys.map(dateKey => (
              <Box key={dateKey} sx={{ position: 'relative' }}>
                {/* Date marker */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: -2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: emotionColors[groupedByDate[dateKey][0]?.emotion as TextEmotion] || '#757575',
                      mr: 1,
                      zIndex: 1,
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: 'primary.main' }}>
                    {formatDate(new Date(dateKey).getTime())}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 0.5 }}>
                    ({groupedByDate[dateKey].length} {t('memoryPanel.entries')})
                  </Typography>
                </Box>

                {/* Emotion entries for this date */}
                <Stack spacing={0.5} sx={{ ml: 2 }}>
                  {groupedByDate[dateKey].map(log => (
                    <Paper
                      key={log.id}
                      sx={{
                        p: 1,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                      }}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: 16 }}>
                          {getTextEmotionEmoji(log.emotion)}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600 }}>
                          {getTextEmotionLabel(log.emotion, (key) => t(key))}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 'auto' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      {expandedId === log.id && (
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                              {t('emotionPanel.intensity')}:
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: emotionColors[log.emotion] }}>
                              {log.intensity}%
                            </Typography>
                            <Chip
                              label={log.source === 'voice' ? 'Voice' : 'Text'}
                              size="small"
                              sx={{ height: 14, fontSize: 7 }}
                            />
                          </Stack>
                          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                            {log.context}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

export default MemoryPanel;
