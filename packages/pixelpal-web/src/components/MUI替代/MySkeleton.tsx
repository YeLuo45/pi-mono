/**
 * MySkeleton.tsx — MUI Skeleton replacement
 * 
 * Replaces MUI Skeleton for loading placeholders.
 * Supports: variant, width, height, animation, circle
 */

import { type FC, type CSSProperties } from 'react';

export interface MySkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MySkeleton: FC<MySkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'wave',
  className = '',
  sx = {},
  style = {},
}) => {
  const getVariantStyles = (): CSSProperties => {
    switch (variant) {
      case 'circular':
        return {
          width: width || 40,
          height: height || 40,
          borderRadius: '50%',
        };
      case 'rectangular':
        return {
          width: width || '100%',
          height: height || '100px',
          borderRadius: '4px',
        };
      case 'rounded':
        return {
          width: width || '100%',
          height: height || '100px',
          borderRadius: '12px',
        };
      case 'text':
      default:
        return {
          width: width || '100%',
          height: height || '20px',
          borderRadius: '4px',
        };
    }
  };

  const baseStyle: CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    ...getVariantStyles(),
    ...sx,
    ...style,
  };

  if (animation === 'none') {
    return <div className={className} style={baseStyle} />;
  }

  return (
    <div className={className} style={baseStyle}>
      {animation === 'wave' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonWave 1.5s ease-in-out infinite',
            borderRadius: 'inherit',
          }}
        />
      )}
      {animation === 'pulse' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            animation: 'skeletonPulse 1.5s ease-in-out infinite',
            borderRadius: 'inherit',
          }}
        />
      )}
      <style>
        {`
          @keyframes skeletonWave {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes skeletonPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default MySkeleton;
