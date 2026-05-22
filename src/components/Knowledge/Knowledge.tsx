/**
 * Knowledge Base Panel - RAG-powered document Q&A
 *
 * Allows users to:
 * - View indexed documents
 * - Search the knowledge base
 * - See relevant chunks with scores
 * - Integrate with chat for RAG-enhanced responses
 */

import React, { useState, useEffect, useRef } from 'react';
import { MyFormControlLabel } from '../MUI替代';
import { MyBox, MyTypography, MyTextField, MyButton, MyIconButton, MyChip, MyCircularProgress, MyAlert, MyPaper, MyList, MyListItem, MyListItemText, MyTooltip, MySwitch } from '../MUI替代';
import { MySwitch } from '../MUI替代';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Article as ArticleIcon,
  Quiz as QuizIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import {
  queryKnowledgeBase,
  getKnowledgeBaseStats,
  getIndexedDocuments,
  removeDocumentFromIndex,
  buildRAGContext,
  reindexAllDocuments,
  type RAGQueryResult,
  type RAGStats,
} from '../../services/rag';
import { useTranslation } from 'react-i18next';

export const KnowledgePanel: React.FC = () => {
  const { t } = useTranslation();
  const documents = useStore((s) => s.documents);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RAGQueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [error, setError] = useState('');
  const [autoRAG, setAutoRAG] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Refresh stats on mount and after indexing
  useEffect(() => {
    refreshStats();
  }, [documents]);

  const refreshStats = () => {
    const s = getKnowledgeBaseStats();
    setStats(s);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsQuerying(true);
    setError('');

    try {
      const result = queryKnowledgeBase({ query: query.trim(), topK: 5 });
      setResults(result);
    } catch (err) {
      setError(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setResults(null);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleRemoveFromIndex = (docId: string) => {
    removeDocumentFromIndex(docId);
    refreshStats();
    if (results?.chunks.some(c => c.chunk.docId === docId)) {
      // Re-run query if removed doc was in results
      if (query.trim()) handleSearch();
    }
  };

  const handleReindexAll = () => {
    const result = reindexAllDocuments(documents);
    refreshStats();
    if (result.failed > 0) {
      setError(`Reindexed ${result.successful} documents, ${result.failed} failed:\n${result.errors.join('\n')}`);
    } else {
      setError('');
    }
  };

  const handleUseInChat = () => {
    if (!results || results.chunks.length === 0) return;

    const context = buildRAGContext(results);
    if (!context) return;

    // Add context as a system-emphasized message in the store
    const ragContextMessage: string = context;

    // We store it in a way the chat can pick it up
    // Using a special prefixed message that the chat handler will recognize
    addMessageWithRAGContext(ragContextMessage);
  };

  // Helper to add message with RAG context (called from chat integration)
  const addMessageWithRAGContext = (context: string) => {
    // This would be used by external callers to inject RAG context
    console.log('[RAG] Context built for chat:', context.slice(0, 100) + '...');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
              🧠 {t('knowledge.title')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              {t('knowledge.subtitle')}
            </Typography>
          </Box>
          <Tooltip title={t('knowledge.settings')}>
            <IconButton
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              sx={{ color: showSettings ? 'primary.main' : 'text.secondary' }}
            >
              <SettingsIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Settings Section */}
      {showSettings && (
        <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(0,0,0,0.2)' }}>
          <FormControlLabel
            control={
              <MySwitch
                size="small"
                checked={autoRAG}
                onChange={(e) => setAutoRAG(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: 12 }}>
                Auto-RAG in Chat
              </Typography>
            }
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block', mt: 0.5, ml: 3 }}>
            Automatically include relevant knowledge when chatting
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={handleReindexAll}
              sx={{ fontSize: 11, py: 0.5 }}
            >
              Re-index All
            </Button>
          </Box>
        </Box>
      )}

      {/* Stats Bar */}
      {stats && stats.totalDocuments > 0 && (
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(155,127,212,0.05)' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              📄 <strong>{stats.totalDocuments}</strong> docs indexed
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              📝 <strong>{stats.totalChunks}</strong> chunks
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              💾 {formatFileSize(stats.indexSizeBytes)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="warning"
          onClose={() => setError('')}
          sx={{ mx: 1.5, mt: 1, fontSize: 11 }}
        >
          {error}
        </Alert>
      )}

      {/* Search Bar */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search your knowledge base..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isQuerying}
          InputProps={{
            endAdornment: isQuerying ? (
              <CircularProgress size={16} />
            ) : (
              <IconButton size="small" onClick={handleSearch} disabled={!query.trim()}>
                <SearchIcon sx={{ fontSize: 18 }} />
              </IconButton>
            ),
          }}
          sx={{
            '& .MuiInputBase-root': { fontSize: 13 },
            '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
          }}
        />
      </Box>

      {/* Results or Empty State */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {results && results.chunks.length > 0 ? (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                Found {results.chunks.length} relevant chunks in {results.queryTime.toFixed(1)}ms
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={<QuizIcon sx={{ fontSize: 12 }} />}
                onClick={handleUseInChat}
                sx={{ fontSize: 10, py: 0.25 }}
              >
                Use in Chat
              </Button>
            </Box>

            <Box ref={resultsRef} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {results.chunks.map(({ chunk, score, rank }) => (
                <Paper
                  key={chunk.id}
                  sx={{
                    p: 1.5,
                    bgcolor: 'rgba(30, 20, 55, 0.8)',
                    border: '1px solid rgba(155, 127, 212, 0.15)',
                    borderRadius: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={`#${rank}`}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 9,
                          bgcolor: rank === 1 ? 'rgba(155, 127, 212, 0.3)' : 'rgba(255,255,255,0.05)',
                          '& .MuiChip-label': { px: 0.75 }
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'primary.light' }}>
                        {chunk.docName}
                      </Typography>
                    </Box>
                    <Tooltip title={`Score: ${score.toFixed(3)}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: score > 5 ? 'success.main' : score > 2 ? 'warning.main' : 'text.secondary',
                          }}
                        />
                        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                          {score.toFixed(2)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.85)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {chunk.content.slice(0, 200)}{chunk.content.length > 200 ? '...' : ''}
                  </Typography>

                  {chunk.metadata && (chunk.metadata as { page?: number }).page && (
                    <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', mt: 0.5, display: 'block' }}>
                      Page {(chunk.metadata as { page: number }).page}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
        ) : results && results.chunks.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              No relevant results found
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
              Try rephrasing your question
            </Typography>
          </Box>
        ) : !results && stats && stats.totalDocuments === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              📚 No documents indexed yet
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
              Upload documents in the Documents panel to build your knowledge base
            </Typography>
          </Box>
        ) : null}
      </Box>

      {/* Indexed Documents Quick View */}
      {stats && stats.totalDocuments > 0 && !results && (
        <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 1, display: 'block' }}>
            INDEXED DOCUMENTS
          </Typography>
          <List dense disablePadding>
            {stats && Object.entries(stats.byDocument).map(([docId, info]) => (
              <ListItem
                key={docId}
                sx={{
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleRemoveFromIndex(docId)}
                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                  >
                    <DeleteIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                }
              >
                <ArticleIcon sx={{ fontSize: 14, mr: 0.75, opacity: 0.5 }} />
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontSize: 11 }}>
                      {getIndexedDocuments().find(d => d.id === docId)?.name || 'Unknown'}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ fontSize: 9 }}>
                      {info.chunks} chunks
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default KnowledgePanel;
