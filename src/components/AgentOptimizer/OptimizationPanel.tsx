/**
 * Optimization Panel Component for V100 Agent Optimizer
 */

import React, { useState, useEffect } from 'react';
import { MyBox as Box, MyTypography as Typography, MyCard as Card, MyButton as Button, MyChip as Chip, MyIconButton as IconButton, MyCollapse as Collapse, MyList, MyListItem, MyDivider as Divider, MyAlert as Alert, MyCircularProgress as CircularProgress , MySwitch as Switch } from '../MUI替代';
import {
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  AutoFixHigh as OptimizeIcon, CheckCircle as ApplyIcon, Close as RejectIcon,
} from '@mui/icons-material';
import { analyzer } from '../../services/agentOptimizer/analyzer';
import { optimizer } from '../../services/agentOptimizer/optimizer';
import type { OptimizationSuggestion } from '../../types/agentOptimizer';

const impactColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const typeLabels: Record<string, string> = {
  add_retry: '🔁 Add Retry',
  improve_prompt: '📝 Improve Prompt',
  add_critic: '🔍 Add Critic',
  change_workflow: '🔄 Change Workflow',
  switch_model: '⚡ Switch Model',
};

interface SuggestionItemProps {
  suggestion: OptimizationSuggestion;
  onApply: (s: OptimizationSuggestion) => void;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, onApply }) => {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    setApplying(true);
    const success = await optimizer.applyOptimization(suggestion);
    setApplying(false);
    if (success) {
      setApplied(true);
      setTimeout(() => onApply(suggestion), 1500);
    }
  };

  return (
    <Card sx={{ mb: 1.5, border: '1px solid rgba(100,100,100,0.15)' }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
                {suggestion.title}
              </Typography>
              <Chip
                label={typeLabels[suggestion.type] || suggestion.type}
                size="small"
                sx={{ height: 16, fontSize: 9 }}
              />
              <Chip
                label={suggestion.impact.toUpperCase()}
                size="small"
                sx={{
                  height: 16,
                  fontSize: 9,
                  bgcolor: `${impactColors[suggestion.impact]}20`,
                  color: impactColors[suggestion.impact],
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
              {suggestion.agentName} • Confidence: {(suggestion.confidence * 100).toFixed(0)}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {suggestion.autoApplicable && (
              <Chip
                label="Auto"
                size="small"
                sx={{ height: 16, fontSize: 8, bgcolor: 'rgba(99, 102, 241, 0.2)', color: '#6366f1' }}
              />
            )}
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <CollapseIcon sx={{ fontSize: 18 }} /> : <ExpandIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              {suggestion.description}
            </Typography>
          </Box>
        </Collapse>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: expanded ? 1.5 : 0 }}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={() => setExpanded(!expanded)}
            sx={{ fontSize: 11, minWidth: 60 }}
          >
            {expanded ? 'Less' : 'Details'}
          </Button>
          {!applied ? (
            <Button
              size="small"
              variant="contained"
              onClick={handleApply}
              disabled={applying}
              startIcon={applying ? <CircularProgress size={12} color="inherit" /> : <ApplyIcon sx={{ fontSize: 14 }} />}
              sx={{
                fontSize: 11,
                minWidth: 80,
                bgcolor: impactColors[suggestion.impact],
                '&:hover': { bgcolor: impactColors[suggestion.impact] },
              }}
            >
              {applying ? 'Applying...' : 'Apply'}
            </Button>
          ) : (
            <Chip
              icon={<ApplyIcon sx={{ fontSize: 12 }} />}
              label="Applied"
              size="small"
              sx={{ height: 24, fontSize: 10, bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
            />
          )}
        </Box>
      </Box>
    </Card>
  );
};

export const OptimizationPanel: React.FC = () => {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  useEffect(() => {
    const loadSuggestions = () => {
      const data = analyzer.analyzePerformanceData();
      setSuggestions(data);
      setLastAnalyzed(new Date().toLocaleTimeString());
      setLoading(false);
    };

    loadSuggestions();
    const interval = setInterval(loadSuggestions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSuggestionApplied = (applied: OptimizationSuggestion) => {
    setSuggestions(prev => prev.filter(s => s.id !== applied.id));
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const data = analyzer.analyzePerformanceData();
      setSuggestions(data);
      setLastAnalyzed(new Date().toLocaleTimeString());
      setLoading(false);
    }, 500);
  };

  const highPriority = suggestions.filter(s => s.impact === 'high');
  const mediumPriority = suggestions.filter(s => s.impact === 'medium');
  const lowPriority = suggestions.filter(s => s.impact === 'low');

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
            💡 Optimization Suggestions
          </Typography>
          {lastAnalyzed && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              Last analyzed: {lastAnalyzed}
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={handleRefresh}
          disabled={loading}
          sx={{ fontSize: 11 }}
        >
          {loading ? 'Analyzing...' : 'Refresh'}
        </Button>
      </Box>

      {suggestions.length === 0 && !loading && (
        <Alert severity="success" sx={{ mb: 2 }}>
          🎉 All agents are performing well! No optimization suggestions at this time.
        </Alert>
      )}

      {highPriority.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={`High Priority (${highPriority.length})`}
              size="small"
              sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
            />
          </Box>
          {highPriority.map(suggestion => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              onApply={handleSuggestionApplied}
            />
          ))}
        </>
      )}

      {mediumPriority.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={`Medium Priority (${mediumPriority.length})`}
              size="small"
              sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
            />
          </Box>
          {mediumPriority.map(suggestion => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              onApply={handleSuggestionApplied}
            />
          ))}
        </>
      )}

      {lowPriority.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={`Low Priority (${lowPriority.length})`}
              size="small"
              sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
            />
          </Box>
          {lowPriority.map(suggestion => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              onApply={handleSuggestionApplied}
            />
          ))}
        </>
      )}
    </Box>
  );
};