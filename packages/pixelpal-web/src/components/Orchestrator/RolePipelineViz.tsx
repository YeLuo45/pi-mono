/**
 * V147: RolePipelineViz — Pure SVG Pipeline Visualization
 *
 * Renders pipeline nodes (Manager/Coder/Reviewer) and edges connecting them.
 * No React Flow — pure SVG with CSS animations.
 */

import React, { useMemo } from 'react';
import type { Pipeline, PipelineStage, RoleType } from '../../services/orchestrator/RolePipeline';

interface RolePipelineVizProps {
  pipeline: Pipeline;
  width?: number;
  height?: number;
  className?: string;
}

interface NodePosition {
  x: number;
  y: number;
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 80;
const VERTICAL_CENTER = 160;

const ROLE_LABELS: Record<RoleType, string> = {
  manager: '📋 Manager',
  coder: '💻 Coder',
  reviewer: '🔍 Reviewer',
};

const ROLE_COLORS: Record<RoleType, { fill: string; stroke: string; text: string }> = {
  manager: { fill: '#1a1a2e', stroke: '#6c63ff', text: '#e8e8f0' },
  coder: { fill: '#1a2a1a', stroke: '#4caf50', text: '#e8f5e9' },
  reviewer: { fill: '#2a1a1a', stroke: '#f44336', text: '#ffebee' },
};

const STATUS_STYLES: Record<PipelineStage['status'], { opacity: number; filter: string; dasharray?: string }> = {
  pending: { opacity: 0.4, filter: 'url(#blur)' },
  running: { opacity: 1, filter: 'url(#glow)', dasharray: '8 4' },
  completed: { opacity: 1, filter: 'none' },
  failed: { opacity: 1, filter: 'url(#error)' },
};

function getNodeX(stageIndex: number, totalStages: number): number {
  return 60 + stageIndex * (NODE_WIDTH + HORIZONTAL_GAP);
}

function PipelineNode({
  stage,
  x,
  y,
  isActive,
}: {
  stage: PipelineStage;
  x: number;
  y: number;
  isActive: boolean;
}) {
  const colors = ROLE_COLORS[stage.role];
  const statusStyle = STATUS_STYLES[stage.status];
  const label = ROLE_LABELS[stage.role];

  return (
    <g transform={`translate(${x}, ${y})`} style={{ opacity: statusStyle.opacity }}>
      {/* Glow/running indicator */}
      {stage.status === 'running' && (
        <rect
          x={-8}
          y={-8}
          width={NODE_WIDTH + 16}
          height={NODE_HEIGHT + 16}
          rx={16}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={2}
          strokeDasharray={statusStyle.dasharray}
          style={{ animation: 'dash-flow 1s linear infinite' }}
        />
      )}

      {/* Node background */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={12}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={isActive ? 3 : 1.5}
      />

      {/* Status indicator bar */}
      <rect
        x={0}
        y={NODE_HEIGHT - 6}
        width={NODE_WIDTH}
        height={6}
        rx={3}
        fill={stage.status === 'completed' ? '#4caf50' : stage.status === 'failed' ? '#f44336' : stage.status === 'running' ? '#ff9800' : '#555'}
      />

      {/* Role icon/label */}
      <text
        x={NODE_WIDTH / 2}
        y={NODE_HEIGHT / 2 - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.text}
        fontSize={11}
        fontWeight={600}
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>

      {/* Status label */}
      <text
        x={NODE_WIDTH / 2}
        y={NODE_HEIGHT / 2 + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.text}
        fontSize={10}
        fontFamily="system-ui, sans-serif"
        opacity={0.75}
      >
        {stage.status}
      </text>
    </g>
  );
}

function PipelineEdge({
  fromX,
  fromY,
  toX,
  toY,
  status,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  status: 'pending' | 'completed' | 'failed';
}) {
  const midX = (fromX + toX) / 2;

  return (
    <g>
      <path
        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
        fill="none"
        stroke={status === 'completed' ? '#4caf50' : status === 'failed' ? '#f44336' : '#555'}
        strokeWidth={2}
        strokeDasharray={status === 'pending' ? '6 3' : 'none'}
        style={{ transition: 'stroke 0.3s ease' }}
      />
      {/* Arrow head */}
      <polygon
        points={`${toX - 8},${toY - 10} ${toX},${toY} ${toX - 8},${toY + 10}`}
        fill={status === 'completed' ? '#4caf50' : status === 'failed' ? '#f44336' : '#555'}
      />
    </g>
  );
}

export const RolePipelineViz: React.FC<RolePipelineVizProps> = ({
  pipeline,
  width = 520,
  height = 240,
  className,
}) => {
  const { nodes, edges } = useMemo(() => {
    const totalStages = pipeline.stages.length;

    const nodes = pipeline.stages.map((stage, index) => {
      const x = getNodeX(index, totalStages);
      const y = VERTICAL_CENTER;
      return { stage, x, y, isActive: pipeline.currentStage === index };
    });

    const edges = pipeline.stages.slice(0, -1).map((fromStage, index) => {
      const fromX = getNodeX(index, totalStages) + NODE_WIDTH;
      const fromY = VERTICAL_CENTER + NODE_HEIGHT / 2;
      const toX = getNodeX(index + 1, totalStages);
      const toY = VERTICAL_CENTER + NODE_HEIGHT / 2;
      return { fromStage, toStage: pipeline.stages[index + 1], fromX, fromY, toX, toY };
    });

    return { nodes, edges };
  }, [pipeline]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
      aria-label="Role Pipeline Visualization"
    >
      <defs>
        {/* Glow filter for running stage */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Error filter for failed stage */}
        <filter id="error" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#f44336" floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="colored" />
          <feMerge>
            <feMergeNode in="colored" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Blur filter for pending */}
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Pipeline label */}
      <text x={16} y={28} fill="#888" fontSize={11} fontFamily="system-ui, sans-serif">
        Pipeline: {pipeline.id.slice(0, 8)}… ({pipeline.status})
      </text>

      {/* Edges first (so nodes appear on top) */}
      {edges.map((edge, i) => (
        <PipelineEdge
          key={i}
          fromX={edge.fromX}
          fromY={edge.fromY}
          toX={edge.toX}
          toY={edge.toY}
          status={
            edge.fromStage.status === 'completed'
              ? 'completed'
              : edge.fromStage.status === 'failed'
              ? 'failed'
              : 'pending'
          }
        />
      ))}

      {/* Nodes */}
      {nodes.map(({ stage, x, y, isActive }, i) => (
        <PipelineNode key={i} stage={stage} x={x} y={y} isActive={isActive} />
      ))}

      <style>{`
        @keyframes dash-flow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
};

export default RolePipelineViz;