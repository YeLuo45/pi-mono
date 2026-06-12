/**
 * KnowledgeGraphViz - SVG-based force-directed knowledge graph visualization
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { KnowledgeEntity, KnowledgeRelation, EntityType, RelationType } from './types';

interface Node {
  entity: KnowledgeEntity;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Link {
  relation: KnowledgeRelation;
  source: string;
  target: string;
}

interface KnowledgeGraphVizProps {
  entities: KnowledgeEntity[];
  relations: KnowledgeRelation[];
  width?: number;
  height?: number;
  selectedEntityId?: string;
  onNodeClick?: (entity: KnowledgeEntity) => void;
  onNodeDoubleClick?: (entity: KnowledgeEntity) => void;
  filterType?: EntityType | 'all';
  filterAgent?: string;
}

const ENTITY_COLORS: Record<EntityType, string> = {
  agent: '#3B82F6',
  task: '#10B981',
  concept: '#8B5CF6',
  document: '#F59E0B',
  skill: '#EC4899',
};

const RELATION_COLORS: Record<RelationType, string> = {
  knows: '#6B7280',
  depends_on: '#EF4444',
  produces: '#10B981',
  requires: '#F59E0B',
  related_to: '#9CA3AF',
  part_of: '#3B82F6',
};

export function KnowledgeGraphViz({
  entities,
  relations,
  width = 800,
  height = 600,
  selectedEntityId,
  onNodeClick,
  onNodeDoubleClick,
  filterType = 'all',
  filterAgent = 'all',
}: KnowledgeGraphVizProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Map<string, Node>>(new Map());
  const [links, setLinks] = useState<Link[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Filter entities
  const filteredEntities = entities.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterAgent !== 'all' && e.ownerAgentId !== filterAgent) return false;
    return true;
  });

  const filteredEntityIds = new Set(filteredEntities.map(e => e.id));
  const filteredRelations = relations.filter(
    r => filteredEntityIds.has(r.sourceId) && filteredEntityIds.has(r.targetId)
  );

  // Initialize nodes with random positions
  useEffect(() => {
    const newNodes = new Map<string, Node>();
    filteredEntities.forEach((entity, i) => {
      const angle = (i / filteredEntities.length) * 2 * Math.PI;
      const radius = Math.min(width, height) / 3;
      newNodes.set(entity.id, {
        entity,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      });
    });
    setNodes(newNodes);
    setLinks(filteredRelations.map(r => ({ relation: r, source: r.sourceId, target: r.targetId })));
  }, [filteredEntities, filteredRelations, width, height]);

  // Force simulation
  useEffect(() => {
    if (nodes.size === 0) return;

    const iterations = 100;
    const centerX = width / 2;
    const centerY = height / 2;
    const repulsion = 5000;
    const attraction = 0.01;
    const damping = 0.9;

    for (let iter = 0; iter < iterations; iter++) {
      const nodeArray = Array.from(nodes.values());

      // Repulsion between nodes
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const a = nodeArray[i];
          const b = nodeArray[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Attraction along links
      for (const link of links) {
        const source = nodes.get(link.source);
        const target = nodes.get(link.target);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * attraction;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      // Center gravity
      for (const node of nodeArray) {
        node.vx += (centerX - node.x) * 0.001;
        node.vy += (centerY - node.y) * 0.001;
      }

      // Update positions with damping
      for (const node of nodeArray) {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        // Boundary
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      }
    }

    setNodes(new Map(nodeArray.map(n => [n.entity.id, n])));
  }, [nodes.size, links.length, width, height]);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    setIsDragging(true);
    setDraggedNode(nodeId);
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;
    setNodes(prev => {
      const node = prev.get(draggedNode);
      if (!node) return prev;
      return new Map(prev).set(draggedNode, { ...node, x, y, vx: 0, vy: 0 });
    });
  }, [draggedNode, transform]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(3, prev.scale * delta)),
    }));
  };

  return (
    <svg
      ref={svgRef}
      className="knowledge-graph-viz"
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
        </marker>
      </defs>

      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        {/* Links */}
        {links.map(link => {
          const source = nodes.get(link.source);
          const target = nodes.get(link.target);
          if (!source || !target) return null;
          return (
            <line
              key={link.relation.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={RELATION_COLORS[link.relation.type]}
              strokeWidth={1 + link.relation.weight}
              strokeOpacity={0.6}
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Nodes */}
        {Array.from(nodes.values()).map(node => (
          <g
            key={node.entity.id}
            transform={`translate(${node.x}, ${node.y})`}
            onClick={() => onNodeClick?.(node.entity)}
            onDoubleClick={() => onNodeDoubleClick?.(node.entity)}
            onMouseDown={e => handleMouseDown(e, node.entity.id)}
            style={{ cursor: 'pointer' }}
          >
            {/* Node circle */}
            <circle
              r={selectedEntityId === node.entity.id ? 24 : 20}
              fill={ENTITY_COLORS[node.entity.type]}
              stroke={selectedEntityId === node.entity.id ? '#fff' : 'transparent'}
              strokeWidth={3}
            />
            {/* Node icon */}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={12}
              fontWeight="bold"
            >
              {node.entity.type === 'agent' ? '🤖' :
               node.entity.type === 'task' ? '📋' :
               node.entity.type === 'concept' ? '💡' :
               node.entity.type === 'document' ? '📄' : '⚡'}
            </text>
            {/* Label */}
            <text
              y={30}
              textAnchor="middle"
              fill="#374151"
              fontSize={10}
            >
              {node.entity.name.length > 12 ? node.entity.name.slice(0, 12) + '...' : node.entity.name}
            </text>
          </g>
        ))}
      </g>

      {/* Legend */}
      <g transform={`translate(10, 10)`}>
        <rect x={0} y={0} width={120} height={100} fill="white" stroke="#E5E7EB" rx={4} />
        <text x={10} y={18} fontSize={10} fontWeight="bold" fill="#374151">Entity Types</text>
        {Object.entries(ENTITY_COLORS).slice(0, 5).map(([type, color], i) => (
          <g key={type} transform={`translate(10, ${30 + i * 14})`}>
            <circle r={5} fill={color} />
            <text x={12} y={3} fontSize={8} fill="#6B7280">{type}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
