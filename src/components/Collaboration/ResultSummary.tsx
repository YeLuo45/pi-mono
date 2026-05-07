/**
 * ResultSummary.tsx — V41 Phase 1
 * Final aggregated output display after collaboration completes
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Divider, Collapse, Chip } from '@mui/material';
import {
  CheckCircle as CheckIcon,
  ContentCopy as CopyIcon,
  Refresh as NewCollabIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import type { Subtask, SubtaskResult } from '../../services/collaboration/types';
import { getRoleEmoji, getRoleDisplayName } from '../../services/collaboration/personaRoleRegistry';

interface RoleResult {
  role: string;
  emoji: string;
  label: string;
  output: string;
  confidence: number;
}

interface ResultSummaryProps {
  /** The original user request */
  userRequest?: string;
  /** Subtasks that were executed */
  subtasks?: Subtask[];
  /** Results from each role */
  results?: Map<string, SubtaskResult> | RoleResult[];
  /** Final aggregated conclusion text */
  finalConclusion?: string;
  /** When the session started */
  startedAt?: number;
  /** When the session completed */
  completedAt?: number;
  /** Whether the session failed */
  failed?: boolean;
  /** Error message if failed */
  error?: string;
  /** Duration in seconds */
  durationSeconds?: number;
  /** Called when user clicks "Copy" */
  onCopy?: (text: string) => void;
  /** Called when user clicks "New Collaboration" */
  onNewCollaboration?: () => void;
  className?: string;
}

/**
 * ResultSummary displays the final aggregated collaboration result
 * with role contributions and action buttons.
 */
