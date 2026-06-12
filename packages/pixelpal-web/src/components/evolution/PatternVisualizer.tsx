/**
 * V154: PatternVisualizer - Radar chart for pattern visualization
 * 
 * Displays personality behavior patterns across 5 dimensions:
 * - Conversation frequency
 * - Emotion volatility
 * - Interest migration
 * - Social activity
 * - Growth curve
 * 
 * Uses recharts RadarChart if available, otherwise pure SVG.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MyBox, MyTypography, MyPaper, MyTabs, MyTabs as Tabs, MyTab, MyChip, MyStack, MyCard, MyCardHeader, MyLinearProgress , MyList as List } from '../MUI替代';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { InteractionPattern } from '../../evolution/types';

interface PatternVisualizerProps {
  /** Current detected patterns */
  patterns: InteractionPattern[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when a pattern is clicked */
  onPatternClick?: (pattern: InteractionPattern) => void;
}

interface PatternDimensionData {
  dimension: string;
  value: number;
  fullMark: number;
  color: string;
}

/** Radar chart color palette */
const DIMENSION_COLORS = {
  conversationFrequency: '#8884d8',
  emotionVolatility: '#82ca9d',
  interestMigration: '#ffc658',
  socialActivity: '#ff7300',
  growthCurve: '#00C49F',
};

/** Map pattern types to dimensions */
function patternToDimensions(patterns: InteractionPattern[]): PatternDimensionData[] {
  if (!patterns || patterns.length === 0) {
    return [
      { dimension: 'Conversation Frequency', value: 0, fullMark: 100, color: DIMENSION_COLORS.conversationFrequency },
      { dimension: 'Emotion Volatility', value: 0, fullMark: 100, color: DIMENSION_COLORS.emotionVolatility },
      { dimension: 'Interest Migration', value: 0, fullMark: 100, color: DIMENSION_COLORS.interestMigration },
      { dimension: 'Social Activity', value: 0, fullMark: 100, color: DIMENSION_COLORS.socialActivity },
      { dimension: 'Growth Curve', value: 0, fullMark: 100, color: DIMENSION_COLORS.growthCurve },
    ];
  }

  // Calculate dimension values based on patterns
  const patternTypes = {
    temporal: patterns.filter((p) => p.type === 'temporal'),
    causal: patterns.filter((p) => p.type === 'causal'),
    preference: patterns.filter((p) => p.type === 'preference'),
  };

  // Conversation frequency - based on temporal patterns
  const conversationFrequency = Math.min(
    100,
    (patternTypes.temporal.reduce((sum, p) => sum + p.frequency, 0) / 10) * 100
  );

  // Emotion volatility - based on causal patterns (cause-effect relationships indicate emotional patterns)
  const emotionVolatility = Math.min(
    100,
    (patternTypes.causal.reduce((sum, p) => sum + p.confidence, 0) / patternTypes.causal.length) * 100 || 0
  );

  // Interest migration - based on preference patterns
  const interestMigration = Math.min(
    100,
    (patternTypes.preference.reduce((sum, p) => sum + p.frequency, 0) / 5) * 100
  );

  // Social activity - derived from overall pattern count and diversity
  const socialActivity = Math.min(
    100,
    ((patterns.length / 20) * 50 + (Object.keys(patternTypes).filter((k) => patternTypes[k as keyof typeof patternTypes].length > 0).length / 3) * 50)
  );

  // Growth curve - based on confidence scores across all patterns
  const growthCurve = Math.min(
    100,
    (patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length) * 100 || 0
  );

  return [
    { dimension: 'Conversation Frequency', value: conversationFrequency, fullMark: 100, color: DIMENSION_COLORS.conversationFrequency },
    { dimension: 'Emotion Volatility', value: emotionVolatility, fullMark: 100, color: DIMENSION_COLORS.emotionVolatility },
    { dimension: 'Interest Migration', value: interestMigration, fullMark: 100, color: DIMENSION_COLORS.interestMigration },
    { dimension: 'Social Activity', value: socialActivity, fullMark: 100, color: DIMENSION_COLORS.socialActivity },
    { dimension: 'Growth Curve', value: growthCurve, fullMark: 100, color: DIMENSION_COLORS.growthCurve },
  ];
}

/** Pattern type color mapping */
const PATTERN_TYPE_COLORS = {
  temporal: '#8884d8',
  causal: '#82ca9d',
  preference: '#ffc658',
};

const PATTERN_TYPE_LABELS = {
  temporal: 'Temporal',
  causal: 'Causal',
  preference: 'Preference',
};

