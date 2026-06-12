/**
 * MyTabs.tsx — MUI Tabs replacement
 * 
 * Replaces MUI Tabs component with custom styling using design tokens.
 * Supports: onChange, indicator, centered, scrollButtons, tabs
 */

import { type FC, type ReactNode, useState, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyTabProps {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface MyTabsProps {
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
  centered?: boolean;
  scrollButtons?: 'auto' | 'desktop' | 'on' | false;
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  className?: string;
  sx?: Record<string, string | number>;
}

interface TabButtonProps {
  value: string;
  activeValue: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  onClick: (value: string) => void;
}

const TabButton: FC<TabButtonProps> = ({
  value,
  activeValue,
  label,
  disabled = false,
  icon,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const isSelected = value === activeValue;

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => onClick(value)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => !disabled && setIsActive(true)}
      onMouseUp={() => !disabled && setIsActive(false)}
      style={{
        padding: '6px 12px',
        border: 'none',
        borderRadius: 'var(--control-radius, 6px)',
        background: isSelected
          ? 'var(--bg-elevated, #2d2d2d)'
          : isHovered
          ? 'var(--bg-hover, rgba(255, 255, 255, 0.04))'
          : 'transparent',
        color: isSelected
          ? 'var(--text-primary, #ffffff)'
          : isHovered
          ? 'var(--text-primary, #ffffff)'
          : 'var(--text-secondary, rgba(255, 255, 255, 0.6))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: '12px',
        fontWeight: isSelected ? 600 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        whiteSpace: 'nowrap',
        boxShadow: isSelected ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.1))' : 'none',
        transform: isActive ? 'scale(0.97)' : isHovered ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {icon && <span style={{ display: 'flex', fontSize: '14px' }}>{icon}</span>}
      {label}
    </button>
  );
};

export const MyTabs: FC<MyTabsProps> = ({
  value,
  onChange,
  children,
  centered = false,
  scrollButtons = 'auto',
  variant = 'standard',
  className = '',
  sx = {},
}) => {
  const theme = useTheme();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Handle scroll buttons visibility
  useEffect(() => {
    const updateScrollButtons = () => {
      if (!tabsRef.current || variant !== 'scrollable') {
        setShowLeftScroll(false);
        setShowRightScroll(false);
        return;
      }
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
    };

    updateScrollButtons();
    tabsRef.current?.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      tabsRef.current?.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [variant]);

  const handleTabClick = (tabValue: string) => {
    onChange(tabValue);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (!tabsRef.current) return;
    const scrollAmount = 200;
    tabsRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const renderTabs = () => {
    const tabs: ReactNode[] = [];
    
    // If children are passed, render them
    if (children) {
      const childArray = Array.isArray(children) ? children : [children];
      childArray.forEach((child) => {
        if (child && typeof child === 'object' && 'props' in child) {
          const childProps = child.props as { value?: string; label?: string; disabled?: boolean; icon?: ReactNode };
          if (childProps.value !== undefined && childProps.label !== undefined) {
            tabs.push(
              <TabButton
                key={childProps.value}
                value={childProps.value}
                activeValue={value}
                label={childProps.label}
                disabled={childProps.disabled}
                icon={childProps.icon}
                onClick={handleTabClick}
              />
            );
          }
        }
      });
    }

    return tabs;
  };

  const tabsContent = renderTabs();

  return (
    <div
      ref={tabsRef}
      className={className}
      role="tablist"
      style={{
        display: 'inline-flex',
        position: 'relative',
        overflowX: variant === 'scrollable' ? 'auto' : 'hidden',
        scrollbarWidth: 'none' as const,
        msOverflowStyle: 'none' as const,
        justifyContent: centered ? 'center' : 'flex-start',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: 'var(--space-1)',
        backgroundColor: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
        borderRadius: 'var(--control-radius, 6px)',
        ...sx,
      }}
    >
      {scrollButtons !== false && showLeftScroll && (
        <button
          onClick={() => handleScroll('left')}
          style={{
            position: 'absolute',
            left: 0,
            zIndex: 2,
            border: 'none',
            background: 'var(--bg-elevated)',
            cursor: 'pointer',
            padding: theme.spacing(0.5),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.8,
          }}
        >
          ‹
        </button>
      )}

      <div style={{ display: 'flex', position: 'relative', gap: 'var(--space-1)' }}>
        {tabsContent}
      </div>

      {scrollButtons !== false && showRightScroll && (
        <button
          onClick={() => handleScroll('right')}
          style={{
            position: 'absolute',
            right: 0,
            zIndex: 2,
            border: 'none',
            background: 'var(--bg-elevated)',
            cursor: 'pointer',
            padding: theme.spacing(0.5),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.8,
          }}
        >
          ›
        </button>
      )}
    </div>
  );
};

export const MyTab: FC<MyTabProps> = ({ label, value, icon, disabled = false, className = '' }) => {
  return (
    <button data-tab data-value={value} className={className} disabled={disabled} style={{ display: 'none' }}>
      {label}
      {icon}
    </button>
  );
};

export default MyTabs;
