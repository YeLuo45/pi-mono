/**
 * RetrievalPanel - Query input and results display
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
import { retrieve } from '../../services/rag/knowledgeBase';
import type { KnowledgeSource, RetrievalResult } from '../../services/rag/types';

interface RetrievalPanelProps {
  onSelectSource: (source: KnowledgeSource) => void;
}

export const RetrievalPanel: React.FC<RetrievalPanelProps> = ({ onSelectSource }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const retrievalResults = await retrieve(query, 5);
      setResults(retrievalResults);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#52c775';
    if (score >= 0.6) return '#f5c542';
    return '#f26875';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>
          🔍 Retrieval Test
        </Typography>
        
        {/* Search Input */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Ask a question about your knowledge base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
            InputProps={{
              sx: { fontSize: 13 },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            sx={{ minWidth: 80, fontSize: 12 }}
          >
            {isSearching ? <CircularProgress size={18} color="inherit" /> : 'Search'}
          </Button>
        </Box>
      </Box>

      {/* Results */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {!hasSearched ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.5,
            }}
          >
            <SearchIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              Enter a query to search your knowledge base
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
              Results will show relevant chunks with relevance scores
            </Typography>
          </Box>
        ) : results.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              No relevant results found
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
              Try rephrasing your question
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                Found {results.length} relevant chunks
              </Typography>
            </Box>

            {results.map(({ chunk, source, score }, index) => (
              <Paper
                key={chunk.id}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => onSelectSource(source)}
              >
                {/* Result Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={`#${index + 1}`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: index === 0 ? 'primary.main' : 'action.hover',
                      color: index === 0 ? 'white' : 'text.primary',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                  <ArticleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 12,
                      fontWeight: 500,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {source.title}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: `${getScoreColor(score)}20`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: getScoreColor(score),
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 10, fontWeight: 500, color: getScoreColor(score) }}
                    >
                      {(score * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>

                {/* Chunk Preview */}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'text.secondary',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {chunk.text}
                </Typography>

                {/* Tags */}
                {source.metadata.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    {source.metadata.tags.slice(0, 2).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 9,
                          bgcolor: 'action.hover',
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