export const PatternVisualizer: React.FC<PatternVisualizerProps> = ({
  patterns,
  isLoading = false,
  onPatternClick,
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = React.useState<'radar' | 'list'>('radar');
  const [selectedPatternId, setSelectedPatternId] = React.useState<string | null>(null);

  // Calculate radar chart data
  const radarData = useMemo(() => patternToDimensions(patterns), [patterns]);

  // Group patterns by type for list view
  const patternsByType = useMemo(() => {
    return {
      temporal: patterns.filter((p) => p.type === 'temporal'),
      causal: patterns.filter((p) => p.type === 'causal'),
      preference: patterns.filter((p) => p.type === 'preference'),
    };
  }, [patterns]);

  const handlePatternClick = (pattern: InteractionPattern) => {
    setSelectedPatternId(pattern.id);
    onPatternClick?.(pattern);
  };

  if (isLoading) {
    return (
      <MyBox sx={{ p: 2 }}>
        <MyTypography>Loading patterns...</MyTypography>
        <MyLinearProgress />
      </MyBox>
    );
  }

  return (
    <MyBox sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <MyTypography variant="h6">Pattern Analysis</MyTypography>
        <MyChip 
          label={`${patterns.length} patterns detected`} 
          size="small" 
          color={patterns.length > 0 ? 'primary' : 'default'}
        />
      </MyBox>

      {/* View Mode Tabs */}
      <MyTabs 
        value={viewMode} 
        onChange={(_, v) => setViewMode(v)} 
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <MyTab label="Radar Chart" value="radar" />
        <MyTab label="Pattern List" value="list" />
      </MyTabs>

      {/* Radar Chart View */}
      {viewMode === 'radar' && (
        <MyBox sx={{ flex: 1, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis 
                dataKey="dimension" 
                tick={{ fontSize: 11 }} 
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }} 
              />
              <Radar
                name="Pattern Strength"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.5}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Dimension Legend */}
          <MyStack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {radarData.map((dim) => (
              <MyChip
                key={dim.dimension}
                label={`${dim.dimension}: ${Math.round(dim.value)}%`}
                size="small"
                sx={{
                  bgcolor: `${dim.color}20`,
                  borderColor: dim.color,
                  border: '1px solid',
                }}
              />
            ))}
          </MyStack>
        </MyBox>
      )}

      {/* Pattern List View */}
      {viewMode === 'list' && (
        <MyBox sx={{ flex: 1, overflow: 'auto' }}>
          {/* Group by Type */}
          {(['temporal', 'causal', 'preference'] as const).map((type) => {
            const typePatterns = patternsByType[type];
            if (typePatterns.length === 0) return null;

            return (
              <MyBox key={type} sx={{ mb: 2 }}>
                <MyTypography 
                  variant="subtitle2" 
                  sx={{ 
                    color: PATTERN_TYPE_COLORS[type],
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <MyChip 
                    label={PATTERN_TYPE_LABELS[type]} 
                    size="small"
                    sx={{ bgcolor: `${PATTERN_TYPE_COLORS[type]}30` }}
                  />
                  {typePatterns.length} patterns
                </MyTypography>

                <MyStack spacing={1}>
                  {typePatterns.slice(0, 5).map((pattern) => (
                    <MyPaper
                      key={pattern.id}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        bgcolor: selectedPatternId === pattern.id ? 'action.selected' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => handlePatternClick(pattern)}
                    >
                      <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <MyBox>
                          <MyTypography variant="body2" sx={{ fontWeight: 500 }}>
                            {pattern.description}
                          </MyTypography>
                          <MyTypography variant="caption" color="text.secondary">
                            Frequency: {pattern.frequency} | Confidence: {Math.round(pattern.confidence * 100)}%
                          </MyTypography>
                        </MyBox>
                        <MyChip 
                          label={`${Math.round(pattern.confidence * 100)}%`}
                          size="small"
                          color={pattern.confidence >= 0.7 ? 'success' : 'default'}
                        />
                      </MyBox>
                    </MyPaper>
                  ))}
                </MyStack>
              </MyBox>
            );
          })}

          {patterns.length === 0 && (
            <MyBox sx={{ textAlign: 'center', py: 4 }}>
              <MyTypography color="text.secondary">
                No patterns detected yet. Patterns will appear as the AI analyzes interactions.
              </MyTypography>
            </MyBox>
          )}
        </MyBox>
      )}
    </MyBox>
  );
};

export default PatternVisualizer;