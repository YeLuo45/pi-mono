import { type FC, type CSSProperties } from 'react';

export interface MyIconButtonProps {
  children?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  sx?: CSSProperties;
  edge?: 'start' | 'end' | false;
}

export const MyIconButton: FC<MyIconButtonProps> = ({
  children,
  color = 'inherit',
  size = 'medium',
  disabled = false,
  onClick,
  className = '',
  sx = {},
}) => {
  const sizeStyles: Record<string, CSSProperties> = {
    small: { width: 32, height: 32 },
    medium: { width: 40, height: 40 },
    large: { width: 48, height: 48 },
  };

  const colorMap: Record<string, string> = {
    primary: '#5e6ad2',
    secondary: '#7170ff',
    error: '#ef5350',
    warning: '#ff9800',
    success: '#4caf50',
    info: '#2196f3',
    inherit: 'currentColor',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        borderRadius: '50%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        padding: 0,
        ...sizeStyles[size],
        color: colorMap[color] || colorMap.inherit,
        ...sx,
      }}
    >
      {children}
    </button>
  );
};

export default MyIconButton;
