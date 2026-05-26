/**
 * V154: EvolutionDashboard - Main evolution dashboard panel
 * 
 * Provides a comprehensive UI for monitoring and controlling the evolution engine:
 * - Pattern analysis visualization (radar chart)
 * - Strategy optimization controls
 * - Skill crystallization management
 * - Evolution event timeline
 * 
 * Features tabs for different views and integrates with the V153 EvolutionEngine.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MyBox, MyTypography, MyPaper, MyTabs, MyTab, MyTab as Tab, MyIconButton, MyButton, MyTooltip, MyStack, MyDivider, MyChip, MyCircularProgress, MySwitch, MyLinearProgress , MySelect as Select } from '../MUI替代';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  Dashboard as DashboardIcon,
  Pattern as PatternIcon,
  Speed as StrategyIcon,
  Spellcheck as SkillIcon,
  Timeline as TimelineIcon,
  AutoAwesome as AutoAwesomeIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useEvolutionStore, type EvolutionEvent } from '../../stores/evolutionStore';
import { PatternVisualizer } from './PatternVisualizer';
import { StrategyOptimizerPanel } from './StrategyOptimizerPanel';
import { SkillCrystallizerPanel } from './SkillCrystallizerPanel';
import { EvolutionTimeline } from './EvolutionTimeline';
import {
  getEvolutionEngine,
  type InteractionPattern,
  type OptimizationStrategy,
  type CrystallizedSkill,
} from '../../evolution';
import type { EvolutionState } from '../../evolution/EvolutionEngine';

interface EvolutionDashboardProps {
  /** Personality ID to track */
  personalityId?: string;
  /** Callback when dashboard is closed */
  onClose?: () => void;
}

/** Summary card component */
interface SummaryCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  color?: string;
  icon: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, color, icon }) => (
  <MyPaper
    sx={{
      p: 2,
      minWidth: 140,
      borderLeft: `4px solid ${color || '#8884d8'}`,
    }}
  >
    <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <MyBox>
        <MyTypography variant="caption" color="text.secondary">
          {title}
        </MyTypography>
        <MyTypography variant="h4" sx={{ fontWeight: 600, color }}>
          {value}
        </MyTypography>
        <MyTypography variant="caption" color="text.secondary">
          {subtitle}
        </MyTypography>
      </MyBox>
      <MyBox sx={{ color: color || 'inherit', opacity: 0.7 }}>{icon}</MyBox>
    </MyBox>
  </MyPaper>
);

/** Dashboard tab content */
interface DashboardViewProps {
  engine: ReturnType<typeof getEvolutionEngine>;
  isLoading: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ engine, isLoading }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<EvolutionState | null>(null);

  useEffect(() => {
    if (engine) {
      setState(engine.getState());
    }
  }, [engine]);

  if (isLoading) {
    return (
      <MyBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <MyCircularProgress />
      </MyBox>
    );
  }

  const patternCount = state?.patterns.length || 0;
  const strategyCount = state?.strategies.length || 0;
  const skillCount = state?.skills.length || 0;
  const totalEvolutions = state?.totalEvolutions || 0;

  return (
    <MyBox sx={{ p: 2 }}>
      <MyStack spacing={2}>
        {/* Summary Cards */}
        <MyStack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <SummaryCard
            title="Patterns Detected"
            value={patternCount}
            subtitle="Total patterns"
            color="#8884d8"
            icon={<PatternIcon />}
          />
          <SummaryCard
            title="Strategies"
            value={strategyCount}
            subtitle="Optimization strategies"
            color="#82ca9d"
            icon={<StrategyIcon />}
          />
          <SummaryCard
            title="Skills"
            value={skillCount}
            subtitle="Crystallized skills"
            color="#00C49F"
            icon={<SkillIcon />}
          />
          <SummaryCard
            title="Evolutions"
            value={totalEvolutions}
            subtitle="Total evolution cycles"
            color="#ffc658"
            icon={<AutoAwesomeIcon />}
          />
        </MyStack>

        {/* Engine Status */}
        <MyPaper sx={{ p: 2 }}>
          <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <MyBox>
              <MyTypography variant="subtitle2">Evolution Engine Status</MyTypography>
              <MyChip
                label={engine?.isActive() ? 'Active' : 'Idle'}
                size="small"
                color={engine?.isActive() ? 'success' : 'default'}
              />
            </MyBox>
            <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MyTypography variant="caption" color="text.secondary">
                Last evolution:
              </MyTypography>
              <MyTypography variant="body2">
                {state?.lastAnalysis
                  ? new Date(state.lastAnalysis).toLocaleString()
                  : 'Never'}
              </MyTypography>
            </MyBox>
          </MyBox>
        </MyPaper>

        {/* Pattern Preview */}
        {state && state.patterns.length > 0 && (
          <MyPaper sx={{ p: 2 }}>
            <MyTypography variant="subtitle2" sx={{ mb: 1 }}>
              Recent Patterns
            </MyTypography>
            <MyStack spacing={1}>
              {state.patterns.slice(0, 3).map((pattern) => (
                <MyBox
                  key={pattern.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <MyBox>
                    <MyTypography variant="body2">{pattern.description}</MyTypography>
                    <MyTypography variant="caption" color="text.secondary">
                      {pattern.type} • {Math.round(pattern.confidence * 100)}% confidence
                    </MyTypography>
                  </MyBox>
                  <MyChip
                    label={`freq: ${pattern.frequency}`}
                    size="small"
                    sx={{ bgcolor: 'action.selected' }}
                  />
                </MyBox>
              ))}
            </MyStack>
          </MyPaper>
        )}

        {/* Quick Actions */}
        <MyPaper sx={{ p: 2 }}>
          <MyTypography variant="subtitle2" sx={{ mb: 1 }}>
            Quick Actions
          </MyTypography>
          <MyStack direction="row" spacing={1}>
            <MyButton
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => engine?.evolve()}
            >
              Run Evolution
            </MyButton>
            <MyButton
              size="small"
              variant="outlined"
              startIcon={<PatternIcon />}
              onClick={() => engine?.analyze()}
            >
              Analyze Patterns
            </MyButton>
          </MyStack>
        </MyPaper>
      </MyStack>
    </MyBox>
  );
};

