/**
 * SpeechService - V92 Multimodal
 * 
 * Unified entry point for Speech-to-Text (STT) and Text-to-Speech (TTS).
 * Uses Web Speech API as primary, with fallback support.
 */

import type { SpeechRecognitionOptions, TextToSpeechOptions, VoiceEmotionResult } from '../../types/multimodal';
import { voiceRecorder } from './VoiceRecorder';
import { detectEmotion, type EmotionResult } from '../voice/emotionDetector';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  durationMs: number;
  language?: string;
}

export interface SynthesisResult {
  success: boolean;
  error?: string;
}

/**
 * SpeechService - unified STT/TTS entry point
 */
export class SpeechService {
  private static instance: SpeechService;
  
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private onTranscriptCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private interimTranscript: string = '';
  private startTime: number = 0;
  
  private constructor() {
    if (typeof window !== 'undefined') {
      this.initRecognition();
      this.synth = window.speechSynthesis;
    }
  }
  
  static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }
  
  // ========================
  // Initialization
  // ========================
  
  private initRecognition(): void {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('[SpeechService] Speech Recognition not supported');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';
    this.recognition.maxAlternatives = 1;
    
    this.recognition.onstart = () => {
      this.isListening = true;
      this.startTime = Date.now();
    };
    
    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      this.interimTranscript = interimTranscript;
      
      if (finalTranscript) {
        const durationMs = Date.now() - this.startTime;
        
        // Detect emotion from speech
        const emotionResult = detectEmotion(finalTranscript, durationMs);
        
        const transcriptionResult: TranscriptionResult = {
          transcript: finalTranscript,
          confidence: event.results[0][0].confidence || 0.9,
          durationMs,
          language: this.recognition.lang,
        };
        
        this.onTranscriptCallback?.(transcriptionResult);
      }
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('[SpeechService] Recognition error:', event.error);
      this.isListening = false;
      
      let errorMsg = 'Speech recognition error';
      switch (event.error) {
        case 'not-allowed':
          errorMsg = 'Microphone access denied';
          break;
        case 'no-speech':
          errorMsg = 'No speech detected';
          break;
        case 'network':
          errorMsg = 'Network error';
          break;
        case 'aborted':
          // User stopped - not an error
          return;
      }
      this.onErrorCallback?.(errorMsg);
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      this.interimTranscript = '';
    };
  }
  
  // ========================
  // Speech Recognition (STT)
  // ========================
  
  /**
   * Check if STT is supported
   */
  isSTTSupported(): boolean {
    return this.recognition !== null;
  }
  
  /**
   * Start speech recognition
   */
  startRecognition(options?: SpeechRecognitionOptions): boolean {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech Recognition not supported');
      return false;
    }
    
    if (this.isListening) {
      return false;
    }
    
    if (options?.lang) {
      this.recognition.lang = options.lang;
    }
    if (options?.continuous !== undefined) {
      this.recognition.continuous = options.continuous;
    }
    if (options?.interimResults !== undefined) {
      this.recognition.interimResults = options.interimResults;
    }
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('[SpeechService] Failed to start recognition:', error);
      return false;
    }
  }
  
  /**
   * Stop speech recognition
   */
  stopRecognition(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore errors when stopping
      }
    }
  }
  
  /**
   * Get current interim transcript
   */
  getInterimTranscript(): string {
    return this.interimTranscript;
  }
  
  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }
  
  /**
   * Set callback for transcription results
   */
  onTranscript(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptCallback = callback;
  }
  
  /**
   * Set callback for errors
   */
  onSpeechError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  /**
   * Transcribe audio from a recording (for voice messages)
   */
  async transcribeRecording(audioBlob: Blob, language?: string): Promise<TranscriptionResult | null> {
    // Use Web Speech API for transcription if available
    // Otherwise, return null (would need a backend service for actual transcription)
    
    if (!this.recognition) {
      console.warn('[SpeechService] Cannot transcribe - no recognition support');
      return null;
    }
    
    // For now, we rely on real-time recognition
    // In a full implementation, you'd send the blob to a transcription service
    return null;
  }
  
  // ========================
  // Speech Synthesis (TTS)
  // ========================
  
  /**
   * Check if TTS is supported
   */
  isTTSSupported(): boolean {
    return this.synth !== null;
  }
  
  /**
   * Get available TTS voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }
  
  /**
   * Get default voice for a language
   */
  getDefaultVoice(lang: string = 'en'): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    return voices.find(v => v.lang.startsWith(lang)) || voices[0] || null;
  }
  
  /**
   * Speak text
   */
  async speak(text: string, options?: TextToSpeechOptions): Promise<SynthesisResult> {
    if (!this.synth) {
      return { success: false, error: 'Speech Synthesis not supported' };
    }
    
    // Cancel any ongoing speech
    this.synth.cancel();
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      if (options?.rate !== undefined) {
        utterance.rate = Math.max(0.1, Math.min(10, options.rate));
      }
      if (options?.pitch !== undefined) {
        utterance.pitch = Math.max(0, Math.min(2, options.pitch));
      }
      if (options?.volume !== undefined) {
        utterance.volume = Math.max(0, Math.min(1, options.volume));
      }
      
      // Set voice
      if (options?.voiceName) {
        const voice = this.getAvailableVoices().find(v => v.name === options.voiceName);
        if (voice) utterance.voice = voice;
      } else if (options?.lang) {
        const voice = this.getDefaultVoice(options.lang);
        if (voice) utterance.voice = voice;
      } else {
        const voice = this.getDefaultVoice();
        if (voice) utterance.voice = voice;
      }
      
      utterance.onstart = () => {
        // Speech started
      };
      
      utterance.onend = () => {
        resolve({ success: true });
      };
      
      utterance.onerror = (event: any) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve({ success: true }); // Not really an error
        } else {
          resolve({ success: false, error: event.error });
        }
      };
      
      this.synth!.speak(utterance);
    });
  }
  
  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }
  
  /**
   * Pause speaking
   */
  pauseSpeaking(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }
  
  /**
   * Resume speaking
   */
  resumeSpeaking(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }
  
  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synth?.speaking || false;
  }
  
  /**
   * Check if currently paused
   */
  isPaused(): boolean {
    return this.synth?.paused || false;
  }
  
  // ========================
  // Emotion Detection
  // ========================
  
  /**
   * Detect emotion from text (wrapper for emotionDetector)
   */
  detectEmotionFromText(text: string, durationMs: number): VoiceEmotionResult {
    const result: EmotionResult = detectEmotion(text, durationMs);
    
    return {
      emotion: result.emotion as VoiceEmotionResult['emotion'],
      confidence: result.confidence,
      transcript: text,
      durationMs,
    };
  }
}

export const speechService = SpeechService.getInstance();
export default speechService;
