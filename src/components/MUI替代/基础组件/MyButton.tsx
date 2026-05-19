import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyButtonProps {
  children?: ReactNode;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  sx?: CSSProperties;
}

export const MyButton: FC<MyButtonProps> = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  startIcon,
  endIcon,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  sx = {},
}) => {
  const sizeStyles: Record<string, CSSProperties> = {
    small: { padding: '4px 12px', fontSize: '13px', minHeight: '32px' },
    medium: { padding: '8px 20px', fontSize: '14px', minHeight: '40px' },
    large: { padding: '12px 28px', fontSize: '16px', minHeight: '48px' },
  };

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: '#5e6ad2', text: '#fff', border: '#5e6ad2' },
    secondary: { bg: '#7170ff', text: '#fff', border: '#7170ff' },
    error: { bg: '#ef5350', text: '#fff', border: '#ef5350' },
    warning: { bg: '#ff9800', text: '#fff', border: '#ff9800' },
    success: { bg: '#4caf50', text: '#fff', border: '#4caf50' },
    info: { bg: '#2196f3', text: '#fff', border: '#2196f3' },
    inherit: { bg: 'transparent', text: 'currentColor', border: 'transparent' },
  };

  const colors = colorMap[color] || colorMap.primary;

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: variant !== 'text' ? `1px solid ${colors.border}` : 'none',
    borderRadius: '8px',
    fontWeight: 500,
    fontFamily: 'Inter, system-ui, sans-serif',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    ...sizeStyles[size],
    ...sx,
  };

  if (variant === 'contained') {
    baseStyle.backgroundColor = colors.bg;
    baseStyle.color = colors.text;
  } else if (variant === 'outlined') {
    baseStyle.backgroundColor = 'transparent';
    baseStyle.color = colors.text;
  } else {
    baseStyle.backgroundColor = 'transparent';
    baseStyle.color = colors.text;
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={baseStyle}
    >
      {startIcon && <span style={{ display: 'flex' }}>{startIcon}</span>}
      {children}
      {endIcon && <span style={{ display: 'flex' }}>{endIcon}</span>}
    </button>
  );
};

export default MyButton;
