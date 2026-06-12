/**
 * useTextToSpeech - V92 Hook for Speech Synthesis (TTS)
 * 
 * Provides:
 * - speak(text, options): Speak the given text
 * - stop(): Stop current speech
 * - pause()/resume(): Pause/resume speech
 * - isPlaying: whether speech is currently playing
 * - voice settings integration with store
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { speechService } from '../services/multimodal/SpeechService';
import { useStore } from '../store';

interface SpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  lang?: string;
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: SpeechSynthesisOptions) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
  availableVoices: SpeechSynthesisVoice[];
  getDefaultVoice: (lang?: string) => SpeechSynthesisVoice | null;
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  ttsRate: number;
  setTtsRate: (rate: number) => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const voiceSettings = useStore((s) => s.voiceSettings);
  const setVoiceSettings = useStore((s) => s.setVoiceSettings);
  
  const isSupported = speechService.isTTSSupported();

  // Load voices
  useEffect(() => {
    const voices = speechService.getAvailableVoices();
    setAvailableVoices(voices);
    
    // Voices may load asynchronously
    const loadInterval = setInterval(() => {
      const updatedVoices = speechService.getAvailableVoices();
      if (updatedVoices.length !== voices.length) {
        setAvailableVoices(updatedVoices);
      }
    }, 1000);
    
    return () => clearInterval(loadInterval);
  }, []);

  const getDefaultVoice = useCallback((lang: string = 'en'): SpeechSynthesisVoice | null => {
    return speechService.getDefaultVoice(lang);
  }, []);

  const speak = useCallback(async (text: string, options?: SpeechSynthesisOptions): Promise<void> => {
    if (!voiceSettings.ttsEnabled) {
      console.warn('[useTextToSpeech] TTS is disabled');
      return;
    }

    // Merge voice settings with options
    const mergedOptions: SpeechSynthesisOptions = {
      rate: options?.rate ?? voiceSettings.ttsRate,
      pitch: options?.pitch ?? voiceSettings.ttsPitch,
      volume: options?.volume ?? voiceSettings.ttsVolume,
      voiceName: options?.voiceName ?? voiceSettings.ttsVoice,
      lang: options?.lang,
    };

    setIsPlaying(true);
    setIsPaused(false);

    try {
      await speechService.speak(text, mergedOptions);
    } finally {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [voiceSettings]);

  const stop = useCallback(() => {
    speechService.stopSpeaking();
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    speechService.pauseSpeaking();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    speechService.resumeSpeaking();
    setIsPaused(false);
  }, []);

  const setTtsEnabled = useCallback((enabled: boolean) => {
    setVoiceSettings({ ttsEnabled: enabled });
  }, [setVoiceSettings]);

  const setTtsRate = useCallback((rate: number) => {
    setVoiceSettings({ ttsRate: rate });
    localStorage.setItem('ttsRate', String(rate));
  }, [setVoiceSettings]);

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
    ttsEnabled: voiceSettings.ttsEnabled,
    setTtsEnabled,
    ttsRate: voiceSettings.ttsRate,
    setTtsRate,
  };
}

export default useTextToSpeech;
