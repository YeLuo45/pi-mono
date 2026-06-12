// V83 AgentThoughtBubble Component
// V89 Updated: Added Skill call status display
// 思考气泡

import React from 'react';
import { MyTypography as Typography, MyIconButton, MyPaper, MyChip as Chip, MyCircularProgress as CircularProgress , MyAvatar as Avatar } from '../MUI替代';
import { Box } from '../ui/Box';
import { agentRegistry } from '../../services/agents/AgentRegistry';

interface AgentThoughtBubbleProps {
  agentId: string;
  content: string;
  type: 'thought' | 'action' | 'result' | 'critique' | 'skill';
  skillName?: string;
  skillStatus?: 'pending' | 'running' | 'completed' | 'failed';
  confidence?: number;
  suggestions?: string[];
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
  skill: {
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    icon: '🎯',
    label: '技能',
  },
};

export const AgentThoughtBubble: React.FC<AgentThoughtBubbleProps> = ({
  agentId,
  content,
  type,
  skillName,
  skillStatus,
  confidence,
  suggestions,
}) => {
  const agent = agentRegistry.get(agentId);
  const agentName = agent?.name || agentId;
  const agentIcon = agent?.icon || '🤖';
  const style = TYPE_STYLES[type] || TYPE_STYLES.thought;

  // Skill status colors
  const SKILL_STATUS_COLORS: Record<string, string> = {
    pending: '#9ca3af',
    running: '#f59e0b',
    completed: '#10b981',
    failed: '#ef4444',
  };

  const getSkillStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'running': return '执行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return '';
    }
  };

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
          
          {/* V89: Skill status display */}
          {type === 'skill' && skillName && (
            <Chip
              label={skillName}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: 'rgba(139, 92, 246, 0.2)',
                color: '#7c3aed',
              }}
            />
          )}
          {type === 'skill' && skillStatus && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {skillStatus === 'running' && (
                <CircularProgress size={10} sx={{ color: SKILL_STATUS_COLORS[skillStatus] }} />
              )}
              <Chip
                label={getSkillStatusLabel(skillStatus)}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 10,
                  bgcolor: `${SKILL_STATUS_COLORS[skillStatus]}20`,
                  color: SKILL_STATUS_COLORS[skillStatus],
                }}
              />
            </Box>
          )}
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
        
        {/* V89: Confidence and suggestions display */}
        {type === 'skill' && confidence !== undefined && (
          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
              置信度: {Math.round(confidence * 100)}%
            </Typography>
            {confidence < 0.5 && (
              <Chip
                label="低置信度"
                size="small"
                sx={{
                  height: 16,
                  fontSize: 9,
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                }}
              />
            )}
          </Box>
        )}
        
        {/* V89: Suggestions display */}
        {type === 'skill' && suggestions && suggestions.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
              建议: {suggestions.slice(0, 2).join(' → ')}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AgentThoughtBubble;
