/**
 * EmotionResponse - V21 情感响应决策引擎
 * 
 * AI伴侣根据用户情绪状态动态调整回复风格和内容
 * - 回复语气（安慰/鼓励/冷静/俏皮）
 * - 回复长度（简短安慰/详细倾听）
 * - 是否主动询问
 * - 表情符号使用
 * - 话题建议
 * 
 * 基于 PRD V21 情感响应引擎规格
 */

import type { TextEmotion } from './emotionService';

// --- Response Style Configuration ---

export interface ResponseStyle {
  /** 语气类型 */
  tone: 'reassuring' | 'encouraging' | 'calm' | 'playful' | 'listening' | 'supportive';
  /** 期望回复长度 */
  length: 'short' | 'medium' | 'long';
  /** 是否主动询问 */
  askQuestions: boolean;
  /** 建议使用的表情符号 */
  emoji: string[];
  /** 话题倾向 */
  topicApproach: 'follow_user' | 'introduce_new' | 'neutral';
  /** 响应优先级 */
  priority: number; // 0-100, higher = more important to respond
}

/** 情绪响应矩阵（来自PRD）*/
const EMOTION_RESPONSE_MATRIX: Record<TextEmotion, ResponseStyle> = {
  happy: {
    tone: 'playful',
    length: 'medium',
    askQuestions: false, // Will ask sometimes based on context
    emoji: ['😊', '🎉', '😄', '✨', '👍'],
    topicApproach: 'introduce_new',
    priority: 30,
  },
  excited: {
    tone: 'playful',
    length: 'medium',
    askQuestions: true,
    emoji: ['🎉', '😆', '🥳', '✨', '🤩'],
    topicApproach: 'introduce_new',
    priority: 40,
  },
  calm: {
    tone: 'reassuring',
    length: 'short',
    askQuestions: false,
    emoji: ['🙂', '😌', '🌿', '🍃', '☀️'],
    topicApproach: 'neutral',
    priority: 20,
  },
  anxious: {
    tone: 'supportive',
    length: 'long',
    askQuestions: true,
    emoji: ['🤗', '💙', '🌸', '🤝', '✨'],
    topicApproach: 'follow_user',
    priority: 70,
  },
  angry: {
    tone: 'calm',
    length: 'medium',
    askQuestions: true,
    emoji: ['😔', '💙', '🤝', '🫂', '💭'],
    topicApproach: 'follow_user',
    priority: 85, // High priority - needs de-escalation
  },
  sad: {
    tone: 'supportive',
    length: 'long',
    askQuestions: true,
    emoji: ['💙', '🤗', '🫂', '🌸', '💭'],
    topicApproach: 'follow_user',
    priority: 80,
  },
  exhausted: {
    tone: 'reassuring',
    length: 'short',
    askQuestions: false,
    emoji: ['🌙', '😴', '💤', '🤗', '☕'],
    topicApproach: 'neutral',
    priority: 50,
  },
  unknown: {
    tone: 'reassuring',
    length: 'medium',
    askQuestions: true,
    emoji: ['😊', '🤔', '💬', '👋', '✨'],
    topicApproach: 'neutral',
    priority: 10,
  },
};

// --- Pre-written Response Templates ---

const RESPONSE_TEMPLATES: Record<TextEmotion, string[]> = {
  happy: [
    "看到你这么开心，我也很高兴呢！✨",
    "呀，气氛这么棒！有什么好事想分享吗？🎉",
    "开心就好～ 继续保持这份好心情！😊",
  ],
  excited: [
    "哇，听起来真的很令人兴奋！🎉",
    "你的热情感染到我了！能多说说吗？✨",
    "太棒了！这种兴奋感一定很棒～ 😆",
  ],
  calm: [
    "嗯，放松的感觉真好～ 🙂",
    "平静是福呢～ 有什么需要随时叫我。",
    "享受这份宁静吧 🌿",
  ],
  anxious: [
    "我理解你的担心，别着急，我在这里陪你 🤗",
    "慢慢来，不要给自己太大压力 💙",
    "有什么让你焦虑的事吗？说说看，我听着呢 💭",
  ],
  angry: [
    "我能感觉到你很沮丧，先深呼吸一下 😔",
    "生气的感受是正常的，想聊聊是什么让你不开心吗？🤝",
    "别憋着，说出来会好受一些的 💙",
  ],
  sad: [
    "我在这里陪着你，想说就说出来吧 💙",
    "难过的时候不需要逞强，我愿意听你说话 🤗",
    "如果想聊聊，我随时都在 🫂",
  ],
  exhausted: [
    "累了就休息一下，不要勉强自己哦～ 🌙",
    "辛苦了，先放松一下吧 😴",
    "休息是重要的，我在这里守着你 ☕",
  ],
  unknown: [
    "今天怎么样？有什么想聊的吗？💬",
    "在想什么呢？😊",
    "我在这里，想说什么都可以～ 👋",
  ],
};

