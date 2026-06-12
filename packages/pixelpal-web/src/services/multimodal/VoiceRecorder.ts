/**
 * VoiceRecorder Service - V92 Multimodal
 * 
 * Manages audio recording for voice input with waveform visualization support.
 */

import type { RecordingState, AudioLevelCallback } from '../../types/multimodal';

export interface RecordingResult {
  blob: Blob;
  url: string;        // Blob URL for playback
  duration: number;   // Duration in milliseconds
  transcript?: string; // Optional transcription
}

export interface VoiceRecorderOptions {
  mimeType?: string;        // Audio MIME type (default: 'audio/webm')
  audioBitsPerSecond?: number;
  maxDurationMs?: number;   // Max recording duration
  onAudioLevel?: AudioLevelCallback; // For waveform visualization
}

/**
 * VoiceRecorder - Handles audio recording for voice input
 */
export class VoiceRecorder {
  private static instance: VoiceRecorder;
  
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: RecordingState = 'idle';
  private startTime: number = 0;
  private options: VoiceRecorderOptions = {};
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private onAudioLevelCallback: AudioLevelCallback | null = null;
  
  private constructor() {}
  
  static getInstance(): VoiceRecorder {
    if (!VoiceRecorder.instance) {
      VoiceRecorder.instance = new VoiceRecorder();
    }
    return VoiceRecorder.instance;
  }
  
  /**
   * Check if recording is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           !!navigator.mediaDevices?.getUserMedia;
  }
  
  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return this.state;
  }
  
  /**
   * Get current duration in milliseconds
   */
  getDuration(): number {
    if (this.state === 'idle' || this.startTime === 0) {
      return 0;
    }
    return Date.now() - this.startTime;
  }
  
  /**
   * Start recording audio
   */
  async startRecording(options: VoiceRecorderOptions = {}): Promise<boolean> {
    if (this.state === 'recording') {
      console.warn('[VoiceRecorder] Already recording');
      return false;
    }
    
    if (!this.isSupported()) {
      console.error('[VoiceRecorder] Recording not supported');
      return false;
    }
    
    try {
      this.options = options;
      this.audioChunks = [];
      
      // Get user media (microphone access)
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        }
      });
      
      // Set up audio analyzer for level visualization
      if (options.onAudioLevel) {
        this.onAudioLevelCallback = options.onAudioLevel;
        this.setupAudioAnalyzer();
      }
      
      // Determine MIME type
      const mimeType = options.mimeType || this.getSupportedMimeType();
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.cleanup();
      };
      
      this.mediaRecorder.onerror = (event) => {
        console.error('[VoiceRecorder] Recording error:', event);
        this.cleanup();
      };
      
      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.state = 'recording';
      this.startTime = Date.now();
      
      // Set up max duration timeout if specified
      if (options.maxDurationMs) {
        setTimeout(() => {
          if (this.state === 'recording') {
            this.stopRecording();
          }
        }, options.maxDurationMs);
      }
      
      return true;
    } catch (error) {
      console.error('[VoiceRecorder] Failed to start recording:', error);
      this.cleanup();
      return false;
    }
  }
  
  /**
   * Stop recording and return the recorded audio
   */
  async stopRecording(): Promise<RecordingResult | null> {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      console.warn('[VoiceRecorder] Not currently recording');
      return null;
    }
    
    return new Promise((resolve) => {
      const duration = this.getDuration();
      
      this.mediaRecorder!.onstop = () => {
        // Create blob from chunks
        const mimeType = this.options.mimeType || this.getSupportedMimeType();
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        this.cleanup();
        
        resolve({
          blob,
          url,
          duration,
        });
      };
      
      this.mediaRecorder!.stop();
      this.state = 'stopped';
    });
  }
  
  /**
   * Pause recording
   */
  pauseRecording(): boolean {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      return false;
    }
    
    this.mediaRecorder.pause();
    this.state = 'paused';
    this.stopAudioLevelMonitoring();
    return true;
  }
  
  /**
   * Resume recording
   */
  resumeRecording(): boolean {
    if (this.state !== 'paused' || !this.mediaRecorder) {
      return false;
    }
    
    this.mediaRecorder.resume();
    this.state = 'recording';
    this.startAudioLevelMonitoring();
    return true;
  }
  
  /**
   * Cancel recording without saving
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    this.state = 'idle';
  }
  
  /**
   * Get the recorded audio stream (for visualization)
   */
  getStream(): MediaStream | null {
    return this.stream;
  }
  
  /**
   * Set up audio analyzer for level visualization
   */
  private setupAudioAnalyzer(): void {
    if (!this.stream) return;
    
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      
      this.startAudioLevelMonitoring();
    } catch (error) {
      console.warn('[VoiceRecorder] Failed to set up audio analyzer:', error);
    }
  }
  
  /**
   * Monitor audio levels for visualization
   */
  private startAudioLevelMonitoring(): void {
    if (!this.analyser || !this.onAudioLevelCallback) return;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const updateLevel = () => {
      if (this.state !== 'recording') return;
      
      this.analyser!.getByteFrequencyData(dataArray);
      
      // Calculate average level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length / 255; // Normalize to 0-1
      
      this.onAudioLevelCallback!(average);
      
      this.animationFrameId = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }
  
  /**
   * Stop audio level monitoring
   */
  private stopAudioLevelMonitoring(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Get the best supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // Fallback
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.stopAudioLevelMonitoring();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.state = 'idle';
  }
  
  /**
   * Convert blob to base64 for storage/transmission
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Convert base64 to blob
   */
  base64ToBlob(base64: string, mimeType: string = 'audio/webm'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

export const voiceRecorder = VoiceRecorder.getInstance();
export default voiceRecorder;
