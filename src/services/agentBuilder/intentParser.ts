/**
 * Intent Parser Service - V99
 * 
 * Parses natural language input to extract Agent configuration using MiniMax LLM.
 */

import type { ParsedAgentConfig, ParsingProgress } from '../../types/agentBuilder';

const INTENT_PARSE_PROMPT = `You are an expert Agent designer. Parse the user's natural language request into a structured Agent configuration.

User Request: "{userInput}"

Please analyze this request and extract:
1. name: A concise name for the Agent (in English, camelCase)
2. description: A brief description of what the Agent does
3. role: The primary role - one of: planner, executor, critic, creative, general
4. capabilities: List of specific capabilities this Agent should have
5. requiredTools: Tools/APIs the Agent will need (e.g., "web-search", "code-execution", "image-generation")
6. workflowTemplate: How the Agent processes tasks - one of: sequential, parallel, hierarchical, reflective, custom
7. personality.tone: Communication style - formal, casual, or friendly
8. personality.expertise: Level of expertise - beginner, intermediate, or expert
9. personality.creativity: How creative the Agent is, from 0.0 (strict) to 1.0 (very creative)
10. constraints: Any limitations or rules the Agent must follow

Respond in JSON format:
{
  "name": "string",
  "description": "string",
  "role": "planner|executor|critic|creative|general",
  "capabilities": ["string"],
  "requiredTools": ["string"],
  "workflowTemplate": "sequential|parallel|hierarchical|reflective|custom",
  "personality": {
    "tone": "formal|casual|friendly",
    "expertise": "beginner|intermediate|expert",
    "creativity": 0.0-1.0
  },
  "constraints": ["string"]
}

If any field cannot be determined, provide a reasonable default. Only output the JSON, no other text.`;

/**
 * Parse user intent with streaming progress updates
 */
export async function parseIntent(
  userInput: string,
  onProgress?: (progress: ParsingProgress) => void
): Promise<ParsedAgentConfig> {
  const reportProgress = (stage: ParsingProgress['stage'], message: string, progress: number) => {
    onProgress?.({ stage, message, progress });
  };

  try {
    // Stage 1: Understanding
    reportProgress('understanding', 'Understanding your request...', 10);
    
    // Stage 2: Analyzing
    reportProgress('analyzing', 'Analyzing requirements...', 30);
    
    // Build the prompt with user input
    const prompt = INTENT_PARSE_PROMPT.replace('{userInput}', userInput);
    
    // Call MiniMax API
    const response = await fetch('https://api.minimax.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_MINIMAX_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'abstr5',
        messages: [
          { role: 'system', content: 'You are an expert Agent designer. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`MiniMax API error: ${response.status}`);
    }

    // Stage 3: Structuring
    reportProgress('structuring', 'Structuring configuration...', 70);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Stage 4: Finalizing
    reportProgress('finalizing', 'Finalizing Agent config...', 90);

    // Parse the JSON response
    let parsedConfig: Partial<ParsedAgentConfig>;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedConfig = JSON.parse(jsonMatch[0]);
      } else {
        parsedConfig = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      // Return default config if parsing fails
      parsedConfig = getDefaultConfig(userInput);
    }

    // Ensure all required fields are present
    const result: ParsedAgentConfig = {
      name: parsedConfig.name || generateName(userInput),
      description: parsedConfig.description || userInput.slice(0, 100),
      role: parsedConfig.role || 'general',
      capabilities: Array.isArray(parsedConfig.capabilities) ? parsedConfig.capabilities : [],
      requiredTools: Array.isArray(parsedConfig.requiredTools) ? parsedConfig.requiredTools : [],
      workflowTemplate: parsedConfig.workflowTemplate || 'sequential',
      personality: {
        tone: parsedConfig.personality?.tone || 'friendly',
        expertise: parsedConfig.personality?.expertise || 'intermediate',
        creativity: typeof parsedConfig.personality?.creativity === 'number' 
          ? Math.max(0, Math.min(1, parsedConfig.personality.creativity)) 
          : 0.5,
      },
      constraints: Array.isArray(parsedConfig.constraints) ? parsedConfig.constraints : [],
    };

    reportProgress('finalizing', 'Complete!', 100);

    return result;
  } catch (error) {
    console.error('Intent parsing error:', error);
    // Return default config on error
    return getDefaultConfig(userInput);
  }
}

/**
 * Generate a name from user input
 */
function generateName(input: string): string {
  // Extract key words and camelCase them
  const words = input.split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  
  return words.join('') || 'NewAgent';
}

/**
 * Get default config when parsing fails
 */
function getDefaultConfig(userInput: string): ParsedAgentConfig {
  return {
    name: generateName(userInput),
    description: userInput.slice(0, 100),
    role: 'general',
    capabilities: [],
    requiredTools: [],
    workflowTemplate: 'sequential',
    personality: {
      tone: 'friendly',
      expertise: 'intermediate',
      creativity: 0.5,
    },
    constraints: [],
  };
}

export default parseIntent;
