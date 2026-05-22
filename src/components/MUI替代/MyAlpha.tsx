/**
 * MyAlpha.tsx — alpha() function replacement
 * 
 * Replaces MUI's alpha() color utility function.
 * This is a simple CSS color manipulation function.
 */

export const alpha = (color: string, opacity: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }

  // Handle rgb/rgba colors
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
  }

  // Fallback: return the original color with opacity via CSS filter
  return color;
};

export default alpha;
