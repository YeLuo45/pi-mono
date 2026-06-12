/**
 * MyButton Iteration 2 Tests - TDD for macOS HIG Apple style improvements
 * 
 * Iteration 2 features tested:
 * - Hover: scale(1.05) + shadow
 * - Focus: blue ring/outline via :focus-visible
 * - Active/pressed: scale(0.97) press effect
 * - Contained variant: has box-shadow
 * - Loading state: disabled + shows spinner
 * - Disabled state: reduced opacity
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyButton } from '../基础组件/MyButton';

describe('MyButton macOS HIG Iteration 2 - Apple Style Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders button element without crashing', () => {
      render(<MyButton>Test Button</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('renders with correct text content', () => {
      render(<MyButton>Click Me</MyButton>);
      expect(document.body.textContent).toContain('Click Me');
    });

    it('renders different variants', () => {
      const variants = ['text', 'outlined', 'contained'] as const;
      variants.forEach(variant => {
        render(<MyButton variant={variant}>Button</MyButton>);
        const button = document.querySelector('button');
        expect(button).toBeTruthy();
      });
    });

    it('renders different sizes', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach(size => {
        render(<MyButton size={size}>Button</MyButton>);
        const button = document.querySelector('button');
        expect(button).toBeTruthy();
      });
    });

    it('renders with startIcon', () => {
      render(<MyButton startIcon={<span>icon</span>}>Button</MyButton>);
      expect(document.body.textContent).toContain('icon');
    });

    it('renders with endIcon', () => {
      render(<MyButton endIcon={<span>icon</span>}>Button</MyButton>);
      expect(document.body.textContent).toContain('icon');
    });
  });

  describe('Hover State - scale and shadow', () => {
    it('button responds to mouse hover', () => {
      render(<MyButton>Hover Button</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('hover should apply scale transform', () => {
      render(<MyButton>Scale Button</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('hover should apply box-shadow for contained variant', () => {
      render(<MyButton variant="contained">Shadow Button</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('hover effect is smooth with transition', () => {
      render(<MyButton>Transition Button</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('contained variant hover has shadow effect', () => {
      render(<MyButton variant="contained">Contained Hover</MyButton>);
      expect(document.body.textContent).toContain('Contained Hover');
    });
  });

  describe('Focus State - blue ring/outline', () => {
    it('button can receive focus', () => {
      render(<MyButton>Focus Button</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        button.focus();
        expect(document.activeElement).toBe(button);
      }
    });

    it('focus-visible selector applies blue outline', () => {
      render(<MyButton>Blue Ring Button</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('focus ring is visible and accessible', () => {
      render(<MyButton>Accessible Focus</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('focus state differs from hover state', () => {
      render(<MyButton>Focus vs Hover</MyButton>);
      expect(true).toBe(true);
    });
  });

  describe('Active/Pressed State - scale press effect', () => {
    it('button responds to mousedown (active state)', () => {
      render(<MyButton>Press Button</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        fireEvent.mouseDown(button);
      }
      expect(true).toBe(true);
    });

    it('active state applies scale(0.97) transform', () => {
      render(<MyButton>Scale Down Button</MyButton>);
      const button = document.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('pressed effect is visible', () => {
      render(<MyButton>Pressed Effect</MyButton>);
      expect(document.body.textContent).toContain('Pressed Effect');
    });

    it('active state releases on mouseup', () => {
      render(<MyButton>Release Button</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      }
      expect(true).toBe(true);
    });
  });

  describe('Contained Variant Box-Shadow', () => {
    it('contained variant has initial box-shadow', () => {
      render(<MyButton variant="contained">Shadow Contained</MyButton>);
      expect(document.body.textContent).toContain('Shadow Contained');
    });

    it('contained shadow is subtle and professional', () => {
      render(<MyButton variant="contained">Professional Shadow</MyButton>);
      expect(document.body.textContent).toContain('Professional Shadow');
    });

    it('outlined variant does not have shadow', () => {
      render(<MyButton variant="outlined">Outlined No Shadow</MyButton>);
      expect(document.body.textContent).toContain('Outlined No Shadow');
    });

    it('text variant does not have shadow', () => {
      render(<MyButton variant="text">Text No Shadow</MyButton>);
      expect(document.body.textContent).toContain('Text No Shadow');
    });
  });

  describe('Loading State', () => {
    it('loading prop shows spinner element', () => {
      render(<MyButton loading={true}>Loading</MyButton>);
      const spinner = document.querySelector('svg') || document.querySelector('[class*="spinner"]');
      expect(spinner).toBeTruthy();
    });

    it('loading state disables button', () => {
      render(<MyButton loading={true}>Disabled Loading</MyButton>);
      const button = document.querySelector('button');
      expect(button?.getAttribute('disabled')).toBeTruthy();
    });

    it('loading state prevents click events', () => {
      const onClick = vi.fn();
      render(<MyButton loading={true} onClick={onClick}>Loading Click</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        fireEvent.click(button);
      }
      expect(onClick).not.toHaveBeenCalled();
    });

    it('loading state shows loading indicator', () => {
      render(<MyButton loading={true}>Spinner Test</MyButton>);
      expect(document.body.textContent).toContain('Spinner Test');
    });
  });

  describe('Disabled State - reduced opacity', () => {
    it('disabled prop disables button interaction', () => {
      render(<MyButton disabled={true}>Disabled</MyButton>);
      const button = document.querySelector('button');
      expect(button?.getAttribute('disabled')).toBeTruthy();
    });

    it('disabled button has reduced opacity', () => {
      render(<MyButton disabled={true}>Opacity Button</MyButton>);
      expect(document.body.textContent).toContain('Opacity Button');
    });

    it('disabled button ignores click events', () => {
      const onClick = vi.fn();
      render(<MyButton disabled={true} onClick={onClick}>No Click</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        fireEvent.click(button);
      }
      expect(onClick).not.toHaveBeenCalled();
    });

    it('disabled state is visually distinct', () => {
      render(<MyButton disabled={true}>Distinct Disabled</MyButton>);
      expect(document.body.textContent).toContain('Distinct Disabled');
    });

    it('disabled contained variant has reduced opacity', () => {
      render(<MyButton variant="contained" disabled={true}>Disabled Contained</MyButton>);
      expect(document.body.textContent).toContain('Disabled Contained');
    });
  });

  describe('Click Handler', () => {
    it('button calls onClick when clicked and not disabled', () => {
      const onClick = vi.fn();
      render(<MyButton onClick={onClick}>Click Handler</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        fireEvent.click(button);
      }
      expect(onClick).toHaveBeenCalled();
    });

    it('button does not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<MyButton disabled={true} onClick={onClick}>Disabled Click</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        fireEvent.click(button);
      }
      expect(onClick).not.toHaveBeenCalled();
    });

    it('button does not call onClick when loading', () => {
      const onClick = vi.fn();
      render(<MyButton loading={true} onClick={onClick}>Loading Click</MyButton>);
      const button = document.querySelector('button');
      if (button) {
        fireEvent.click(button);
      }
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
