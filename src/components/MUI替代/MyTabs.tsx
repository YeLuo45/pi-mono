/**
 * MyTabs.tsx — MUI Tabs replacement
 * 
 * Replaces MUI Tabs component with custom styling using design tokens.
 * Supports: onChange, indicator, centered, scrollButtons, tabs
 */

import { type FC, type ReactNode, useState, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { borderRadius } from '../ui/design-tokens';

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
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Find all tab elements and calculate indicator position
  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsRef.current) return;
      const tabs = tabsRef.current.querySelectorAll('[data-tab]');
      tabs.forEach((tab) => {
        const tabElement = tab as HTMLButtonElement;
        if (tabElement.dataset.value === value) {
          const rect = tabElement.getBoundingClientRect();
          const parentRect = tabsRef.current!.getBoundingClientRect();
          setIndicatorStyle({
            left: rect.left - parentRect.left,
            width: rect.width,
          });
        }
      });
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [value, children]);

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
              <button
                key={childProps.value}
                data-tab
                data-value={childProps.value}
                role="tab"
                aria-selected={childProps.value === value}
                disabled={childProps.disabled}
                onClick={() => handleTabClick(childProps.value!)}
                style={{
                  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
                  border: 'none',
                  background: 'transparent',
                  color: childProps.value === value
                    ? theme.palette.primary?.main || '#5e6ad2'
                    : theme.palette.text?.secondary || '#d0d6e0',
                  cursor: childProps.disabled ? 'not-allowed' : 'pointer',
                  opacity: childProps.disabled ? 0.5 : 1,
                  fontSize: '14px',
                  fontWeight: childProps.value === value ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing(0.5),
                  transition: 'color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {childProps.icon && (
                  <span style={{ display: 'flex', fontSize: '18px' }}>{childProps.icon}</span>
                )}
                {childProps.label}
              </button>
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
        display: 'flex',
        position: 'relative',
        overflowX: variant === 'scrollable' ? 'auto' : 'hidden',
        scrollbarWidth: 'none' as const,
        msOverflowStyle: 'none' as const,
        justifyContent: centered ? 'center' : 'flex-start',
        borderBottom: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.05)'}`,
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
            background: theme.palette.background?.paper || '#0f1011',
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

      <div style={{ display: 'flex', position: 'relative' }}>
        {tabsContent}
      </div>

      {/* Tab indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          height: '2px',
          backgroundColor: theme.palette.primary?.main || '#5e6ad2',
          transition: 'left 0.2s ease, width 0.2s ease',
        }}
      />

      {scrollButtons !== false && showRightScroll && (
        <button
          onClick={() => handleScroll('right')}
          style={{
            position: 'absolute',
            right: 0,
            zIndex: 2,
            border: 'none',
            background: theme.palette.background?.paper || '#0f1011',
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
