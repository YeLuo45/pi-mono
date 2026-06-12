/**
 * ImageAnalyzer Service - V92 Multimodal
 * 
 * Provides image analysis capabilities using vision-capable AI providers.
 * Supports OCR, caption generation, and multi-image comparison.
 */

import { providerManager } from '../providers/providerManager';
import type { AIProvider } from '../providers/types';
import type { ImageMessage, ImageAnalysisResult, ImageAnalysisOptions } from '../../types/multimodal';
import { useStore } from '../../store';

const VISION_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-pro-vision',
];

interface ProviderWithVision {
  provider: AIProvider;
  model: string;
}

/**
 * Find a provider with vision capabilities
 */
function findVisionProvider(): ProviderWithVision | null {
  const providers = providerManager.getAll();
  
  for (const [id, config] of Object.entries(providers)) {
    if (!config.enabled) continue;
    
    // Check if it's a known vision model
    const model = config.defaultModel || '';
    if (VISION_MODELS.some(vm => model.toLowerCase().includes(vm.toLowerCase()))) {
      const provider = providerManager.getProvider(id);
      if (provider) {
        return { provider, model: config.defaultModel };
      }
    }
  }
  
  // Fallback: return the first available provider and assume it might support vision
  for (const [id, config] of Object.entries(providers)) {
    if (!config.enabled) continue;
    const provider = providerManager.getProvider(id);
    if (provider) {
      return { provider, model: config.defaultModel || 'gpt-4o' };
    }
  }
  
  return null;
}

/**
 * Check if a string is a valid data URL or URL
 */
function isValidImageUrl(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:');
}

/**
 * Convert image URL to base64 data URL if needed
 */
async function ensureDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  if (imageUrl.startsWith('blob:')) {
    // Convert blob to base64
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return imageUrl;
    }
  }
  
  // For regular URLs, try to fetch and convert
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return imageUrl;
  }
}

/**
 * Extract image dimensions from a data URL
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * ImageAnalyzer class for V92 Multimodal
 */
export class ImageAnalyzer {
  private static instance: ImageAnalyzer;
  
  private constructor() {}
  
  static getInstance(): ImageAnalyzer {
    if (!ImageAnalyzer.instance) {
      ImageAnalyzer.instance = new ImageAnalyzer();
    }
    return ImageAnalyzer.instance;
  }
  
  /**
   * Analyze a single image
   */
  async analyzeImage(
    imageUrl: string,
    options: ImageAnalysisOptions = {}
  ): Promise<ImageAnalysisResult> {
    const { includeOCR = true, includeCaption = true } = options;
    
    const visionProvider = findVisionProvider();
    if (!visionProvider) {
      return { analysis: 'No vision-capable provider available' };
    }
    
    try {
      // Ensure we have a data URL for processing
      const dataUrl = await ensureDataUrl(imageUrl);
      
      // Build the analysis prompt
      let prompt = 'Please analyze this image carefully.';
      
      if (includeCaption) {
        prompt += '\n\nFirst, provide a clear, concise caption/description of what the image shows.';
      }
      
      if (includeOCR) {
        prompt += '\n\nIf there is any text visible in the image, please extract and list it completely.';
      }
      
      prompt += '\n\nProvide your analysis in a well-structured format.';
      
      // Call the vision model
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ],
          timestamp: Date.now(),
        }
      ];
      
      // Note: The actual API call format depends on the provider
      // This is a simplified version - in production, you'd need provider-specific handling
      const response = await visionProvider.provider.chat(messages as any, {
        model: visionProvider.model,
        temperature: 0.3,
      });
      
      // Parse the response
      const content = response.content;
      
      // Extract caption if present
      let caption: string | undefined;
      let detectedText: string | undefined;
      
      // Simple parsing - in production, use more robust methods
      const captionMatch = content.match(/caption[:\s]*(.+?)(?:\n|$)/i);
      if (captionMatch) caption = captionMatch[1].trim();
      
      const textMatch = content.match(/(?:text|ocr)[:\s]*(.+?)(?:\n\n|\n[A-Z]|$)/is);
      if (textMatch) detectedText = textMatch[1].trim();
      
      return {
        caption,
        detectedText,
        analysis: content,
        confidence: 0.8,
      };
    } catch (error) {
      console.error('[ImageAnalyzer] Analysis failed:', error);
      return {
        analysis: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
  
  /**
   * Analyze multiple images (comparison)
   */
  async analyzeImages(
    images: ImageMessage[],
    query?: string
  ): Promise<ImageAnalysisResult> {
    const visionProvider = findVisionProvider();
    if (!visionProvider) {
      return { analysis: 'No vision-capable provider available' };
    }
    
    try {
      // Convert all images to data URLs
      const dataUrls = await Promise.all(
        images.map(img => ensureDataUrl(img.imageUrl))
      );
      
      // Build comparison prompt
      let prompt = query || 'Please analyze and compare these images.';
      prompt += '\n\nProvide a detailed comparison, noting similarities, differences, and any notable findings.';
      
      // Build message content
      const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: prompt }
      ];
      
      dataUrls.forEach((url, i) => {
        content.push({ type: 'image_url', image_url: { url } });
      });
      
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content,
          timestamp: Date.now(),
        }
      ];
      
      const response = await visionProvider.provider.chat(messages as any, {
        model: visionProvider.model,
        temperature: 0.3,
      });
      
      return {
        analysis: response.content,
        confidence: 0.8,
      };
    } catch (error) {
      console.error('[ImageAnalyzer] Multi-image analysis failed:', error);
      return {
        analysis: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
  
  /**
   * Create an ImageMessage from a file
   */
  async createImageMessage(file: File): Promise<ImageMessage> {
    const id = crypto.randomUUID();
    
    // Convert to data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // Get dimensions
    const dimensions = await getImageDimensions(dataUrl);
    
    return {
      id,
      type: 'image',
      imageUrl: dataUrl,
      mimeType: file.type,
      size: file.size,
      width: dimensions?.width,
      height: dimensions?.height,
    };
  }
  
  /**
   * Create an ImageMessage from a data URL
   */
  async createImageMessageFromDataUrl(
    dataUrl: string,
    mimeType?: string
  ): Promise<ImageMessage> {
    const id = crypto.randomUUID();
    const dimensions = await getImageDimensions(dataUrl);
    
    return {
      id,
      type: 'image',
      imageUrl: dataUrl,
      mimeType: mimeType || 'image/png',
      width: dimensions?.width,
      height: dimensions?.height,
    };
  }
  
  /**
   * Create an ImageMessage from a blob
   */
  async createImageMessageFromBlob(blob: Blob): Promise<ImageMessage> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    const dimensions = await getImageDimensions(dataUrl);
    
    return {
      id: crypto.randomUUID(),
      type: 'image',
      imageUrl: dataUrl,
      mimeType: blob.type,
      size: blob.size,
      width: dimensions?.width,
      height: dimensions?.height,
    };
  }
}

export const imageAnalyzer = ImageAnalyzer.getInstance();
export default imageAnalyzer;
