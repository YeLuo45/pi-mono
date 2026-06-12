/**
 * ImageUploadZone Component - V92 Multimodal
 * 
 * Drag-and-drop image upload zone with:
 * - Preview thumbnails
 * - Multi-image support
 * - Click to upload
 * - Image type validation
 */

import React, { useState, useCallback, useRef } from 'react';
import { MyBox as Box, MyTypography as Typography, MyIconButton, MyLinearProgress as LinearProgress } from '../MUI替代';
import {
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { imageAnalyzer } from '../../services/multimodal/ImageAnalyzer';
import type { ImageMessage } from '../../types/multimodal';

interface ImageUploadZoneProps {
  onImagesAdded: (images: ImageMessage[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  accept?: string[];  // MIME types
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  onImagesAdded,
  maxImages = 9,
  maxSizeMB = 10,
  accept = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!accept.includes(file.type)) {
      return `不支持的图片格式: ${file.type}`;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `图片大小超过 ${maxSizeMB}MB 限制`;
    }
    
    return null;
  }, [accept, maxSizeMB]);
  
  // Process files into ImageMessages
  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setIsProcessing(true);
    setProgress(0);
    
    const fileArray = Array.from(files);
    
    // Check max images
    if (fileArray.length > maxImages) {
      setError(`最多只能上传 ${maxImages} 张图片`);
      setIsProcessing(false);
      return;
    }
    
    const imageMessages: ImageMessage[] = [];
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Validate
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      
      try {
        // Create ImageMessage using ImageAnalyzer
        const imgMsg = await imageAnalyzer.createImageMessage(file);
        imageMessages.push(imgMsg);
        
        setProgress(((i + 1) / fileArray.length) * 100);
      } catch (err) {
        console.error('[ImageUploadZone] Failed to process image:', err);
        setError(`处理图片失败: ${file.name}`);
      }
    }
    
    if (imageMessages.length > 0) {
      onImagesAdded(imageMessages);
    }
    
    setIsProcessing(false);
  }, [validateFile, maxImages, onImagesAdded]);
  
  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);
  
  // Click to upload
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [processFiles]);
  
  return (
    <Box
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      sx={{
        border: '2px dashed',
        borderColor: isDragging
          ? 'primary.main'
          : error
          ? 'error.main'
          : 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        p: 2,
        textAlign: 'center',
        cursor: 'pointer',
        bgcolor: isDragging
          ? 'rgba(94, 106, 210, 0.1)'
          : 'rgba(255, 255, 255, 0.02)',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.4)',
          bgcolor: 'rgba(255, 255, 255, 0.04)',
        },
        ...(isProcessing && {
          pointerEvents: 'none',
        }),
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {isProcessing ? (
        <>
          <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
            正在处理图片...
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 1, borderRadius: 1 }}
          />
        </>
      ) : error ? (
        <>
          <DescriptionIcon sx={{ fontSize: 32, color: 'error.main', mb: 1 }} />
          <Typography variant="body2" sx={{ fontSize: 12, color: 'error.main' }}>
            {error}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
            点击重新上传
          </Typography>
        </>
      ) : (
        <>
          <ImageIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
            {isDragging
              ? '松开以上传图片'
              : `拖拽图片到这里，或点击上传（最多${maxImages}张，每张不超过${maxSizeMB}MB）`}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5 }}>
            支持 JPG、PNG、GIF、WebP、BMP 格式
          </Typography>
        </>
      )}
    </Box>
  );
};

export default ImageUploadZone;