// --- Additional caring messages for alerts ---

const CARING_MESSAGES: Record<string, string[]> = {
  persistent_negative: [
    "注意到你最近心情不太好，有什么想聊聊的吗？我在这里陪着你 💙",
    "这几天看起来有点累，要不要休息一下？我可以给你讲个故事 🌙",
    "我在这里陪着你，想说什么都可以。无论是什么情绪，我都愿意听 💭",
  ],
  sudden_drop: [
    "感觉你今天心情有点低落，发生什么事了吗？🤗",
    "我注意到你情绪有些变化，需要我帮忙吗？💙",
  ],
  high_negative_ratio: [
    "今天似乎有很多负面情绪，别忘了照顾自己哦 🤗",
    "如果需要休息一下，随时告诉我，我可以陪着你 🌸",
  ],
};

// --- EmotionResponseEngine Class ---

export class EmotionResponseEngine {
  private static instance: EmotionResponseEngine;
  
  /** 每N条消息最多触发1次情感响应 */
  private messageCountSinceLastResponse = 0;
  private readonly RESPONSE_INTERVAL = 3;
  
  /** 上次触发的情绪类型（用于避免重复）*/
  private lastRespondedEmotion: TextEmotion | null = null;

  private constructor() {}

  /** 获取单例实例 */
  public static getInstance(): EmotionResponseEngine {
    if (!EmotionResponseEngine.instance) {
      EmotionResponseEngine.instance = new EmotionResponseEngine();
    }
    return EmotionResponseEngine.instance;
  }

  /**
   * 判断是否应该触发情感响应
   * 基于响应限流规则：每3条消息最多触发1次
   */
  public shouldRespond(currentEmotion: TextEmotion, context: { messageCount?: number } = {}): boolean {
    const { messageCount = this.messageCountSinceLastResponse } = context;
    
    // Increment counter
    this.messageCountSinceLastResponse++;
    
    // Check if we should respond
    const shouldRespond = this.messageCountSinceLastResponse >= this.RESPONSE_INTERVAL;
    
    // Get style priority threshold
    const style = this.getResponseStyle(currentEmotion);
    
    // High priority emotions (angry, sad, anxious) can break the interval
    const isHighPriority = style.priority >= 70;
    
    // Reset counter if we respond
    if (shouldRespond || isHighPriority) {
      this.messageCountSinceLastResponse = 0;
    }
    
    return shouldRespond || isHighPriority;
  }

  /**
   * 获取指定情绪的响应风格配置
   */
  public getResponseStyle(emotion: TextEmotion): ResponseStyle {
    return EMOTION_RESPONSE_MATRIX[emotion] ?? EMOTION_RESPONSE_MATRIX.unknown;
  }

