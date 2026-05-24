/**
 * V148: Knowledge Graph Panel
 * 
 * SVG-based knowledge graph visualization component.
 * Renders entities as nodes and relations as edges.
 * No external dependencies - pure SVG.
 */

import React, { useMemo } from 'react';
import { KGEntity, KGRelation } from '../../services/knowledge';

export interface KnowledgePanelProps {
  /** Entities to display */
  entities: KGEntity[];
  /** Relations between entities */
  relations: KGRelation[];
  /** Currently selected entity ID */
  selectedEntityId?: string | null;
  /** Callback when an entity is clicked */
  onEntityClick?: (entity: KGEntity) => void;
  /** Callback when a relation is clicked */
  onRelationClick?: (relation: KGRelation) => void;
  /** Language for i18n */
  language?: 'en' | 'zh';
  /** CSS class name */
  className?: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  entity: KGEntity;
}

interface EdgeData {
  relation: KGRelation;
  source: NodePosition;
  target: NodePosition;
}

// Simple force-directed layout algorithm
function layoutNodes(entities: KGEntity[], width: number, height: number): NodePosition[] {
  const padding = 60;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - padding * 2;

  return entities.map((entity, index) => {
    // Arrange in a circle
    const angle = (2 * Math.PI * index) / entities.length;
    return {
      id: entity.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      entity,
    };
  });
}

function getEdgePath(source: NodePosition, target: NodePosition): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dr = Math.sqrt(dx * dx + dy * dy);
  
  // Self-looping edge
  if (source.id === target.id) {
    const loopRadius = 30;
    return `M ${source.x} ${source.y - 20} 
            A ${loopRadius} ${loopRadius} 0 1 1 ${source.x + loopRadius} ${source.y - 20}`;
  }

  // Arrow line with slight curve
  if (dr < 1) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }

  // Calculate control point for curve
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const curveOffset = dr * 0.1;
  const nx = -dy / dr * curveOffset;
  const ny = dx / dr * curveOffset;

  return `M ${source.x} ${source.y} Q ${midX + nx} ${midY + ny} ${target.x} ${target.y}`;
}

function getEntityColor(type: string): string {
  const colors: Record<string, string> = {
    person: '#4CAF50',
    place: '#2196F3',
    event: '#FF9800',
    concept: '#9C27B0',
    object: '#795548',
    topic: '#00BCD4',
    fact: '#F44336',
    default: '#607D8B',
  };
  return colors[type.toLowerCase()] || colors.default;
}

function EntityIcon({ type }: { type: string }): React.ReactNode {
  const iconMap: Record<string, string> = {
    person: '👤',
    place: '📍',
    event: '📅',
    concept: '💡',
    object: '📦',
    topic: '📚',
    fact: '✅',
    default: '🔹',
  };
  return <span>{iconMap[type.toLowerCase()] || iconMap.default}</span>;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  entities,
  relations,
  selectedEntityId,
  onEntityClick,
  onRelationClick,
  language = 'en',
  className,
}) => {
  const labels = useMemo(() => ({
    en: {
      title: 'Knowledge Graph',
      noData: 'No knowledge entries yet',
      type: 'Type',
      relations: 'relations',
      shared: 'Shared',
      personaOwned: 'Persona',
    },
    zh: {
      title: '知识图谱',
      noData: '暂无知识条目',
      type: '类型',
      relations: '条关系',
      shared: '共享',
      personaOwned: '角色',
    },
  }), [language]);

  const width = 600;
  const height = 400;

  // Calculate node positions
  const nodes = useMemo(() => {
    if (entities.length === 0) return [];
    return layoutNodes(entities, width, height);
  }, [entities, width, height]);

  // Build node map for edge lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Calculate edges
  const edges = useMemo((): EdgeData[] => {
    const result: EdgeData[] = [];
    for (const relation of relations) {
      const source = nodeMap.get(relation.source_id);
      const target = nodeMap.get(relation.target_id);
      if (source && target) {
        result.push({ relation, source, target });
      }
    }
    return result;
  }, [relations, nodeMap]);

  if (entities.length === 0) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: '#999' }}>{labels.noData}</span>
      </div>
    );
  }

  return (
    <div className={className} style={{ overflow: 'auto' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#fafafa', borderRadius: 8 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#90a4ae" />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Render edges */}
        <g className="edges">
          {edges.map(({ relation, source, target }) => (
            <g key={relation.id} onClick={() => onRelationClick?.(relation)} style={{ cursor: 'pointer' }}>
              <path
                d={getEdgePath(source, target)}
                fill="none"
                stroke="#90a4ae"
                strokeWidth={selectedEntityId === relation.source_id || selectedEntityId === relation.target_id ? 3 : 1.5}
                markerEnd="url(#arrowhead)"
                style={{ transition: 'stroke-width 0.2s' }}
              />
              <text
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2 - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#78909c"
              >
                {relation.relation_type}
              </text>
            </g>
          ))}
        </g>

        {/* Render nodes */}
        <g className="nodes">
          {nodes.map(node => {
            const isSelected = node.id === selectedEntityId;
            const isShared = node.entity.persona_id === null;
            const color = getEntityColor(node.entity.type);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onEntityClick?.(node.entity)}
                style={{ cursor: 'pointer' }}
                filter={isSelected ? 'url(#shadow)' : undefined}
              >
                {/* Node circle */}
                <circle
                  r={isSelected ? 28 : 24}
                  fill={color}
                  stroke={isSelected ? '#fff' : 'transparent'}
                  strokeWidth={isSelected ? 3 : 0}
                  style={{ transition: 'all 0.2s' }}
                />
                
                {/* Entity icon */}
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize="16"
                  fill="#fff"
                  style={{ pointerEvents: 'none' }}
                >
                  {EntityIcon({ type: node.entity.type })}
                </text>

                {/* Entity name */}
                <text
                  y={40}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#37474f"
                  fontWeight={isSelected ? 700 : 400}
                >
                  {node.entity.name.length > 15 
                    ? node.entity.name.substring(0, 15) + '…' 
                    : node.entity.name}
                </text>

                {/* Type label */}
                <text
                  y={54}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#78909c"
                >
                  {node.entity.type}
                </text>

                {/* Shared indicator */}
                {isShared && (
                  <circle
                    cx={20}
                    cy={-20}
                    r={6}
                    fill="#FFD700"
                    stroke="#fff"
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 12px', fontSize: 11, color: '#666' }}>
        <span>👤 {labels.type}: person</span>
        <span>📍 {labels.type}: place</span>
        <span>📅 {labels.type}: event</span>
        <span>💡 {labels.type}: concept</span>
        <span>🔹 <span style={{ color: '#FFD700' }}>●</span> = {labels.shared}</span>
      </div>
    </div>
  );
};

export default KnowledgePanel;