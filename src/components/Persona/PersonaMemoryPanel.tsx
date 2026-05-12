/**
 * V90: PersonaMemoryPanel - Memory browser with timeline view
 * Displays persona memories in a timeline format with filtering and search
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Divider,
  Slider,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  Timeline as TimelineIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocalOffer as TagIcon,
  EmojiEmotions as EmotionIcon,
  Star as StarIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Lightbulb as InsightIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import {
  queryPersonaMemories,
  getPersonaMemory,
  deletePersonaMemory,
  updatePersonaMemory,
  addPersonaMemory,
  getMemoryStatsV90,
} from '../../services/persona/memoryStore';
import { calculateMemoryStrength } from '../../services/persona/memoryManager';
import type { PersonaMemory, MemoryTypeV90 } from '../../services/persona/v90Types';

interface PersonaMemoryPanelProps {
  personaId: string;
}

const TYPE_COLORS: Record<MemoryTypeV90, string> = {
  event: '#3b82f6',
  emotion: '#ec4899',
  preference: '#f59e0b',
  fact: '#10b981',
};

const TYPE_ICONS: Record<MemoryTypeV90, string> = {
  event: '📅',
  emotion: '💝',
  preference: '⭐',
  fact: '📚',
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 30) return formatDate(timestamp);
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

export const PersonaMemoryPanel: React.FC<PersonaMemoryPanelProps> = ({ personaId }) => {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<PersonaMemory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MemoryTypeV90 | 'all'>('all');
  const [selectedMemory, setSelectedMemory] = useState<PersonaMemory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editImportance, setEditImportance] = useState(5);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalMemories: number;
    byType: Record<MemoryTypeV90, number>;
    averageStrength: number;
    highPriorityCount: number;
  } | null>(null);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const query: any = { personaId };
      if (searchQuery) query.keyword = searchQuery;
      if (selectedType !== 'all') query.type = selectedType;

      const results = await queryPersonaMemories(query);
      setMemories(results);

      const statsData = await getMemoryStatsV90(personaId);
      setStats(statsData as any);
    } catch (err) {
      console.error('Failed to load memories:', err);
    }
    setLoading(false);
  }, [personaId, searchQuery, selectedType]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条记忆吗？')) {
      await deletePersonaMemory(id);
      loadMemories();
    }
  };

  const handleEdit = (memory: PersonaMemory) => {
    setSelectedMemory(memory);
    setEditContent(memory.content);
    setEditImportance(memory.importance);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMemory) return;
    await updatePersonaMemory(selectedMemory.id, {
      content: editContent,
      importance: editImportance,
    });
    setEditDialogOpen(false);
    loadMemories();
  };

  const handleAddMemory = () => {
    setSelectedMemory(null);
    setEditContent('');
    setEditImportance(5);
    setEditDialogOpen(true);
  };

  const filteredMemories = memories.filter((m) => {
    if (selectedType !== 'all' && m.type !== selectedType) return false;
    return true;
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon /> 记忆浏览器
        </Typography>
        <Button startIcon={<InsightIcon />} size="small" onClick={handleAddMemory}>
          添加记忆
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              <Typography variant="h6">{stats.totalMemories}</Typography>
              <Typography variant="caption" color="text.secondary">记忆总数</Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#f5f5f5' }}>
              <Typography variant="h6">{stats.averageStrength}</Typography>
              <Typography variant="caption" color="text.secondary">平均强度</Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#fff3e0' }}>
              <Typography variant="h6" sx={{ color: '#f59e0b' }}>{stats.byType.emotion || 0}</Typography>
              <Typography variant="caption" color="text.secondary">情感记忆</Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#e8f5e9' }}>
              <Typography variant="h6" sx={{ color: '#10b981' }}>{stats.highPriorityCount}</Typography>
              <Typography variant="caption" color="text.secondary">重要记忆</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Search */}
      <TextField
        size="small"
        placeholder="搜索记忆..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
        fullWidth
      />

      {/* Type Filter */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label="全部"
          color={selectedType === 'all' ? 'primary' : 'default'}
          onClick={() => setSelectedType('all')}
          size="small"
        />
        {(['event', 'emotion', 'preference', 'fact'] as MemoryTypeV90[]).map((type) => (
          <Chip
            key={type}
            icon={<span>{TYPE_ICONS[type]}</span>}
            label={{ event: '事件', emotion: '情感', preference: '偏好', fact: '事实' }[type]}
            color={selectedType === type ? 'primary' : 'default'}
            onClick={() => setSelectedType(type)}
            size="small"
            sx={{ bgcolor: selectedType === type ? TYPE_COLORS[type] + '20' : undefined }}
          />
        ))}
      </Stack>

      {/* Timeline */}
      {loading ? (
        <LinearProgress />
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {filteredMemories.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <TimelineIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              <Typography>暂无记忆</Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {filteredMemories.map((memory) => {
                const strength = calculateMemoryStrength(memory);
                return (
                  <Card
                    key={memory.id}
                    sx={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${TYPE_COLORS[memory.type]}`,
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 3 },
                    }}
                    onClick={() => setSelectedMemory(memory)}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                              {memory.content.length > 60 ? memory.content.slice(0, 60) + '...' : memory.content}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              size="small"
                              icon={<span>{TYPE_ICONS[memory.type]}</span>}
                              label={{ event: '事件', emotion: '情感', preference: '偏好', fact: '事实' }[memory.type]}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeTime(memory.lastAccessedAt)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              强度: {strength}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(memory); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedMemory ? '编辑记忆' : '添加记忆'}
          <IconButton onClick={() => setEditDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="记忆内容"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <Typography gutterBottom>重要性: {editImportance}</Typography>
          <Slider
            min={0}
            max={10}
            step={1}
            value={editImportance}
            onChange={(_, v) => setEditImportance(v as number)}
            marks={[
              { value: 0, label: '0' },
              { value: 5, label: '5' },
              { value: 10, label: '10' },
            ]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={!editContent.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedMemory && !editDialogOpen}
        onClose={() => setSelectedMemory(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedMemory && (
          <>
            <DialogTitle sx={{ borderBottom: `4px solid ${TYPE_COLORS[selectedMemory.type]}` }}>
              <Chip
                icon={<span>{TYPE_ICONS[selectedMemory.type]}</span>}
                label={{ event: '事件', emotion: '情感', preference: '偏好', fact: '事实' }[selectedMemory.type]}
                size="small"
                sx={{ mr: 1 }}
              />
              记忆详情
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {selectedMemory.content}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">创建时间</Typography>
                  <Typography variant="body2">{formatDate(selectedMemory.createdAt)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">最后访问</Typography>
                  <Typography variant="body2">{formatDate(selectedMemory.lastAccessedAt)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">重要性</Typography>
                  <Typography variant="body2">{selectedMemory.importance}/10</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">访问次数</Typography>
                  <Typography variant="body2">{selectedMemory.accessCount}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">当前强度</Typography>
                  <Typography variant="body2">{calculateMemoryStrength(selectedMemory)}</Typography>
                </Grid>
              </Grid>
              {selectedMemory.tags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">标签</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                    {selectedMemory.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedMemory(null)}>关闭</Button>
              <Button onClick={() => handleEdit(selectedMemory)}>编辑</Button>
              <Button color="error" onClick={() => { handleDelete(selectedMemory.id); setSelectedMemory(null); }}>
                删除
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
