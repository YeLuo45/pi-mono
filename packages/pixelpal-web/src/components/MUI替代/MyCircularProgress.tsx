/**
 * MyCircularProgress.tsx — MUI CircularProgress replacement
 * 
 * Replaces MUI CircularProgress with custom styling.
 * Supports: size, thickness, value, color, variant, determinate/indeterminate
 */

import { type FC, type CSSProperties } from 'react';

export interface MyCircularProgressProps {
  size?: number | string;
  thickness?: number;
  value?: number;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'inherit';
  variant?: 'determinate' | 'indeterminate';
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyCircularProgress: FC<MyCircularProgressProps> = ({
  size = 40,
  thickness = 3.6,
  value = 0,
  color = 'primary',
  variant = 'indeterminate',
  className = '',
  sx = {},
  style = {},
}) => {
  const colorMap: Record<string, string> = {
    primary: '#5e6ad2',
    secondary: '#7170ff',
    error: '#ef5350',
    warning: '#ff9800',
    success: '#4caf50',
    info: '#2196f3',
    inherit: 'currentColor',
  };

  const progressColor = colorMap[color] || colorMap.primary;
  const strokeWidth = thickness;
  const normalizedSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 40;
  const radius = (normalizedSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = variant === 'determinate' 
    ? circumference - (value / 100) * circumference 
    : circumference * 0.75;

  const containerStyle: CSSProperties = {
    width: normalizedSize,
    height: normalizedSize,
    ...sx,
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      <svg
        viewBox={`0 0 ${normalizedSize} ${normalizedSize}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={normalizedSize / 2}
          cy={normalizedSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={normalizedSize / 2}
          cy={normalizedSize / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: variant === 'indeterminate' 
              ? 'stroke-dashoffset 1.4s ease-in-out infinite' 
              : 'stroke-dashoffset 0.3s ease',
          }}
        />
      </svg>
    </div>
  );
};

export default MyCircularProgress;
