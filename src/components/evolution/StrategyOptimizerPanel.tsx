/**
 * V154: StrategyOptimizerPanel - Strategy comparison and manual override panel
 * 
 * Displays optimization strategy comparisons (before/after weights),
 * allows accepting or rejecting optimizations, and enables manual weight overrides.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MyBox,
  MyTypography,
  MyPaper,
  MyButton,
  MySlider,
  MyChip,
  MyStack,
  MyDivider,
  MyIconButton,
  MyTooltip,
 MyTable as Table } from '../MUI替代';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import type { OptimizationStrategy } from '../../evolution/types';

interface StrategyOptimizerPanelProps {
  /** Current/active strategies (before optimization) */
  currentStrategies: OptimizationStrategy[];
  /** Optimized strategies (after optimization) */
  optimizedStrategies: OptimizationStrategy[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when user accepts optimized strategies */
  onAcceptOptimized?: (strategies: OptimizationStrategy[]) => void;
  /** Callback when user manually overrides a strategy weight */
  onOverrideWeight?: (strategyId: string, newWeight: number) => void;
  /** Callback to rollback to a specific strategy version */
  onRollback?: (strategyId: string) => void;
}

interface StrategyWithWeight extends OptimizationStrategy {
  weight: number;
  isLocked: boolean;
}

interface StrategyComparison {
  id: string;
  type: OptimizationStrategy['type'];
  target_metric: string;
  currentWeight: number;
  optimizedWeight: number;
  effectiveWeight: number;
  isLocked: boolean;
  expectedImprovement: number;
}

const STRATEGY_TYPE_COLORS = {
  speed: '#8884d8',
  empathy: '#82ca9d',
  memory: '#ffc658',
};

const STRATEGY_TYPE_LABELS = {
  speed: 'Speed',
  empathy: 'Empathy',
  memory: 'Memory',
};

function buildComparison(
  current: OptimizationStrategy[],
  optimized: OptimizationStrategy[]
): StrategyComparison[] {
  const comparisons: StrategyComparison[] = [];
  
  // Get all unique strategy IDs
  const allStrategyIds = new Set([
    ...current.map((s) => s.id),
    ...optimized.map((s) => s.id),
  ]);

  for (const id of allStrategyIds) {
    const currentStrategy = current.find((s) => s.id === id);
    const optimizedStrategy = optimized.find((s) => s.id === id);
    
    // Determine strategy type and target
    const type = currentStrategy?.type || optimizedStrategy?.type || 'speed';
    const target = currentStrategy?.target_metric || optimizedStrategy?.target_metric || '';
    
    // Calculate weights (normalize to 0-100 scale)
    const currentWeight = currentStrategy ? 50 : 0; // Default weight if not present
    const optimizedWeight = optimizedStrategy 
      ? Math.min(100, 50 + (optimizedStrategy.expected_improvement * 50))
      : currentWeight;
    
    comparisons.push({
      id,
      type,
      target_metric: target,
      currentWeight,
      optimizedWeight,
      effectiveWeight: currentWeight, // Will be updated by user interaction
      isLocked: false,
      expectedImprovement: optimizedStrategy?.expected_improvement || 0,
    });
  }

  return comparisons;
}

