/**
 * V80 Skill Dev Tools - Starter Code Templates
 * These templates are used when creating new skill files in the Dev Tools IDE.
 */

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: 'empty' | 'api' | 'text' | 'chain';
  code: string;
}

export const SKILL_CODE_TEMPLATES: SkillTemplate[] = [
  {
    id: 'empty-skill',
    name: 'Empty Skill',
    description: 'Minimal SkillDefinition structure with execute function',
    category: 'empty',
    code: `// Empty Skill Template
export const skill = {
  id: 'my-custom-skill',
  name: 'My Custom Skill',
  description: 'Describe what this skill does',
  icon: '⚡',
  version: '1.0.0',
  author: 'Developer',
  category: 'productivity' as const,
  tags: ['custom', 'utility'],
  chatTriggerable: true,
  chatKeywords: ['skill', 'help'],
  order: 100,
  enabled: true,
  systemPrompt: 'You are a helpful assistant.',
  examplePrompts: ['Run my skill'],
  requiredContext: [],
  optionalContext: [],
  maxSteps: 3,
  showSteps: true,

  async execute(context) {
    const { triggerMessage, parsedParams } = context;
    
    // Your skill logic here
    const result = \`Processed: \${triggerMessage}\`;
    
    return {
      success: true,
      response: result,
      durationMs: 100,
    };
  }
};

export default skill;`,
  },
  {
    id: 'api-caller',
    name: 'API Caller',
    description: 'Skill that calls an external API endpoint',
    category: 'api',
    code: `// API Caller Skill Template
export const skill = {
  id: 'api-caller-skill',
  name: 'API Caller',
  description: 'Calls an external API and returns formatted results',
  icon: '🌐',
  version: '1.0.0',
  author: 'Developer',
  category: 'developer' as const,
  tags: ['api', 'http', 'integration'],
  chatTriggerable: true,
  chatKeywords: ['fetch', 'api', 'http'],
  order: 101,
  enabled: true,
  systemPrompt: 'You fetch data from APIs and present it clearly.',
  examplePrompts: ['Fetch user data', 'Call API'],
  requiredContext: ['personaId'],
  optionalContext: ['sceneId'],
  maxSteps: 5,
  showSteps: true,

  async execute(context) {
    const { triggerMessage, metadata } = context;
    const startTime = Date.now();

    // Example: Parse trigger message for URL
    const url = triggerMessage.match(/https?:\\/\\/[^\\s]+/)?.[0] || 'https://api.example.com/data';

    try {
      // Make API call
      // const response = await fetch(url);
      // const data = await response.json();

      // Simulated response for demo
      const data = { status: 'ok', url, timestamp: new Date().toISOString() };

      return {
        success: true,
        response: JSON.stringify(data, null, 2),
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'API call failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
};

export default skill;`,
  },
  {
    id: 'text-processor',
    name: 'Text Processor',
    description: 'Transform and parse text input',
    category: 'text',
    code: `// Text Processor Skill Template
export const skill = {
  id: 'text-processor-skill',
  name: 'Text Processor',
  description: 'Transforms and parses text input with various operations',
  icon: '📝',
  version: '1.0.0',
  author: 'Developer',
  category: 'productivity' as const,
  tags: ['text', 'transform', 'parse'],
  chatTriggerable: true,
  chatKeywords: ['process', 'text', 'transform'],
  order: 102,
  enabled: true,
  systemPrompt: 'You process and transform text input efficiently.',
  examplePrompts: ['Process this text', 'Transform input'],
  requiredContext: [],
  optionalContext: [],
  maxSteps: 2,
  showSteps: false,

  async execute(context) {
    const { triggerMessage, parsedParams } = context;
    const startTime = Date.now();

    // Get operation from parsed params or detect from message
    const operation = parsedParams.operation || 'uppercase';
    let result = triggerMessage;

    switch (operation) {
      case 'uppercase':
        result = triggerMessage.toUpperCase();
        break;
      case 'lowercase':
        result = triggerMessage.toLowerCase();
        break;
      case 'reverse':
        result = triggerMessage.split('').reverse().join('');
        break;
      case 'word-count':
        const words = triggerMessage.trim().split(/\\s+/).length;
        result = \`Word count: \${words}\`;
        break;
      default:
        result = triggerMessage.toUpperCase();
    }

    return {
      success: true,
      response: result,
      durationMs: Date.now() - startTime,
    };
  }
};

export default skill;`,
  },
  {
    id: 'chain-step',
    name: 'Chain Step',
    description: 'Lightweight step for use in skill chains',
    category: 'chain',
    code: `// Chain Step Template
export const skill = {
  id: 'chain-step-skill',
  name: 'Chain Step Skill',
  description: 'A lightweight skill step for chain execution',
  icon: '🔗',
  version: '1.0.0',
  author: 'Developer',
  category: 'developer' as const,
  tags: ['chain', 'step'],
  chatTriggerable: false,
  chatKeywords: [],
  order: 103,
  enabled: true,
  systemPrompt: 'You are a chain step that processes input and passes output to the next step.',
  examplePrompts: [],
  requiredContext: ['personaId'],
  optionalContext: [],
  maxSteps: 1,
  showSteps: false,

  async execute(context) {
    const { triggerMessage, metadata } = context;
    const startTime = Date.now();

    // Get previous step output from metadata if available
    const previousOutput = metadata?.previousStepOutput || '';

    // Process and pass forward
    const result = previousOutput
      ? \`[\${previousOutput}] -> \${triggerMessage}\`
      : triggerMessage;

    return {
      success: true,
      response: result,
      durationMs: Date.now() - startTime,
    };
  }
};

export default skill;`,
  },
];

export const getTemplateById = (id: string): SkillTemplate | undefined => {
  return SKILL_CODE_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: SkillTemplate['category']): SkillTemplate[] => {
  return SKILL_CODE_TEMPLATES.filter(t => t.category === category);
};
