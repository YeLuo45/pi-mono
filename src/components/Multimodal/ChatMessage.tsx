/**
 * ChatMessage Component - V92 Multimodal Enhancement
 * 
 * Enhanced message bubble component with support for:
 * - Text messages
 * - Image messages with thumbnails and analysis results
 * - Voice input/output messages
 * - Image gallery view
 */

import React, { useState, useCallback } from 'react';
import { MyImageList as ImageList, MyImageListItem as ImageListItem, MyImageListItemBar as ImageListItemBar, MyDialog as Dialog , MyDialogContent as DialogContent } from '../MUI替代';
import { MyBox as Box, MyPaper as Paper, MyTypography as Typography, MyIconButton as IconButton, MyCollapse as Collapse, MyTooltip as Tooltip, MyButton as Button } from '../MUI替代';
import {
  ExpandMore as ExpandMoreIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
} from '@mui/icons-material';
import type { ImageMessage, VoiceMessage } from '../../types/multimodal';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  images?: ImageMessage[];
  voice?: VoiceMessage;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  role,
  images = [],
  voice,
  onSpeak,
  isSpeaking = false,
}) => {
  const [showImages, setShowImages] = useState(images.length > 0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageMessage | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  
  const { speak, stop, isPlaying } = useTextToSpeech();
  
  const hasImages = images.length > 0;
  const hasVoice = !!voice;
  
  // Handle TTS for message content
  const handleSpeak = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      onSpeak?.(content);
    }
  }, [content, isPlaying, stop, onSpeak]);
  
  // Open image dialog
  const handleImageClick = (image: ImageMessage) => {
    setSelectedImage(image);
    setImageDialogOpen(true);
  };
  
  // Toggle analysis expansion for an image
  const toggleAnalysis = (imageId: string) => {
    setExpandedAnalysis(prev => ({
      ...prev,
      [imageId]: !prev[imageId],
    }));
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Voice Message Display */}
      {hasVoice && voice.type === 'voice_input' && (
        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'rgba(94, 106, 210, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            maxWidth: 280,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🎤
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
              语音消息
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              {voice.text || '（转录中...）'}
            </Typography>
          </Box>
          {voice.duration && (
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
              {Math.round(voice.duration / 1000)}s
            </Typography>
          )}
        </Paper>
      )}
      
      {/* Voice Output Message Display */}
      {hasVoice && voice.type === 'voice_output' && (
        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'rgba(155, 127, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            maxWidth: 280,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🔊
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
              语音回复
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              {voice.text}
            </Typography>
          </Box>
        </Paper>
      )}
      
      {/* Image Gallery */}
      {hasImages && (
        <Box>
          <Button
            size="small"
            startIcon={<ImageIcon />}
            onClick={() => setShowImages(!showImages)}
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              textTransform: 'none',
              mb: 0.5,
            }}
          >
            {showImages ? '隐藏' : '显示'} {images.length} 张图片
          </Button>
          
          <Collapse in={showImages}>
            <ImageList
              cols={Math.min(images.length, 3)}
              gap={8}
              sx={{
                overflow: 'hidden',
                borderRadius: 1,
                mb: 1,
              }}
            >
              {images.map(img => (
                <ImageListItem
                  key={img.id}
                  sx={{
                    cursor: 'pointer',
                    opacity: 0.9,
                    '&:hover': {
                      opacity: 1,
                      transform: 'scale(1.02)',
                      transition: 'all 0.2s ease',
                    },
                  }}
                  onClick={() => handleImageClick(img)}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.caption || 'Image'}
                    loading="lazy"
                    style={{
                      borderRadius: 4,
                      objectFit: 'cover',
                    }}
                  />
                  {img.caption && (
                    <ImageListItemBar
                      title={
                        <Typography variant="caption" sx={{ fontSize: 10 }}>
                          {img.caption.slice(0, 50)}{img.caption.length > 50 ? '...' : ''}
                        </Typography>
                      }
                      actionIcon={
                        <Tooltip title="查看分析">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAnalysis(img.id);
                            }}
                            sx={{ color: 'white' }}
                          >
                            <ZoomInIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      }
                      sx={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                      }}
                    />
                  )}
                </ImageListItem>
              ))}
            </ImageList>
            
            {/* Image Analysis Results */}
            {images.some(img => img.analysisResult || img.detectedText) && (
              <Box sx={{ mt: 1 }}>
                {images.map(img => (
                  (img.analysisResult || img.detectedText) && (
                    <Box
                      key={img.id}
                      sx={{
                        p: 1,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      {img.caption && (
                        <Typography variant="caption" sx={{ fontSize: 11, color: 'primary.main', display: 'block', mb: 0.5 }}>
                          📝 描述: {img.caption}
                        </Typography>
                      )}
                      {img.detectedText && (
                        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}>
                          📄 文字: {img.detectedText}
                        </Typography>
                      )}
                      <Collapse in={expandedAnalysis[img.id]}>
                        {img.analysisResult && (
                          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', display: 'block', mt: 0.5 }}>
                            分析: {img.analysisResult}
                          </Typography>
                        )}
                      </Collapse>
                    </Box>
                  )
                ))}
              </Box>
            )}
          </Collapse>
        </Box>
      )}
      
      {/* Text Content */}
      {content && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              fontSize: { xs: 14, md: 13 },
              lineHeight: 1.6,
              flex: 1,
            }}
          >
            {content}
          </Typography>
          
          {/* TTS Button for assistant messages */}
          {role === 'assistant' && (
            <Tooltip title={isSpeaking ? '停止朗读' : '朗读'}>
              <IconButton
                size="small"
                onClick={handleSpeak}
                sx={{
                  p: 0.25,
                  color: isSpeaking ? 'primary.main' : 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {isSpeaking ? (
                  <VolumeOffIcon sx={{ fontSize: 14 }} />
                ) : (
                  <VolumeUpIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
      
      {/* Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(10, 10, 15, 0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setImageDialogOpen(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              zIndex: 1,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          
          {selectedImage && (
            <Box>
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.caption || 'Full size'}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
              
              {(selectedImage.caption || selectedImage.analysisResult || selectedImage.detectedText) && (
                <Box sx={{ p: 2 }}>
                  {selectedImage.caption && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>📝 描述:</strong> {selectedImage.caption}
                    </Typography>
                  )}
                  {selectedImage.detectedText && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>📄 识别文字:</strong> {selectedImage.detectedText}
                    </Typography>
                  )}
                  {selectedImage.analysisResult && (
                    <Typography variant="body2">
                      <strong>🔍 分析:</strong> {selectedImage.analysisResult}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ChatMessage;
