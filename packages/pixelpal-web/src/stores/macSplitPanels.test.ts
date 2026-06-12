import { describe, it, expect } from 'vitest';
import { MAC_SPLIT_PANELS, isMacSplitPanel } from './macSplitPanels';

describe('macSplitPanels', () => {
  it('includes core workspace and tools panels', () => {
    expect(MAC_SPLIT_PANELS).toContain('chat');
    expect(MAC_SPLIT_PANELS).toContain('memory');
    expect(MAC_SPLIT_PANELS).toContain('evolution');
    expect(MAC_SPLIT_PANELS).toContain('mcp');
  });

  it('isMacSplitPanel returns true for registered ids', () => {
    expect(isMacSplitPanel('analytics')).toBe(true);
    expect(isMacSplitPanel('unknown')).toBe(false);
  });

  it('plugin uses same helper when passed as panel id', () => {
    expect(isMacSplitPanel('plugin')).toBe(true);
  });
});