export const EvolutionDashboard: React.FC<EvolutionDashboardProps> = ({
  personalityId,
  onClose,
}) => {
  const { t } = useTranslation();
  const {
    isPanelOpen,
    activeTab,
    autoRefresh,
    lastRefreshAt,
    events,
    isLoading,
    setActiveTab,
    toggleAutoRefresh,
    updateLastRefresh,
    addEvent,
    closePanel,
  } = useEvolutionStore();

  const [engine, setEngine] = useState<ReturnType<typeof getEvolutionEngine> | null>(null);
  const [patterns, setPatterns] = useState<InteractionPattern[]>([]);
  const [strategies, setStrategies] = useState<OptimizationStrategy[]>([]);
  const [skills, setSkills] = useState<CrystallizedSkill[]>([]);
  const [crystallizingSkills, setCrystallizingSkills] = useState<Array<{ id: string; condition: string; action: string; progress: number; patternIds: string[] }>>([]);

  // Initialize evolution engine
  useEffect(() => {
    const evolutionEngine = getEvolutionEngine();
    setEngine(evolutionEngine);
    
    // Load initial state
    const state = evolutionEngine.getState();
    setPatterns(state.patterns);
    setStrategies(state.strategies);
    setSkills(state.skills);
  }, []);

  // Listen to evolution events from the engine
  useEffect(() => {
    if (!engine) return;

    // Poll for state changes when auto-refresh is enabled
    const pollInterval = autoRefresh ? setInterval(() => {
      const state = engine.getState();
      setPatterns(state.patterns);
      setStrategies(state.strategies);
      setSkills(state.skills);
      updateLastRefresh();
    }, 30000) : null;

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [engine, autoRefresh, updateLastRefresh]);

  // Create event from pattern
  const handlePatternDetected = useCallback((pattern: InteractionPattern) => {
    addEvent({
      id: `pattern-${pattern.id}-${Date.now()}`,
      timestamp: Date.now(),
      type: 'pattern_detected',
      title: `Pattern Detected: ${pattern.type}`,
      description: pattern.description,
      metadata: {
        patternId: pattern.id,
        confidence: pattern.confidence,
        frequency: pattern.frequency,
      },
    });
  }, [addEvent]);

  // Run evolution cycle manually
  const handleRunEvolution = async () => {
    if (!engine) return;
    
    try {
      await engine.evolve();
      const state = engine.getState();
      setPatterns(state.patterns);
      setStrategies(state.strategies);
      setSkills(state.skills);
      
      // Add event for evolution completion
      addEvent({
        id: `evolution-${Date.now()}`,
        timestamp: Date.now(),
        type: 'strategy_optimized',
        title: 'Evolution Cycle Complete',
        description: `Analyzed ${state.patterns.length} patterns, optimized ${state.strategies.length} strategies`,
        metadata: {
          patternCount: state.patterns.length,
          strategyCount: state.strategies.length,
          skillCount: state.skills.length,
        },
      });
    } catch (error) {
      console.error('Evolution failed:', error);
    }
  };

  const handleAcceptOptimized = (newStrategies: OptimizationStrategy[]) => {
    setStrategies(newStrategies);
    addEvent({
      id: `strategy-accept-${Date.now()}`,
      timestamp: Date.now(),
      type: 'strategy_optimized',
      title: 'Strategy Optimization Accepted',
      description: `${newStrategies.length} strategies applied`,
    });
  };

  const handleOverrideWeight = (strategyId: string, newWeight: number) => {
    addEvent({
      id: `override-${strategyId}-${Date.now()}`,
      timestamp: Date.now(),
      type: 'manual_override',
      title: 'Manual Override',
      description: `Strategy weight adjusted to ${newWeight}`,
      metadata: { strategyId, newWeight },
    });
  };

  const handleLockSkill = (skillId: string) => {
    addEvent({
      id: `lock-${skillId}-${Date.now()}`,
      timestamp: Date.now(),
      type: 'manual_override',
      title: 'Skill Locked',
      description: `Skill ${skillId} locked to prevent overwriting`,
      metadata: { skillId },
    });
  };

  const handleExportEvents = (eventsToExport: EvolutionEvent[]) => {
    const jsonStr = JSON.stringify(eventsToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evolution-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tab configuration
  const tabs = [
    { value: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { value: 'patterns', label: 'Patterns', icon: <PatternIcon /> },
    { value: 'strategies', label: 'Strategies', icon: <StrategyIcon /> },
    { value: 'skills', label: 'Skills', icon: <SkillIcon /> },
    { value: 'timeline', label: 'Timeline', icon: <TimelineIcon /> },
  ] as const;

  if (!isPanelOpen) {
    return null;
  }

  return (
    <MyPaper
      sx={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 480,
        maxWidth: '100vw',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: -4,
      }}
    >
      {/* Header */}
      <MyBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <MyTypography variant="h6">Evolution Dashboard</MyTypography>
        </MyBox>
        <MyStack direction="row" spacing={1}>
          <MyTooltip title="Auto Refresh">
            <MySwitch
              size="small"
              checked={autoRefresh}
              onChange={toggleAutoRefresh}
            />
          </MyTooltip>
          <MyTooltip title="Refresh Now">
            <MyIconButton size="small" onClick={handleRunEvolution}>
              <RefreshIcon fontSize="small" />
            </MyIconButton>
          </MyTooltip>
          <MyTooltip title="Help">
            <MyIconButton size="small">
              <HelpIcon fontSize="small" />
            </MyIconButton>
          </MyTooltip>
          <MyTooltip title="Close">
            <MyIconButton size="small" onClick={onClose || closePanel}>
              <CloseIcon fontSize="small" />
            </MyIconButton>
          </MyTooltip>
        </MyStack>
      </MyBox>

      {/* Status Bar */}
      <MyBox
        sx={{
          px: 2,
          py: 1,
          bgcolor: 'action.hover',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
        }}
      >
        <MyStack direction="row" spacing={2}>
          <MyTypography variant="caption" color="text.secondary">
            Engine: {engine?.isActive() ? '🟢 Active' : '⚪ Idle'}
          </MyTypography>
          {lastRefreshAt && (
            <MyTypography variant="caption" color="text.secondary">
              Last: {new Date(lastRefreshAt).toLocaleTimeString()}
            </MyTypography>
          )}
        </MyStack>
        <MyTypography variant="caption" color="text.secondary">
          Auto: {autoRefresh ? 'ON' : 'OFF'}
        </MyTypography>
      </MyBox>

      {/* Tab Navigation */}
      <MyTabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab) => (
          <MyTab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            sx={{ minHeight: 48, fontSize: 12 }}
          />
        ))}
      </MyTabs>

      {/* Tab Content */}
      <MyBox sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'dashboard' && (
          <DashboardView engine={engine} isLoading={isLoading} />
        )}
        
        {activeTab === 'patterns' && (
          <MyBox sx={{ p: 2 }}>
            <PatternVisualizer
              patterns={patterns}
              isLoading={isLoading}
              onPatternClick={(pattern) => handlePatternDetected(pattern)}
            />
          </MyBox>
        )}
        
        {activeTab === 'strategies' && (
          <MyBox sx={{ p: 2 }}>
            <StrategyOptimizerPanel
              currentStrategies={strategies}
              optimizedStrategies={strategies}
              isLoading={isLoading}
              onAcceptOptimized={handleAcceptOptimized}
              onOverrideWeight={handleOverrideWeight}
            />
          </MyBox>
        )}
        
        {activeTab === 'skills' && (
          <MyBox sx={{ p: 2 }}>
            <SkillCrystallizerPanel
              crystallizedSkills={skills}
              crystallizingSkills={crystallizingSkills}
              isLoading={isLoading}
              onLockSkill={handleLockSkill}
              onUnlockSkill={(id) => {}}
              onViewDetails={(skill) => console.log('View skill:', skill)}
            />
          </MyBox>
        )}
        
        {activeTab === 'timeline' && (
          <MyBox sx={{ p: 2 }}>
            <EvolutionTimeline
              events={events}
              selectedEventId={null}
              isLoading={isLoading}
              onSelectEvent={(id) => console.log('Select event:', id)}
              onExportEvents={handleExportEvents}
            />
          </MyBox>
        )}
      </MyBox>
    </MyPaper>
  );
};

export default EvolutionDashboard;