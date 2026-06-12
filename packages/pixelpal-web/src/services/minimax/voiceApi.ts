/**
 * MiniMax Voice Services - V96
 * 
 * Text-to-Audio (T2A) and Audio-to-Text (ASR) via MiniMax API.
 */

const T2A_API = 'https://api.minimax.io/v1/t2a_v2';        // Text-to-Audio v2
const ASR_API = 'https://api.minimax.io/v1/speech-to-text'; // Speech-to-Text

export interface MiniMaxVoiceOptions {
  voice?: string;      // Voice ID (male/female options)
  speed?: number;      // Speech speed (0.5 - 2.0)
  volume?: number;     // Volume (0 - 100)
  pitch?: number;       // Pitch adjustment
  format?: 'mp3' | 'wav' | 'pcm';  // Audio format
}

/**
 * MiniMax T2A (Text-to-Audio / Text-to-Speech)
 * Converts text to speech audio.
 * 
 * @param text - Text to convert to speech
 * @param apiKey - MiniMax API key
 * @param options - Voice synthesis options
 * @returns Audio data as ArrayBuffer
 */
export async function minimaxTextToSpeech(
  text: string,
  apiKey: string,
  options: MiniMaxVoiceOptions = {}
): Promise<ArrayBuffer> {
  const {
    voice = 'male-qn',
    speed = 1.0,
    volume = 100,
    format = 'mp3',
  } = options;

  const response = await fetch(T2A_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'speech-02-hd',
      text,
      voice_setting: {
        voice_id: voice,
        speed,
        volume,
      },
      audio_setting: {
        format,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax T2A error: ${response.status} - ${error}`);
  }

  return response.arrayBuffer();
}

/**
 * MiniMax ASR (Audio-to-Text / Speech-to-Text)
 * Converts speech audio to text.
 * 
 * @param audio - Audio data as ArrayBuffer (wav/pcm format preferred)
 * @param apiKey - MiniMax API key
 * @param language - Language code (e.g., 'zh', 'en', 'auto')
 * @returns Transcribed text
 */
export async function minimaxSpeechToText(
  audio: ArrayBuffer,
  apiKey: string,
  language: string = 'auto'
): Promise<string> {
  const formData = new FormData();
  
  // Create a blob from the audio data
  const audioBlob = new Blob([audio], { type: 'audio/wav' });
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'speech-01');
  formData.append('language', language);

  const response = await fetch(ASR_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await text();
    throw new Error(`MiniMax ASR error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.text ?? data.transcript ?? '';
}

/**
 * Get available MiniMax voice IDs
 */
export const MINIMAX_VOICES = {
  // Male voices
  'male-qn': 'Male QN (Chinese)',
  'male-qn1': 'Male QN1 (Chinese)',
  'male-qn2': 'Male QN2 (Chinese)',
  'male-qn3': 'Male QN3 (Chinese)',
  
  // Female voices
  'female-qn': 'Female QN (Chinese)',
  'female-qn1': 'Female QN1 (Chinese)',
  'female-qn2': 'Female QN2 (Chinese)',
  'female-qn3': 'Female QN3 (Chinese)',
  
  // English voices
  'male-en': 'Male EN (English)',
  'female-en': 'Female EN (English)',
  
  // Additional
  'emo_xiaobing': 'XiaoBing (Emotional)',
} as const;

export type MiniMaxVoiceId = keyof typeof MINIMAX_VOICES;

export default {
  minimaxTextToSpeech,
  minimaxSpeechToText,
  MINIMAX_VOICES,
};
