/**
 * Persona Command Parser — parses slash commands and @mentions for persona switching
 */

export interface ParseResult {
  type: 'switch' | 'help' | 'list' | 'unknown' | 'collab' | 'endcollab' | 'savecollab' | 'loadcollab' | 'listcollab' | 'clear' | 'new';
  personaId?: string;
  rawCommand?: string;
  collabNames?: string[];   // For /collab friend teacher
  presetName?: string;      // For /savecollab name, /loadcollab name
}

// Preset persona command mappings
const PRESET_COMMANDS: Record<string, string> = {
  '/friend': 'preset-friend',
  '/朋友': 'preset-friend',
  '/teacher': 'preset-teacher',
  '/老师': 'preset-teacher',
  '/coach': 'preset-coach',
  '/教练': 'preset-coach',
  '/lover': 'preset-lover',
  '/恋人': 'preset-lover',
  '/help': 'help',
  '/帮助': 'help',
  '/list': 'list',
  '/列表': 'list',
  '/new': 'clear',
  '/clear': 'clear',
  '/reset': 'clear',
};

// Collab-specific commands (not in PRESET_COMMANDS to avoid conflicts)
const COLLABC_MD_START_COMMANDS = ['/collab', '/协作', '/collab'];
const ENDCOLLAP_COMMANDS = ['/endcollab', '/结束协作', '/end'];
const SAVECOLLAP_COMMANDS = ['/savecollab', '/保存协作'];
const LOADCOLLAP_COMMANDS = ['/loadcollab', '/加载协作'];
const LISTCOLLAP_COMMANDS = ['/listcollab', '/列表协作'];

/**
 * Parse a user input string for persona commands.
 * Returns ParseResult if command detected, null otherwise.
 */
export function parsePersonaCommand(input: string): ParseResult | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  // Check slash commands (preset persona commands)
  for (const [cmd, personaId] of Object.entries(PRESET_COMMANDS)) {
    if (trimmed === cmd || trimmed.startsWith(cmd + ' ')) {
      if (personaId === 'help') {
        return { type: 'help' };
      }
      if (personaId === 'list') {
        return { type: 'list' };
      }
      return { type: 'switch', personaId };
    }
  }

  // Check @mention for fuzzy name matching
  const atMatch = trimmed.match(/^@(.+)$/);
  if (atMatch) {
    return { type: 'switch', rawCommand: atMatch[1] };
  }

  // Check /collab [name1] [name2] or /collab [preset-name]
  for (const cmd of COLLABC_MD_START_COMMANDS) {
    if (trimmed === cmd) {
      // /collab alone — return type so ChatPanel shows usage
      return { type: 'collab', collabNames: [] };
    }
    if (trimmed.startsWith(cmd + ' ')) {
      const after = trimmed.slice(cmd.length + 1).trim();
      // Check if it's a preset name (single word, no spaces)
      if (!after.includes(' ')) {
        return { type: 'collab', presetName: after };
      }
      // Otherwise parse persona names
      const names = after.split(/\s+/).filter(Boolean);
      return { type: 'collab', collabNames: names };
    }
  }

  // Check /endcollab or /end
  for (const cmd of ENDCOLLAP_COMMANDS) {
    if (trimmed === cmd || trimmed === '/end') {
      return { type: 'endcollab' };
    }
  }

  // Check /savecollab [name]
  for (const cmd of SAVECOLLAP_COMMANDS) {
    if (trimmed === cmd) {
      return { type: 'savecollab' };
    }
    if (trimmed.startsWith(cmd + ' ')) {
      const name = trimmed.slice(cmd.length + 1).trim();
      return { type: 'savecollab', presetName: name };
    }
  }

  // Check /loadcollab [name]
  for (const cmd of LOADCOLLAP_COMMANDS) {
    if (trimmed === cmd) {
      return { type: 'loadcollab' };
    }
    if (trimmed.startsWith(cmd + ' ')) {
      const name = trimmed.slice(cmd.length + 1).trim();
      return { type: 'loadcollab', presetName: name };
    }
  }

  // Check /listcollab
  for (const cmd of LISTCOLLAP_COMMANDS) {
    if (trimmed === cmd) {
      return { type: 'listcollab' };
    }
  }

  return null;
}

/**
 * Fuzzy match a persona by name from the personas array.
 * Returns the matched persona's id, or null if no match.
 */
export function fuzzyMatchPersona(personas: Array<{ id: string; name: string; avatar: string }>, name: string): string | null {
  const lowerName = name.toLowerCase();
  const matched = personas.find(p => p.name.toLowerCase().includes(lowerName));
  return matched ? matched.id : null;
}

/**
 * Match multiple persona names from a list of names.
 * Returns array of matched personaIds (in order).
 */
export function fuzzyMatchPersonas(
  personas: Array<{ id: string; name: string; avatar: string }>,
  names: string[]
): string[] {
  const matched: string[] = [];
  for (const name of names) {
    const id = fuzzyMatchPersona(personas, name);
    if (id && !matched.includes(id)) {
      matched.push(id);
    }
  }
  return matched;
}
