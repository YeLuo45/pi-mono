/**
 * CollaborationChat.tsx — V41 Real-time Message Stream
 * 
 * Displays multi-role discussion in topological order with:
 * - Message cards with avatar (emoji), bubble, timestamp
 * - CircularProgress indicator for currently-running role
 * - Auto-scroll to bottom on new messages
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import { useStore } from '../../store';
import type { CollaborationMessage, PersonaRole, Subtask } from '../../services/collaboration/types';
import { getRoleEmoji, getRoleDisplayName } from '../../services/collaboration/personaRoleRegistry';

// Role emoji mapping (PRD specified emojis)
// Note: getRoleEmoji uses 📊 for EmotionAnalyst and 💡 for Advisor
// Using the PRD-specified ones for consistency with design spec
const ROLE_EMOJI: Record<PersonaRole, string> = {
  MemoryExpert: '🧠',
  EmotionAnalyst: '💜',
  Advisor: '🎯',
  Researcher: '🔍',
  Coder: '💻',
};

const ROLE_LABELS: Record<PersonaRole, string> = {
  MemoryExpert: 'memoryExpert',
  EmotionAnalyst: 'emotionAnalyst',
  Advisor: 'advisor',
  Researcher: 'researcher',
  Coder: 'coder',
};

// ============================================================================
// Message Card Component
// ============================================================================

interface MessageCardProps {
  message: CollaborationMessage;
  isActive?: boolean; // Whether this role is currently thinking
}

const MessageCard: React.FC<MessageCardProps> = ({ message, isActive }) => {
  const { t } = useTranslation();
  const emoji = ROLE_EMOJI[message.role] || '👤';
  const roleLabel = ROLE_LABELS[message.role] || message.role;
  
  const formattedTime = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          maxWidth: '85%',
          mb: 1.5,
        }}
      >
        {/* Role header with avatar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mb: 0.5,
          }}
        >
          <Typography sx={{ fontSize: 16 }}>{emoji}</Typography>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: 'text.secondary',
              letterSpacing: '0.02em',
            }}
          >
            {roleLabel}
          </Typography>
          {isActive && (
            <CircularProgress
              size={10}
              thickness={6}
              sx={{ color: '#863bff', ml: 0.5 }}
            />
          )}
        </Box>

        {/* Message bubble */}
        <Box
          sx={{
            position: 'relative',
            bgcolor: 'rgba(134, 59, 255, 0.08)',
            border: '1px solid rgba(134, 59, 255, 0.15)',
            borderRadius: 2,
            borderTopLeftRadius: 4,
            px: 1.5,
            py: 1,
            width: '100%',
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.55,
            }}
          >
            {message.content}
          </Typography>
          
          {/* Timestamp */}
          <Typography
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 10,
              fontSize: 10,
              color: 'text.disabled',
              letterSpacing: '0.02em',
            }}
          >
            {formattedTime}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

// ============================================================================
// Typing Indicator (for currently-running role)
// ============================================================================

interface TypingIndicatorProps {
  role: PersonaRole;
  message: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ role, message }) => {
  const { t } = useTranslation();
  const emoji = ROLE_EMOJI[role] || '👤';
  const roleLabel = t('collab.role.' + ROLE_LABELS[role]) || role;

  return (
    <Fade in timeout={200}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          maxWidth: '85%',
          mb: 1.5,
        }}
      >
        {/* Role header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Typography sx={{ fontSize: 16 }}>{emoji}</Typography>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            {roleLabel}
          </Typography>
          <CircularProgress
            size={10}
            thickness={6}
            sx={{ color: '#863bff', ml: 0.5 }}
          />
        </Box>

        {/* Animated bubble */}
        <Box
          sx={{
            bgcolor: 'rgba(134, 59, 255, 0.08)',
            border: '1px solid rgba(134, 59, 255, 0.15)',
            borderRadius: 2,
            borderTopLeftRadius: 4,
            px: 1.5,
            py: 1,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: '#863bff',
                  opacity: 0.6,
                  animation: 'bounce 1.2s infinite',
                  animationDelay: `${i * 0.15}s`,
                  '@keyframes bounce': {
                    '0%, 80%, 100%': {
                      transform: 'translateY(0)',
                      opacity: 0.6,
                    },
                    '40%': {
                      transform: 'translateY(-4px)',
                      opacity: 1,
                    },
                  },
                }}
              />
            ))}
          </Box>
          
          <Typography
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 10,
              fontSize: 10,
              color: 'text.disabled',
            }}
          >
            {t('collab.chat.thinking')}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

// ============================================================================
// Arrow Connector (visual flow indicator between messages)
// ============================================================================

const ArrowConnector: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'flex-start',
      pl: 3,
      py: 0.25,
      opacity: 0.4,
    }}
  >
    <Typography
      sx={{
        fontSize: 14,
        color: 'primary.main',
      }}
    >
      ↓
    </Typography>
  </Box>
);

// ============================================================================
// Topological Message Queue
// ============================================================================

interface MessageNode {
  message: CollaborationMessage;
  dependencies: string[]; // IDs of messages this depends on
  level: number; // Topological level
}

