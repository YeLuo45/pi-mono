/**
 * V92 Multimodal Types
 * 
 * Defines types for image understanding and voice interaction.
 */

/**
 * Voice Message - represents voice input/output in chat
 */
export interface VoiceMessage {
  id: string;
  type: 'voice_input' | 'voice_output';
  text: string;
  audioUrl?: string;
  duration?: number;    // milliseconds
  language?: string;   // BCP-47 language tag, e.g. 'zh-CN', 'en-US'
  transcription?: string;  // For voice_input: the recognized text
}

/**
 * Image Message - represents an image in chat with analysis results
 */
export interface ImageMessage {
  id: string;
  type: 'image';
  imageUrl: string;       // Data URL or blob URL for display
  caption?: string;       // Auto-generated image caption/description
  analysisResult?: string; // AI analysis result
  detectedText?: string;   // OCR extracted text
  mimeType?: string;      // Image MIME type
  size?: number;          // File size in bytes
  width?: number;         // Image width
  height?: number;        // Image height
}

/**
 * Multimodal Message - combined text, images, and voice
 */
export interface MultimodalMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  images?: ImageMessage[];
  voice?: VoiceMessage;
  personaId?: string;
}

/**
 * Image Analysis Options
 */
export interface ImageAnalysisOptions {
  includeOCR?: boolean;      // Extract text from image
  includeCaption?: boolean;  // Generate image description
  includeComparison?: boolean; // Compare multiple images
}

/**
 * Image Analysis Result
 */
export interface ImageAnalysisResult {
  caption?: string;        // Auto-generated description
  detectedText?: string;   // OCR extracted text
  analysis?: string;       // AI analysis/explanation
  objects?: string[];      // Detected objects
  faces?: number;          // Number of faces detected
  confidence?: number;      // Analysis confidence
}

/**
 * Speech Recognition Options
 */
export interface SpeechRecognitionOptions {
  lang?: string;           // BCP-47 language tag
  continuous?: boolean;     // Continue listening
  interimResults?: boolean; // Return interim results
  maxAlternatives?: number; // Max alternative transcriptions
}

/**
 * Text-to-Speech Options
 */
export interface TextToSpeechOptions {
  rate?: number;           // 0.1 to 10, default 1
  pitch?: number;          // 0 to 2, default 1
  volume?: number;         // 0 to 1, default 1
  voiceName?: string;      // Specific voice to use
  lang?: string;           // BCP-47 language tag
}

/**
 * Voice Emotion Detection Result
 */
export interface VoiceEmotionResult {
  emotion: 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'calm' | 'anxious' | 'unknown';
  confidence: number;      // 0 to 1
  transcript: string;      // The transcribed text
  durationMs: number;      // Speech duration
}

/**
 * Recording State
 */
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * Audio Level callback type
 */
export type AudioLevelCallback = (level: number) => void;
