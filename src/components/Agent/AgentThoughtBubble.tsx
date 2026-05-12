// V83 AgentThoughtBubble Component
// 思考气泡

import React from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import { agentRegistry } from '../../services/agents/AgentRegistry';

interface AgentThoughtBubbleProps {
  agentId: string;
  content: string;
  type: 'thought' | 'action' | 'result' | 'critique';
}

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  thought: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: '💭',
    label: '思考',
  },
  action: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    icon: '⚡',
    label: '执行',
  },
  result: {
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    icon: '✅',
    label: '结果',
  },
  critique: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: '🔍',
    label: '审查',
  },
};

export const AgentThoughtBubble: React.FC<AgentThoughtBubbleProps> = ({
  agentId,
  content,
  type,
}) => {
  const agent = agentRegistry.get(agentId);
  const agentName = agent?.name || agentId;
  const agentIcon = agent?.icon || '🤖';
  const style = TYPE_STYLES[type] || TYPE_STYLES.thought;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        p: 1,
        borderRadius: 1,
        bgcolor: style.bg,
        border: '1px solid',
        borderColor: style.border,
      }}
    >
      <Avatar
        sx={{
          width: 24,
          height: 24,
          fontSize: 12,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {agentIcon}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {agentName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {style.icon} {style.label}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            color: 'text.primary',
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {content}
        </Typography>
      </Box>
    </Box>
  );
};

export default AgentThoughtBubble;
