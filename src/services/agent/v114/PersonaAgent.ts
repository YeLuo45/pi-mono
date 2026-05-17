/**
 * PersonaAgent - Persona-bound agent with personality and context
 * 
 * Responsibilities:
 * - Bind to a specific persona (personality, voice, preferences)
 * - Execute tasks with persona context
 * - Maintain persona-specific memory and state
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, Task, AgentMessage } from './types';
import { getAllPersonas } from '../../persona/personaStorage';

export class PersonaAgent extends BaseAgent {
  private personaId: string;
  private personaName: string = '';
  private personalityTraits: string[] = [];
  private preferenceProfile: Record<string, unknown> = {};

  constructor(config: AgentConfig) {
    if (!config.personaId) {
      throw new Error('PersonaAgent requires a personaId in config');
    }
    super(config);
    this.personaId = config.personaId;
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', `PersonaAgent initializing for persona: ${this.personaId}`);
    await this.loadPersonaProfile();
    this.log('info', `PersonaAgent initialized for: ${this.personaName}`);
  }

  protected async onStart(): Promise<void> {
    this.log('info', `PersonaAgent started: ${this.personaName}`);
  }

  protected async onPause(): Promise<void> {
    this.log('info', `PersonaAgent paused: ${this.personaName}`);
  }

  protected async onResume(): Promise<void> {
    this.log('info', `PersonaAgent resumed: ${this.personaName}`);
  }

  protected async onStop(): Promise<void> {
    this.log('info', `PersonaAgent stopping: ${this.personaName}`);
    await this.savePersonaProfile();
  }

  protected async executeTask(task: Task): Promise<void> {
    this.log('info', `PersonaAgent executing task for ${this.personaName}: ${task.goal}`);
    
    // Inject persona context into task
    const enrichedTask = {
      ...task,
      context: {
        ...task.context,
        personaId: this.personaId,
        personaName: this.personaName,
        personalityTraits: this.personalityTraits,
      },
    };
    
    // Task execution with persona context
    this.log('info', 'Task enriched with persona context', enrichedTask.context);
  }

  // --------------------------------------------------------------------------
  // Persona Profile
  // --------------------------------------------------------------------------

  private async loadPersonaProfile(): Promise<void> {
    try {
      const personas = getAllPersonas();
      const persona = personas.find((p) => p.id === this.personaId);
      
      if (persona) {
        this.personaName = persona.name ?? this.personaId;
        this.personalityTraits = this.parseTraits(persona.bio ?? '');
        this.preferenceProfile = {
          name: this.personaName,
          loadedAt: Date.now(),
        };
        
        this.log('debug', `Loaded persona profile: ${this.personaName}`, {
          traits: this.personalityTraits,
        });
      } else {
        this.personaName = this.personaId;
        this.log('warn', `Persona not found: ${this.personaId}, using defaults`);
      }
    } catch (error) {
      this.log('error', 'Failed to load persona profile', { error });
      this.personaName = this.personaId;
    }
  }

  private async savePersonaProfile(): Promise<void> {
    try {
      localStorage.setItem(
        `persona_agent:${this.personaId}`,
        JSON.stringify({
          preferenceProfile: this.preferenceProfile,
          savedAt: Date.now(),
        })
      );
      this.log('debug', `Saved persona profile for: ${this.personaName}`);
    } catch (error) {
      this.log('error', 'Failed to save persona profile', { error });
    }
  }

  private parseTraits(bio: string): string[] {
    if (!bio) return [];
    // Simple trait extraction - split by common delimiters
    const traits = bio
      .split(/[,，;；.。!！?？\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length < 50);
    return [...new Set(traits)].slice(0, 10);
  }

  // --------------------------------------------------------------------------
  // Persona-specific Methods
  // --------------------------------------------------------------------------

  /**
   * Get the agent's response style based on personality
   */
  getResponseStyle(): 'formal' | 'casual' | 'friendly' | 'professional' {
    if (this.personalityTraits.some((t) => t.includes('formal') || t.includes('正式'))) {
      return 'formal';
    }
    if (this.personalityTraits.some((t) => t.includes('casual') || t.includes('随意'))) {
      return 'casual';
    }
    if (this.personalityTraits.some((t) => t.includes('professional') || t.includes('专业'))) {
      return 'professional';
    }
    return 'friendly';
  }

  /**
   * Format a message with persona characteristics
   */
  formatMessage(content: string): string {
    const style = this.getResponseStyle();
    
    switch (style) {
      case 'formal':
        return content;
      case 'casual':
        return content.replace(/\./g, '~').replace(/\?/g, '??').replace(/!/g, '!!');
      case 'friendly':
        return `✨ ${content} ✨`;
      case 'professional':
        return `[${this.personaName}] ${content}`;
      default:
        return content;
    }
  }

  /**
   * Get persona information
   */
  getPersonaInfo(): { id: string; name: string; traits: string[]; style: string } {
    return {
      id: this.personaId,
      name: this.personaName,
      traits: this.personalityTraits,
      style: this.getResponseStyle(),
    };
  }

  /**
   * Update a preference value
   */
  setPreference(key: string, value: unknown): void {
    this.preferenceProfile[key] = value;
    this.log('debug', `Updated preference: ${key}`, { value });
  }

  /**
   * Get a preference value
   */
  getPreference<T>(key: string, defaultValue: T): T {
    return (this.preferenceProfile[key] as T) ?? defaultValue;
  }
}