import React, { useState, useRef, useEffect } from 'react';
import { MyMenu as Menu , MyDialog as Dialog, MyMenuItem as MenuItem , MyAvatar as Avatar } from '../MUI替代';
import { MyBox as Box, MyTextField as TextField, MyIconButton as IconButton, MyTypography as Typography, MyPaper as Paper, MyDivider as Divider, MyTooltip as Tooltip, MyChip as Chip, MySelect, MyButton as Button } from '../MUI替代';
import { Send as SendIcon, Mic as MicIcon, MicOff as MicOffIcon, VolumeUp as VolumeUpIcon, VolumeOff as VolumeOffIcon, Stop as StopIcon, Close as CloseIcon, Pause as PauseIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { MemoPanel } from '../Memo/MemoPanel';
import { CollaborationStatus } from '../Collaboration/CollaborationStatus';
import { chatCompletion, chatCompletionWithTools, initModelRegistry, getDefaultModel } from '../../services/ai/model-registry-adapter';
import { injectCompanionContext, autoSummarizeChat, adjustMoodForInteraction } from '../../services/companion';
import { queryKnowledgeBase, buildRAGContext, isDocumentIndexed, reindexAllDocuments } from '../../services/rag';
import { buildRAGContext as buildKnowledgeRAGContext, retrieve as retrieveFromKnowledge } from '../../services/rag/knowledgeBase';
import { voiceService } from '../../services/voice/voiceService';
import { detectEmotion, type EmotionState } from '../../services/voice/emotionDetector';
import { addVoiceEmotionLog } from '../../services/emotion/emotionStorage';
import { PluginService } from '../../plugins';
import { pluginRegistry } from '../../services/plugins/pluginRegistry';
import type { Message } from '../../types';
import { useTranslation } from 'react-i18next';
import { useSceneStore } from '../../stores/sceneStore';
import { checkKeywordTrigger, executeScene, initSceneScheduler } from '../../utils/sceneScheduler';
import { getRules, updateRule } from '../../services/storage/sceneStorage';
import { evaluateRule } from '../../services/scene/ruleEngine';
import { parsePersonaCommand, fuzzyMatchPersona, fuzzyMatchPersonas } from '../../utils/personaCommands';
import { getAllPersonas, getPersonaSystemPrompt } from '../../services/persona';
import { getIntimacyLevel } from '../../store';
import { checkAndTagImportantMessage } from '../../services/summary/dailySummary';
import { checkAndCreateMilestones } from '../../services/milestone/milestoneTracker';
import { isGoalOriented, createTaskFromGoal, executeTask } from '../../services/agent/taskPlanner';
import { shouldUsePlanningMode } from '../../services/agent/planningUtils';
import { TaskConfirmDialog } from '../Agent/TaskConfirmDialog';
import type { Task as AgentTask } from '../../services/agent/types';
import { SpeechButton } from '../ChatInput/SpeechButton';
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis';
import { PlanView } from '../Plan/PlanView';
import { usePlanStore } from '../../stores/planStore';
import { usePlanExecution } from '../../hooks/usePlanExecution';
import { useSceneAwareness } from '../../hooks/useSceneAwareness';
import { useMultiAgentTrigger } from '../../hooks/useMultiAgentTrigger';
import { RecommendationPanel } from '../Recommendation/RecommendationPanel';
import { preferenceEngine } from '../../services/recommendation/preferenceEngine';
import { recommendationEngine } from '../../services/recommendation/recommendationEngine';
import { SkillPanel } from '../Skill/SkillPanel';
import { skillRunner } from '../../services/skills/skillRunner';
import type { SkillExecutionResult } from '../../services/skills/types';
import { matchChainTrigger, executeChain } from '../../services/chains/chainEngine';
import { getAllChains } from '../../services/chains/chainStorage';
import { AgentCreationWizard } from '../AgentBuilder';
import { useCompositionExecution } from '../../hooks/useCompositionExecution';

// Three-dot typing indicator component
const TypingIndicator: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pl: 1 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#5e6ad2',
            animation: 'bounce 1.2s infinite ease-in-out',
            animationDelay: `${i * 0.16}s`,
            '@keyframes bounce': {
              '0%, 80%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
              '40%': { transform: 'translateY(-5px)', opacity: 1 },
            },
          }}
        />
      ))}
    </Box>
  );
};

// Collab message bubble component
interface CollabBubbleProps {
  personaId: string;
  personaName: string;
  avatar: string;
  content: string;
  color: string;
  isUser?: boolean;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>) => void;
}

const CollabBubble: React.FC<CollabBubbleProps> = ({ personaName, avatar, content, color, isUser, onContextMenu }) => (
  <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
    <Paper
      onContextMenu={onContextMenu}
      sx={{
        maxWidth: 680,
        p: 1.5,
        borderRadius: '16px',
        bgcolor: isUser ? 'rgba(94, 106, 210, 0.15)' : '#191a1b',
        border: isUser ? 'none' : `1px solid ${color}40`,
        color: '#f7f8f8',
        fontSize: { xs: 14, md: 13 },
        borderBottomRightRadius: isUser ? 4 : 16,
        borderBottomLeftRadius: isUser ? 16 : 4,
        boxShadow: 'none',
      }}
    >
      {/* Persona header */}
      {!isUser && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Avatar sx={{ width: 18, height: 18, bgcolor: color, fontSize: 10 }}>
            {avatar}
          </Avatar>
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color }}>
            {personaName}
          </Typography>
        </Box>
      )}
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: { xs: 14, md: 13 }, lineHeight: 1.6 }}>
        {content}
      </Typography>
    </Paper>
  </Box>
);

