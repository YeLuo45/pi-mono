/**
 * V160: Personality Radar Chart Component
 * 
 * Visual comparison component that renders a radar/spider chart
 * for comparing personality metrics across multiple dimensions.
 */

import React from 'react';
import type { PersonalityMetrics } from './PersonalityComparisonEngine';

interface Props {
  metricsA: PersonalityMetrics;
  metricsB: PersonalityMetrics;
}

export function PersonalityRadarChart({ metricsA, metricsB }: Props) {
  const dimensions = ['successRate', 'lowRisk', 'adaptationSpeed', 'eventVolume', 'patternDiversity'];
  
  const getValue = (metrics: PersonalityMetrics) => [
    metrics.successRate,
    1 - metrics.riskScore,
    Math.min(metrics.avgAdaptationTime / 1000, 1),
    Math.min(metrics.totalEvents / 100, 1),
    metrics.topPatterns.length / 5
  ];

  const valueA = getValue(metricsA);
  const valueB = getValue(metricsB);

  const getPoint = (value: number, index: number) => {
    const angle = (index * 72 - 90) * Math.PI / 180;
    const x = 200 + 150 * value * Math.cos(angle);
    const y = 200 + 150 * value * Math.sin(angle);
    return `${x},${y}`;
  };

  return (
    <div className="radar-chart">
      <svg viewBox="0 0 400 400" style={{width: '100%', maxWidth: '400px'}}>
        {[1, 0.6, 0.3].map(scale => (
          <polygon
            key={scale}
            points={dimensions.map((_, i) => getPoint(scale, i)).join(' ')}
            fill="none"
            stroke="#ddd"
            strokeWidth="1"
          />
        ))}
        
        {dimensions.map((_, i) => {
          const angle = (i * 72 - 90) * Math.PI / 180;
          return (
            <line
              key={i}
              x1="200" y1="200"
              x2={200 + 150 * Math.cos(angle)}
              y2={200 + 150 * Math.sin(angle)}
              stroke="#ddd"
            />
          );
        })}
        
        <polygon
          points={valueA.map((v, i) => getPoint(v, i)).join(' ')}
          fill="rgba(99, 102, 241, 0.3)"
          stroke="#6366f1"
          strokeWidth="2"
        />
        
        <polygon
          points={valueB.map((v, i) => getPoint(v, i)).join(' ')}
          fill="rgba(236, 72, 153, 0.3)"
          stroke="#ec4899"
          strokeWidth="2"
        />
        
        {dimensions.map((dim, i) => {
          const angle = (i * 72 - 90) * Math.PI / 180;
          const x = 200 + 170 * Math.cos(angle);
          const y = 200 + 170 * Math.sin(angle);
          return (
            <text key={dim} x={x} y={y} textAnchor="middle" fontSize="12" fill="#666">
              {dim}
            </text>
          );
        })}
      </svg>
      
      <div className="legend" style={{display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '8px'}}>
        <span style={{color: '#6366f1', fontWeight: 'bold'}}>{metricsA.personalityId}</span>
        <span style={{color: '#ec4899', fontWeight: 'bold'}}>{metricsB.personalityId}</span>
      </div>
    </div>
  );
}