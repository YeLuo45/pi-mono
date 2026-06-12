/**
 * MyAlert.tsx — MUI Alert replacement
 * 
 * Replaces MUI Alert with custom styling.
 * Supports: severity, children, title, action, icon, variant (filled/outlined/standard)
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyAlertProps {
  children?: ReactNode;
  severity?: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: 'filled' | 'outlined' | 'standard';
  onClose?: () => void;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyAlert: FC<MyAlertProps> = ({
  children,
  severity = 'info',
  title,
  action,
  icon,
  variant = 'standard',
  onClose,
  className = '',
  sx = {},
  style = {},
}) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    success: {
      bg: variant === 'filled' ? '#4caf50' : 'rgba(76, 175, 80, 0.15)',
      border: '#4caf50',
      text: variant === 'filled' ? '#fff' : '#4caf50',
      icon: '✓',
    },
    info: {
      bg: variant === 'filled' ? '#2196f3' : 'rgba(33, 150, 243, 0.15)',
      border: '#2196f3',
      text: variant === 'filled' ? '#fff' : '#2196f3',
      icon: 'ℹ',
    },
    warning: {
      bg: variant === 'filled' ? '#ff9800' : 'rgba(255, 152, 0, 0.15)',
      border: '#ff9800',
      text: variant === 'filled' ? '#fff' : '#ff9800',
      icon: '⚠',
    },
    error: {
      bg: variant === 'filled' ? '#ef5350' : 'rgba(239, 83, 80, 0.15)',
      border: '#ef5350',
      text: variant === 'filled' ? '#fff' : '#ef5350',
      icon: '✕',
    },
  };

  const colors = colorMap[severity] || colorMap.info;

  const alertStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: variant === 'standard' ? colors.bg : 'transparent',
    border: variant !== 'standard' ? `1px solid ${colors.border}` : 'none',
    color: colors.text,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    lineHeight: 1.5,
    ...sx,
    ...style,
  };

  return (
    <div className={className} style={alertStyle} role="alert">
      {icon && <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>}
      {!icon && (
        <span style={{ fontSize: '18px', flexShrink: 0, opacity: 0.8 }}>
          {colors.icon}
        </span>
      )}
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 600, marginBottom: children ? '4px' : 0 }}>
            {title}
          </div>
        )}
        {children && <div>{children}</div>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0',
            fontSize: '18px',
            opacity: 0.7,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default MyAlert;
