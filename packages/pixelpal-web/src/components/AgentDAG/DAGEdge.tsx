// DAGEdge - SVG edge rendering for Agent DAG Visualization

import React from 'react';
import { MyTypography } from '../MUI替代/基础组件/MyTypography';

export interface DAGEdgeProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label?: string;
  isConditional?: boolean;
  isCritical?: boolean;
  onClick?: (fromId: string, toId: string) => void;
}

export const DAGEdge: React.FC<DAGEdgeProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  label,
  isConditional = false,
  isCritical = false,
  onClick,
}) => {
  // Calculate control points for bezier curve
  const dx = toX - fromX;
  const dy = toY - fromY;
  
  // Control point offset based on distance
  const cpOffset = Math.min(Math.abs(dx) / 2, 80);
  
  // Create bezier curve path
  const path = isConditional
    ? `M ${fromX} ${fromY} Q ${fromX + cpOffset} ${fromY} ${(fromX + toX) / 2} ${(fromY + toY) / 2} Q ${toX - cpOffset} ${toY} ${toX} ${toY}`
    : `M ${fromX} ${fromY} C ${fromX + cpOffset} ${fromY} ${toX - cpOffset} ${toY} ${toX} ${toY}`;

  // Calculate arrow head
  const arrowSize = 8;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowPoints = [
    [toX - arrowSize * Math.cos(angle - Math.PI / 6), toY - arrowSize * Math.sin(angle - Math.PI / 6)],
    [toX, toY],
    [toX - arrowSize * Math.cos(angle + Math.PI / 6), toY - arrowSize * Math.sin(angle + Math.PI / 6)],
  ].map(p => p.join(',')).join(' ');

  const strokeColor = isCritical ? '#ff9800' : isConditional ? '#757575' : '#5e6ad2';
  const strokeWidth = isCritical ? 3 : 2;
  const strokeDasharray = isConditional ? '8,4' : 'none';

  const handleClick = () => {
    onClick?.('', '');
  };

  return (
    <g className="dag-edge" onClick={handleClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Edge path */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        style={{
          transition: 'stroke 0.2s ease',
        }}
      />
      
      {/* Arrow head */}
      <polygon
        points={arrowPoints}
        fill={strokeColor}
      />

      {/* Label */}
      {label && (
        <g transform={`translate(${(fromX + toX) / 2}, ${(fromY + toY) / 2 - 10})`}>
          <rect
            x={-30}
            y={-10}
            width={60}
            height={20}
            rx={4}
            fill="#1e1e2e"
            stroke={strokeColor}
            strokeWidth={1}
          />
          <MyTypography
            variant="caption"
            sx={{ fontSize: '10px', color: '#aaa' }}
            style={{ textAlign: 'center', display: 'block' }}
          >
            {label}
          </MyTypography>
        </g>
      )}
    </g>
  );
};

export default DAGEdge;