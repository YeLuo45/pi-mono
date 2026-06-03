import type { LucideIcon } from 'lucide-react';
import {
  ChatIcon,
  CalendarMonthIcon,
  CheckBoxIcon,
  DescriptionIcon,
  EmailIcon,
  EditIcon,
  SettingsIcon,
  GroupIcon,
  PsychologyIcon,
  ExtensionIcon,
  MemoryIcon,
  BarChartIcon,
  HubIcon,
  ScenesIcon,
  FlashOnIcon,
  MultiAgentIcon,
  ActivityIcon,
  NetworkIcon,
  AutoAwesomeIcon,
} from '../components/ui/muiIconMap';

const CalendarIcon = CalendarMonthIcon;
const ExecutionIcon = ActivityIcon;

export interface NavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'chat', labelKey: 'nav.chat', icon: ChatIcon },
  { id: 'memory', labelKey: 'nav.memory', icon: MemoryIcon },
  { id: 'calendar', labelKey: 'nav.calendar', icon: CalendarIcon },
  { id: 'tasks', labelKey: 'nav.tasks', icon: CheckBoxIcon },
  { id: 'document', labelKey: 'nav.document', icon: DescriptionIcon },
  { id: 'knowledge', labelKey: 'nav.knowledge', icon: PsychologyIcon },
  { id: 'writing', labelKey: 'nav.writing', icon: EditIcon },
  { id: 'email', labelKey: 'nav.email', icon: EmailIcon },
  { id: 'team', labelKey: 'nav.team', icon: GroupIcon },
  { id: 'analytics', labelKey: 'nav.analytics', icon: BarChartIcon },
  { id: 'graph', labelKey: 'nav.graph', icon: HubIcon },
  { id: 'scenes', labelKey: 'nav.scenes', icon: ScenesIcon },
  { id: 'agent', labelKey: 'nav.agent', icon: FlashOnIcon },
  { id: 'multiagent', labelKey: 'nav.multiAgent', icon: MultiAgentIcon },
  { id: 'tools', labelKey: 'nav.tools', icon: ExtensionIcon },
  { id: 'execution', labelKey: 'nav.execution', icon: ExecutionIcon },
  { id: 'mcp', labelKey: 'nav.mcp', icon: NetworkIcon },
  { id: 'evolution', labelKey: 'nav.evolution', icon: AutoAwesomeIcon },
  { id: 'settings', labelKey: 'nav.settings', icon: SettingsIcon },
];

export type NavGroupId = 'workspace' | 'tools' | 'other';

export const NAV_GROUPS: Record<NavGroupId, readonly string[]> = {
  workspace: ['chat', 'memory', 'calendar', 'tasks', 'document', 'knowledge', 'writing', 'email', 'team'],
  tools: ['analytics', 'graph', 'scenes', 'agent', 'multiagent', 'tools', 'execution', 'mcp', 'evolution'],
  other: ['settings'],
};

export const NAV_GROUP_LABEL_KEYS: Record<NavGroupId, string> = {
  workspace: 'nav.groupWorkspace',
  tools: 'nav.groupTools',
  other: 'nav.groupOther',
};

const navItemById = new Map(NAV_ITEMS.map((item) => [item.id, item]));

export function getNavItemById(id: string): NavItem | undefined {
  return navItemById.get(id);
}

export function getNavItemsForGroup(groupId: NavGroupId): NavItem[] {
  return NAV_GROUPS[groupId]
    .map((id) => getNavItemById(id))
    .filter((item): item is NavItem => item !== undefined);
}
