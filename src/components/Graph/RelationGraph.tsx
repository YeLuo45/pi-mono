/**
 * RelationGraph — Force-directed persona relationship visualization
 * 
 * Features:
 * - Canvas 2D rendering for performance
 * - Simple physics simulation (repulsion + attraction + center gravity + damping)
 * - Hover tooltips for nodes and edges
 * - Node size based on message count, edge color based on intimacy
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MyDialog as Dialog , MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyTooltip as Tooltip } from '../MUI替代';
import { MyIconButton as IconButton, MyTypography as Typography, MyBox as Box, MyPaper as Paper, MyChip as Chip } from '../MUI替代';
import { Close as CloseIcon } from '@mui/icons-material';
import {
  computeRelationGraph,
  normalizeNodeRadius,
  normalizeEdgeWidth,
  getIntimacyLevel,
  type GraphNode,
  type GraphEdge,
} from '../../services/graph/relationGraph';

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node: GraphNode;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

interface RelationGraphProps {
  open: boolean;
  onClose: () => void;
}

const EDGE_MIN_WIDTH = 1;
const EDGE_MAX_WIDTH = 5;
const NODE_MIN_RADIUS = 20;
const NODE_MAX_RADIUS = 60;
const MAX_ITERATIONS = 200;
const MOVEMENT_THRESHOLD = 0.5;
const REPULSION_STRENGTH = 5000;
const ATTRACTION_STRENGTH = 0.01;
const CENTER_GRAVITY = 0.01;
const DAMPING = 0.85;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Get edge color based on intimacy (gray -> gold -> purple)
function getEdgeColor(intimacy: number): string {
  if (intimacy >= 70) return '#a855f7'; // purple (high)
  if (intimacy >= 40) return '#eab308'; // gold (medium)
  return '#6b7280'; // gray (low)
}

export const RelationGraph: React.FC<RelationGraphProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const nodePositionsRef = useRef<NodePosition[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Graph data
  const graphData = useRef(computeRelationGraph());

  // Hover state
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  const hoveredNodeRef = useRef<string | null>(null);
  const hoveredEdgeRef = useRef<{ source: string; target: string } | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Compute min/max for normalization
  const messageCounts = graphData.current.nodes.map(n => n.messageCount);
  const minMsg = Math.min(...messageCounts, 0);
  const maxMsg = Math.max(...messageCounts, 1);

  // Run force-directed layout
  const runLayout = useCallback(() => {
    const { nodes, edges } = graphData.current;
    if (nodes.length === 0) return;

    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions randomly in center area
    nodePositionsRef.current = nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.25;
      return {
        id: node.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        node,
      };
    });

    let iteration = 0;
    let totalMovement = Infinity;

    const simulate = () => {
      const positions = nodePositionsRef.current;
      if (positions.length === 0) return;

      // Reset movement accumulator
      totalMovement = 0;

      // 1. Repulsion: all nodes push away from each other
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION_STRENGTH / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // 2. Attraction: connected nodes pull toward each other
      for (const edge of edges) {
        const sourcePos = positions.find(p => p.id === edge.source);
        const targetPos = positions.find(p => p.id === edge.target);
        if (!sourcePos || !targetPos) continue;
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = ATTRACTION_STRENGTH * dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        sourcePos.vx += fx;
        sourcePos.vy += fy;
        targetPos.vx -= fx;
        targetPos.vy -= fy;
      }

      // 3. Center gravity + 4. Damping
      for (const pos of positions) {
        pos.vx += (centerX - pos.x) * CENTER_GRAVITY;
        pos.vy += (centerY - pos.y) * CENTER_GRAVITY;
        pos.vx *= DAMPING;
        pos.vy *= DAMPING;
        pos.x += pos.vx;
        pos.y += pos.vy;
        // Keep within bounds
        pos.x = clamp(pos.x, 60, width - 60);
        pos.y = clamp(pos.y, 60, height - 60);
        totalMovement += Math.abs(pos.vx) + Math.abs(pos.vy);
      }

      iteration++;
      if (iteration < MAX_ITERATIONS && totalMovement > MOVEMENT_THRESHOLD) {
        animationRef.current = requestAnimationFrame(simulate);
      } else {
        setInitialized(true);
      }
    };

    simulate();
  }, []);

  // Start layout when dialog opens
  useEffect(() => {
    if (open && !initialized) {
      // Small delay to ensure container is sized
      const timer = setTimeout(runLayout, 50);
      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(animationRef.current);
      };
    }
  }, [open, initialized, runLayout]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !initialized) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const { edges } = graphData.current;
    const positions = nodePositionsRef.current;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Find hovered edge for highlighting
    const hoveredEdge = hoveredEdgeRef.current;

    // Draw edges
    for (const edge of edges) {
      const sourcePos = positions.find(p => p.id === edge.source);
      const targetPos = positions.find(p => p.id === edge.target);
      if (!sourcePos || !targetPos) continue;

      const isHovered = hoveredEdge &&
        ((hoveredEdge.source === edge.source && hoveredEdge.target === edge.target) ||
         (hoveredEdge.source === edge.target && hoveredEdge.target === edge.source));

      const edgeWidth = normalizeEdgeWidth(edge.weight, minMsg, maxMsg);
      const edgeColor = getEdgeColor(edge.intimacy);

      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.strokeStyle = isHovered ? '#fff' : edgeColor;
      ctx.lineWidth = isHovered ? edgeWidth + 2 : edgeWidth;
      ctx.globalAlpha = isHovered ? 1 : 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw nodes
    for (const pos of positions) {
      const { node } = pos;
      const radius = normalizeNodeRadius(node.messageCount, minMsg, maxMsg);
      const isHovered = hoveredNodeRef.current === node.id;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.globalAlpha = isHovered ? 1 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Highlight ring
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Emoji
      ctx.font = `${radius * 1.0}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.avatar, pos.x, pos.y);

      // Label below node
      ctx.font = '12px Arial';
      ctx.fillStyle = '#e5e7eb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelY = pos.y + radius + 4;
      ctx.fillText(node.name, pos.x, labelY);
    }
  }, [initialized, minMsg, maxMsg]);

  // Handle mouse move for hover detection
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePosRef.current = { x, y };

    const positions = nodePositionsRef.current;
    const { edges } = graphData.current;

    // Find nearest node within hit radius
    let nearestNode: NodePosition | null = null;
    let nearestNodeDist = Infinity;
    for (const pos of positions) {
      const radius = normalizeNodeRadius(pos.node.messageCount, minMsg, maxMsg);
      const dx = x - pos.x;
      const dy = y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius + 10 && dist < nearestNodeDist) {
        nearestNode = pos;
        nearestNodeDist = dist;
      }
    }

    // Find nearest edge
    let nearestEdge: GraphEdge | null = null;
    let nearestEdgeDist = Infinity;
    if (!nearestNode) {
      for (const edge of edges) {
        const sourcePos = positions.find(p => p.id === edge.source);
        const targetPos = positions.find(p => p.id === edge.target);
        if (!sourcePos || !targetPos) continue;
        // Distance from point to line segment
        const dist = pointToSegmentDistance(x, y, sourcePos.x, sourcePos.y, targetPos.x, targetPos.y);
        if (dist < 10 && dist < nearestEdgeDist) {
          nearestEdge = edge;
          nearestEdgeDist = dist;
        }
      }
    }

    // Update hover state
    if (nearestNode) {
      hoveredNodeRef.current = nearestNode.node.id;
      hoveredEdgeRef.current = null;
      // Calculate last active days ago
      const daysAgo = Math.floor((Date.now() - (nearestNode.node.messageCount * 3600000)) / 86400000);
      setTooltip({
        visible: true,
        x: nearestNode.x,
        y: nearestNode.y - normalizeNodeRadius(nearestNode.node.messageCount, minMsg, maxMsg) - 50,
        content: (
          <Paper sx={{ p: 1.5, minWidth: 160 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: 20 }}>{nearestNode.node.avatar}</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{nearestNode.node.name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {t('graph.messageCount', '消息数:')} <strong>{nearestNode.node.messageCount}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('graph.intimacy', '亲密度:')} <strong>{nearestNode.node.intimacy} ({getIntimacyLevel(nearestNode.node.intimacy)})</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('graph.lastActive', '最后活跃:')} <strong>{nearestNode.node.messageCount > 0 ? `${Math.max(1, nearestNode.node.messageCount)}${t('graph.daysAgo', '天前')}` : t('graph.never', '从未')}</strong>
              </Typography>
            </Box>
          </Paper>
        ),
      });
    } else if (nearestEdge) {
      hoveredNodeRef.current = null;
      hoveredEdgeRef.current = { source: nearestEdge.source, target: nearestEdge.target };
      const sourceNode = graphData.current.nodes.find(n => n.id === nearestEdge!.source)!;
      const targetNode = graphData.current.nodes.find(n => n.id === nearestEdge!.target)!;
      const sourcePos = positions.find(p => p.id === nearestEdge!.source)!;
      const targetPos = positions.find(p => p.id === nearestEdge!.target)!;
      setTooltip({
        visible: true,
        x: (sourcePos.x + targetPos.x) / 2,
        y: (sourcePos.y + targetPos.y) / 2 - 20,
        content: (
          <Paper sx={{ p: 1.5, minWidth: 140 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {sourceNode.avatar} ↔ {targetNode.avatar}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('graph.potentialHeat', '潜在互动热度:')} <strong>{Math.round(nearestEdge.weight)}</strong>
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              {t('graph.avgIntimacy', '平均亲密度:')} <strong>{Math.round(nearestEdge.intimacy)}</strong>
            </Typography>
          </Paper>
        ),
      });
    } else {
      hoveredNodeRef.current = null;
      hoveredEdgeRef.current = null;
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  }, [minMsg, maxMsg]);

  const handleMouseLeave = useCallback(() => {
    hoveredNodeRef.current = null;
    hoveredEdgeRef.current = null;
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Redraw on hover changes
  useEffect(() => {
    if (initialized) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Trigger redraw
      const event = new Event('mousemove', { bubbles: true });
      canvas.dispatchEvent(event);
    }
  }, [tooltip, initialized]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: '90vw',
          height: '85vh',
          maxWidth: 1200,
          maxHeight: 800,
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
            🔗 {t('graph.title', '关系图谱')}
          </Typography>
          <Chip label={`${graphData.current.nodes.length} ${t('graph.personaCount', '个人格')}`} size="small" sx={{ fontSize: 11 }} />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Legend */}
        <Box sx={{ position: 'absolute', top: 12, left: 16, zIndex: 10, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#6b7280' }} />
            <Typography variant="caption" sx={{ fontSize: 10 }}>{t('graph.lowIntimacy', '低亲密度')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#eab308' }} />
            <Typography variant="caption" sx={{ fontSize: 10 }}>{t('graph.mediumIntimacy', '中亲密度')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#a855f7' }} />
            <Typography variant="caption" sx={{ fontSize: 10 }}>{t('graph.highIntimacy', '高亲密度')}</Typography>
          </Box>
        </Box>

        {/* Canvas container */}
        <Box
          ref={containerRef}
          sx={{ width: '100%', height: '100%', position: 'relative' }}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ display: 'block', cursor: 'pointer' }}
          />

          {/* Tooltip */}
          {tooltip.visible && (
            <Box
              sx={{
                position: 'absolute',
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translateX(-50%)',
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              {tooltip.content}
            </Box>
          )}

          {/* Loading overlay */}
          {!initialized && (
            <Box sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.4)',
            }}>
              <Typography color="text.secondary">{t('graph.calculating', '布局计算中...')}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// Point to line segment distance
function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}
