import React, { useState } from 'react';
import { Box } from '../ui/Box';
import { ExpandMore as ExpandIcon, ExpandLess as CollapseIcon } from '@mui/icons-material';

interface CollapsiblePanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  onToggle,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <Box
      sx={{
        border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'var(--color-bg-paper, #0f1011)',
      }}
    >
      {/* Header */}
      <Box
        component="button"
        onClick={handleToggle}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-primary, #f7f8f8)',
          transition: 'background-color 0.15s ease',
          '&:hover': {
            bgcolor: 'var(--color-button-hover, rgba(255,255,255,0.05))',
          },
        }}
      >
        {icon && (
          <Box sx={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        )}
        <Box
          component="span"
          sx={{
            flex: 1,
            textAlign: 'left',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {title}
        </Box>
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            color: 'var(--color-text-secondary, #d0d6e0)',
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          {expanded ? <CollapseIcon sx={{ fontSize: 18 }} /> : <ExpandIcon sx={{ fontSize: 18 }} />}
        </Box>
      </Box>

      {/* Content - CSS transition with conditional render */}
      <Box
        sx={{
          overflow: 'hidden',
          maxHeight: expanded ? '1000px' : '0',
          opacity: expanded ? 1 : 0,
          transition: 'max-height 0.2s ease-in-out, opacity 0.15s ease',
        }}
      >
        <Box sx={{ px: 2, pb: 2 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default CollapsiblePanel;
