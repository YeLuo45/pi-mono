/**
 * Voice Service - Web Speech API (Speech Recognition + Speech Synthesis)
 * 
 * Provides:
 * - Speech-to-Text (STT): Capture voice input via microphone
 * - Text-to-Speech (TTS): Speak AI responses aloud
 */

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isInterrupted: boolean;
  lastTranscription: string | null;
  error: string | null;
}

export interface VoiceSettings {
  sttEnabled: boolean;   // Speech-to-text (voice input)
  ttsEnabled: boolean;   // Text-to-speech (voice output)
  ttsRate: number;       // 0.1 to 10, default 1
  ttsPitch: number;      // 0 to 2, default 1
  ttsVolume: number;     // 0 to 1, default 1
  ttsVoice: string;      // Voice name from system
}

// V37: Persona voice config for per-personality voice differentiation
export interface PersonaVoice {
  rate: number;    // 0.5-2.0, default 1.0
  pitch: number;   // 0.5-2.0, default 1.0
  volume: number;  // 0-1, default 1.0
  voiceName?: string;
}

// Current persona voice config (set by store on persona switch)
let currentPersonaVoice: PersonaVoice = { rate: 1, pitch: 1, volume: 1 };

export function setVoiceConfig(config: PersonaVoice): void {
  currentPersonaVoice = config;
}

// Events emitted by the voice service
export type VoiceEventType = 'stateChange' | 'transcription' | 'error';

export interface VoiceEvent {
  type: VoiceEventType;
  state?: VoiceState;
  transcription?: string;
  error?: string;
}

type VoiceEventListener = (event: VoiceEvent) => void;

// ============================================================
// Voice Service Class
// ============================================================

import {
  type SpeechRecognitionEvent,
  type SpeechRecognitionErrorEvent,
  type ISpeechRecognition,
} from '../../types';

class VoiceService {
  private state: VoiceState = {
    isListening: false,
    isSpeaking: false,
    isInterrupted: false,
    lastTranscription: null,
    error: null,
  };

  private settings: VoiceSettings = {
    sttEnabled: true,
    ttsEnabled: false,
    ttsRate: 1,
    ttsPitch: 1,
    ttsVolume: 1,
    ttsVoice: '',
  };

