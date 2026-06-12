/**
 * MySlider.tsx — MUI Slider replacement
 * 
 * Replaces MUI Slider with custom styling.
 * Supports: value, onChange, min, max, step, disabled, marks
 */

import { type FC, useState } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MySliderProps {
  value?: number | number[];
  onChange?: (value: number | number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  marks?: Array<{ value: number; label?: string }>;
  className?: string;
  sx?: Record<string, string | number>;
  defaultValue?: number | number[];
}

export const MySlider: FC<MySliderProps> = ({
  value: controlledValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  marks = [],
  className = '',
  sx = {},
  defaultValue = 0,
}) => {
  const theme = useTheme();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isArray = Array.isArray(controlledValue !== undefined ? controlledValue : internalValue);
  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;
  const trackFill = isArray ? ((currentValue as number[])[1] - (currentValue as number[])[0]) / (max - min) * 100 : ((currentValue as number) - min) / (max - min) * 100;
  const trackStart = isArray ? ((currentValue as number[])[0] - min) / (max - min) * 100 : 0;

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newValue = min + percent * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    if (isArray) {
      const range = (currentValue as number[])[1] - (currentValue as number[])[0];
      const center = clampedValue;
      const newRange: [number, number] = [
        Math.max(min, Math.min(center - range / 2, max - range)),
        Math.min(max, Math.max(center + range / 2, range))
      ];
      setInternalValue(newRange);
      onChange?.(newRange);
    } else {
      setInternalValue(clampedValue);
      onChange?.(clampedValue);
    }
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '8px 0',
        ...sx,
      }}
      onClick={handleTrackClick}
    >
      {/* Track background */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: theme.palette.divider || 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
        }}
      />
      
      {/* Track fill */}
      <div
        style={{
          position: 'absolute',
          left: `${trackStart}%`,
          width: `${trackFill}%`,
          height: '4px',
          backgroundColor: theme.palette.primary?.main || '#5e6ad2',
          borderRadius: '2px',
        }}
      />

      {/* Thumb */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${trackStart}% + ${trackFill}% * 0.5)`,
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          backgroundColor: theme.palette.primary?.main || '#5e6ad2',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          cursor: disabled ? 'not-allowed' : 'grab',
          transition: 'box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.target as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLDivElement).style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        }}
      />

      {/* Marks */}
      {marks.map((mark) => (
        <div
          key={mark.value}
          style={{
            position: 'absolute',
            left: `${((mark.value - min) / (max - min)) * 100}%`,
            transform: 'translateX(-50%)',
            bottom: '-16px',
            fontSize: '11px',
            color: theme.palette.text.secondary || '#d0d6e0',
          }}
        >
          {mark.label}
        </div>
      ))}
    </div>
  );
};

export default MySlider;