function buildTopologicalOrder(
  subtasks: Subtask[],
  messages: CollaborationMessage[]
): MessageNode[] {
  // Build a map of subtask -> level based on dependencies
  const subtaskLevels = new Map<string, number>();
  
  // Get execution order levels from subtasks
  for (const subtask of subtasks) {
    if (subtask.dependencies.length === 0) {
      subtaskLevels.set(subtask.id, 0);
    }
  }
  
  // Calculate levels based on dependencies
  let changed = true;
  while (changed) {
    changed = false;
    for (const subtask of subtasks) {
      if (!subtaskLevels.has(subtask.id)) {
        const allDepsHaveLevel = subtask.dependencies.every(
          (depId) => subtaskLevels.has(depId)
        );
        if (allDepsHaveLevel && subtask.dependencies.length > 0) {
          const maxDepLevel = Math.max(
            ...subtask.dependencies.map((depId) => subtaskLevels.get(depId) ?? 0)
          );
          subtaskLevels.set(subtask.id, maxDepLevel + 1);
          changed = true;
        }
      }
    }
  }

  // Build message nodes with levels
  const nodes: MessageNode[] = messages.map((msg) => {
    const subtask = subtasks.find(
      (s) => s.id === msg.subtaskId || msg.content.includes(getRoleDisplayName(msg.role))
    );
    const level = subtask ? subtaskLevels.get(subtask.id) ?? 0 : 0;
    const dependencies = subtask?.dependencies ?? [];
    
    return {
      message: msg,
      dependencies,
      level,
    };
  });

  // Sort by level, then by timestamp
  return nodes.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.message.timestamp - b.message.timestamp;
  });
}

// ============================================================================
// Main CollaborationChat Component
// ============================================================================

interface CollaborationChatProps {
  className?: string;
}

export const CollaborationChat: React.FC<CollaborationChatProps> = ({
 className }) => {
  const { t } = useTranslation();
  const collaborationMode = useStore((s) => s.collaborationMode);
  const collaborationProgress = useStore((s) => s.collaborationProgress);
  
  // Internal state for message stream
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [activeRole, setActiveRole] = useState<PersonaRole | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  
  // Refs for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Find currently running role from progress
  const runningProgress = collaborationProgress.find((p) => p.status === 'running');
  const currentlyRunningRole = runningProgress
    ? (runningProgress.role as PersonaRole)
    : null;

  // Subscribe to store changes and simulate message stream
  // In a real implementation, this would listen to orchestrator events
  useEffect(() => {
    if (!collaborationMode) {
      setMessages([]);
      setActiveRole(null);
      setPendingMessage('');
      return;
    }

    // Build messages from completed progress items
    const newMessages: CollaborationMessage[] = collaborationProgress
      .filter((p) => p.status === 'done' && p.output)
      .map((p) => ({
        id: `msg_${p.role}_${Date.now()}`,
        sessionId: 'session',
        role: p.role as PersonaRole,
        personaId: p.role.toLowerCase(),
        content: p.output || '',
        timestamp: Date.now() - Math.random() * 1000, // Approximate timestamp
        type: 'contribution' as const,
        subtaskId: `subtask_${p.role}`,
      }));

    // Only update if messages actually changed
    if (newMessages.length !== prevMessagesLengthRef.current) {
      setMessages((prev) => {
        // Merge new messages without duplicates
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id));
        if (uniqueNew.length === 0) return prev;
        return [...prev, ...uniqueNew].sort((a, b) => a.timestamp - b.timestamp);
      });
      prevMessagesLengthRef.current = newMessages.length;
    }

    // Update active role for typing indicator
    if (runningProgress) {
      setActiveRole(runningProgress.role as PersonaRole);
      setPendingMessage(runningProgress.output || t('collab.chat.processing'));
    } else {
      setActiveRole(null);
      setPendingMessage('');
    }
  }, [collaborationMode, collaborationProgress, runningProgress]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeRole]);

  // If collaboration mode is off, don't render anything
  if (!collaborationMode) return null;

  // Build ordered message list
  const orderedNodes = buildTopologicalOrder(
    collaborationProgress.map((p) => ({
      id: `subtask_${p.role}`,
      type: 'memory_retrieval' as const,
      description: '',
      params: {},
      responsible: p.role as PersonaRole,
      status: p.status === 'done' ? 'completed' : p.status === 'running' ? 'running' : 'pending',
      dependencies: [],
      createdAt: Date.now(),
    })),
    messages
  );

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: '1px solid rgba(134, 59, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('collab.chat.title')}
        </Typography>
        {activeRole && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <CircularProgress size={6} thickness={6} sx={{ color: '#863bff' }} />
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
              {t('collab.role.' + ROLE_LABELS[activeRole])}{t('collab.chat.roleThinking')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: 1.5,
          py: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {orderedNodes.length === 0 && !activeRole ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
              {t('collab.chat.waiting')}
            </Typography>
          </Box>
        ) : (
          <>
            {orderedNodes.map((node, index) => (
              <React.Fragment key={node.message.id}>
                {/* Arrow connector between messages */}
                {index > 0 && <ArrowConnector />}
                
                <MessageCard
                  message={node.message}
                  isActive={false}
                />
              </React.Fragment>
            ))}

            {/* Typing indicator for active role */}
            {activeRole && (
              <>
                {orderedNodes.length > 0 && <ArrowConnector />}
                <TypingIndicator
                  role={activeRole}
                  message={pendingMessage}
                />
              </>
            )}
          </>
        )}
        
        {/* Invisible element for scroll anchoring */}
        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
};

export default CollaborationChat;
