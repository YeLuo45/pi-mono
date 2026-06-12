/**
 * ChatHistorySearchDialog - Semantic search through chat history
 * 
 * Users can input a natural language query and search through
 * all their chat messages using semantic similarity.
 */

import React, { useState, useEffect } from 'react';
import { MyDialog as Dialog , MyDialogContent as DialogContent, MyDialogTitle as DialogTitle } from '../MUI替代';
import { MyBox as Box, MyTextField as TextField, MyTypography as Typography, MyIconButton as IconButton, MyPaper as Paper, MyList as List, MyListItem as ListItem, MyChip as Chip, MyInputAdornment as InputAdornment, MyCircularProgress as CircularProgress } from '../MUI替代';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { embedText } from '../../services/rag/messageEmbedding';
import { searchSimilar } from '../../services/storage/embeddingStorage';
import { useStore } from '../../store';
import type { Message } from '../../types';

interface ChatHistorySearchDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  messageId: string;
  score: number;
  message: Message | null;
}

export const ChatHistorySearchDialog: React.FC<ChatHistorySearchDialogProps> = ({
  open,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const messages = useStore((s) => s.messages);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setSearched(false);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setSearched(true);

    try {
      // Embed the query
      const queryEmbedding = await embedText(query.trim());
      
      if (queryEmbedding.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Search similar message embeddings
      const similar = await searchSimilar(queryEmbedding, 10);

      // Map messageIds to full messages with scores
      const messageMap = new Map(messages.map(m => [m.id, m]));
      
      const searchResults: SearchResult[] = similar.map(({ messageId, score }) => ({
        messageId,
        score,
        message: messageMap.get(messageId) || null,
      })).filter(r => r.message !== null);

      setResults(searchResults);
    } catch (err) {
      console.warn('[ChatHistorySearchDialog] Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatScore = (score: number) => {
    return `${(score * 100).toFixed(0)}%`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 13, 25, 0.98)',
          border: '1px solid rgba(155, 127, 212, 0.25)',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
            🔍 搜索历史消息
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Search input */}
        <TextField
          fullWidth
          size="small"
          placeholder="输入关键词搜索历史消息，例如：计算机相关"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoFocus
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            mb: 2,
            '& .MuiInputBase-root': {
              fontSize: 13,
              borderRadius: 1.5,
              bgcolor: 'var(--bg-input)',
              border: '1px solid var(--separator)',
              '&:hover': { borderColor: 'var(--border-strong)' },
              '&.Mui-focused': {
                boxShadow: '0 0 0 2px color-mix(in srgb, var(--system-blue) 30%, transparent)',
                borderColor: 'var(--system-blue)',
              },
            },
            '& .MuiInputBase-input': {
              color: 'var(--text-primary)',
              '&::placeholder': { color: 'var(--text-placeholder)', opacity: 1 },
            },
          }}
        />

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ color: 'var(--system-blue)' }} />
          </Box>
        )}

        {/* Empty state - not searched yet */}
        {!loading && !searched && (
          <Box sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
              输入查询词，点击回车搜索历史消息
            </Typography>
          </Box>
        )}

        {/* Empty state - no results */}
        {!loading && searched && results.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
              未找到相关内容，请尝试其他关键词
            </Typography>
          </Box>
        )}

        {/* Results list */}
        {!loading && results.length > 0 && (
          <List disablePadding sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {results.map((result) => {
              const msg = result.message!;
              const isUser = msg.role === 'user';

              return (
                <ListItem
                  key={result.messageId}
                  disablePadding
                  sx={{ mb: 1 }}
                >
                  <Paper
                    sx={{
                      width: '100%',
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: isUser ? 'var(--chat-user-tint)' : 'var(--bg-elevated)',
                      border: '1px solid var(--separator)',
                      '&:hover': {
                        borderColor: 'var(--system-blue)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      {/* Role indicator */}
                      <Chip
                        size="small"
                        label={isUser ? '你' : 'AI'}
                        sx={{
                          height: 18,
                          fontSize: 10,
                          fontWeight: 600,
                          bgcolor: isUser ? 'color-mix(in srgb, var(--system-blue) 30%, transparent)' : 'color-mix(in srgb, var(--system-purple, #AF52DE) 30%, transparent)',
                          color: isUser ? 'var(--system-blue)' : 'var(--system-purple, #AF52DE)',
                          flexShrink: 0,
                        }}
                      />

                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: 13,
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                            mb: 0.5,
                          }}
                        >
                          {msg.content}
                        </Typography>

                        {/* Meta row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ fontSize: 10, color: '#62666d' }}>
                            {formatTime(msg.timestamp)}
                          </Typography>
                          <Chip
                            size="small"
                            label={`相似度 ${formatScore(result.score)}`}
                            sx={{
                              height: 16,
                              fontSize: 9,
                              bgcolor: 'var(--chat-user-tint)',
                              color: 'rgba(155, 127, 212, 0.9)',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Copy button */}
                      <IconButton
                        size="small"
                        onClick={() => handleCopyContent(msg.content)}
                        sx={{
                          color: 'text.secondary',
                          p: 0.5,
                          opacity: 0.6,
                          '&:hover': { opacity: 1, color: 'var(--text-primary)' },
                        }}
                      >
                        <CopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </Paper>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatHistorySearchDialog;
