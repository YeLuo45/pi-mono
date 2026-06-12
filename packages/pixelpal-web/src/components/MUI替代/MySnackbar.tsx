/**
 * MySnackbar.tsx — MUI Snackbar replacement
 * 
 * Replaces MUI Snackbar with custom styling.
 * Supports: open, onClose, children, autoHideDuration, anchorOrigin
 */

import React, { type FC, type ReactNode, useEffect, type CSSProperties } from 'react';

export interface MySnackbarProps {
  open: boolean;
  onClose?: () => void;
  children?: ReactNode;
  autoHideDuration?: number | null;
  anchorOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' };
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MySnackbar: FC<MySnackbarProps> = ({
  open,
  onClose,
  children,
  autoHideDuration = 3000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  className = '',
  sx = {},
  style = {},
}) => {
  useEffect(() => {
    if (open && autoHideDuration && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [open, autoHideDuration, onClose]);

  const snackbarStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    ...anchorOrigin,
    ...sx,
    ...style,
  };

  if (!open) return null;

  return (
    <div className={className} style={snackbarStyle} role="alert">
      {children || (
        <div
          style={{
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '400px',
          }}
        >
          Snackbar message
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '8px',
                fontSize: '18px',
                opacity: 0.7,
              }}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MySnackbar;
