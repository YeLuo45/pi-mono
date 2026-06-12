import type { AIConfig, Message } from '../../types';

export async function chatCompletion(
  messages: Message[],
  config: AIConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API Key not configured. Please go to Settings and enter your API Key.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };

  const baseURL = config.baseURL || PROVIDER_BASE_URLS[config.provider] || 'https://api.openai.com/v1';
  const url = `${baseURL}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`AI request failed: ${errorMsg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function documentChatCompletion(
  documentContent: string,
  userQuestion: string,
  config: AIConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API Key not configured. Please go to Settings and enter your API Key.');
  }

  const baseURL = config.baseURL || PROVIDER_BASE_URLS[config.provider] || 'https://api.openai.com/v1';
  const url = `${baseURL}/chat/completions`;

  const systemPrompt = `You are a document assistant. The user has uploaded a document. Answer questions about it based on the document content provided. If the answer cannot be found in the document, say so. Be precise and quote relevant parts when possible.

DOCUMENT CONTENT:
${documentContent.slice(0, 15000)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`AI request failed: ${errorMsg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function writingChatCompletion(
  outline: string,
  instruction: 'generate' | 'continue' | 'polish' | 'summarize',
  existingContent: string,
  config: AIConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API Key not configured.');
  }

  const baseURL = config.baseURL || PROVIDER_BASE_URLS[config.provider] || 'https://api.openai.com/v1';
  const url = `${baseURL}/chat/completions`;

  const instructions: Record<string, string> = {
    generate: 'Generate a complete article based on the following outline. Output only the article in Markdown format.',
    continue: 'Continue writing from where the existing content left off. Output only the continuation in Markdown format.',
    polish: 'Improve and polish the existing content for better readability and flow. Output only the polished version in Markdown format.',
    summarize: 'Summarize the following content into a concise summary. Output only the summary in Markdown format.',
  };

  const userContent = instruction === 'generate'
    ? `OUTLINE:\n${outline}`
    : `EXISTING CONTENT:\n${existingContent}\n\n---\n${instructions[instruction].replace('Output only ', '')}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: instructions[instruction] },
        { role: 'user', content: userContent },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`AI request failed: ${errorMsg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Provider default base URLs
export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  minimax: 'https://api.minimax.chat/v1',
  xiaomi: 'https://api.mimi.io/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  qwen: 'https://dashscope.aliyuncs.com/api/v1',
  feishu: 'https://open.feishu.cn/open-apis',
  'azure-openai': '',
  custom: '',
};

// Preset models per provider
export const PRESET_MODELS: Array<{ label: string; value: string; provider: string }> = [
  // OpenAI
  { label: 'GPT-4o', value: 'gpt-4o', provider: 'openai' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini', provider: 'openai' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', provider: 'openai' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', provider: 'openai' },
  // Anthropic
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
  { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022', provider: 'anthropic' },
  // MiniMax
  { label: 'MiniMax Text-01', value: 'MiniMax-Text-01', provider: 'minimax' },
  { label: 'MiniMax Embedding', value: 'embedding', provider: 'minimax' },
  // Xiaomi / Mimo
  { label: 'MIMO-v2-Pro', value: 'mimo-v2-pro', provider: 'xiaomi' },
  { label: 'MIMO-v2-Omni', value: 'mimo-v2-omni', provider: 'xiaomi' },
  // Zhipu
  { label: 'GLM-4.5 Air', value: 'glm-4.5-air', provider: 'zhipu' },
  { label: 'GLM-4.7', value: 'glm-4.7', provider: 'zhipu' },
  { label: 'GLM-4.6V', value: 'glm-4.6v', provider: 'zhipu' },
  // Qwen
  { label: 'Qwen Turbo', value: 'qwen-turbo', provider: 'qwen' },
  { label: 'Qwen Plus', value: 'qwen-plus', provider: 'qwen' },
  { label: 'Qwen Max', value: 'qwen-max', provider: 'qwen' },
  { label: 'Qwen VL Max', value: 'qwen-vl-max', provider: 'qwen' },
];

export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku',
  minimax: 'MiniMax-Text-01',
  xiaomi: 'mimo-v2-pro',
  zhipu: 'glm-4.5-air',
  qwen: 'qwen-plus',
  'azure-openai': 'gpt-4o-mini',
  custom: 'gpt-4o-mini',
};
