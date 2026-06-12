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
    primary: { on: 'var(--system-green)', off: 'var(--system-gray)' },
    secondary: { on: 'var(--system-purple)', off: 'var(--system-gray)' },
    error: { on: 'var(--system-red)', off: 'var(--system-gray)' },
    warning: { on: 'var(--system-orange)', off: 'var(--system-gray)' },
    success: { on: 'var(--system-green)', off: 'var(--system-gray)' },
    info: { on: 'var(--system-teal)', off: 'var(--system-gray)' },
  };

  const colors = colorMap[color] || colorMap.primary;
  const trackHeight = size === 'small' ? 22 : 31;
  const thumbSize = size === 'small' ? 18 : 27;
  const trackWidth = size === 'small' ? 40 : 51;
  const thumbInset = 2;

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
        borderRadius: 'var(--radius-full)',
        backgroundColor: checked ? colors.on : colors.off,
        transition: 'background-color var(--duration-short) var(--ease-macOS)',
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
          backgroundColor: '#fff',
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform var(--duration-short) var(--ease-macOS)',
          transform: checked
            ? `translateX(${trackWidth - thumbSize - thumbInset * 2}px)`
            : `translateX(${thumbInset}px)`,
          left: 0,
          top: (trackHeight - thumbSize) / 2,
        }}
      />
    </span>
  );
};

export default MySwitch;