export const StrategyOptimizerPanel: React.FC<StrategyOptimizerPanelProps> = ({
  currentStrategies,
  optimizedStrategies,
  isLoading = false,
  onAcceptOptimized,
  onOverrideWeight,
  onRollback,
}) => {
  const { t } = useTranslation();
  const [strategyWeights, setStrategyWeights] = useState<Record<string, number>>({});
  const [lockedStrategies, setLockedStrategies] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  // Build comparison data
  const comparisons = useMemo(
    () => buildComparison(currentStrategies, optimizedStrategies),
    [currentStrategies, optimizedStrategies]
  );

  // Get effective weight for a strategy
  const getEffectiveWeight = (strategyId: string, defaultWeight: number): number => {
    return strategyWeights[strategyId] ?? defaultWeight;
  };

  // Handle weight slider change
  const handleWeightChange = (strategyId: string, newWeight: number) => {
    setStrategyWeights((prev) => ({
      ...prev,
      [strategyId]: newWeight,
    }));
    onOverrideWeight?.(strategyId, newWeight);
  };

  // Handle lock/unlock
  const handleToggleLock = (strategyId: string) => {
    setLockedStrategies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(strategyId)) {
        newSet.delete(strategyId);
      } else {
        newSet.add(strategyId);
      }
      return newSet;
    });
  };

  // Handle accepting all optimizations
  const handleAcceptAll = () => {
    if (onAcceptOptimized && optimizedStrategies.length > 0) {
      onAcceptOptimized(optimizedStrategies);
    }
  };

  // Calculate overall improvement
  const totalImprovement = useMemo(() => {
    return optimizedStrategies.reduce((sum, s) => sum + s.expected_improvement, 0);
  }, [optimizedStrategies]);

  const hasOptimizations = optimizedStrategies.length > 0;

  if (isLoading) {
    return (
      <MyBox sx={{ p: 2 }}>
        <MyTypography>Loading strategies...</MyTypography>
      </MyBox>
    );
  }

  return (
    <MyBox sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <MyBox>
          <MyTypography variant="h6">Strategy Optimizer</MyTypography>
          <MyTypography variant="caption" color="text.secondary">
            {comparisons.length} strategies tracked
          </MyTypography>
        </MyBox>
        <MyStack direction="row" spacing={1}>
          <MyTooltip title="View History">
            <MyIconButton size="small" onClick={() => setShowHistory(!showHistory)}>
              <HistoryIcon fontSize="small" />
            </MyIconButton>
          </MyTooltip>
          {hasOptimizations && (
            <MyButton
              size="small"
              variant="contained"
              startIcon={<CheckIcon />}
              onClick={handleAcceptAll}
            >
              Accept All ({Math.round(totalImprovement * 100)}% ↑)
            </MyButton>
          )}
        </MyStack>
      </MyBox>

      {/* Strategy Comparison Table */}
      <MyBox sx={{ flex: 1, overflow: 'auto' }}>
        <MyStack spacing={2}>
          {comparisons.map((comparison) => {
            const effectiveWeight = getEffectiveWeight(comparison.id, comparison.currentWeight);
            const hasOptimization = comparison.optimizedWeight !== comparison.currentWeight;
            const isLocked = lockedStrategies.has(comparison.id);

            return (
              <MyPaper
                key={comparison.id}
                sx={{
                  p: 2,
                  borderLeft: `4px solid ${STRATEGY_TYPE_COLORS[comparison.type]}`,
                }}
              >
                <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <MyBox>
                    <MyChip
                      label={STRATEGY_TYPE_LABELS[comparison.type]}
                      size="small"
                      sx={{ bgcolor: `${STRATEGY_TYPE_COLORS[comparison.type]}30`, mr: 1 }}
                    />
                    <MyTypography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                      {comparison.target_metric || 'Untitled Strategy'}
                    </MyTypography>
                  </MyBox>
                  <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {hasOptimization && (
                      <MyChip
                        label={`+${Math.round(comparison.expectedImprovement * 100)}%`}
                        size="small"
                        color="success"
                      />
                    )}
                    <MyIconButton
                      size="small"
                      onClick={() => handleToggleLock(comparison.id)}
                      color={isLocked ? 'primary' : 'default'}
                    >
                      {isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                    </MyIconButton>
                  </MyBox>
                </MyBox>

                {/* Weight Comparison */}
                <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <MyBox sx={{ width: 80 }}>
                    <MyTypography variant="caption" color="text.secondary">
                      Before
                    </MyTypography>
                    <MyTypography variant="h6">
                      {Math.round(comparison.currentWeight)}
                    </MyTypography>
                  </MyBox>
                  
                  <MyBox sx={{ flex: 1 }}>
                    <MyTypography variant="caption" color="text.secondary">
                      Effective Weight
                    </MyTypography>
                    <MySlider
                      value={effectiveWeight}
                      min={0}
                      max={100}
                      step={5}
                      disabled={isLocked}
                      onChange={(_, value) => handleWeightChange(comparison.id, value as number)}
                      valueLabelDisplay="auto"
                      sx={{
                        color: STRATEGY_TYPE_COLORS[comparison.type],
                      }}
                    />
                  </MyBox>
                  
                  <MyBox sx={{ width: 80, textAlign: 'right' }}>
                    <MyTypography variant="caption" color="text.secondary">
                      After
                    </MyTypography>
                    <MyTypography 
                      variant="h6" 
                      color={hasOptimization ? 'success.main' : 'inherit'}
                    >
                      {Math.round(comparison.optimizedWeight)}
                    </MyTypography>
                  </MyBox>
                </MyBox>

                {/* Change indicator */}
                {hasOptimization && (
                  <MyBox sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <MyDivider sx={{ flex: 1 }} />
                    <MyTypography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                      {effectiveWeight > comparison.currentWeight ? '↑ Increased' : '↓ Decreased'} by{' '}
                      {Math.abs(effectiveWeight - comparison.currentWeight)}
                    </MyTypography>
                    <MyDivider sx={{ flex: 1 }} />
                  </MyBox>
                )}
              </MyPaper>
            );
          })}

          {comparisons.length === 0 && (
            <MyBox sx={{ textAlign: 'center', py: 4 }}>
              <MyTypography color="text.secondary">
                No strategies available. Strategies will be generated when patterns are detected.
              </MyTypography>
            </MyBox>
          )}
        </MyStack>
      </MyBox>

      {/* History Panel (collapsible) */}
      {showHistory && (
        <MyPaper sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
          <MyTypography variant="subtitle2" sx={{ mb: 1 }}>
            Strategy History
          </MyTypography>
          <MyTypography variant="caption" color="text.secondary">
            Previous strategy versions will be shown here. Click to rollback.
          </MyTypography>
          {onRollback && (
            <MyButton size="small" sx={{ mt: 1 }} onClick={() => onRollback(comparisons[0]?.id)}>
              Test Rollback
            </MyButton>
          )}
        </MyPaper>
      )}
    </MyBox>
  );
};

export default StrategyOptimizerPanel;