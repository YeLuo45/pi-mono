/**
 * translateTool - Text translation tool
 * Translates text between different languages using simple mapping
 */

import type { McpTool, ToolResult } from '../tool-registry'

// Simple language code mapping
const LANGUAGE_MAP: Record<string, string> = {
  'en': 'English',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'ru': 'Russian',
  'ar': 'Arabic',
  'auto': 'auto-detect',
}

// Common translations for demo (simplified)
const DEMO_TRANSLATIONS: Record<string, Record<string, string>> = {
  'hello': { zh: '你好', ja: 'こんにちは', ko: '안녕하세요', fr: 'Bonjour', de: 'Hallo' },
  'goodbye': { zh: '再见', ja: 'さようなら', ko: '안녕히 가세요', fr: 'Au revoir', de: 'Auf Wiedersehen' },
  'thank you': { zh: '谢谢', ja: 'ありがとう', ko: '감사합니다', fr: 'Merci', de: 'Danke' },
  'yes': { zh: '是', ja: 'はい', ko: '네', fr: 'Oui', de: 'Ja' },
  'no': { zh: '不', ja: 'いいえ', ko: '아니요', fr: 'Non', de: 'Nein' },
  'please': { zh: '请', ja: 'お願いします', ko: '제발', fr: "S'il vous plaît", de: 'Bitte' },
  'sorry': { zh: '对不起', ja: 'ごめんなさい', ko: '미안합니다', fr: 'Désolé', de: 'Entschuldigung' },
  'good morning': { zh: '早上好', ja: 'おはよう', ko: '좋은 아침', fr: 'Bonjour', de: 'Guten Morgen' },
  'good night': { zh: '晚安', ja: 'おやすみ', ko: '잘 자요', fr: 'Bonne nuit', de: 'Gute Nacht' },
  'how are you': { zh: '你好吗', ja: 'お元気ですか', ko: '어떻게 지내세요', fr: 'Comment allez-vous', de: 'Wie geht es Ihnen' },
}

function getLanguageName(code: string): string {
  return LANGUAGE_MAP[code.toLowerCase()] || code
}

function simpleTranslate(text: string, targetLang: string): string {
  const lowerText = text.toLowerCase().trim()

  // Check for exact matches in demo translations
  if (DEMO_TRANSLATIONS[lowerText] && DEMO_TRANSLATIONS[lowerText][targetLang]) {
    return DEMO_TRANSLATIONS[lowerText][targetLang]
  }

  // For demo: return placeholder with language indication
  // In production, this would call a translation API
  return `[${getLanguageName(targetLang)}] ${text}`
}

/**
 * Translate text to target language
 * @param text - The text to translate
 * @param targetLang - Target language code (en, zh, ja, ko, fr, de, es, ru, ar)
 * @param sourceLang - Source language code (default: auto)
 */
async function translateHandler(args: {
  text: string
  targetLang: string
  sourceLang?: string
}): Promise<ToolResult> {
  try {
    const { text, targetLang, sourceLang = 'auto' } = args

    if (!text || typeof text !== 'string') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Text is required' }) }],
        isError: true,
      }
    }

    if (!targetLang) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Target language is required' }) }],
        isError: true,
      }
    }

    const validLanguages = Object.keys(LANGUAGE_MAP).filter(l => l !== 'auto')
    if (!validLanguages.includes(targetLang.toLowerCase())) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: false,
          error: `Unsupported target language: ${targetLang}. Supported: ${validLanguages.join(', ')}`,
        }) }],
        isError: true,
      }
    }

    const translated = simpleTranslate(text, targetLang.toLowerCase())

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          original: text,
          translated,
          sourceLang: sourceLang === 'auto' ? 'auto-detected' : getLanguageName(sourceLang),
          targetLang: getLanguageName(targetLang),
        }, null, 2),
      }],
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error }) }],
      isError: true,
    }
  }
}

export const translateTool: McpTool = {
  name: 'translate',
  description: 'Translate text between languages (en, zh, ja, ko, fr, de, es, ru, ar)',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text content to translate',
      },
      targetLang: {
        type: 'string',
        description: 'Target language code (en, zh, ja, ko, fr, de, es, ru, ar)',
      },
      sourceLang: {
        type: 'string',
        description: 'Source language code (default: auto-detect)',
        default: 'auto',
      },
    },
    required: ['text', 'targetLang'],
  },
  handler: translateHandler,
}