  private listeners: Set<VoiceEventListener> = new Set();
  private recognition: ISpeechRecognition | null = null;
  private synth: SpeechSynthesis | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.initRecognition();
    }
  }

  // --------------------------------
  // Event System
  // --------------------------------

  subscribe(listener: VoiceEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: VoiceEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private updateState(updates: Partial<VoiceState>): void {
    this.state = { ...this.state, ...updates };
    this.emit({ type: 'stateChange', state: this.state });
  }

  // --------------------------------
  // Settings
  // --------------------------------

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  // --------------------------------
  // State
  // --------------------------------

  getState(): VoiceState {
    return { ...this.state };
  }

  isSupported(): { stt: boolean; tts: boolean } {
    return {
      stt: typeof window !== 'undefined' && (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window)),
      tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
    };
  }

  // --------------------------------
  // Speech Recognition (STT)
  // --------------------------------

  private initRecognition(): void {
    const win = window as typeof window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn('[Voice] Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new (SpeechRecognitionAPI as unknown as new () => ISpeechRecognition)();
    if (!this.recognition) {
      console.warn('[Voice] Speech Recognition initialization failed');
      return;
    }
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.updateState({ isListening: true, error: null });
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.updateState({ lastTranscription: finalTranscript });
        this.emit({ type: 'transcription', transcription: finalTranscript });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMsg = 'Speech recognition error';
      switch (event.error) {
        case 'not-allowed':
          errorMsg = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'no-speech':
          errorMsg = 'No speech detected. Please try again.';
          break;
        case 'network':
          errorMsg = 'Network error during speech recognition.';
          break;
        case 'aborted':
          // User stopped manually, not an error
          return;
        default:
          errorMsg = `Speech recognition error: ${event.error}`;
      }
      this.updateState({ error: errorMsg, isListening: false });
      this.emit({ type: 'error', error: errorMsg });
    };

    this.recognition.onend = () => {
      this.updateState({ isListening: false });
    };
  }

  startListening(lang?: string): boolean {
    if (!this.recognition) {
      this.emit({ type: 'error', error: 'Speech Recognition not supported' });
      return false;
    }

    if (this.state.isListening) {
      return false;
    }

    if (lang) {
      this.recognition.lang = lang;
    }

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      // May fail if already started
      console.warn('[Voice] Failed to start recognition:', err);
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.state.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore errors when stopping
      }
    }
  }

  // --------------------------------
  // Speech Synthesis (TTS)
  // --------------------------------

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  getDefaultVoice(): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    if (voices.length === 0) return null;
    // Prefer English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  private createUtterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    // V37: Apply persona voice config (rate/pitch/volume) — overrides global settings
    utterance.rate = currentPersonaVoice.rate;
    utterance.pitch = currentPersonaVoice.pitch;
    utterance.volume = currentPersonaVoice.volume;

    // V37: Apply persona voice name if set
    if (currentPersonaVoice.voiceName) {
      const voice = this.getAvailableVoices().find(v => v.name === currentPersonaVoice.voiceName);
      if (voice) {
        utterance.voice = voice;
      }
    }

    // Fall back to global settings voice if no persona voice matched
    if (!utterance.voice) {
      if (this.settings.ttsVoice) {
        const voice = this.getAvailableVoices().find(v => v.name === this.settings.ttsVoice);
        if (voice) {
          utterance.voice = voice;
        }
      } else {
        const defaultVoice = this.getDefaultVoice();
        if (defaultVoice) {
          utterance.voice = defaultVoice;
        }
      }
    }

    return utterance;
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech Synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.cancel();

      const utterance = this.createUtterance(text);

      utterance.onstart = () => {
        this.updateState({ isSpeaking: true, error: null });
      };

      utterance.onend = () => {
        this.updateState({ isSpeaking: false });
        resolve();
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        this.updateState({ isSpeaking: false, error: `Speech error: ${event.error}` });
        // Don't reject for 'interrupted' or 'canceled'
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      this.synth.speak(utterance);
    });
  }

  cancel(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.updateState({ isSpeaking: false });
  }

  pause(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }

  resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }

  // --------------------------------
  // Interrupt & Streaming
  // --------------------------------

  /**
   * Interrupt current speech and return an abort signal for stopping AI fetch
   */
  interrupt(): AbortSignal | null {
    // Cancel current speech
    if (this.synth) {
      this.synth.cancel();
    }
    this.updateState({ isSpeaking: false, isInterrupted: true });
    return this.abortController?.signal || null;
  }

  /**
   * Create a new AbortController for AI fetch cancellation
   */
  createAbortController(): AbortController {
    this.abortController = new AbortController();
    return this.abortController;
  }

  /**
   * Get the current abort signal
   */
  getAbortSignal(): AbortSignal | null {
    return this.abortController?.signal || null;
  }

  /**
   * Speak a text chunk immediately without waiting for full text.
   * Used for streaming TTS - speaks sentences as they arrive.
   */
  speakChunk(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech Synthesis not supported'));
        return;
      }

      // Split into sentences for natural chunks
      const sentences = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text];
      
      const speakNext = (index: number): void => {
        if (index >= sentences.length) {
          this.updateState({ isSpeaking: false });
          resolve();
          return;
        }

        const sentence = sentences[index].trim();
        if (!sentence) {
          speakNext(index + 1);
          return;
        }

        const utterance = this.createUtterance(sentence);

        utterance.onstart = () => {
          this.updateState({ isSpeaking: true, isInterrupted: false, error: null });
        };

        utterance.onend = () => {
          if (!this.state.isInterrupted) {
            speakNext(index + 1);
          } else {
            resolve();
          }
        };

        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
          if (event.error === 'interrupted' || event.error === 'canceled') {
            resolve();
          } else {
            // On error, still try next sentence
            if (!this.state.isInterrupted) {
              speakNext(index + 1);
            } else {
              resolve();
            }
          }
        };

        this.synth!.speak(utterance);
      };

      speakNext(0);
    });
  }

  // --------------------------------
  // Cleanup
  // --------------------------------

  destroy(): void {
    this.stopListening();
    this.cancel();
    this.listeners.clear();
    this.recognition = null;
    this.synth = null;
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const voiceService = new VoiceService();
export default voiceService;