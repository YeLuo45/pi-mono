/**
 * V154: EvolutionTimeline - Timeline of evolution events
 * 
 * Displays a horizontal scrollable timeline of evolution events over the last 7 days,
 * filterable by event type, with expandable details and JSON export functionality.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MyBox,
  MyTypography,
  MyPaper,
  MyButton,
  MyCheckbox,
  MyStack,
  MyChip,
  MyIconButton,
  MyTooltip,
  MyCollapse,
  MyDivider,
} from '../MUI替代';
import {
  Event as EventIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timeline as TimelineIcon,
  Pattern as PatternIcon,
  Speed as StrategyIcon,
  Spellcheck as SkillIcon,
  TouchApp as OverrideIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { EvolutionEvent } from '../../stores/evolutionStore';

interface EvolutionTimelineProps {
  /** Evolution events to display */
  events: EvolutionEvent[];
  /** Currently selected event ID */
  selectedEventId: string | null;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when an event is selected */
  onSelectEvent?: (eventId: string | null) => void;
  /** Callback to export events as JSON */
  onExportEvents?: (events: EvolutionEvent[]) => void;
}

interface EventTypeConfig {
  type: EvolutionEvent['type'];
  label: string;
  icon: React.ReactNode;
  color: string;
}

const EVENT_TYPE_CONFIGS: EventTypeConfig[] = [
  { type: 'pattern_detected', label: 'Pattern Detected', icon: <PatternIcon fontSize="small" />, color: '#8884d8' },
  { type: 'strategy_optimized', label: 'Strategy Optimized', icon: <StrategyIcon fontSize="small" />, color: '#82ca9d' },
  { type: 'skill_crystallized', label: 'Skill Crystallized', icon: <SkillIcon fontSize="small" />, color: '#00C49F' },
  { type: 'manual_override', label: 'Manual Override', icon: <OverrideIcon fontSize="small" />, color: '#ffc658' },
];

const EVENT_TYPE_MAP = new Map(EVENT_TYPE_CONFIGS.map((c) => [c.type, c]));

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TimelineItemProps {
  event: EvolutionEvent;
  isSelected: boolean;
  onSelect: () => void;
  onExpand: () => void;
  isExpanded: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  event,
  isSelected,
  onSelect,
  onExpand,
  isExpanded,
}) => {
  const config = EVENT_TYPE_MAP.get(event.type) || EVENT_TYPE_CONFIGS[0];

  return (
    <MyPaper
      sx={{
        minWidth: 280,
        maxWidth: 320,
        p: 2,
        cursor: 'pointer',
        borderTop: `4px solid ${config.color}`,
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={onSelect}
    >
      <MyBox sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <MyBox sx={{ color: config.color, mt: 0.5 }}>
          {config.icon}
        </MyBox>
        <MyBox sx={{ flex: 1 }}>
          <MyTypography variant="body2" sx={{ fontWeight: 500 }}>
            {event.title}
          </MyTypography>
          <MyTypography variant="caption" color="text.secondary">
            {formatTimestamp(event.timestamp)}
          </MyTypography>
        </MyBox>
        <MyIconButton size="small" onClick={(e) => { e.stopPropagation(); onExpand(); }}>
          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </MyIconButton>
      </MyBox>

      <MyCollapse in={isExpanded}>
        <MyBox sx={{ mt: 1.5, pt: 1.5 }}>
          <MyTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {event.description}
          </MyTypography>
          
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <>
              <MyDivider sx={{ my: 1 }} />
              <MyTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Metadata:
              </MyTypography>
              <MyBox
                component="pre"
                sx={{
                  fontSize: 10,
                  bgcolor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 100,
                }}
              >
                {JSON.stringify(event.metadata, null, 2)}
              </MyBox>
            </>
          )}
          
          <MyTypography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {formatFullDate(event.timestamp)}
          </MyTypography>
        </MyBox>
      </MyCollapse>
    </MyPaper>
  );
};

