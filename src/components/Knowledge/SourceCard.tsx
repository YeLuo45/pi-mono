/**
 * SourceCard - Display card for a knowledge source
 */

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Language as UrlIcon,
  Note as NoteIcon,
  Description as TextIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import type { KnowledgeSource } from '../../services/rag/types';

interface SourceCardProps {
  source: KnowledgeSource;
  selected?: boolean;
  onClick?: () => void;
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

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  selected = false,
  onClick,
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${TYPE_COLORS[source.type]}20`,
            color: TYPE_COLORS[source.type],
          }}
        >
          {TYPE_ICONS[source.type]}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
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
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            {source.metadata.size.toLocaleString()} chars
          </Typography>
        </Box>
      </Box>

      {/* Tags */}
      {source.metadata.tags.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {source.metadata.tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 18,
                fontSize: 9,
                bgcolor: 'action.hover',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}
          {source.metadata.tags.length > 3 && (
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', alignSelf: 'center' }}>
              +{source.metadata.tags.length - 3}
            </Typography>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
          {formatDate(source.metadata.createdAt)}
        </Typography>
        {source.metadata.source && (
          <>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
              •
            </Typography>
            <Tooltip title={source.metadata.source}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 100,
                }}
              >
                {source.metadata.source}
              </Typography>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  );
};
