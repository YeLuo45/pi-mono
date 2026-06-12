/**
 * useSpeechRecognition - Enhanced V92 Hook for Speech Recognition (STT)
 * 
 * Extends the existing useSpeechRecognition with additional features:
 * - Voice emotion detection integration
 * - Audio level monitoring
 * - Recording mode for voice messages
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { speechService, type TranscriptionResult } from '../services/multimodal/SpeechService';
import { voiceRecorder } from '../services/multimodal/VoiceRecorder';
import type { VoiceEmotionResult } from '../types/multimodal';

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isRecording: boolean;
  error: string | null;
  durationMs: number;
  audioLevel: number;
  startListening: (lang?: string) => boolean;
  stopListening: () => void;
  resetTranscript: () => void;
  startRecording: () => Promise<string | null>;  // Returns blob URL
  stopRecording: () => Promise<{ blob: Blob; url: string; duration: number } | null>;
  emotion: VoiceEmotionResult | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [emotion, setEmotion] = useState<VoiceEmotionResult | null>(null);

  const startTimeRef = useRef<number>(0);
  const audioLevelCallbackRef = useRef<((level: number) => void) | null>(null);

  // Set up audio level callback
  useEffect(() => {
    audioLevelCallbackRef.current = (level: number) => {
      setAudioLevel(level);
    };
  }, []);

  // Subscribe to speech service transcription events
  useEffect(() => {
    speechService.onTranscript((result: TranscriptionResult) => {
      setTranscript(result.transcript);
      setDurationMs(result.durationMs);
      
      // Detect emotion from transcript
      const emotionResult = speechService.detectEmotionFromText(
        result.transcript,
        result.durationMs
      );
      setEmotion(emotionResult);
    });

    speechService.onSpeechError((err: string) => {
      setError(err);
      setIsListening(false);
    });
  }, []);

  const startListening = useCallback((lang?: string): boolean => {
    setError(null);
    setInterimTranscript('');
    
    // Get interim transcript updates
    const interimInterval = setInterval(() => {
      const interim = speechService.getInterimTranscript();
      if (interim) {
        setInterimTranscript(interim);
      }
    }, 100);

    const started = speechService.startRecognition({ lang, interimResults: true });
    
    if (started) {
      setIsListening(true);
      startTimeRef.current = Date.now();
    } else {
      clearInterval(interimInterval);
    }

    return started;
  }, []);

  const stopListening = useCallback(() => {
    speechService.stopRecognition();
    setIsListening(false);
    
    if (startTimeRef.current > 0) {
      const elapsed = Date.now() - startTimeRef.current;
      setDurationMs(elapsed);
      startTimeRef.current = 0;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setEmotion(null);
  }, []);

  const startRecording = useCallback(async (): Promise<string | null> => {
    if (!voiceRecorder.isSupported()) {
      setError('Recording not supported');
      return null;
    }

    setError(null);
    const started = await voiceRecorder.startRecording({
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      maxDurationMs: 60000, // 60 second max
    });

    if (started) {
      setIsRecording(true);
      return null; // Recording started, blob URL will be available when stopped
    } else {
      setError('Failed to start recording');
      return null;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return null;

    const result = await voiceRecorder.stopRecording();
    setIsRecording(false);
    setAudioLevel(0);

    if (result) {
      // Transcribe the recording
      const transcription = await speechService.transcribeRecording(result.blob);
      
      if (transcription) {
        setTranscript(transcription.transcript);
        setDurationMs(transcription.durationMs);
        
        const emotionResult = speechService.detectEmotionFromText(
          transcription.transcript,
          transcription.durationMs
        );
        setEmotion(emotionResult);
      }

      return result;
    }

    return null;
  }, [isRecording]);

  return {
    transcript,
    interimTranscript,
    isListening,
    isRecording,
    error,
    durationMs,
    audioLevel,
    startListening,
    stopListening,
    resetTranscript,
    startRecording,
    stopRecording,
    emotion,
  };
}

export default useSpeechRecognition;
