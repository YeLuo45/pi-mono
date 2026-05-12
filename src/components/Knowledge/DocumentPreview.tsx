/**
 * DocumentPreview - Full content display for selected source
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Article as ArticleIcon,
  Language as UrlIcon,
  Note as NoteIcon,
  Description as TextIcon,
  AccessTime as TimeIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import type { KnowledgeSource } from '../../services/rag/types';

interface DocumentPreviewProps {
  source: KnowledgeSource;
  onClose?: () => void;
}

const TYPE_ICONS = {
  text: <TextIcon />,
  file: <ArticleIcon />,
  url: <UrlIcon />,
  note: <NoteIcon />,
};

const TYPE_COLORS = {
  text: '#4a52b8',
  file: '#52c775',
  url: '#1456f0',
  note: '#ea5ec1',
};

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ source, onClose }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${TYPE_COLORS[source.type]}20`,
            color: TYPE_COLORS[source.type],
            flexShrink: 0,
          }}
        >
          {TYPE_ICONS[source.type]}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {source.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Chip
              label={source.type}
              size="small"
              sx={{
                height: 16,
                fontSize: 9,
                bgcolor: `${TYPE_COLORS[source.type]}20`,
                color: TYPE_COLORS[source.type],
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
              {source.metadata.size.toLocaleString()} chars
            </Typography>
          </Box>
        </Box>
        {onClose && (
          <Tooltip title="Close preview">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Meta Info */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <TimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            Created: {formatDate(source.metadata.createdAt)}
          </Typography>
        </Box>
        {source.metadata.source && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
              Source: {source.metadata.source}
            </Typography>
          </Box>
        )}
        
        {/* Tags */}
        {source.metadata.tags.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
            <TagIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
            {source.metadata.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 10,
                  bgcolor: 'action.hover',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {source.content}
        </Typography>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
          sx={{ fontSize: 11 }}
          color="error"
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
};
