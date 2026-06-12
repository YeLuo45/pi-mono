/**
 * GraphVisualizer - Renders role dependency graph as SVG
 */

import React from 'react';
import type { DependencyGraph, DependencyEdge } from '../types';

interface GraphVisualizerProps {
  graph: DependencyGraph | null;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 60;

export function GraphVisualizer({ graph, width = 800, height = 400, onNodeClick }: GraphVisualizerProps) {
  if (!graph) {
    return <div className="graph-visualizer-empty">No graph data</div>;
  }

  // Calculate positions using layered layout
  const positions = calculateLayout(graph, width, height);

  return (
    <svg width={width} height={height} className="graph-visualizer">
      {/* Edges */}
      {graph.edges.map((edge, i) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;

        const path = getEdgePath(from, to, edge);
        const color = edge.type === 'conditional' ? '#F59E0B' : edge.type === 'parallel' ? '#8B5CF6' : '#6B7280';

        return (
          <g key={i}>
            <path
              d={path}
              stroke={color}
              strokeWidth={2}
              fill="none"
              markerEnd={`url(#arrowhead-${edge.type})`}
            />
            {edge.label && (
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 5}
                textAnchor="middle"
                fontSize={10}
                fill={color}
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Arrow markers */}
      <defs>
        <marker id="arrowhead-sequence" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
        </marker>
        <marker id="arrowhead-conditional" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" />
        </marker>
        <marker id="arrowhead-parallel" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6" />
        </marker>
      </defs>

      {/* Nodes */}
      {graph.nodes.map(node => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        const color = node.type === 'role' ? '#3B82F6' : node.type === 'condition' ? '#F59E0B' : node.type === 'parallel' ? '#8B5CF6' : '#10B981';

        return (
          <g
            key={node.id}
            onClick={() => onNodeClick?.(node.id)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pos.x - NODE_WIDTH / 2}
              y={pos.y - NODE_HEIGHT / 2}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={4}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={12}
              fontWeight="500"
            >
              {node.label.length > 15 ? node.label.slice(0, 15) + '...' : node.label}
            </text>
          </g>
        );
      })}

      {/* Cycle indicators */}
      {graph.cycles.map((cycle, i) => (
        <text
          key={i}
          x={20}
          y={20 + i * 16}
          fill="#EF4444"
          fontSize={12}
        >
          ⚠ Cycle detected: {cycle.join(' → ')}
        </text>
      ))}
    </svg>
  );
}

function calculateLayout(graph: DependencyGraph, width: number, height: number): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Simple layered layout
  const layers = new Map<string, number>();
  const visited = new Set<string>();

  // Find entry nodes (nodes with no incoming edges)
  const hasIncoming = new Set(graph.edges.map(e => e.to));
  const entryNodes = graph.nodes.filter(n => !hasIncoming.has(n.id));

  // BFS to assign layers
  const queue = entryNodes.map(n => n.id);
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const layer = layers.get(nodeId) || 0;
    positions.set(nodeId, {
      x: Math.min(width - NODE_WIDTH, Math.max(NODE_WIDTH, (layer + 1) * (NODE_WIDTH + HORIZONTAL_GAP))),
      y: height / 2 + layers.size * VERTICAL_GAP - 100,
    });

    const outgoing = graph.edges.filter(e => e.from === nodeId);
    for (const edge of outgoing) {
      layers.set(edge.to, Math.max(layers.get(edge.to) || 0, layer + 1));
      queue.push(edge.to);
    }
  }

  // Position remaining nodes
  let yOffset = 50;
  for (const node of graph.nodes) {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: width / 2, y: yOffset });
      yOffset += VERTICAL_GAP;
    }
  }

  return positions;
}

function getEdgePath(from: { x: number; y: number }, to: { x: number; y: number }, edge: DependencyEdge): string {
  const startY = from.y + NODE_HEIGHT / 2;
  const endY = to.y - NODE_HEIGHT / 2;
  const midY = (startY + endY) / 2;

  return `M ${from.x} ${startY} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${endY}`;
}
