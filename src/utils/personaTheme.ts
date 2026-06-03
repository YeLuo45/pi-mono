/**
 * Persona Theme Utility
 * Applies subtle persona-specific color tinting via CSS variables on :root.
 * CSS vars: --persona-primary, --persona-secondary, --persona-accent,
 *           --persona-bg, --persona-text
 */

import type { PersonaTheme } from '../services/persona/personaStorage';

const CSS_VARS = [
  '--persona-primary',
  '--persona-secondary',
  '--persona-accent',
  '--persona-bg',
  '--persona-text',
  '--system-blue',
] as const;

/**
 * Apply persona theme colors as CSS variables on :root.
 * Colors are subtle tints — existing components are not broken.
 */
export function applyPersonaTheme(theme: PersonaTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--persona-primary', theme.primaryColor);
  root.style.setProperty('--persona-secondary', theme.secondaryColor);
  root.style.setProperty('--persona-accent', theme.accentColor);
  root.style.setProperty('--persona-bg', theme.backgroundColor);
  root.style.setProperty('--persona-text', theme.textColor);
  // Tint macOS accent without replacing semantic tokens
  const accent = theme.accentColor || theme.primaryColor;
  if (accent) {
    root.style.setProperty('--system-blue', accent);
  }
}

/**
 * Remove all persona CSS variables from :root.
 */
export function resetPersonaTheme(): void {
  const root = document.documentElement;
  CSS_VARS.forEach((varName) => {
    root.style.removeProperty(varName);
  });
}
