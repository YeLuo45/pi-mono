/**
 * MyDialog.tsx — MUI Dialog replacement
 * 
 * Replaces MUI Dialog, DialogTitle, DialogContent, DialogActions with custom styling.
 * Supports compound component pattern (DialogTitle, DialogContent, DialogActions as props or sub-components).
 */

import { type FC, type ReactNode, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyDialogProps {
  open: boolean;
  onClose?: () => void;
  children?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  fullScreen?: boolean;
  className?: string;
  sx?: Record<string, string | number>;
  PaperProps?: {
    sx?: Record<string, string | number>;
    className?: string;
    style?: Record<string, string | number>;
  };
}

export interface MyDialogTitleProps {
  children: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  id?: string;
}

export interface MyDialogContentProps {
  children: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  dividers?: boolean;
}

export interface MyDialogActionsProps {
  children: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyDialogTitle: FC<MyDialogTitleProps> = ({
  children,
  className = '',
  sx = {},
  id,
}) => {
  const theme = useTheme();
  return (
    <div
      id={id}
      className={className}
      style={{
        padding: theme.spacing(2),
        paddingBottom: theme.spacing(1),
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        borderBottom: '1px solid var(--separator)',
        ...sx,
      }}
    >
      {children}
    </div>
  );
};

export const MyDialogContent: FC<MyDialogContentProps> = ({
  children,
  className = '',
  sx = {},
  dividers = false,
}) => {
  const theme = useTheme();
  return (
    <div
      className={className}
      style={{
        padding: theme.spacing(2),
        flex: 1,
        overflowY: 'auto',
        color: 'var(--text-secondary)',
        borderBottom: dividers ? '1px solid var(--separator)' : 'none',
        ...sx,
      }}
    >
      {children}
    </div>
  );
};

export const MyDialogActions: FC<MyDialogActionsProps> = ({
  children,
  className = '',
  sx = {},
}) => {
  const theme = useTheme();
  return (
    <div
      className={className}
      style={{
        padding: theme.spacing(1.5),
        paddingTop: theme.spacing(1),
        display: 'flex',
        justifyContent: 'flex-end',
        gap: theme.spacing(1),
        borderTop: '1px solid var(--separator)',
        ...sx,
      }}
    >
      {children}
    </div>
  );
};

export const MyDialog: FC<MyDialogProps> = ({
  open,
  onClose,
  children,
  maxWidth = 'sm',
  fullWidth = false,
  fullScreen = false,
  className = '',
  sx = {},
  PaperProps = {},
}) => {
  const theme = useTheme();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Get maxWidth value
  const maxWidthMap: Record<string, string> = {
    xs: '300px',
    sm: '400px',
    md: '500px',
    lg: '600px',
    xl: '800px',
  };
  const paperMaxWidth = maxWidth ? maxWidthMap[maxWidth] || maxWidthMap.sm : undefined;

  // Handle click away
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && onClose) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const paperSx = PaperProps.sx || {};
  const paperStyle = PaperProps.style || {};
  const paperClassName = PaperProps.className || '';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.modal || 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Dialog Paper */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`${className} ${paperClassName}`}
        style={{
          position: 'relative',
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: paperMaxWidth,
          width: fullWidth || fullScreen ? '100%' : 'auto',
          maxHeight: fullScreen ? '100%' : '90vh',
          height: fullScreen ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          margin: fullScreen ? 0 : '24px',
          animation: 'slideIn 0.2s ease',
          ...sx,
          ...paperSx,
          ...paperStyle,
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default MyDialog;
