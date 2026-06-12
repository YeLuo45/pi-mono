/**
 * MultimodalInput Component - V92
 * 
 * Unified input component combining:
 * - Text input
 * - Voice input (microphone)
 * - Image upload
 * - Send button
 */

import React, { useState, useRef, useCallback } from 'react';
import { MyBox as Box, MyTextField as TextField, MyIconButton as IconButton, MyTooltip as Tooltip, MyPaper, MyCircularProgress as CircularProgress , MyButton as Button } from '../MUI替代';
import {
  Send as SendIcon,
  Mic as MicIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { VoiceInputButton } from './VoiceInputButton';
import { VoiceOutputToggle } from './VoiceOutputToggle';
import { ImageUploadZone } from './ImageUploadZone';
import { imageAnalyzer } from '../../services/multimodal/ImageAnalyzer';
import type { ImageMessage } from '../../types/multimodal';
import { useStore } from '../../store';

interface MultimodalInputProps {
  onSend: (content: string, images?: ImageMessage[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({
  onSend,
  disabled = false,
  placeholder = '输入消息...',
}) => {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<ImageMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  
  const textFieldRef = useRef<HTMLInputElement>(null);
  
  const isAIThinking = useStore((s) => s.isAIThinking);
  const voiceSettings = useStore((s) => s.voiceSettings);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  
  // Handle text submission
  const handleSend = useCallback(() => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && images.length === 0) || isAIThinking || disabled) {
      return;
    }
    
    onSend(trimmedInput, images.length > 0 ? images : undefined);
    setInput('');
    setImages([]);
    setShowImageUpload(false);
  }, [input, images, isAIThinking, disabled, onSend]);
  
  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle image upload from ImageUploadZone
  const handleImagesAdded = useCallback(async (newImages: ImageMessage[]) => {
    setImages(prev => [...prev, ...newImages]);
    setShowImageUpload(false);
    
    // Auto-analyze images if enabled
    for (const img of newImages) {
      setIsAnalyzing(true);
      try {
        const result = await imageAnalyzer.analyzeImage(img.imageUrl, {
          includeCaption: true,
          includeOCR: true,
        });
        
        // Update the image with analysis results
        setImages(prev =>
          prev.map(i =>
            i.id === img.id
              ? {
                  ...i,
                  caption: result.caption || i.caption,
                  detectedText: result.detectedText || i.detectedText,
                  analysisResult: result.analysis,
                }
              : i
          )
        );
      } catch (error) {
        console.warn('[MultimodalInput] Image analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, []);
  
  // Remove an image
  const handleRemoveImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(i => i.id !== imageId));
  }, []);
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Image Preview Bar */}
      {images.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 1,
            overflowX: 'auto',
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 1,
            mb: 1,
          }}
        >
          {images.map(img => (
            <Box
              key={img.id}
              sx={{
                position: 'relative',
                flexShrink: 0,
                width: 60,
                height: 60,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <img
                src={img.imageUrl}
                alt="Upload preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemoveImage(img.id)}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  p: 0.25,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                }}
              >
                <CloseIcon sx={{ fontSize: 12, color: 'white' }} />
              </IconButton>
              {isAnalyzing && (
                <CircularProgress
                  size={16}
                  sx={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    color: 'primary.main',
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      )}
      
      {/* Image Upload Zone (collapsible) */}
      {showImageUpload && (
        <Box sx={{ mb: 1 }}>
          <ImageUploadZone onImagesAdded={handleImagesAdded} />
        </Box>
      )}
      
      {/* Main Input Row */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        {/* Text Input */}
        <TextField
          inputRef={textFieldRef}
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isAIThinking}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: 13,
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.15)',
              },
              '&.Mui-focused': {
                boxShadow: '0 0 0 2px rgba(94, 106, 210, 0.3)',
                borderColor: '#5e6ad2',
              },
            },
            '& .MuiInputBase-input': {
              color: '#f7f8f8',
              '&::placeholder': {
                color: '#62666d',
                opacity: 1,
              },
            },
          }}
        />
        
        {/* Image Upload Button */}
        <Tooltip title="添加图片">
          <IconButton
            onClick={() => setShowImageUpload(!showImageUpload)}
            disabled={disabled || isAIThinking}
            size="small"
            sx={{
              alignSelf: 'flex-end',
              flexShrink: 0,
              bgcolor: showImageUpload ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
              '&:hover': {
                bgcolor: showImageUpload ? 'rgba(94, 106, 210, 0.25)' : 'rgba(255,255,255,0.08)',
              },
            }}
          >
            <ImageIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        
        {/* Voice Input Button */}
        <VoiceInputButton
          onTranscriptChange={transcript => {
            setInput(prev => {
              if (!prev && transcript) return transcript;
              if (prev && transcript) return `${prev} ${transcript}`;
              return prev;
            });
          }}
          disabled={!voiceSettings.sttEnabled || isAIThinking || disabled}
        />
        
        {/* TTS Toggle */}
        {ttsSupported && (
          <VoiceOutputToggle />
        )}
        
        {/* Send Button */}
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={(!input.trim() && images.length === 0) || isAIThinking || disabled}
          size="small"
          sx={{
            alignSelf: 'flex-end',
            flexShrink: 0,
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default MultimodalInput;
