/**
 * MyDrawer.tsx — MUI Drawer replacement
 * 
 * Replaces MUI Drawer component with custom styling using design tokens.
 * Supports: anchor, open, onClose, variant (temporary/persistent/permanent)
 */

import { type FC, type ReactNode, useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { borderRadius } from '../ui/design-tokens';

export interface MyDrawerProps {
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  open: boolean;
  onClose?: () => void;
  variant?: 'temporary' | 'persistent' | 'permanent';
  children: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  PaperProps?: {
    sx?: Record<string, string | number>;
    className?: string;
    style?: Record<string, string | number>;
  };
  ModalProps?: {
    keepMounted?: boolean;
    sx?: Record<string, string | number>;
  };
}

export const MyDrawer: FC<MyDrawerProps> = ({
  anchor = 'left',
  open = false,
  onClose,
  variant = 'temporary',
  children,
  className = '',
  sx = {},
  PaperProps = {},
  ModalProps = {},
}) => {
  const theme = useTheme();
  const shop = theme.palette.shop || {};
  const [isVisible, setIsVisible] = useState(open);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle visibility and animation states
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle backdrop click for temporary variant
  const handleBackdropClick = () => {
    if (variant === 'temporary' && onClose) {
      onClose();
    }
  };

  // Calculate position styles
  const getPositionStyle = (): Record<string, string | number> => {
    const baseStyle: Record<string, string | number> = {
      position: 'fixed',
      zIndex: theme.zIndex.drawer || 1200,
      top: 0,
      height: '100%',
      width: anchor === 'left' || anchor === 'right' ? 280 : '100%',
      maxWidth: anchor === 'left' || anchor === 'right' ? 280 : '100%',
    };

    switch (anchor) {
      case 'left':
        baseStyle.left = 0;
        baseStyle.transform = isAnimating ? 'translateX(0)' : 'translateX(-100%)';
        break;
      case 'right':
        baseStyle.right = 0;
        baseStyle.transform = isAnimating ? 'translateX(0)' : 'translateX(100%)';
        break;
      case 'top':
        baseStyle.top = 0;
        baseStyle.width = '100%';
        baseStyle.height = 'auto';
        baseStyle.maxWidth = '100%';
        baseStyle.transform = isAnimating ? 'translateY(0)' : 'translateY(-100%)';
        break;
      case 'bottom':
        baseStyle.bottom = 0;
        baseStyle.width = '100%';
        baseStyle.height = 'auto';
        baseStyle.maxWidth = '100%';
        baseStyle.transform = isAnimating ? 'translateY(0)' : 'translateY(100%)';
        break;
    }

    return baseStyle;
  };

  // Get paper/modal props
  const paperSx = PaperProps.sx || {};
  const paperStyle = PaperProps.style || {};
  const paperClassName = PaperProps.className || '';

  // For permanent/persistent, always show
  const shouldRender = variant === 'permanent' || variant === 'persistent' || isVisible;

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop for temporary/persistent variants */}
      {(variant === 'temporary' || (variant === 'persistent' && open)) && (
        <div
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: (theme.zIndex.drawer || 1200) - 1,
            opacity: isAnimating ? 1 : 0,
            transition: 'opacity 0.2s ease',
            cursor: 'pointer',
          }}
        />
      )}

      {/* Drawer container */}
      <div
        className={`${className} ${paperClassName}`}
        role="dialog"
        aria-modal={variant === 'temporary'}
        style={{
          ...getPositionStyle(),
          transition: 'transform 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          ...sx,
        }}
      >
        {/* Paper */}
        <div
          style={{
            width: '100%',
            height: '100%',
            bgcolor: shop.drawerBackground || theme.palette.background?.paper || '#0f1011',
            color: theme.palette.text?.primary || '#f7f8f8',
            borderRight: anchor === 'left' ? `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.05)'}` : 'none',
            borderLeft: anchor === 'right' ? `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.05)'}` : 'none',
            borderRadius: anchor === 'left' || anchor === 'right' ? 0 : borderRadius.lg,
            overflowY: 'auto',
            overflowX: 'hidden',
            ...paperSx,
            ...paperStyle,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default MyDrawer;
