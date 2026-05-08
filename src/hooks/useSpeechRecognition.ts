/**
 * useSpeechRecognition - Hook for browser-native Speech Recognition (STT)
 * 
 * Provides:
 * - transcript: recognized text (updated in real-time)
 * - isListening: whether recognition is active
 * - startListening: start speech recognition
 * - stopListening: stop speech recognition
 * - resetTranscript: clear the transcript
 * 
 * Browser support: Chrome, Edge, Safari (requires HTTPS or localhost)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SpeechRecognitionEvent, SpeechRecognitionErrorEvent, ISpeechRecognition } from '../types';

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  error: string | null;
  durationMs: number; // V63: speech duration in milliseconds
  startListening: (lang?: string) => boolean;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0); // V63: speech duration

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isMountedRef = useRef(true);
  const startTimeRef = useRef<number>(0); // V63: track when speech started

  // Check for browser support
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize recognition instance
  useEffect(() => {
    if (!isSupported) return;

    const win = window as typeof window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) return;

    const recognition = new (SpeechRecognitionAPI as unknown as new () => ISpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN'; // Default to Chinese

    recognition.onstart = () => {
      if (isMountedRef.current) {
        setIsListening(true);
        setError(null);
        startTimeRef.current = Date.now(); // V63: record start time
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMountedRef.current) return;
      
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
          // V63: Calculate duration when we get final transcript
          if (startTimeRef.current > 0) {
            const elapsed = Date.now() - startTimeRef.current;
            setDurationMs(elapsed);
          }
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => {
          const newTranscript = prev ? `${prev} ${final}` : final;
          return newTranscript;
        });
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return;
      
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
      setError(errorMsg);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isMountedRef.current) {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, [isSupported]);

  const startListening = useCallback((lang?: string): boolean => {
    if (!recognitionRef.current) {
      setError('Speech Recognition not supported in this browser');
      return false;
    }

    if (isListening) return false;

    // Reset interim on new start
    setInterimTranscript('');
    setError(null);

    if (lang) {
      recognitionRef.current.lang = lang;
    }

    try {
      recognitionRef.current.start();
      return true;
    } catch (err) {
      console.warn('[useSpeechRecognition] Failed to start:', err);
      return false;
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    durationMs, // V63: speech duration
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useSpeechRecognition;
