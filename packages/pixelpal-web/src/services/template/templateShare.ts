/**
 * Template Share Service — V31
 * Encode/decode persona as shareable Base64 code
 */

import type { Persona, PersonaTheme, PersonaAppearance, PersonaVoiceType } from '../persona/personaStorage';

export interface TemplatePayload {
  v: 1;  // version
  n: string;  // name
  a: string;  // avatar
  b: string;  // bio
  v2: PersonaVoiceType;  // voice personality type (warm/rational/humorous/serious)
  t?: [string, string, string];  // theme: [primaryColor, secondaryColor, accentColor]
  // V101: Persona files
  soul?: string;
  userProfile?: string;
  memory?: string;
}

/**
 * Encode a persona into a Base64 share code
 */
export function encodeTemplate(persona: Persona): string {
  const payload: TemplatePayload = {
    v: 1,
    n: persona.name,
    a: persona.avatar,
    b: persona.bio,
    v2: persona.voiceType,
    t: persona.theme
      ? [persona.theme.primaryColor, persona.theme.secondaryColor, persona.theme.accentColor]
      : undefined,
    soul: persona.soul || undefined,
    userProfile: persona.userProfile || undefined,
    memory: persona.memory || undefined,
  };
  const json = JSON.stringify(payload);
  // Use btoa with Unicode-safe encoding
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64;
}

/**
 * Decode a share code back into TemplatePayload
 */
export function decodeTemplate(code: string): TemplatePayload | null {
  try {
    const json = decodeURIComponent(escape(atob(code)));
    const payload = JSON.parse(json) as TemplatePayload;
    if (payload.v !== 1) return null;
    if (!payload.n || !payload.a || !payload.b || !payload.v2) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Convert TemplatePayload to partial Persona fields (for creating a new persona)
 */
export function templateToPersonaData(payload: TemplatePayload): Pick<Persona, 'name' | 'avatar' | 'bio' | 'voice' | 'voiceType' | 'theme' | 'appearance' | 'soul' | 'userProfile' | 'memory'> {
  const theme: PersonaTheme | undefined = payload.t
    ? {
        primaryColor: payload.t[0],
        secondaryColor: payload.t[1],
        accentColor: payload.t[2],
        backgroundColor: payload.t[0] + '1a',  // semi-transparent
        textColor: '#ffffff',
      }
    : undefined;

  const appearance: PersonaAppearance = {
    expression: '😊',
    accessory: '🤍',
    outfit: '👕',
  };

  // Determine voiceType from voice object
  const voiceType: PersonaVoiceType = (payload.v2 as PersonaVoiceType) || 'warm';

  return {
    name: payload.n,
    avatar: payload.a,
    bio: payload.b,
    voice: { rate: 1.0, pitch: 1.0, volume: 1.0 },
    voiceType,
    appearance,
    ...(theme ? { theme } : {}),
    soul: payload.soul || '',
    userProfile: payload.userProfile || '',
    memory: payload.memory || '',
  };
}

/**
 * Copy text to clipboard using navigator.clipboard API
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch {
    return false;
  }
}
