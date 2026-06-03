/** Panels that use macOS three-column split layout (Source / Item / Detail). */
export const MAC_SPLIT_PANELS = [
  'chat',
  'tasks',
  'knowledge',
  'settings',
  'calendar',
  'email',
  'writing',
  'document',
  'memory',
  'analytics',
  'plugin',
  'agent',
  'mcp',
  'tools',
  'execution',
  'pluginStore',
  'graph',
  'evolution',
] as const;

export type MacSplitPanelId = (typeof MAC_SPLIT_PANELS)[number];

export function isMacSplitPanel(panel: string): panel is MacSplitPanelId {
  return (MAC_SPLIT_PANELS as readonly string[]).includes(panel);
}
