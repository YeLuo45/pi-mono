/**
 * SourceList - List of knowledge sources with add/delete/search
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MyListItemButton } from '../MUI替代';

import { MyDialog, MyListItemSecondaryAction } from '../MUI替代';
import { MyBox, MyTypography, MyButton, MyTextField, MyInputAdornment, MyIconButton, MyChip, MyTooltip, MyList, MyListItem, MyListItemText, MyCircularProgress } from '../MUI替代';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Article as ArticleIcon,
  Language as UrlIcon,
  Note as NoteIcon,
  Description as TextIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { SourceCard } from './SourceCard';
import { AddSourceDialog } from './AddSourceDialog';
import { getAllSources, deleteSource } from '../../services/rag/sourceStorage';
import { searchSources } from '../../services/rag/knowledgeBase';
import type { KnowledgeSource } from '../../services/rag/types';

interface SourceListProps {
  onSelectSource: (source: KnowledgeSource | null) => void;
  selectedSource: KnowledgeSource | null;
  onSourceDeleted: () => void;
}

const TYPE_ICONS = {
  text: <TextIcon sx={{ fontSize: 16 }} />,
  file: <ArticleIcon sx={{ fontSize: 16 }} />,
  url: <UrlIcon sx={{ fontSize: 16 }} />,
  note: <NoteIcon sx={{ fontSize: 16 }} />,
};

export const SourceList: React.FC<SourceListProps> = ({
  onSelectSource,
  selectedSource,
  onSourceDeleted,
}) => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = searchQuery.trim()
        ? await searchSources(searchQuery)
        : await getAllSources();
      setSources(results);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSource(id);
      if (selectedSource?.id === id) {
        onSelectSource(null);
      }
      onSourceDeleted();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleSourceAdded = () => {
    setShowAddDialog(false);
    loadSources();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>
          Sources
        </Typography>
        
        {/* Search */}
        <TextField
          size="small"
          fullWidth
          placeholder="Search sources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1, '& .MuiInputBase-input': { fontSize: 13 } }}
        />
        
        {/* Add Button */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setShowAddDialog(true)}
          sx={{ fontSize: 12, py: 0.75 }}
        >
          Add Source
        </Button>
      </Box>

      {/* Source List */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : sources.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, opacity: 0.6 }}>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              No sources found
            </Typography>
            {searchQuery && (
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                Try a different search term
              </Typography>
            )}
          </Box>
        ) : (
          <List dense disablePadding>
            {sources.map((source) => (
              <ListItem
                key={source.id}
                disablePadding
                secondaryAction={
                  <ListItemSecondaryAction>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(source.id);
                        }}
                        sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: 'error.main' } }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                }
              >
                <ListItemButton
                  selected={selectedSource?.id === source.id}
                  onClick={() => onSelectSource(source)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%', pr: 4 }}>
                    <Box sx={{ mt: 0.25, color: 'text.secondary' }}>
                      {TYPE_ICONS[source.type]}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 12,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {source.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={source.type}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 9,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', alignSelf: 'center' }}>
                          {source.metadata.size} chars
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Add Source Dialog */}
      <AddSourceDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSourceAdded={handleSourceAdded}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: 16 }}>Delete Source</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            Are you sure you want to delete this source? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} size="small">
            Cancel
          </Button>
          <Button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            color="error"
            size="small"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
