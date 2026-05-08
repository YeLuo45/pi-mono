/**
 * useSpeechSynthesis - Hook for browser-native Speech Synthesis (TTS)
 * 
 * Provides:
 * - speak(text, options): Speak the given text
 * - stop(): Stop current speech
 * - pause(): Pause speech
 * - resume(): Resume speech
 * - isPlaying: whether speech is currently playing
 * 
 * Browser support: All modern browsers (Chrome, Edge, Safari, Firefox)
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechSynthesisOptions {
  rate?: number;   // 0.1 to 10, default 1
  pitch?: number;   // 0 to 2, default 1
  volume?: number;  // 0 to 1, default 1
  voiceName?: string;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string, options?: SpeechSynthesisOptions) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
  availableVoices: SpeechSynthesisVoice[];
  getDefaultVoice: () => SpeechSynthesisVoice | null;
}

// Get stored TTS rate from localStorage (V58 compatibility)
function getStoredTtsRate(): number {
  try {
    const stored = localStorage.getItem('ttsRate');
    if (stored) {
      const rate = parseFloat(stored);
      if (!isNaN(rate) && rate >= 0.5 && rate <= 2) {
        return rate;
      }
    }
  } catch {
    // localStorage not available
  }
  return 1.0;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resolveRef = useRef<((value: void) => void) | null>(null);
  const isMountedRef = useRef(true);

  // Check support
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load voices
  useEffect(() => {
    if (!isSupported) return;

    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      if (synthRef.current && isMountedRef.current) {
        setAvailableVoices(synthRef.current.getVoices());
      }
    };

    loadVoices();
    synthRef.current.addEventListener('voiceschanged', loadVoices);

    return () => {
      if (synthRef.current) {
        synthRef.current.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, [isSupported]);

  // Get default English voice
  const getDefaultVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;
    // Prefer English voice
    return availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
  }, [availableVoices]);

  const speak = useCallback(async (text: string, options?: SpeechSynthesisOptions): Promise<void> => {
    if (!synthRef.current) {
      throw new Error('Speech Synthesis not supported');
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();
    setIsPlaying(true);
    setIsPaused(false);

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options or use stored rate
      const rate = options?.rate ?? getStoredTtsRate();
      utterance.rate = rate;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;

      // Find voice
      if (options?.voiceName) {
        const voice = availableVoices.find(v => v.name === options.voiceName);
        if (voice) utterance.voice = voice;
      }

      // Fall back to default voice
      if (!utterance.voice) {
        const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        if (defaultVoice) utterance.voice = defaultVoice;
      }

      utterance.onstart = () => {
        if (isMountedRef.current) {
          setIsPlaying(true);
          setIsPaused(false);
        }
      };

      utterance.onend = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
          setIsPaused(false);
        }
        resolve();
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (isMountedRef.current) {
          setIsPlaying(false);
          setIsPaused(false);
        }
        // Don't reject for interrupted/canceled
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      };

      currentUtteranceRef.current = utterance;
      resolveRef.current = resolve;
      synthRef.current!.speak(utterance);
    });
  }, [availableVoices]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    currentUtteranceRef.current = null;
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (synthRef.current && isPlaying && !isPaused) {
      synthRef.current.pause();
      setIsPaused(true);
    }
  }, [isPlaying, isPaused]);

  const resume = useCallback(() => {
    if (synthRef.current && isPlaying && isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    }
  }, [isPlaying, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isPaused,
    isSupported,
    availableVoices,
    getDefaultVoice,
  };
}

export default useSpeechSynthesis;
