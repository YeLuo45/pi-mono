import { type FC, type CSSProperties, type ChangeEvent } from 'react';

export interface MySwitchProps {
  checked?: boolean;
  onChange?: ((checked: boolean) => void) | ((event: ChangeEvent<HTMLButtonElement>, checked: boolean) => void);
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  size?: 'small' | 'medium';
  className?: string;
  sx?: CSSProperties;
  edge?: 'start' | 'end' | false;
}

export const MySwitch: FC<MySwitchProps> = ({
  checked = false,
  onChange,
  disabled = false,
  color = 'primary',
  size = 'medium',
  className = '',
  sx = {},
}) => {
  const colorMap: Record<string, { on: string; off: string }> = {
    primary: { on: '#5e6ad2', off: 'rgba(255,255,255,0.38)' },
    secondary: { on: '#7170ff', off: 'rgba(255,255,255,0.38)' },
    error: { on: '#ef5350', off: 'rgba(255,255,255,0.38)' },
    warning: { on: '#ff9800', off: 'rgba(255,255,255,0.38)' },
    success: { on: '#4caf50', off: 'rgba(255,255,255,0.38)' },
    info: { on: '#2196f3', off: 'rgba(255,255,255,0.38)' },
  };

  const colors = colorMap[color] || colorMap.primary;
  const trackHeight = size === 'small' ? 14 : 20;
  const thumbSize = size === 'small' ? 12 : 20;
  const trackWidth = size === 'small' ? 30 : 40;

  const handleChange = () => {
    if (disabled) return;
    if (onChange) {
      // Support both signatures: () => void and (event, checked) => void
      (onChange as (c: boolean) => void)(!checked);
    }
  };

  return (
    <span
      className={className}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={handleChange}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleChange();
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        width: trackWidth,
        height: trackHeight,
        borderRadius: trackHeight / 2,
        backgroundColor: checked ? colors.on : colors.off,
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
        ...sx,
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: thumbSize,
          height: thumbSize,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s ease',
          transform: checked
            ? `translateX(${trackWidth - thumbSize}px)`
            : 'translateX(0)',
          left: 0,
          top: (trackHeight - thumbSize) / 2,
        }}
      />
    </span>
  );
};

export default MySwitch;
