/**
 * Box.tsx — MUI Box replacement using Emotion css prop
 * 
 * Supports the most common sx prop patterns:
 * - display, flexDirection, alignItems, justifyContent, gap
 * - padding/margin (p, px, py, pt, pb, pl, pr, m, mx, my, mt, mb, ml, mr)
 * - bgcolor, color, fontSize, fontWeight
 * - borderRadius, width, height, minWidth, maxWidth, maxHeight
 * - position, top, left, right, bottom, zIndex
 * - overflow, opacity
 * - &:hover, &::before, @keyframes (nested selectors)
 * 
 * Not supported (use css prop directly for these):
 * - theme.spacing() values (use numbers directly: p: 2 means 16px)
 * - theme.breakpoints values (use media queries directly)
 * - sx prop on non-Box elements (IconButton, Typography, etc.)
 */

import { css, Global } from '@emotion/react';
import { ReactNode } from 'react';

// MUI spacing multiplier (8px base)
const SPACING = 8;

// Convert MUI spacing shorthand to CSS
function toSpacing(value: unknown): string | number {
  if (typeof value === 'number') return value * SPACING;
  if (typeof value === 'string') {
    // Check if it's a CSS string (px, rem, etc.)
    if (value.match(/^[0-9.]+(px|rem|em|%)$/)) return value;
    // Numeric string
    const n = Number(value);
    if (!isNaN(n)) return n * SPACING;
  }
  return value;
}

// Parse spacing from an sx value object
function parseSx(sx: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sx)) {
    // Spacing shortcuts
    if (['p', 'px', 'py', 'pt', 'pb', 'pl', 'pr', 'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr'].includes(key)) {
      result[key] = toSpacing(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Preprocess sx object to handle common patterns
function preprocessSx(sx: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(sx)) {
    // Skip theme-dependent values we can't resolve without theme context
    if (key.startsWith('theme.')) continue;

    // Convert spacing
    if (['p', 'px', 'py', 'pt', 'pb', 'pl', 'pr', 'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr'].includes(key)) {
      result[key] = toSpacing(value);
      continue;
    }

    // Responsive values { xs: X, sm: Y } — use xs as fallback
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if ('xs' in obj) {
        result[key] = obj.xs;
      }
      continue;
    }

    // Nested selectors with theme breakpoints
    if (typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      // Handle &:hover, &::before, etc.
      if (key.startsWith('&:') || key.startsWith('&::') || key === '&') {
        result[key] = obj;
        continue;
      }
      // Handle @keyframes
      if (key === '@keyframes') {
        result[key] = obj;
        continue;
      }
    }

    result[key] = value;
  }

  return result;
}

interface BoxProps {
  children?: ReactNode;
  component?: string;
  onClick?: () => void;
  sx?: Record<string, unknown>;
  css?: Parameters<typeof css>[0];
  className?: string;
  ref?: React.Ref<HTMLElement>;
}

export const Box = ({
  children,
  component = 'div',
  onClick,
  sx,
  css: extraCss,
  className,
  ref,
  ...rest
}: BoxProps) => {
  // Build the emotion css object
  let emotionCss: Parameters<typeof css>[0] = {};

  if (sx) {
    emotionCss = preprocessSx(sx);
  }

  if (extraCss) {
    emotionCss = [emotionCss, extraCss];
  }

  const Tag = component as keyof JSX.IntrinsicElements;

  return (
    <Tag
      ref={ref}
      onClick={onClick}
      css={emotionCss}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Box;