  /**
   * 生成情感响应内容
   */
  public generateResponse(emotion: TextEmotion, options: { 
    /** 是否强制响应（忽略间隔限制）*/
    force?: boolean;
    /** 额外上下文 */
    context?: string;
  } = {}): string | null {
    const { force = false, context } = options;

    // Check if we should respond
    if (!force && !this.shouldRespond(emotion)) {
      return null;
    }

    // Avoid responding to the same emotion repeatedly
    if (!force && this.lastRespondedEmotion === emotion && emotion !== 'unknown') {
      // Still return a response but it might be less specific
    }

    // Get templates for this emotion
    const templates = RESPONSE_TEMPLATES[emotion] ?? RESPONSE_TEMPLATES.unknown;
    
    // Pick a random template
    let response = templates[Math.floor(Math.random() * templates.length)];
    
    // Add context emoji if emotion is strong
    const style = this.getResponseStyle(emotion);
    if (style.emoji.length > 0) {
      const emoji = style.emoji[Math.floor(Math.random() * style.emoji.length)];
      response += ` ${emoji}`;
    }

    // Add follow-up question if appropriate
    if (style.askQuestions && Math.random() > 0.5) {
      const questions: Record<TextEmotion, string[]> = {
        happy: ['有什么特别让你开心的吗？', '想聊聊这个吗？'],
        excited: ['是什么让你这么兴奋？', '快告诉我！'],
        calm: ['享受平静的感觉真好～'],
        anxious: ['想详细说说吗？', '我在听。'],
        angry: ['是什么让你生气？', '愿意说说吗？'],
        sad: ['想聊聊发生什么了吗？', '我在听。'],
        exhausted: ['想休息一下吗？'],
        unknown: ['今天怎么样？'],
      };
      const extraQuestions = questions[emotion] ?? [];
      if (extraQuestions.length > 0) {
        const extraQ = extraQuestions[Math.floor(Math.random() * extraQuestions.length)];
        response += ` ${extraQ}`;
      }
    }

    // Update last responded emotion
    this.lastRespondedEmotion = emotion;

    return response;
  }

  /**
   * 生成预警关怀消息
   */
  public generateCaringMessage(alertType: 'persistent_negative' | 'sudden_drop' | 'high_negative_ratio'): string {
    const templates = CARING_MESSAGES[alertType] ?? CARING_MESSAGES.persistent_negative;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * 获取建议的话题方向
   */
  public getSuggestedTopicApproach(emotion: TextEmotion): 'follow_user' | 'introduce_new' | 'neutral' {
    const style = this.getResponseStyle(emotion);
    return style.topicApproach;
  }

  /**
   * 获取建议的回复长度关键词
   * 用于在 AI 回复时注入提示
   */
  public getLengthHint(emotion: TextEmotion): string {
    const style = this.getResponseStyle(emotion);
    switch (style.length) {
      case 'short':
        return '[回复简短一些，温暖但不啰嗦]';
      case 'medium':
        return '[回复中等长度，自然对话]';
      case 'long':
        return '[回复详细一些，给予倾听和支持]';
    }
  }

  /**
   * 获取语气提示关键词
   */
  public getToneHint(emotion: TextEmotion): string {
    const style = this.getResponseStyle(emotion);
    switch (style.tone) {
      case 'reassuring':
        return '[语气温暖安抚]';
      case 'encouraging':
        return '[语气鼓励积极]';
      case 'calm':
        return '[语气冷静平和]';
      case 'playful':
        return '[语气俏皮轻松]';
      case 'listening':
        return '[语气倾听专注]';
      case 'supportive':
        return '[语气支持理解]';
    }
  }

  /**
   * 获取完整的行为指导提示
   */
  public getBehaviorGuidance(emotion: TextEmotion): string {
    const tone = this.getToneHint(emotion);
    const length = this.getLengthHint(emotion);
    const style = this.getResponseStyle(emotion);
    
    // Combine emoji suggestion
    const emojiSuggestion = style.emoji.length > 0 
      ? `[可以适当使用表情：${style.emoji.slice(0, 2).join('')}]`
      : '';

    return `${tone} ${length} ${emojiSuggestion}`.trim();
  }

  /**
   * 重置响应引擎状态
   */
  public reset(): void {
    this.messageCountSinceLastResponse = 0;
    this.lastRespondedEmotion = null;
  }

  /**
   * 获取响应间隔（用于测试）
   */
  public getResponseInterval(): number {
    return this.RESPONSE_INTERVAL;
  }

  /**
   * 获取自上次响应后的消息计数（用于测试）
   */
  public getMessageCountSinceLastResponse(): number {
    return this.messageCountSinceLastResponse;
  }
}

// --- Export singleton helper ---

export const emotionResponseEngine = EmotionResponseEngine.getInstance();