export const ResultSummary: React.FC<ResultSummaryProps> = ({

  userRequest,
  subtasks = [],
  results,
  finalConclusion,
  startedAt,
  completedAt,
  failed = false,
  error,
  durationSeconds,
  onCopy,
  onNewCollaboration,
  className,
}) => {
  const { t } = useTranslation();
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Normalize results to RoleResult array
  const roleResults: RoleResult[] = React.useMemo(() => {
    if (Array.isArray(results)) {
      return results;
    }

    if (results instanceof Map) {
      return Array.from(results.values()).map(r => ({
        role: r.role,
        emoji: getRoleEmoji(r.role as any),
        label: getRoleDisplayName(r.role as any),
        output: r.output,
        confidence: r.confidence,
      }));
    }

    // Fallback: build from subtasks
    return subtasks
      .filter(s => s.status === 'completed' && s.result)
      .map(s => ({
        role: s.responsible,
        emoji: getRoleEmoji(s.responsible as any),
        label: getRoleDisplayName(s.responsible as any),
        output: String(s.result),
        confidence: 0.8,
      }));
  }, [results, subtasks]);

  // Calculate stats
  const completedCount = subtasks.filter(s => s.status === 'completed').length;
  const failedCount = subtasks.filter(s => s.status === 'failed').length;
  const totalCount = subtasks.length;

  // Calculate duration
  const duration = durationSeconds ?? (
    startedAt && completedAt
      ? Math.round((completedAt - startedAt) / 1000)
      : null
  );

  const handleCopy = () => {
    const text = finalConclusion || roleResults.map(r => `${r.emoji} ${r.label}: ${r.output}`).join('\n\n');
    if (onCopy) {
      onCopy(text);
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <Box className={className} sx={{ p: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <CheckIcon sx={{ fontSize: 16, color: failed ? '#f44336' : '#4caf50' }} />
        <Typography
          sx={{
            fontSize: 11,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {failed ? t('collab.result.failed') : t('collab.result.completed')}
        </Typography>
        {duration !== null && (
          <>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
              {t('collab.result.duration')} {duration}s
            </Typography>
          </>
        )}
      </Box>

      {/* User request context */}
      {userRequest && (
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            mb: 1.5,
            bgcolor: 'rgba(134, 59, 255, 0.06)',
            borderRadius: 1,
            border: '1px solid rgba(134, 59, 255, 0.12)',
          }}
        >
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.25 }}>
            {t('collab.result.task')}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.primary' }}>
            {userRequest}
          </Typography>
        </Box>
      )}

      {/* Error state */}
      {failed && error && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            mb: 1.5,
            bgcolor: 'rgba(244, 67, 54, 0.08)',
            borderRadius: 1,
            border: '1px solid rgba(244, 67, 54, 0.2)',
          }}
        >
          <Typography sx={{ fontSize: 11, color: '#f44336' }}>
            ❌ {error}
          </Typography>
        </Box>
      )}

      {/* Final conclusion */}
      {finalConclusion && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            mb: 1.5,
            bgcolor: 'rgba(134, 59, 255, 0.08)',
            borderRadius: 1,
            border: '1px solid rgba(134, 59, 255, 0.15)',
          }}
        >
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.5 }}>
            {t('collab.result.conclusion')}
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {finalConclusion}
          </Typography>
        </Box>
      )}

      {/* Stats chips */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={`✅ ${completedCount} {t('collab.result.completed_count')}`}
          sx={{
            height: 20,
            fontSize: 10,
            bgcolor: 'rgba(76, 175, 80, 0.1)',
            color: '#4caf50',
            border: '1px solid rgba(76, 175, 80, 0.2)',
          }}
        />
        {failedCount > 0 && (
          <Chip
            size="small"
            label={`❌ ${failedCount} {t('collab.result.failed_count')}`}
            sx={{
              height: 20,
              fontSize: 10,
              bgcolor: 'rgba(244, 67, 54, 0.1)',
              color: '#f44336',
              border: '1px solid rgba(244, 67, 54, 0.2)',
            }}
          />
        )}
        <Chip
          size="small"
          label={`${"RESULT_total_count"} ${totalCount} {t('collab.result.task')}`}
          sx={{
            height: 20,
            fontSize: 10,
            bgcolor: 'rgba(134, 59, 255, 0.08)',
            color: '#863bff',
            border: '1px solid rgba(134, 59, 255, 0.15)',
          }}
        />
        {duration !== null && (
          <Chip
            size="small"
            label={`⏱ ${duration}s`}
            sx={{
              height: 20,
              fontSize: 10,
              bgcolor: 'rgba(255, 152, 0, 0.08)',
              color: '#ff9800',
              border: '1px solid rgba(255, 152, 0, 0.15)',
            }}
          />
        )}
      </Box>

      {/* Role contributions */}
      {roleResults.length > 0 && (
        <>
          <Divider sx={{ mb: 1, borderColor: 'rgba(134, 59, 255, 0.1)' }} />

          {/* Section header with expand toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
              cursor: 'pointer',
            }}
            onClick={() => setDetailsExpanded(!detailsExpanded)}
          >
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('collab.result.roleDetails')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                {detailsExpanded ? t('collab.result.collapse') : t('collab.result.expand')}
              </Typography>
              {detailsExpanded ? (
                <CollapseIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              ) : (
                <ExpandIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              )}
            </Box>
          </Box>

          <Collapse in={detailsExpanded}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {roleResults.map((result, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 1,
                    border: '1px solid rgba(134, 59, 255, 0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 14 }}>{result.emoji}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                      {result.label}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography
                      sx={{
                        fontSize: 9,
                        color: 'text.disabled',
                        fontFamily: 'monospace',
                      }}
                    >
                      {Math.round(result.confidence * 100)}%
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: 'text.secondary',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                    }}
                  >
                    {result.output}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button
          size="small"
          startIcon={<CopyIcon sx={{ fontSize: 14 }} />}
          onClick={handleCopy}
          sx={{
            flex: 1,
            fontSize: 11,
            color: 'text.secondary',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          {t('collab.result.copy')}
        </Button>
        <Button
          size="small"
          startIcon={<NewCollabIcon sx={{ fontSize: 14 }} />}
          onClick={onNewCollaboration}
          sx={{
            flex: 1,
            fontSize: 11,
            color: '#863bff',
            bgcolor: 'rgba(134, 59, 255, 0.1)',
            border: '1px solid rgba(134, 59, 255, 0.2)',
            '&:hover': {
              bgcolor: 'rgba(134, 59, 255, 0.15)',
            },
          }}
        >
          {t('collab.result.newCollab')}
        </Button>
      </Box>
    </Box>
  );
};

export default ResultSummary;
