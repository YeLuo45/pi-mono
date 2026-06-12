/**
 * MyLinearProgress.tsx — MUI LinearProgress replacement
 * 
 * Replaces MUI LinearProgress with custom styling.
 * Supports: value, color, variant (determinate/indeterminate/buffer/query)
 */

import { type FC, type CSSProperties } from 'react';

export interface MyLinearProgressProps {
  value?: number;
  valueBuffer?: number;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'inherit';
  variant?: 'determinate' | 'indeterminate' | 'buffer' | 'query';
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyLinearProgress: FC<MyLinearProgressProps> = ({
  value = 0,
  valueBuffer,
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
  const normalizedValue = Math.min(100, Math.max(0, value));

  const containerStyle: CSSProperties = {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    ...sx,
    ...style,
  };

  const getBarStyle = (width: number, delay: number = 0): CSSProperties => ({
    height: '100%',
    borderRadius: '2px',
    backgroundColor: progressColor,
    transition: variant === 'indeterminate' ? 'transform 1s ease-in-out infinite' : 'width 0.3s ease',
    transform: variant === 'indeterminate' ? 'translateX(-100%)' : 'none',
    animation: variant === 'indeterminate' ? `linearProgress 1.4s ease-in-out ${delay}ms infinite` : 'none',
    width: variant === 'indeterminate' ? '100%' : `${width}%`,
  });

  return (
    <div className={className} style={containerStyle} role="progressbar">
      {variant === 'buffer' && (
        <div
          style={{
            ...getBarStyle(valueBuffer || 0),
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            position: 'absolute',
          }}
        />
      )}
      {variant !== 'query' && (
        <div style={getBarStyle(normalizedValue)} />
      )}
      {variant === 'query' && (
        <div
          style={{
            ...getBarStyle(100),
            animation: 'reverse linearProgress 1.4s ease-in-out infinite',
          }}
        />
      )}
      <style>
        {`
          @keyframes linearProgress {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default MyLinearProgress;