export const ChatPanel: React.FC = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [showThinkingContent, setShowThinkingContent] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [showCollabSuggestion, setShowCollabSuggestion] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [goalConfirmDialogOpen, setGoalConfirmDialogOpen] = useState(false);
  const [pendingAgentTask, setPendingAgentTask] = useState<AgentTask | null>(null);
  const [pendingGoal, setPendingGoal] = useState('');
  // V58: Per-message TTS playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const { speak, stop, isPlaying, isSupported: ttsHookSupported } = useSpeechSynthesis({});
  const setCurrentEmotion = useStore((s) => s.setCurrentEmotion);
  const addEmotionEntry = useStore((s) => s.addEmotionEntry);
  const messages = useStore((s) => s.messages);
  const activePersonaId = useStore((s) => s.activePersonaId);
  const setActivePersonaId = useStore((s) => s.setActivePersonaId);
  const filteredMessages = messages.filter((m) => !m.personaId || m.personaId === activePersonaId);
  const personaSystemPrompt = useStore((s) => s.personaSystemPrompt);
  const models = useStore((s) => s.models);
  const addMessage = useStore((s) => s.addMessage);
  const clearMessages = useStore((s) => s.clearMessages);
  const isAIThinking = useStore((s) => s.isAIThinking);
  const aiThinkingContent = useStore((s) => s.aiThinkingContent);
  const setAIThinking = useStore((s) => s.setAIThinking);
  const setAIThinkingContent = useStore((s) => s.setAIThinkingContent);
  const aiConfig = useStore((s) => s.aiConfig);
  const setPetStatus = useStore((s) => s.setPetStatus);
  const updateLastActivity = useStore((s) => s.updateLastActivity);
  const voiceSettings = useStore((s) => s.voiceSettings);
  const personaIntimacy = useStore((s) => s.personaIntimacy);
  const setPersonaIntimacy = useStore((s) => s.setPersonaIntimacy);

  // V143: DSL execution hook
  const { runDSL } = useCompositionExecution();

  // Collab state
  const collabSession = useStore((s) => s.collabSession);
  const collabMessages = useStore((s) => s.collabMessages);
  const collabPresets = useStore((s) => s.collabPresets);
  const collabModeActive = useStore((s) => s.collaborationMode);
  const startCollab = useStore((s) => s.startCollab);
  const endCollab = useStore((s) => s.endCollab);
  const addCollabMessage = useStore((s) => s.addCollabMessage);
  const saveCollabPreset = useStore((s) => s.saveCollabPreset);
  const loadCollabPreset = useStore((s) => s.loadCollabPreset);
  const memoNotification = useStore((s) => s.memoNotification);
  const setMemoNotification = useStore((s) => s.setMemoNotification);
  const chatInputMention = useStore((s) => s.chatInputMention);
  const setChatInputMention = useStore((s) => s.setChatInputMention);
  const [memoOpen, setMemoOpen] = useState(false);
  const [skillPanelOpen, setSkillPanelOpen] = useState(false);
  const [agentBuilderOpen, setAgentBuilderOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Plan mode state
  const {
    currentPlan,
    planStatus,
    isExecuting,
    currentStepIndex,
    setCurrentPlan,
    setPlanStatus,
    createPlanFromTask,
    confirmPlan,
    updateStepStatus,
    setCurrentStepIndex,
    clearPlan,
  } = usePlanStore();
  const { executePlan, startExecution, abortExecution  } = usePlanExecution({
    onStepComplete: (index, step, result) => {
      // Step completed callback
    },
    onPlanComplete: (plan) => {
      addMessage({ role: 'system', content: `✅ 任务执行完成！\n\n最终结果：\n${plan.steps.map((s, i) => `${i + 1}. ${s.description}: ${s.result || '完成'}`).join('\n')}`, personaId: activePersonaId });
      clearPlan();
    },
    onPlanFailed: (plan, error) => {
      addMessage({ role: 'system', content: `❌ 任务执行失败：${error}`, personaId: activePersonaId });
      clearPlan();
    },
  });

  // Scene awareness tracking
  const { recordAction, recordError } = useSceneAwareness();

  // Multi-agent trigger hook
  const { triggerMultiAgent, parseCommand } = useMultiAgentTrigger();

  // Message context menu state
  const [contextMenu, setContextMenu] = useState<{ open: boolean; anchorEl: HTMLElement | null; msg: Message | null }>({
    open: false,
    anchorEl: null,
    msg: null,
  });

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, msg: Message) => {
    event.preventDefault();
    setContextMenu({ open: true, anchorEl: event.currentTarget, msg });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ open: false, anchorEl: null, msg: null });
  };

  const handleCopyMessage = () => {
    if (contextMenu.msg) {
      navigator.clipboard.writeText(contextMenu.msg.content).catch(() => {});
    }
    handleCloseContextMenu();
  };

  const handleDeleteMessage = () => {
    if (contextMenu.msg) {
      const msgs = useStore.getState().messages;
      useStore.getState().setMessages(msgs.filter(m => m.id !== contextMenu.msg!.id));
    }
    handleCloseContextMenu();
  };

  // Collab message context menu handler
  const handleCollabContextMenu = (event: React.MouseEvent<HTMLElement>, content: string, isUser: boolean) => {
    event.preventDefault();
    // Create a fake msg-like object for the menu
    const fakeMsg = { id: '', role: isUser ? 'user' : 'assistant', content, personaId: '' } as Message;
    setContextMenu({ open: true, anchorEl: event.currentTarget, msg: fakeMsg });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceUnsubscribeRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize model registry when models change
  useEffect(() => {
    initModelRegistry(models);
  }, [models]);

  // Voice service initialization and subscription
  useEffect(() => {
    const support = voiceService.isSupported();
    setTtsSupported(support.tts);
    setTtsEnabled(voiceSettings.ttsEnabled);

    const unsubscribe = voiceService.subscribe((event) => {
      if (event.type === 'stateChange' && event.state) {
        setIsListening(event.state.isListening);
        setIsSpeaking(event.state.isSpeaking);
      }
      if (event.type === 'transcription' && event.transcription) {
        setInput((prev) => {
          return prev ? `${prev} ${event.transcription}` : event.transcription || prev;
        });
        const result = detectEmotion(event.transcription, 2000);
        setCurrentEmotion(result.emotion);
        addEmotionEntry(result.emotion, result.confidence);
      }
    });

    voiceUnsubscribeRef.current = unsubscribe;
    return () => { unsubscribe(); };
  }, [voiceSettings.ttsEnabled]);

  useEffect(() => {
    setTtsEnabled(voiceSettings.ttsEnabled);
  }, [voiceSettings.ttsEnabled]);

  const defaultModel = getDefaultModel();
  const displayModel = defaultModel ? `${defaultModel.name} (${defaultModel.provider})` : `${aiConfig.model} · ${aiConfig.provider}`;

  const scrollToBottom = () => {
    // Use auto behavior on mobile for better performance, smooth on desktop
    const isMobile = window.innerWidth <= 768;
    messagesEndRef.current?.scrollIntoView({ behavior: isMobile ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, collabMessages, isAIThinking]);

  // Prepend @mention when chatInputMention is set (from MemoPanel reply)
  useEffect(() => {
    if (chatInputMention) {
      setInput(prev => chatInputMention + prev);
      setChatInputMention(null);
    }
  }, [chatInputMention, setChatInputMention]);

  // Clear memo notification when switching away
  useEffect(() => {
    if (memoNotification) {
      setMemoNotification(null);
    }
  }, [activePersonaId]);

  // Recommendation panel - refresh when messages change
  useEffect(() => {
    const recs = recommendationEngine.getActiveRecommendations(3);
    setRecommendations(recs);
  }, [messages]);

  const handleVoiceToggle = () => {
    if (isListening) {
      voiceService.stopListening();
    } else {
      if (voiceSettings.sttEnabled) {
        voiceService.startListening();
      }
    }
  };

  // V58: Handle transcript from SpeechButton, update input
  const handleSpeechTranscript = (transcript: string) => {
    setInput(transcript);
  };

  const handleTtsToggle = () => {
    const newTtsEnabled = !ttsEnabled;
    setTtsEnabled(newTtsEnabled);
    useStore.getState().setVoiceSettings({ ttsEnabled: newTtsEnabled });
  };

  // V58: Speak a specific message content via TTS
  const handleMessageSpeak = (content: string) => {
    voiceService.cancel();
    voiceService.speak(content);
  };

  // ---- Goal Confirmation Dialog handlers ----
  const handleOpenGoalConfirm = (agentTask: AgentTask, goal: string) => {
    setPendingAgentTask(agentTask);
    setPendingGoal(goal);
    setGoalConfirmDialogOpen(true);
  };

  const handleConfirmGoalTasks = (tasks: import('../../types').Task[]) => {
    // Add tasks to the store
    const addTask = useStore.getState().addTask;
    tasks.forEach(task => addTask(task));
    
    // Also add agent task to agent task store if available
    if (pendingAgentTask) {
      try {
        const agentTaskStore = useStore.getState().tasks;
        // Just add the agent task as-is for tracking
        // (agent tasks have different structure from user tasks)
      } catch (e) {
        console.warn('[ChatPanel] Could not add to agent task store:', e);
      }
    }
    
    console.log('[ChatPanel] Added', tasks.length, 'tasks to Tasks panel');
  };

  const handleInterrupt = () => {
    voiceService.interrupt();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAIThinking(false);
    setPetStatus({ state: 'idle' });
    // V58: Stop any per-message TTS playback
    stop();
    setPlayingMessageId(null);
  };

  // V58: Per-message TTS playback
  const handlePlayMessage = async (msgId: string, content: string) => {
    if (playingMessageId === msgId) {
      // Stop if already playing this message
      stop();
      setPlayingMessageId(null);
    } else {
      // Stop any other playback and start this one
      stop();
      setPlayingMessageId(msgId);
      try {
        await speak(content);
      } catch (err) {
        console.warn('[ChatPanel] TTS error:', err);
      } finally {
        setPlayingMessageId(null);
      }
    }
  };

  const speakChunkImmediate = (text: string) => {
    if (ttsEnabled && ttsSupported) {
      try {
        voiceService.speakChunk(text);
      } catch (err) {
        console.warn('[Voice] TTS chunk error:', err);
      }
    }
  };

  // ---- Collab helpers ----
  const getPersonaColor = (personaId: string): string => {
    const personas = getAllPersonas();
    const p = personas.find(p => p.id === personaId);
    return p?.theme?.primaryColor || '#9B7FD4';
  };

  const getPersonaAvatar = (personaId: string): string => {
    const personas = getAllPersonas();
    const p = personas.find(p => p.id === personaId);
    return p?.avatar || '❓';
  };

  const getPersonaName = (personaId: string): string => {
    const personas = getAllPersonas();
    const p = personas.find(p => p.id === personaId);
    return p?.name || personaId;
  };

  // Parse AI multi-persona response into separate messages
  const parseCollabAIResponse = (response: string, participants: string[]): Array<{ personaId: string; content: string }> => {
    const results: Array<{ personaId: string; content: string }> = [];
    const participantNames = participants.map(p => getPersonaName(p));

    // Pattern: [Name]: content or [Name] content
    // Try each participant's name as anchor
    for (const pid of participants) {
      const name = getPersonaName(pid);
      const patterns = [
        new RegExp(`\\[${name}\\]:?\\s*([\\s\\S]*?)(?=\\n\\[|$)`, 'i'),
        new RegExp(`^${name}:\\s*([\\s\\S]*?)$`, 'im'),
      ];

      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match && match[1]?.trim()) {
          results.push({ personaId: pid, content: match[1].trim() });
          break;
        }
      }
    }

    // Fallback: if no participant patterns matched, split by double newlines and distribute
    if (results.length === 0) {
      const paragraphs = response.split(/\n\n+/).filter(p => p.trim());
      if (paragraphs.length >= participants.length) {
        paragraphs.slice(0, participants.length).forEach((content, i) => {
          results.push({ personaId: participants[i], content: content.trim() });
        });
      } else if (paragraphs.length > 0) {
        // One paragraph per participant in round-robin
        paragraphs.forEach((content, i) => {
          results.push({ personaId: participants[i % participants.length], content: content.trim() });
        });
      } else {
        // No parse possible — treat as single message from first participant
        results.push({ personaId: participants[0], content: response.trim() });
      }
    }

    return results;
  };

  // ---- Collab mode send ----
  const handleCollabSend = async () => {
    if (!input.trim() || isAIThinking) return;

    const userMsg = input.trim();
    setInput('');

    // Add user message to collab messages
    addCollabMessage({ personaId: 'user', content: userMsg });
    updateLastActivity();

    // Create AbortController
    abortControllerRef.current = voiceService.createAbortController();
    const abortSignal = abortControllerRef.current.signal;

    setPetStatus({ state: 'thinking', message: undefined });
    let errorOccurred = false;

    try {
      setAIThinking(true);

      const participants = collabSession.participants;
      const personas = getAllPersonas();

      // Build combined system prompt from all participants
      const combinedPrompts = participants.map(pid => {
        const persona = personas.find(p => p.id === pid);
        const prompt = persona ? getPersonaSystemPrompt(persona) : '';
        return `[${getPersonaName(pid)}]\n${prompt}`;
      }).join('\n\n---\n\n');

      const participantNames = participants.map(p => getPersonaName(p)).join('、');
      const collabContext = `你正在参与一个多人协作讨论。参与者：${participantNames}。请以各参与者的身份轮流发表观点。\n格式要求：每个参与者的发言必须以 "[姓名]:" 开头，例如：[朋友]: 我觉得这个想法很棒！`;

      const systemPrompt = `${combinedPrompts}\n\n${collabContext}`;

      // Build conversation for API
      const collabHistoryText = collabMessages.map(m => {
        if (m.personaId === 'user') {
          return `[用户]: ${m.content}`;
        }
        return `[${getPersonaName(m.personaId)}]: ${m.content}`;
      }).join('\n');

      const apiMessages: Message[] = [
        { id: 'sys', role: 'system', content: systemPrompt, timestamp: Date.now() },
        { id: 'hist', role: 'system', content: `[讨论历史]\n${collabHistoryText}`, timestamp: Date.now() },
        { id: 'temp', role: 'user', content: `用户说了：${userMsg}\n请依次以[${participantNames}]的身份各自发表看法，用[姓名]:格式。`, timestamp: Date.now() },
      ];

      const result = await chatCompletion(apiMessages, null);

      const aiResponse = result || '';

      // Parse AI response into per-persona messages
      const parsed = parseCollabAIResponse(aiResponse, participants);

      for (const { personaId, content } of parsed) {
        addCollabMessage({ personaId, content });
      }

      // TTS: speak first response
      if (ttsEnabled && ttsSupported && parsed.length > 0) {
        const firstContent = parsed[0].content;
        const sentences = firstContent.match(/[^.!?。！？]+[.!?。！？]*/g) || [firstContent];
        for (const sentence of sentences) {
          if (abortSignal.aborted) break;
          const trimmed = sentence.trim();
          if (trimmed) {
            speakChunkImmediate(trimmed);
          }
        }
      }
    } catch (err) {
      errorOccurred = true;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addCollabMessage({ personaId: 'system', content: `${t('chat.errorPrefix')}: ${errorMsg}` });
    } finally {
      setAIThinking(false);
      updateLastActivity();
      if (!errorOccurred) {
        setPetStatus({ state: 'idle' });
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isAIThinking) return;

    // Extract user preference before sending
    preferenceEngine.extractFromInteraction({
      id: Date.now().toString(),
      type: 'message',
      content: input,
      timestamp: Date.now(),
    });

    // Multi-agent command parsing
    const { mode, message: processedMsg } = parseCommand(input);

    if (mode === 'multi') {
      triggerMultiAgent(processedMsg);
      console.log('[ChatPanel] Multi-agent triggered for:', processedMsg);
      return;
    }

    recordAction('send_message');
    const userMsg = processedMsg;

    // ---- COLLAB MODE ----
    if (collabSession.active) {
      await handleCollabSend();
      return;
    }

    // --- Clear commands (local, no AI) ---
    const parsed = parsePersonaCommand(userMsg);
    if (parsed && (parsed.type === 'clear' || parsed.type === 'new')) {
      clearMessages();
      endCollab(); // also clear collab state to prevent orphaned messages
      addMessage({ role: 'system', content: '已开启新对话', personaId: activePersonaId });
      return;
    }

    // ---- NORMAL MODE ----
    setInput('');

    // Add user message
    addMessage({ role: 'user', content: userMsg, personaId: activePersonaId });
    
    // Auto-tag important messages (V32)
    checkAndTagImportantMessage(userMsg, activePersonaId).catch(() => {});
    updateLastActivity();

    // Intimacy: increment by 0.5 on user message (capped at 100)
    const currentIntimacy = personaIntimacy[activePersonaId] || 0;
    const newIntimacy = Math.min(100, currentIntimacy + 0.5);
    setPersonaIntimacy(activePersonaId, newIntimacy);
    // V35: Check for milestone on intimacy change
    checkAndCreateMilestones(activePersonaId).catch(() => {});
    localStorage.setItem(`persona_lastActive_${activePersonaId}`, String(Date.now()));

    adjustMoodForInteraction('chat');

    // --- Persona Command Interception ---
    if (parsed) {
      if (parsed.type === 'help') {
        const helpText = `可用命令：
/friend 或 /朋友 - 切换到朋友人格
/teacher 或 /老师 - 切换到老师人格
/coach 或 /教练 - 切换到教练人格
/lover 或 /恋人 - 切换到恋人人格
@名字 - 切换到指定人格
/list 或 /列表 - 查看所有人格
/collab [名字1] [名字2] - 启动多人协作
/endcollab 或 /end - 结束协作
/savecollab [名称] - 保存当前协作配置
/loadcollab [名称] - 加载协作配置
/listcollab - 查看已保存的协作配置
/help 或 /帮助 - 显示此帮助`;
        addMessage({ role: 'system', content: helpText, personaId: activePersonaId });
        return;
      }
      if (parsed.type === 'list') {
        const personas = getAllPersonas();
        const listText = '当前人格：\n' + personas.map(p => `${p.avatar} ${p.name}`).join('\n');
        addMessage({ role: 'system', content: listText, personaId: activePersonaId });
        return;
      }
      // Collab commands in normal mode
      if (parsed.type === 'collab') {
        const personas = getAllPersonas();
        if (parsed.presetName) {
          // Try loading as preset first
          const preset = loadCollabPreset(parsed.presetName);
          if (preset) {
            startCollab(preset);
            // V35: Trigger milestone check for each participant
            preset.forEach(pid => checkAndCreateMilestones(pid).catch(() => {}));
            const names = preset.map(pid => getPersonaName(pid)).join(' + ');
            addMessage({ role: 'system', content: `协作模式已启动：${names}`, personaId: activePersonaId });
          } else {
            // Try fuzzy matching as persona name
            const matched = fuzzyMatchPersonas(personas, [parsed.presetName!]);
            if (matched.length > 0) {
              startCollab(matched);
              // V35: Trigger milestone check for each matched participant
              matched.forEach(pid => checkAndCreateMilestones(pid).catch(() => {}));
              const names = matched.map(pid => getPersonaName(pid)).join(' + ');
              addMessage({ role: 'system', content: `协作模式已启动：${names}`, personaId: activePersonaId });
            } else {
              addMessage({ role: 'system', content: `未找到 "${parsed.presetName}" 对应的协作配置或人格`, personaId: activePersonaId });
            }
          }
        } else if (parsed.collabNames && parsed.collabNames.length >= 2) {
          const matched = fuzzyMatchPersonas(personas, parsed.collabNames);
          if (matched.length >= 2) {
            const participants = matched.slice(0, 4);
            startCollab(participants);
            // V35: Trigger milestone check for each participant
            participants.forEach(pid => checkAndCreateMilestones(pid).catch(() => {}));
            const names = participants.map(pid => getPersonaName(pid)).join(' + ');
            addMessage({ role: 'system', content: `协作模式已启动：${names}`, personaId: activePersonaId });
          } else {
            addMessage({ role: 'system', content: `需要至少2个人格来启动协作，当前匹配到 ${matched.length} 个人格`, personaId: activePersonaId });
          }
        } else {
          addMessage({ role: 'system', content: `用法：/collab [名字1] [名字2] 或 /collab [preset-name]\n例如：/collab 朋友 老师\n例如：/collab 我的团队`, personaId: activePersonaId });
        }
        return;
      }
      if (parsed.type === 'endcollab') {
        if (collabSession.active) {
          // Generate summary
          const summaryPrompt = `请总结以下多人协作讨论的要点：\n${collabMessages.map(m => `[${m.personaId === 'user' ? '用户' : getPersonaName(m.personaId)}]: ${m.content}`).join('\n')}`;
          let summary = '';
          try {
            const result = await chatCompletion([{ id: 's', role: 'user', content: summaryPrompt, timestamp: Date.now() }], null);
            summary = result || '';
          } catch (e) {
            summary = '(无法生成摘要)';
          }
          endCollab();
          addMessage({ role: 'system', content: `协作已结束。\n摘要：${summary}`, personaId: activePersonaId });
        } else {
          addMessage({ role: 'system', content: '当前没有进行中的协作', personaId: activePersonaId });
        }
        return;
      }
      if (parsed.type === 'savecollab') {
        if (collabSession.active) {
          if (parsed.presetName) {
            saveCollabPreset(parsed.presetName, collabSession.participants);
            addMessage({ role: 'system', content: `协作配置 "${parsed.presetName}" 已保存`, personaId: activePersonaId });
          } else {
            addMessage({ role: 'system', content: '请提供保存名称：/savecollab [名称]', personaId: activePersonaId });
          }
        } else {
          addMessage({ role: 'system', content: '当前没有进行中的协作', personaId: activePersonaId });
        }
        return;
      }
      if (parsed.type === 'loadcollab') {
        if (parsed.presetName) {
          const preset = loadCollabPreset(parsed.presetName);
          if (preset) {
            startCollab(preset);
            // V35: Trigger milestone check for each participant
            preset.forEach(pid => checkAndCreateMilestones(pid).catch(() => {}));
            const names = preset.map(pid => getPersonaName(pid)).join(' + ');
            addMessage({ role: 'system', content: `协作配置 "${parsed.presetName}" 已加载：${names}`, personaId: activePersonaId });
          } else {
            addMessage({ role: 'system', content: `未找到名为 "${parsed.presetName}" 的协作配置`, personaId: activePersonaId });
          }
        } else {
          const names = Object.keys(collabPresets);
          if (names.length > 0) {
            addMessage({ role: 'system', content: `已保存的协作配置：\n${names.join('\n')}`, personaId: activePersonaId });
          } else {
            addMessage({ role: 'system', content: '暂无保存的协作配置', personaId: activePersonaId });
          }
        }
        return;
      }
      if (parsed.type === 'listcollab') {
        const names = Object.keys(collabPresets);
        if (names.length > 0) {
          addMessage({ role: 'system', content: `已保存的协作配置：\n${names.join('\n')}`, personaId: activePersonaId });
        } else {
          addMessage({ role: 'system', content: '暂无保存的协作配置', personaId: activePersonaId });
        }
        return;
      }
      if (parsed.type === 'switch') {
        let targetPersonaId: string | null = parsed.personaId || null;
        if (!targetPersonaId && parsed.rawCommand) {
          const personas = getAllPersonas();
          targetPersonaId = fuzzyMatchPersona(personas, parsed.rawCommand);
        }
        if (targetPersonaId) {
          setActivePersonaId(targetPersonaId);
          const personas = getAllPersonas();
          const persona = personas.find(p => p.id === targetPersonaId);
          const switchText = persona ? `已切换到 ${persona.name} ${persona.avatar}` : `已切换到人格 ${targetPersonaId}`;
          addMessage({ role: 'system', content: switchText, personaId: activePersonaId });
        } else {
          addMessage({ role: 'system', content: `未找到匹配的人格 "${parsed.rawCommand || ''}"，请尝试 /list 查看所有人格`, personaId: activePersonaId });
        }
        return;
      }
    }

    // /reset command — reset intimacy for current or named persona
    const resetMatch = userMsg.match(/^\/reset(?:\s+(.+))?$/i);
    if (resetMatch) {
      const targetName = resetMatch[1]?.trim();
      if (targetName) {
        const personas = getAllPersonas();
        const matched = personas.find(p => p.name.toLowerCase().includes(targetName.toLowerCase()));
        if (matched) {
          setPersonaIntimacy(matched.id, 20);
          addMessage({ role: 'system', content: `已重置 ${matched.name} 的亲密度为 20（陌生人）`, personaId: activePersonaId });
        } else {
          addMessage({ role: 'system', content: `未找到名为 "${targetName}" 的人格`, personaId: activePersonaId });
        }
      } else {
        setPersonaIntimacy(activePersonaId, 20);
        addMessage({ role: 'system', content: `已重置当前人格的亲密度为 20（陌生人）`, personaId: activePersonaId });
      }
      return;
    }

    // Text-based emotion detection
    let detectedEmotion: string = 'unknown';
    let emotionEntry: { emotion: string; intensity: number } | null = null;
    try {
      const { createEmotionLogEntry, addEmotionLog, emotionResponseEngine } = await import('../../services/emotion');
      emotionEntry = createEmotionLogEntry(userMsg);
      addEmotionLog(emotionEntry);
      detectedEmotion = emotionEntry.emotion;
      console.log('[Emotion] Text emotion detected:', emotionEntry.emotion, 'intensity:', emotionEntry.intensity);

      // V21 Emotion Response: Check if AI should respond with emotion-aware message
      if (emotionResponseEngine.shouldRespond(emotionEntry.emotion, { messageCount: emotionEntry.intensity })) {
        const responseStyle = emotionResponseEngine.getResponseStyle(emotionEntry.emotion);
        const behaviorGuidance = emotionResponseEngine.getBehaviorGuidance(emotionEntry.emotion);
        console.log('[EmotionResponse] Triggering emotion-aware response:', behaviorGuidance);
        // Emotion response guidance is injected via emotionContext in the API call below
      }
    } catch (err) {
      console.warn('[Emotion] Text emotion detection failed:', err);
    }

    // Keyword trigger
    const { loaded: scenesLoaded, loadScenes } = useSceneStore.getState();
    if (!scenesLoaded) {
      await loadScenes();
      initSceneScheduler();
    }
    const matchedScenes = checkKeywordTrigger(userMsg);
    for (const scene of matchedScenes) {
      executeScene(scene);
    }

    // ---- CHAIN TRIGGER ----
    const allChains = await getAllChains();
    const matchedChain = matchChainTrigger(userMsg, allChains.filter(c => c.enabled));
    if (matchedChain) {
      console.log('[ChainChat] Chain triggered:', matchedChain.name);
      addMessage({ role: 'system', content: `🔗 Chain "${matchedChain.name}" 已被触发...`, personaId: activePersonaId });

      const chainResult = await executeChain(matchedChain, {
        triggerMessage: userMsg,
        recentMessages: messages,
        personaId: activePersonaId,
        metadata: {},
        parsedParams: {},
      });

      if (chainResult.success) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: chainResult.response,
          timestamp: Date.now(),
          personaId: activePersonaId,
        });
        if (chainResult.steps && chainResult.steps.length > 0) {
          const stepsText = chainResult.steps.map((s, i) => `Step ${i + 1}: ${s.description}\n→ ${s.result}`).join('\n\n');
          addMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content: `[${matchedChain.name} Steps]\n${stepsText}`,
            timestamp: Date.now(),
            personaId: activePersonaId,
          });
        }
      } else {
        addMessage({
          id: crypto.randomUUID(),
          role: 'system',
          content: `⚠️ Chain 执行失败: ${chainResult.error || chainResult.response}`,
          timestamp: Date.now(),
          personaId: activePersonaId,
        });
      }
      return;
    }

    // ---- DSL TRIGGER ----
    if (userMsg.startsWith('#dsl:')) {
      const dsl = userMsg.slice(4).trim();
      addMessage({ role: 'system', content: `⚡ DSL 执行中...`, personaId: activePersonaId });
      const result = await runDSL(dsl, { triggerMessage: userMsg, personaId: activePersonaId });
      if (result) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.success ? String(result.output || '执行完成') : `DSL 执行失败: ${result.error}`,
          timestamp: Date.now(),
          personaId: activePersonaId,
        });
      } else {
        addMessage({ role: 'system', content: `⚠️ DSL 编译或执行失败`, personaId: activePersonaId });
      }
      return;
    }

    // ---- SKILL CHAT TRIGGER ----
    const matchedSkill = skillRunner.matchChatSkill(userMsg);
    if (matchedSkill) {
      console.log('[SkillChat] Skill triggered:', matchedSkill.name);
      addMessage({ role: 'system', content: `🔮 技能 "${matchedSkill.name}" 已被触发...`, personaId: activePersonaId });

      const result = await skillRunner.runSkillFromChat(
        matchedSkill.id,
        userMsg,
        messages,
        activePersonaId,
        undefined
      );

      if (result.success) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
          personaId: activePersonaId,
        });
        if (result.steps && result.steps.length > 0) {
          const stepsText = result.steps.map((s, i) => `Step ${i + 1}: ${s.description}\n→ ${s.result}`).join('\n\n');
          addMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content: `[${matchedSkill.name} Steps]\n${stepsText}`,
            timestamp: Date.now(),
            personaId: activePersonaId,
          });
        }
      } else {
        addMessage({
          id: crypto.randomUUID(),
          role: 'system',
          content: `⚠️ 技能执行失败: ${result.error || result.response}`,
          timestamp: Date.now(),
          personaId: activePersonaId,
        });
      }
      return;
    }

    // ---- AGENT MODE: Goal-oriented task detection ----
    if (isGoalOriented(userMsg)) {
      console.log('[AgentChat] Goal-oriented intent detected:', userMsg);
      
      try {
        // Create task from the goal
        const agentTask: AgentTask = await createTaskFromGoal(userMsg, { personaId: activePersonaId });
        
        // Determine if planning mode should be used
        const shouldUsePlanning = shouldUsePlanningMode(userMsg) || agentTask.steps.length > 3;
        
        // Check if this is a long task that should use planning mode
        if (shouldUsePlanning) {
          console.log('[AgentChat] Using planning mode for task with', agentTask.steps.length, 'steps');
          
          // Add a system message showing agent is activated
          addMessage({ role: 'system', content: `🎯 检测到复杂任务，正在生成执行方案...`, personaId: activePersonaId });
          
          // Create plan from task steps
          const planSteps = agentTask.steps.map((step, index) => ({
            description: step.description,
            toolName: step.toolName,
            arguments: step.toolArgs || {},
            riskLevel: 'low' as const,
            order: index,
          }));
          
          // Create plan in planStore
          const plan = createPlanFromTask(userMsg, planSteps, ['任务复杂度较高，请仔细确认每个步骤']);
          setCurrentPlan(plan);
          setPlanStatus('awaiting_confirmation');
          
          // Continue to normal chat mode - PlanView will be shown
          updateLastActivity();
          return;
        } else {
          // Short task - show simple confirmation and execute directly
          addMessage({ role: 'system', content: `🎯 检测到任务目标，正在规划...`, personaId: activePersonaId });
          
          // Add planning message showing the task steps
          addMessage({ role: 'system', content: `📋 任务规划完成：${agentTask.steps.length} 个步骤\n${agentTask.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}`, personaId: activePersonaId });

          // Open confirmation dialog
          handleOpenGoalConfirm(agentTask, userMsg);

          updateLastActivity();
          return;
        }
      } catch (err) {
        // Fallback to normal chat if task creation fails
        console.warn('[AgentChat] Task creation failed, falling back to normal chat:', err);
        addMessage({ role: 'system', content: `⚠️ 任务规划失败，将使用普通模式继续...`, personaId: activePersonaId });
        // Continue to normal chat mode below
      }
    }

    // Create AbortController
    abortControllerRef.current = voiceService.createAbortController();
    const abortSignal = abortControllerRef.current.signal;

    setPetStatus({ state: 'thinking', message: undefined });
    setAIThinkingContent(null);
    setShowThinkingContent(false);

    let aiContent = '';
    let thinkingContent: string | null = null;
    let errorOccurred = false;

    try {
      setAIThinking(true);

      const apiMessages: Message[] = [
        ...messages,
        { id: 'temp', role: 'user', content: userMsg, timestamp: Date.now() },
      ];

      const emotionState = useStore.getState().currentEmotion;
      const emotionContext = detectedEmotion !== 'unknown' ? detectedEmotion : (emotionState !== 'unknown' ? emotionState : undefined);

      const currentIntimacy2 = personaIntimacy[activePersonaId] || 0;
      const intimacyLevel = getIntimacyLevel(currentIntimacy2);
      const intimacyPrompt = intimacyLevel ? `\n[当前关系：${intimacyLevel} — ${{
        '陌生人': '初次见面，保持礼貌距离',
        '熟人': '有些了解，但还不够熟悉',
        '朋友': '已经认识，可以畅所欲言',
        '挚友': '非常亲密，无话不谈',
        '灵魂伴侣': '心意相通，最深层的理解',
      }[intimacyLevel] || ''}]` : '';

      const messagesWithContext = await injectCompanionContext(apiMessages, { emotionContext, personaSystemPrompt: personaSystemPrompt + intimacyPrompt });

      // RAG Enhancement (V82: Knowledge Base RAG)
      let ragContext = '';
      try {
        // 1. Existing document RAG
        const docs = useStore.getState().documents;
        if (docs.length > 0) {
          const needsReindex = docs.some(doc => !isDocumentIndexed(doc.id));
          if (needsReindex) {
            reindexAllDocuments(docs);
          }
          const ragResults = queryKnowledgeBase({ query: userMsg, topK: 3, minScore: 0.5 });
          if (ragResults.chunks.length > 0) {
            ragContext += buildRAGContext(ragResults, 1000);
          }
        }
        
        // 2. New Knowledge Base RAG (V82)
        try {
          const knowledgeResults = await retrieveFromKnowledge(userMsg, 3);
          if (knowledgeResults.length > 0) {
            const knowledgeContext = await buildKnowledgeRAGContext(userMsg, messages.map(m => ({ role: m.role, content: m.content })));
            if (knowledgeContext) {
              if (ragContext) ragContext += '\n\n';
              ragContext += knowledgeContext;
            }
          }
        } catch (kbErr) {
          console.warn('[KnowledgeBase] RAG query failed:', kbErr);
        }
      } catch (ragErr) {
        console.warn('[RAG] Knowledge base query failed:', ragErr);
      }

      let finalMessages = messagesWithContext;
      if (ragContext) {
        const ragSystemMessage: Message = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `\n[KNOWLEDGE BASE - Answer using this information when relevant]\n${ragContext}\n[/KNOWLEDGE BASE]`,
          timestamp: Date.now(),
        };
        finalMessages = [messagesWithContext[0], ragSystemMessage, ...messagesWithContext.slice(1)];
      }

      const pluginTools = PluginService.getAITools();
      const openAITools = pluginTools.map(t => ({
        type: 'function' as const,
        function: {
          name: `${t.pluginId}:${t.toolName}`,
          description: `${t.pluginName} - ${t.toolName}`,
          parameters: { type: 'object' as const, properties: {} },
        },
      }));

      // V60: Try plugin action first (keyword-triggered, no AI needed)
      const match = pluginRegistry.matchAction(userMsg);
      if (match !== null) {
        const pluginResult = await pluginRegistry.executeAction(match.pluginId, match.actionId, match.params).catch(() => null);
        if (pluginResult !== null) {
          const toolResultMessage: Message = {
            id: crypto.randomUUID(),
            role: 'system',
            content: `用户查询了插件结果：${pluginResult}`,
            timestamp: Date.now(),
          };
          currentMessages.push(toolResultMessage);

          // Re-generate AI response with plugin result context
          const resultWithContext = await chatCompletionWithTools(currentMessages, undefined);
          if (resultWithContext.success) {
            aiContent = resultWithContext.content;
            toolCalls = [];
          } else {
            aiContent = pluginResult;
          }
        } else {
          // Fallback to normal chat
          const result = await chatCompletionWithTools(currentMessages, openAITools.length > 0 ? openAITools : undefined);
          if (!result.success) throw new Error(result.error || 'AI request failed');
          aiContent = result.content;
          toolCalls = result.toolCalls || [];
        }
      } else {

        const result = await chatCompletionWithTools(currentMessages, openAITools.length > 0 ? openAITools : undefined);

        if (!result.success) {
          throw new Error(result.error || 'AI request failed');
        }

        aiContent = result.content;
        toolCalls = result.toolCalls;

        while (toolCalls && toolCalls.length > 0) {
          addMessage({ role: 'assistant', content: `🧩 正在调用 ${toolCalls.length} 个工具...`, personaId: activePersonaId });

          for (const tc of toolCalls) {
            try {
              const [pluginId, toolName] = tc.name.split(':');
              const args = JSON.parse(tc.arguments);
              const toolResult = await PluginService.callTool(pluginId, toolName, args);

              currentMessages.push({
                id: crypto.randomUUID(),
                role: 'tool',
                content: JSON.stringify(toolResult),
                timestamp: Date.now(),
                toolCallId: tc.id,
              });
            } catch (toolErr) {
              currentMessages.push({
                id: crypto.randomUUID(),
                role: 'tool',
                content: JSON.stringify({ error: toolErr instanceof Error ? toolErr.message : 'Tool execution failed' }),
                timestamp: Date.now(),
                toolCallId: tc.id,
              });
            }
          }

          const followUpResult = await chatCompletionWithTools(currentMessages, openAITools.length > 0 ? openAITools : undefined);

          if (!followUpResult.success) {
            throw new Error(followUpResult.error || 'AI follow-up request failed');
          }

          finalContent = followUpResult.content;
          toolCalls = followUpResult.toolCalls;

          if (!toolCalls || toolCalls.length === 0) {
            aiContent = finalContent;
          }
        }

        if (!aiContent) {
          aiContent = finalContent;
        }

        const thinkingMatch = aiContent.match(/<(?:think(?:ing)?|thought)>([\s\S]*?)<\/(?:think(?:ing)?|thought)>/i)
          || aiContent.match(/【思考】([\s\S]*?)【\/思考】/)
          || aiContent.match(/\[(?:思考|thinking|reasoning)\]([\s\S]*?)\[\/(?:思考|thinking|reasoning)\]/i);

        if (thinkingMatch) {
          thinkingContent = thinkingMatch[1].trim();
          aiContent = aiContent.replace(thinkingMatch[0], '').trim();
          setAIThinkingContent(thinkingContent);
        } else {
          setAIThinkingContent(null);
        }

        addMessage({ role: 'assistant', content: aiContent, personaId: activePersonaId });

        if (ttsEnabled && ttsSupported && aiContent) {
          const sentences = aiContent.match(/[^.!?。！？]+[.!?。！？]*/g) || [aiContent];
          for (const sentence of sentences) {
            if (abortSignal.aborted) break;
            const trimmed = sentence.trim();
            if (trimmed) {
              speakChunkImmediate(trimmed);
            }
          }
        }

        const companionState = useStore.getState().companion;
        if (companionState.autoSummarize && messagesWithContext.length > 10) {
          autoSummarizeChat(messagesWithContext).catch(() => {});
        }

        // V61: Evaluate trigger rules after message exchange
        try {
          const rules = await getRules();
          const emotionState = useStore.getState().currentEmotion;
          const context = {
            lastActiveDays: 0, // TODO: calculate from persona.lastActive
            messageCount: messagesWithContext.length,
            currentHour: new Date().getHours(),
            currentEmotion: emotionContext,
            emotionIntensity: emotionEntry?.intensity,
          };

          for (const rule of rules) {
            if (evaluateRule(rule, context)) {
              // Execute action
              if (rule.action === 'evolve') {
                triggerEvolution?.(rule.actionParams.targetLevel);
              } else if (rule.action === 'remind') {
                addMessage({ role: 'system', content: rule.actionParams.message, personaId: activePersonaId });
              }
              // Update lastTriggered
              await updateRule(rule.id, { lastTriggered: Date.now() });
            }
          }
        } catch (e) {
          console.warn('[V61] Rule evaluation failed:', e);
        }
      }
    } catch (err) {
      errorOccurred = true;
      recordError();
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addMessage({ role: 'assistant', content: `${t('chat.errorPrefix')}: ${errorMsg}`, personaId: activePersonaId });
    } finally {
      setAIThinking(false);
      updateLastActivity();
      if (!errorOccurred && aiContent) {
        setPetStatus({ state: 'speaking', message: aiContent.slice(0, 50) + (aiContent.length > 50 ? '...' : '') });
        setTimeout(() => {
          setPetStatus({ state: 'idle' });
        }, 3000);
      } else {
        setPetStatus({ state: 'idle' });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine which messages to show
  const displayMessages = collabSession.active ? collabMessages : filteredMessages;

  return (
    <>
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
              {collabSession.active ? '🤝 协作模式' : `💬 ${t('chat.title')}`}
            </Typography>
            {collabSession.active && (
              <Chip
                size="small"
                label={`${collabSession.participants.length}人`}
                sx={{ height: 18, fontSize: 10 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!collabSession.active && (
              <>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                {displayModel}
              </Typography>
              <Tooltip title={t('agent.createAgent') || '创建Agent'}>
                <IconButton
                  size="small"
                  onClick={() => setAgentBuilderOpen(true)}
                  sx={{ color: 'rgba(139,92,246,0.8)', '&:hover': { color: 'rgba(139,92,246,1)' } }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('skill.title') || 'Skills'}>
                <IconButton
                  size="small"
                  onClick={() => setSkillPanelOpen(true)}
                  sx={{ color: 'rgba(94,106,210,0.8)', '&:hover': { color: 'rgba(94,106,210,1)' } }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              </>
            )}
            {collabSession.active && (
              <Tooltip title="结束协作">
                <IconButton size="small" onClick={() => {
                  if (collabMessages.length > 0) {
                    const summaryPrompt = `请总结以下多人协作讨论的要点：\n${collabMessages.map(m => `[${m.personaId === 'user' ? '用户' : getPersonaName(m.personaId)}]: ${m.content}`).join('\n')}`;
                    chatCompletion([{ id: 's', role: 'user', content: summaryPrompt, timestamp: Date.now() }], null).then(result => {
                      const summary = result || '(无法生成摘要)';
                      endCollab();
                      addMessage({ role: 'system', content: `协作已结束。\n摘要：${summary}`, personaId: activePersonaId });
                    }).catch(() => {
                      endCollab();
                      addMessage({ role: 'system', content: '协作已结束。', personaId: activePersonaId });
                    });
                  } else {
                    endCollab();
                    addMessage({ role: 'system', content: '协作已结束。', personaId: activePersonaId });
                  }
                }} sx={{ p: 0.5 }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Collab participant avatars */}
        {collabSession.active && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {collabSession.participants.map(pid => (
              <Chip
                key={pid}
                size="small"
                avatar={
                  <Avatar sx={{ bgcolor: getPersonaColor(pid), width: 18, height: 18, fontSize: 10 }}>
                    {getPersonaAvatar(pid)}
                  </Avatar>
                }
                label={getPersonaName(pid)}
                sx={{ height: 24, fontSize: 11 }}
              />
            ))}
          </Box>
        )}

        {/* V40: Collaboration status — multi-agent progress (UI layer) */}
        {collabModeActive && (
          <Box sx={{ mt: 1 }}>
            <CollaborationStatus />
          </Box>
        )}

        {/* V40: Complex query suggestion */}
        {showCollabSuggestion && !collabModeActive && !collabSession.active && (
          <Box sx={{
            mx: 2, mt: 1, p: 1, borderRadius: 1.5,
            bgcolor: 'rgba(134,59,255,0.12)',
            border: '1px solid rgba(134,59,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 1,
          }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', flex: 1 }}>
              💡 检测到复杂查询，建议开启 <strong style={{ color: '#863bff' }}>协作模式</strong> 多智能体分析
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                useStore.getState().setCollaborationMode(true);
                setShowCollabSuggestion(false);
              }}
              sx={{ fontSize: 11, py: 0.25, minWidth: 'auto', bgcolor: '#863bff', '&:hover': { bgcolor: '#6b2fe0' } }}
            >
              开启
            </Button>
            <Button
              size="small"
              onClick={() => setShowCollabSuggestion(false)}
              sx={{ fontSize: 11, py: 0.25, minWidth: 'auto', color: 'text.secondary' }}
            >
              忽略
            </Button>
          </Box>
        )}
      </Box>

      {/* Memo Notification Banner */}
      {memoNotification && memoNotification.trim() && (
        <Box
          sx={{
            mx: 2, mt: 1, p: 1, borderRadius: 1,
            bgcolor: 'rgba(94, 106, 210, 0.15)', color: '#f7f8f8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', fontSize: 12,
          }}
          onClick={() => setMemoOpen(true)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 14 }}>📬</Typography>
            <Typography sx={{ fontSize: 12 }}>{memoNotification}</Typography>
          </Box>
          <Button size="small" sx={{ color: '#f7f8f8', minWidth: 'auto', fontSize: 11 }}>查看</Button>
        </Box>
      )}

      {/* Messages */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        p: { xs: 1.5, md: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 0,
        width: '100%',
      }}>
        {displayMessages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {collabSession.active ? '协作模式已启动，输入消息开始讨论' : t('chat.emptyState')}
            </Typography>
          </Box>
        )}

        {displayMessages.map((msg) => {
          // Collab mode rendering
          if (collabSession.active) {
            if (msg.personaId === 'user') {
              return (
                <CollabBubble
                  key={msg.id}
                  personaId="user"
                  personaName="你"
                  avatar="👤"
                  content={msg.content}
                  color="#9B7FD4"
                  isUser
                  onContextMenu={(e) => handleCollabContextMenu(e, msg.content, true)}
                />
              );
            }
            if (msg.personaId === 'system') {
              return (
                <Box key={msg.id} sx={{ textAlign: 'center', my: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>
                    {msg.content}
                  </Typography>
                </Box>
              );
            }
            return (
              <CollabBubble
                key={msg.id}
                personaId={msg.personaId}
                personaName={getPersonaName(msg.personaId)}
                avatar={getPersonaAvatar(msg.personaId)}
                content={msg.content}
                color={getPersonaColor(msg.personaId)}
                onContextMenu={(e) => handleCollabContextMenu(e, msg.content, false)}
              />
            );
          }

          // Normal mode rendering
          return (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: { xs: 1, md: 1.5 },
                alignItems: 'flex-end',
              }}
            >
              <Paper
                onContextMenu={(e) => handleContextMenu(e, msg)}
                className="message-enter"
                sx={{
                  maxWidth: 680,
                  p: 1.5,
                  borderRadius: '16px',
                  bgcolor: msg.role === 'user'
                    ? 'var(--color-chat-user-bg, rgba(94, 106, 210, 0.15))'
                    : 'var(--color-chat-ai-bg, #191a1b)',
                  color: 'var(--color-text-primary, #f7f8f8)',
                  fontSize: { xs: 14, md: 13 },
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
                  boxShadow: 'none',
                  border: msg.role === 'assistant'
                    ? '1px solid var(--color-border, rgba(255, 255, 255, 0.08))'
                    : 'none',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: { xs: 14, md: 13 }, lineHeight: 1.6 }}>
                  {msg.content}
                </Typography>
                {msg.role === 'assistant' && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handlePlayMessage(msg.id, msg.content)}
                      sx={{ p: 0.25, color: playingMessageId === msg.id ? 'primary.main' : 'text.secondary' }}
                    >
                      {playingMessageId === msg.id ? <PauseIcon sx={{ fontSize: 14 }} /> : <VolumeUpIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Box>
                )}
              </Paper>
              {/* TTS button for AI messages */}
              {msg.role === 'assistant' && ttsSupported && (
                <Tooltip title={t('chat.speakMessage') || '朗读'}>
                  <IconButton
                    size="small"
                    onClick={() => handleMessageSpeak(msg.content)}
                    disabled={isSpeaking}
                    sx={{
                      color: 'rgba(255,255,255,0.4)',
                      '&:hover': { color: '#5e6ad2', bgcolor: 'rgba(94, 106, 210, 0.15)' },
                    }}
                  >
                    <VolumeUpIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
        {isAIThinking && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 0.5 }}>
            <Paper
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(30, 20, 55, 0.95)',
                color: 'white',
                border: '1px solid rgba(155, 127, 212, 0.2)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 16,
                width: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  {collabSession.active ? '🤔 讨论中...' : t('chat.thinking')}
                </Typography>
                <TypingIndicator />
              </Box>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Recommendation Panel */}
      {recommendations.length > 0 && (
        <RecommendationPanel onExecute={(action: string) => {
          if (action.startsWith('/multi')) {
            // Trigger multi-agent
            triggerMultiAgent(action.replace('/multi ', ''));
          } else if (action === 'enable_memory') {
            // Enable memory
            console.log('[ChatPanel] Memory enabled');
          } else {
            // Other action sent as message
            handleSend(action);
          }
        }} />
      )}

      <Divider />

      {/* Input */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          flexShrink: 0,
          position: { xs: 'sticky', md: 'relative' },
          bottom: { xs: 0, md: 'auto' },
          zIndex: { xs: 10, md: 0 },
          bgcolor: { xs: '#0f1011', md: 'transparent' },
          borderTop: { xs: '1px solid rgba(255,255,255,0.05)', md: 'none' },
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder={collabSession.active ? '输入消息参与讨论...' : t('chat.placeholder')}
          value={input}
          onChange={(e) => {
            const val = e.target.value;
            setInput(val);
            // V40: Show collaboration suggestion for complex queries
            if (!collabModeActive && !collabSession.active && val.length > 30) {
              const hasMultipleTopics = /而且|还有|另外|同时|但是|不过/.test(val);
              const hasMultiplePronouns = (val.match(/我|你|他|她|它/g) || []).length >= 3;
              const hasAnalysisRequest = /分析|比较|规划|建议|思考|看看|研究/.test(val);
              if (hasMultipleTopics || hasMultiplePronouns || hasAnalysisRequest) {
                setShowCollabSuggestion(true);
              }
            } else if (val.length < 20) {
              setShowCollabSuggestion(false);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={isAIThinking}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: 13,
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
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
            '& fieldset': { borderColor: 'transparent' },
            '&:hover fieldset': { borderColor: 'transparent' },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
          }}
        />

        {/* Voice Input Button (Mic) - V63: Now uses SpeechButton for emotion detection */}
        <SpeechButton
          onTranscriptChange={handleSpeechTranscript}
          onEmotionDetected={(result) => {
            // V63: Update emotion state when speech is detected
            setCurrentEmotion(result.emotion);
            addEmotionEntry(result.emotion, result.confidence);
            // V65: Also write voice emotion to EmotionCurve localStorage
            addVoiceEmotionLog(result.emotion, result.confidence * 100, `语音:${result.transcript.slice(0, 30)}`);
          }}
          disabled={!voiceSettings.sttEnabled || isAIThinking}
          size="small"
        />

        {/* TTS Toggle Button */}
        {ttsSupported && (
          <Tooltip title={ttsEnabled ? t('chat.disableVoiceOutput') : t('chat.enableVoiceOutput')}>
            <span>
              <IconButton
                color={ttsEnabled ? 'primary' : 'default'}
                onClick={handleTtsToggle}
                size="small"
                sx={{
                  alignSelf: 'flex-end',
                  flexShrink: 0,
                  bgcolor: ttsEnabled ? 'rgba(155, 127, 212, 0.15)' : 'transparent',
                  '&:hover': { bgcolor: ttsEnabled ? 'rgba(155, 127, 212, 0.25)' : 'rgba(255,255,255,0.08)' },
                }}
              >
                {ttsEnabled ? <VolumeUpIcon sx={{ fontSize: 18 }} /> : <VolumeOffIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* Interrupt Button (shown when AI is speaking/thinking) */}
        {(isSpeaking || isAIThinking) && (
          <Tooltip title={t('interruptVoice')}>
            <span>
              <IconButton
                color="error"
                onClick={handleInterrupt}
                size="small"
                sx={{
                  alignSelf: 'flex-end',
                  flexShrink: 0,
                  bgcolor: 'rgba(255, 80, 80, 0.15)',
                  '&:hover': { bgcolor: 'rgba(255, 80, 80, 0.25)' },
                }}
              >
                <StopIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}

        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || isAIThinking}
          size="small"
          sx={{ alignSelf: 'flex-end', flexShrink: 0 }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {!collabSession.active && messages.length > 0 && (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography
            variant="caption"
            component="button"
            onClick={clearMessages}
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              cursor: 'pointer',
              opacity: 0.6,
              background: 'none',
              border: 'none',
              '&:hover': { opacity: 1 },
            }}
          >
            Clear chat
          </Typography>
        </Box>
      )}

      {/* Message context menu */}
      <Menu
        open={contextMenu.open}
        onClose={handleCloseContextMenu}
        anchorEl={contextMenu.anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(20, 15, 35, 0.98)',
              border: '1px solid rgba(155, 127, 212, 0.3)',
              backgroundImage: 'none',
              minWidth: 140,
            },
          },
        }}
      >
        <MenuItem
          onClick={handleCopyMessage}
          sx={{ fontSize: 13, color: 'white', minHeight: 40 }}
        >
          复制内容
        </MenuItem>
        {contextMenu.msg?.role === 'user' && (
          <MenuItem
            onClick={handleDeleteMessage}
            sx={{ fontSize: 13, color: 'error.main', minHeight: 40 }}
          >
            删除消息
          </MenuItem>
        )}
      </Menu>
    </Box>

    <MemoPanel
      personaId={activePersonaId}
      open={memoOpen}
      onClose={() => setMemoOpen(false)}
    />

    <SkillPanel
      visible={skillPanelOpen}
      onClose={() => setSkillPanelOpen(false)}
      messages={messages}
      onResult={(result: SkillExecutionResult) => {
        if (result.success) {
          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.response,
            timestamp: Date.now(),
            personaId: activePersonaId,
          });
          if (result.steps && result.steps.length > 0) {
            const stepsText = result.steps.map((s, i) => `Step ${i + 1}: ${s.description}\n→ ${s.result}`).join('\n\n');
            addMessage({
              id: crypto.randomUUID(),
              role: 'system',
              content: `[Skill Steps]\n${stepsText}`,
              timestamp: Date.now(),
              personaId: activePersonaId,
            });
          }
        } else {
          addMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content: `⚠️ Skill failed: ${result.error || result.response}`,
            timestamp: Date.now(),
            personaId: activePersonaId,
          });
        }
      }}
    />

    <TaskConfirmDialog
      open={goalConfirmDialogOpen}
      agentTask={pendingAgentTask}
      goal={pendingGoal}
      onClose={() => setGoalConfirmDialogOpen(false)}
      onConfirm={handleConfirmGoalTasks}
    />

    {/* Plan View - shows when there's an active plan */}
    {currentPlan && planStatus !== 'idle' && (
      <PlanView
        onExecute={async (plan) => {
          // When user confirms execution from PlanView
          await startExecution();
        }}
        onCancel={() => {
          abortExecution();
          clearPlan();
        }}
      />
    )}

    <AgentCreationWizard
      open={agentBuilderOpen}
      onClose={() => setAgentBuilderOpen(false)}
      onComplete={async (agent, soul, userProfile, memory) => {
        // V101: Create persona from agent with soul/userProfile/memory
        try {
          const { createPersona } = await import('../../services/persona/personaStorage');
          const { PersonaVoice, PersonaAppearance } = await import('../../services/persona/personaStorage');

          // Map agent to persona fields
          const voiceTypeMap: Record<string, 'warm' | 'rational' | 'humorous' | 'serious'> = {
            planner: 'rational',
            executor: 'warm',
            critic: 'serious',
            creative: 'humorous',
            general: 'warm',
          };

          const newPersona = createPersona({
            name: agent.name,
            avatar: agent.icon,
            bio: agent.description,
            voice: { rate: 1.0, pitch: 1.0, volume: 1.0 } as PersonaVoice,
            voiceType: voiceTypeMap[agent.role] || 'warm',
            appearance: { expression: '😊', accessory: '🤍', outfit: '👕' } as PersonaAppearance,
            soul: soul || `You are ${agent.name}. ${agent.description}`,
            userProfile: userProfile || '',
            memory: memory || '',
          });

          // Set as active persona
          setActivePersonaId(newPersona.id);

          addMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content: `✅ Agent "${agent.name}" created and saved as persona!`,
            timestamp: Date.now(),
            personaId: activePersonaId,
          });
        } catch (err) {
          console.error('Failed to create persona:', err);
          addMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content: `✅ Agent "${agent.name}" created (failed to save as persona)`,
            timestamp: Date.now(),
            personaId: activePersonaId,
          });
        }
        setAgentBuilderOpen(false);
      }}
    />
    </>
  );
};

export default ChatPanel;