export const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({
  events,
  selectedEventId,
  isLoading = false,
  onSelectEvent,
  onExportEvents,
}) => {
  const { t } = useTranslation();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<EvolutionEvent['type']>>(
    new Set(['pattern_detected', 'strategy_optimized', 'skill_crystallized', 'manual_override'])
  );

  // Filter events by type and last 7 days
  const filteredEvents = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return events
      .filter((e) => e.timestamp > sevenDaysAgo && activeFilters.has(e.type))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [events, activeFilters]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EvolutionEvent[]> = {};
    for (const event of filteredEvents) {
      const dateKey = new Date(event.timestamp).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    }
    return grouped;
  }, [filteredEvents]);

  // Handle filter toggle
  const handleFilterToggle = (type: EvolutionEvent['type']) => {
    setActiveFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  // Handle expand/collapse
  const handleExpand = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  // Handle export
  const handleExport = () => {
    if (onExportEvents) {
      onExportEvents(filteredEvents);
    } else {
      // Default export behavior
      const jsonStr = JSON.stringify(filteredEvents, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evolution-events-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const activeFilterCount = activeFilters.size;

  if (isLoading) {
    return (
      <MyBox sx={{ p: 2 }}>
        <MyTypography>Loading events...</MyTypography>
      </MyBox>
    );
  }

  return (
    <MyBox sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <MyBox>
          <MyTypography variant="h6">Evolution Timeline</MyTypography>
          <MyTypography variant="caption" color="text.secondary">
            Last 7 days • {filteredEvents.length} events
          </MyTypography>
        </MyBox>
        <MyStack direction="row" spacing={1}>
          <MyTooltip title={showFilters ? 'Hide Filters' : 'Show Filters'}>
            <MyIconButton
              size="small"
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? 'primary' : 'default'}
            >
              <FilterIcon fontSize="small" />
            </MyIconButton>
          </MyTooltip>
          <MyTooltip title="Export JSON">
            <MyIconButton size="small" onClick={handleExport}>
              <DownloadIcon fontSize="small" />
            </MyIconButton>
          </MyTooltip>
        </MyStack>
      </MyBox>

      {/* Filter Panel */}
      <MyCollapse in={showFilters}>
        <MyPaper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
          <MyTypography variant="subtitle2" sx={{ mb: 1 }}>
            Filter by Type
          </MyTypography>
          <MyStack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {EVENT_TYPE_CONFIGS.map((config) => (
              <MyBox
                key={config.type}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                onClick={() => handleFilterToggle(config.type)}
              >
                <MyCheckbox
                  size="small"
                  checked={activeFilters.has(config.type)}
                  sx={{ p: 0 }}
                />
                <MyChip
                  icon={<MyBox sx={{ color: config.color }}>{config.icon}</MyBox>}
                  label={config.label}
                  size="small"
                  variant={activeFilters.has(config.type) ? 'filled' : 'outlined'}
                  sx={{ bgcolor: activeFilters.has(config.type) ? `${config.color}20` : 'transparent' }}
                />
              </MyBox>
            ))}
          </MyStack>
        </MyPaper>
      </MyCollapse>

      {/* Timeline */}
      <MyBox sx={{ flex: 1, overflow: 'auto' }}>
        {filteredEvents.length === 0 ? (
          <MyBox sx={{ textAlign: 'center', py: 4 }}>
            <TimelineIcon sx={{ fontSize: 48, opacity: 0.3 }} />
            <MyTypography color="text.secondary" sx={{ mt: 1 }}>
              No events in the selected time period
            </MyTypography>
          </MyBox>
        ) : (
          <MyStack spacing={2}>
            {Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
              <MyBox key={dateKey}>
                <MyTypography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: 'block', fontWeight: 500 }}
                >
                  {dateKey}
                </MyTypography>
                <MyBox
                  sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    pb: 1,
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': { borderRadius: 3 },
                  }}
                >
                  {dateEvents.map((event) => (
                    <TimelineItem
                      key={event.id}
                      event={event}
                      isSelected={selectedEventId === event.id}
                      onSelect={() => onSelectEvent?.(event.id === selectedEventId ? null : event.id)}
                      onExpand={() => handleExpand(event.id)}
                      isExpanded={expandedEventId === event.id}
                    />
                  ))}
                </MyBox>
              </MyBox>
            ))}
          </MyStack>
        )}
      </MyBox>
    </MyBox>
  );
};

export default EvolutionTimeline;