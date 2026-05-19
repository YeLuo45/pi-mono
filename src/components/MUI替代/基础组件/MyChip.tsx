import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyChipProps {
  children?: ReactNode;
  label?: ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'default';
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  onDelete?: () => void;
  icon?: ReactNode;
  className?: string;
  sx?: CSSProperties;
}

export const MyChip: FC<MyChipProps> = ({
  children,
  label,
  color = 'default',
  variant = 'filled',
  size = 'medium',
  onDelete,
  icon,
  className = '',
  sx = {},
}) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: 'rgba(94, 106, 210, 0.15)', text: '#5e6ad2', border: '#5e6ad2' },
    secondary: { bg: 'rgba(113, 112, 255, 0.15)', text: '#7170ff', border: '#7170ff' },
    error: { bg: 'rgba(239, 83, 80, 0.15)', text: '#ef5350', border: '#ef5350' },
    warning: { bg: 'rgba(255, 152, 0, 0.15)', text: '#ff9800', border: '#ff9800' },
    success: { bg: 'rgba(76, 175, 80, 0.15)', text: '#4caf50', border: '#4caf50' },
    info: { bg: 'rgba(33, 150, 243, 0.15)', text: '#2196f3', border: '#2196f3' },
    default: { bg: 'rgba(255, 255, 255, 0.08)', text: 'currentColor', border: 'rgba(255,255,255,0.2)' },
  };

  const colors = colorMap[color] || colorMap.default;
  const sizeStyles = size === 'small'
    ? { fontSize: '12px', height: '24px', padding: '0 8px' }
    : { fontSize: '14px', height: '32px', padding: '0 12px' };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '16px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...sizeStyles,
        backgroundColor: variant === 'filled' ? colors.bg : 'transparent',
        color: colors.text,
        border: `1px solid ${colors.border}`,
        ...sx,
      }}
    >
      {icon && <span style={{ display: 'flex', fontSize: 'inherit' }}>{icon}</span>}
      {label || children}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            color: 'inherit',
            opacity: 0.7,
            fontSize: 'inherit',
            marginLeft: '4px',
          }}
        >
          ×
        </button>
      )}
    </span>
  );
};

export default MyChip;
