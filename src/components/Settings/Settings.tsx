import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MyDialog as Dialog, MySlider as Slider , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyFormControl as FormControl, MyInputLabel as InputLabel, MyMenuItem as MenuItem } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MyTextField as TextField, MyButton as Button, MyPaper as Paper, MySelect as Select, MyAlert as Alert, MyDivider as Divider, MyStack as Stack, MyIconButton as IconButton, MyChip as Chip, MyTooltip as Tooltip, MyCollapse as Collapse, MySwitch as Switch, MyList as List, MyListItem as ListItem } from '../MUI替代';
import {
  Visibility, VisibilityOff, Save as SaveIcon,
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  DragIndicator as DragIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  Download as DownloadIcon, Upload as UploadIcon,
  Keyboard as KeyboardIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { HOTKEY_DEFINITIONS } from '../../hooks/useHotkeys';
import { testModel } from '../../services/ai/model-registry-adapter';
import { PERSONAS, MOODS } from '../../services/companion/personalityTypes';
import { getMemoryStats, clearAllMemories, compactMemory } from '../../services/memory/memoryStorage';
import { voiceService } from '../../services/voice/voiceService';
import { WebhookSettings } from './WebhookSettings';
import { VersionInfo } from './VersionInfo';
import { decodeTemplate, templateToPersonaData } from '../../services/template/templateShare';
import { ONLINE_TEMPLATES, type OnlineTemplate } from '../../services/template/onlineTemplates';
import { createPersona, type PersonaVoice, type PersonaAppearance } from '../../services/persona/personaStorage';
import type { ModelConfig } from '../../services/ai/model-registry';
import type { PersonaId, PersonaRole } from '../../types';
import { createCustomPreset, applyCustomTheme } from '../../utils/appTheme';
import { MAC_THEME_PRESETS, applyMacThemePreset } from '../../utils/macThemePresets';
import { AnalyticsDashboard } from '../Analytics/AnalyticsDashboard';
import { PerformanceDashboard, OptimizationPanel, AgentLeaderboard } from '../AgentOptimizer';
import { BotChannelsSettings } from './BotChannelsSettings';
import { useMacSplitStore } from '../../stores/macSplitStore';
import { ProvidersPage } from '../../pages/ProvidersPage';
import { UsageStatsPanel } from '../Usage/UsageStatsPanel';
import { useEvolutionStore } from '../../stores/evolutionStore';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  minimax: 'MiniMax',
  'minimax-cn': 'MiniMax CN',
  xiaomi: 'Xiaomi (Mimo)',
  zhipu: 'Zhipu (GLM)',
  qwen: 'Qwen (Alibaba)',
  gemini: 'Google Gemini',
  feishu: 'Feishu (Lark)',
  'azure-openai': 'Azure OpenAI',
  custom: 'Custom Endpoint',
};

interface SettingsProps {
  splitLayout?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ splitLayout = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const aiConfig = useStore((s) => s.aiConfig);
  const setAIConfig = useStore((s) => s.setAIConfig);
  const models = useStore((s) => s.models);
  const addModel = useStore((s) => s.addModel);
  const updateModel = useStore((s) => s.updateModel);
  const removeModel = useStore((s) => s.removeModel);
  const emailAccount = useStore((s) => s.emailAccount);
  const setEmailAccount = useStore((s) => s.setEmailAccount);
  const interactionSettings = useStore((s) => s.interactionSettings);
  const setInteractionSettings = useStore((s) => s.setInteractionSettings);
  const companion = useStore((s) => s.companion);
  const setPersona = useStore((s) => s.setPersona);
  const setMood = useStore((s) => s.setMood);
  const setCustomName = useStore((s) => s.setCustomName);
  const setMemoryEnabled = useStore((s) => s.setMemoryEnabled);
  const setAutoSummarize = useStore((s) => s.setAutoSummarize);

  // Legacy form state (for backward compatibility)
  const [formData, setFormData] = useState(aiConfig);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Model management state
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; success?: boolean; message: string }>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogModel, setDialogModel] = useState<Partial<ModelConfig>>({});

  // Companion/Memory state
  const [memoryStats, setMemoryStats] = useState<{ totalEntries: number; byType: Record<string, number> } | null>(null);
  const [memoryClearing, setMemoryClearing] = useState(false);
  const [memoryCompacting, setMemoryCompacting] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(companion.customName);

  // Voice state
  const voiceSettings = useStore((s) => s.voiceSettings);
  const setVoiceSettings = useStore((s) => s.setVoiceSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceSupported, setVoiceSupported] = useState({ stt: false, tts: false });

  // Desktop settings state (Electron only)
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const [desktopSettings, setDesktopSettings] = useState({
    openAtLogin: false,
    alwaysOnTop: false,
    notificationsEnabled: true,
    minimizeToTray: true,
    autoUpdate: true,
    dataDirectory: '',
  });

  // V94: Desktop settings tab
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'desktop' | 'analytics' | 'agentOptimizer'>('general');
  const settingsSection = useMacSplitStore((s) => s.settingsSection);
  const effectiveTab = splitLayout
    ? (settingsSection === 'appearance' ? 'general' : settingsSection)
    : activeSettingsTab;
  const showGeneralBody = !splitLayout || settingsSection === 'general';
  const showThemeBlock = !splitLayout || settingsSection === 'general' || settingsSection === 'appearance';

  // V94: Update status state
  const [updateStatus, setUpdateStatus] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
    progress?: number;
    version?: string;
    error?: string;
  }>({ status: 'idle' });

  // Template Management state (V31)
  const [activeTemplateTab, setActiveTemplateTab] = useState<'local' | 'online' | 'install'>('local');
  const localTemplates = useStore((s) => s.localTemplates);
  const removeLocalTemplate = useStore((s) => s.removeLocalTemplate);
  const setActivePersonaId = useStore((s) => s.setActivePersonaId);
  const [installCode, setInstallCode] = useState('');
  const [installPreview, setInstallPreview] = useState<ReturnType<typeof templateToPersonaData> | null>(null);
  const [installError, setInstallError] = useState('');
  const [installSuccess, setInstallSuccess] = useState('');

  // V33: Theme settings state
  const appThemeMode = useStore((s) => s.appThemeMode);
  const appThemePresetId = useStore((s) => s.appThemePresetId);
  const customTheme = useStore((s) => s.customTheme);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customColors, setCustomColors] = useState({
    background: '#121212',
    text: '#e0e0e0',
    accent: '#8b5cf6',
    border: '#333333',
  });

  // V52: Hotkey settings state
  const hotkeySettings = useStore((s) => s.hotkeySettings);
  const toggleHotkey = useStore((s) => s.toggleHotkey);

  // V103: Plan Review settings state
  const [planReviewEnabled, setPlanReviewEnabled] = useState(false);
  const [reviewModel, setReviewModel] = useState(
    models.length > 0 ? models[0].modelName : ''
  );

  // V104: Loop Detection settings state
  const [loopDetectionEnabled, setLoopDetectionEnabled] = useState(false);
  const [maxIterations, setMaxIterations] = useState(20);
  const [stallThreshold, setStallThreshold] = useState(3);

  const handleSaveCustomTheme = () => {
    const theme = createCustomPreset(customColors);
    setAppThemePreset('custom');
    setCustomTheme(theme);
    applyCustomTheme(theme);
  };

  // Load desktop settings on mount
  useEffect(() => {
    if (!isElectron) return;
    const loadDesktopSettings = async () => {
      try {
        const loginSettings = await (window as any).electronAPI.getLoginItemSettings();
        const alwaysOnTop = await (window as any).electronAPI.getAlwaysOnTop();
        const minimizeToTray = await (window as any).electronAPI.getMinimizeToTray();
        const dataDirectory = await (window as any).electronAPI.getDataDirectory();
        setDesktopSettings(prev => ({
          ...prev,
          openAtLogin: loginSettings?.openAtLogin ?? false,
          alwaysOnTop: alwaysOnTop ?? false,
          minimizeToTray: minimizeToTray ?? true,
          dataDirectory: dataDirectory ?? '',
        }));
      } catch (e) {
        console.error('Failed to load desktop settings:', e);
      }
    };
    loadDesktopSettings();

    // Listen for always-on-top changes from main process
    const unsubscribeAlwaysOnTop = (window as any).electronAPI?.onAlwaysOnTopChanged((value: boolean) => {
      setDesktopSettings(prev => ({ ...prev, alwaysOnTop: value }));
    });

    // V94: Listen for update status changes
    const unsubscribeUpdate = (window as any).electronAPI?.onUpdateStatusChanged((status: typeof updateStatus) => {
      setUpdateStatus(status);
    });

    return () => {
      if (unsubscribeAlwaysOnTop) unsubscribeAlwaysOnTop();
      if (unsubscribeUpdate) unsubscribeUpdate();
    };
  }, [isElectron]);

  // Handle desktop setting changes
  const handleDesktopSettingChange = (key: 'openAtLogin' | 'alwaysOnTop' | 'notificationsEnabled' | 'minimizeToTray' | 'autoUpdate') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setDesktopSettings(prev => ({ ...prev, [key]: value }));

    if (!isElectron) return;
    try {
      if (key === 'openAtLogin') {
        await (window as any).electronAPI.setLoginItemSettings(value);
      } else if (key === 'alwaysOnTop') {
        await (window as any).electronAPI.setAlwaysOnTop(value);
      } else if (key === 'minimizeToTray') {
        await (window as any).electronAPI.setMinimizeToTray(value);
      }
    } catch (err) {
      console.error('Failed to update desktop setting:', err);
    }
  };

  // V94: Check for updates
  const handleCheckForUpdates = async () => {
    if (!isElectron) return;
    setUpdateStatus({ status: 'checking' });
    try {
      await (window as any).electronAPI.checkForUpdates();
    } catch (err) {
      setUpdateStatus({ status: 'error', error: String(err) });
    }
  };

  // V94: Download update
  const handleDownloadUpdate = async () => {
    if (!isElectron) return;
    try {
      await (window as any).electronAPI.downloadUpdate();
    } catch (err) {
      setUpdateStatus({ status: 'error', error: String(err) });
    }
  };

  // V94: Install update
  const handleInstallUpdate = () => {
    if (!isElectron) return;
    (window as any).electronAPI.installUpdate();
  };

  // V94: Open data directory
  const handleOpenDataDirectory = () => {
    if (!isElectron) return;
    (window as any).electronAPI.openDataDirectory();
  };

  // Template management handlers (V31)
  const handleDecodeInstallCode = () => {
    setInstallError('');
    setInstallPreview(null);
    if (!installCode.trim()) {
      setInstallError(t('settings.invalidShareCode'));
      return;
    }
    const payload = decodeTemplate(installCode.trim());
    if (!payload) {
      setInstallError(t('settings.invalidShareCode'));
      return;
    }
    setInstallPreview(templateToPersonaData(payload));
  };

  const handleInstallTemplate = () => {
    if (!installPreview) return;
    try {
      const newPersona = createPersona(installPreview);
      setActivePersonaId(newPersona.id);
      setInstallSuccess(t('settings.personaCreated', { name: newPersona.name }));
      setInstallCode('');
      setInstallPreview(null);
      setTimeout(() => setInstallSuccess(''), 3000);
    } catch (err) {
      setInstallError(t('settings.installFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
    }
  };

  const handleInstallOnlineTemplate = (template: OnlineTemplate) => {
    try {
      const personaData = {
        name: template.name,
        avatar: template.avatar,
        bio: template.bio,
        voice: { rate: 1.0, pitch: 1.0, volume: 1.0 } as PersonaVoice,
        voiceType: template.voice,
        appearance: { expression: '😊', accessory: '🤍', outfit: '👕' } as PersonaAppearance,
        theme: template.theme,
        soul: template.soul || '',
        userProfile: template.userProfile || '',
        memory: template.memory || '',
      };
      const newPersona = createPersona(personaData);
      setActivePersonaId(newPersona.id);
      setInstallSuccess(t('settings.personaCreated', { name: newPersona.name }));
      setTimeout(() => setInstallSuccess(''), 3000);
    } catch (err) {
      setInstallError(t('settings.installFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
    }
  };

  const handleCreateFromLocalTemplate = (template: typeof localTemplates[0]) => {
    try {
      const { id, createdAt, updatedAt, isDefault, ...templateData } = template;
      const newPersona = createPersona(templateData);
      setActivePersonaId(newPersona.id);
      setInstallSuccess(t('settings.personaCreated', { name: newPersona.name }));
      setTimeout(() => setInstallSuccess(''), 3000);
    } catch (err) {
      setInstallError(t('settings.createFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
    }
  };

  // Test notification
  const testNotification = () => {
    if (isElectron) {
      (window as any).electronAPI.showNotification('PixelPal Test', 'Desktop notifications are working!');
    } else {
      if (Notification.permission === 'granted') {
        new Notification('PixelPal Test', { body: 'Desktop notifications are working!' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('PixelPal Test', { body: 'Desktop notifications are working!' });
          }
        });
      }
    }
  };

  // Load memory stats on mount
  useEffect(() => {
    getMemoryStats().then(setMemoryStats).catch(() => {});
  }, []);

  // Load voice support and available voices
  useEffect(() => {
    const support = voiceService.isSupported();
    setVoiceSupported(support);
    if (support.tts) {
      const voices = voiceService.getAvailableVoices();
      setAvailableVoices(voices);
      // Voices may load asynchronously
      const loadVoices = () => {
        setAvailableVoices(voiceService.getAvailableVoices());
      };
      window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  useEffect(() => {
    setFormData(aiConfig);
  }, [aiConfig]);

  const handleLegacySave = () => {
    if (!formData.apiKey.trim()) {
      setError('API Key is required to use AI features.');
      return;
    }
    setAIConfig(formData);
    setSaved(true);
    setError('');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDisconnectGmail = () => {
    setEmailAccount(null);
    localStorage.removeItem('pixelpal_gmail_client_id');
  };

  // Model management functions
  const handleToggleModelEnabled = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      updateModel(modelId, { isEnabled: !model.isEnabled });
    }
  };

  const handleTestModel = async (model: ModelConfig) => {
    if (!model.apiKey || !model.apiKey.trim()) {
      setTestStatus(prev => ({
        ...prev,
        [model.id]: { loading: false, success: false, message: 'No API Key' }
      }));
      return;
    }

    setTestStatus(prev => ({
      ...prev,
      [model.id]: { loading: true, message: 'Testing...' }
    }));

    const result = await testModel(model.id);

    setTestStatus(prev => ({
      ...prev,
      [model.id]: { loading: false, success: result.success, message: result.message }
    }));
  };

  const handleOpenAddDialog = () => {
    const newModel: Partial<ModelConfig> = {
      name: '',
      provider: 'openai',
      modelName: '',
      apiBaseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 4096,
      isEnabled: true,
      priority: models.length,
    };
    setDialogModel(newModel);
    setIsAddingModel(true);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (model: ModelConfig) => {
    setDialogModel({ ...model });
    setIsAddingModel(false);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogModel({});
    setIsAddingModel(false);
  };

  const handleSaveDialog = () => {
    if (!dialogModel.name || !dialogModel.provider || !dialogModel.modelName) {
      return;
    }

    if (isAddingModel) {
      const newModel: ModelConfig = {
        id: `model-${Date.now()}`,
        name: dialogModel.name || '',
        provider: dialogModel.provider || 'openai',
        modelName: dialogModel.modelName || '',
        apiBaseUrl: dialogModel.apiBaseUrl || PROVIDER_BASE_URLS[dialogModel.provider || 'openai'] || '',
        apiKey: dialogModel.apiKey || '',
        temperature: dialogModel.temperature ?? 0.7,
        maxTokens: dialogModel.maxTokens ?? 4096,
        isEnabled: dialogModel.isEnabled ?? true,
        priority: dialogModel.priority ?? models.length,
      };
      addModel(newModel);
    } else if (dialogModel.id) {
      updateModel(dialogModel.id, dialogModel);
    }

    handleCloseDialog();
  };

  const handleDeleteModel = (modelId: string) => {
    if (models.length <= 1) {
      setError('Cannot delete the last model. At least one model is required.');
      return;
    }
    removeModel(modelId);
  };

  const handleProviderChange = (provider: string) => {
    const baseUrl = PROVIDER_BASE_URLS[provider] || '';
    setDialogModel({
      ...dialogModel,
      provider,
      apiBaseUrl: baseUrl,
      modelName: '', // Reset model name when provider changes
    });
  };

  // Sort models by priority
  const sortedModels = [...models].sort((a, b) => a.priority - b.priority);
  const enabledCount = models.filter(m => m.isEnabled && m.apiKey && m.apiKey.trim()).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {!splitLayout && (
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          ⚙️ Settings
        </Typography>
      </Box>
      )}

      {/* V94: Settings Tab Navigation (Desktop only) */}
      {!splitLayout && isElectron && (
        <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={activeSettingsTab === 'general' ? 'contained' : 'outlined'}
            onClick={() => setActiveSettingsTab('general')}
            sx={{ fontSize: 12, textTransform: 'none' }}
          >
            General
          </Button>
          <Button
            size="small"
            variant={activeSettingsTab === 'desktop' ? 'contained' : 'outlined'}
            onClick={() => setActiveSettingsTab('desktop')}
            sx={{ fontSize: 12, textTransform: 'none' }}
          >
            Desktop
          </Button>
          <Button
            size="small"
            variant={activeSettingsTab === 'analytics' ? 'contained' : 'outlined'}
            onClick={() => setActiveSettingsTab('analytics')}
            sx={{ fontSize: 12, textTransform: 'none' }}
          >
            Analytics
          </Button>
          <Button
            size="small"
            variant={activeSettingsTab === 'agentOptimizer' ? 'contained' : 'outlined'}
            onClick={() => setActiveSettingsTab('agentOptimizer')}
            sx={{ fontSize: 12, textTransform: 'none' }}
          >
            Agent Optimizer
          </Button>
        </Box>
      )}

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* V94: Desktop Settings Tab */}
        {isElectron && effectiveTab === 'desktop' && (
          <>
            {/* V94: System Integration */}
            <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
                🖥️ System Integration
              </Typography>
              <Stack gap={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      Start at Login
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      Launch PixelPal when your computer starts
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={desktopSettings.openAtLogin}
                    onChange={handleDesktopSettingChange('openAtLogin')}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      Minimize to Tray
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      Keep running in system tray when closed
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={desktopSettings.minimizeToTray}
                    onChange={handleDesktopSettingChange('minimizeToTray')}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      Always on Top
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      Keep window above other applications
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={desktopSettings.alwaysOnTop}
                    onChange={handleDesktopSettingChange('alwaysOnTop')}
                  />
                </Box>
              </Stack>
            </Paper>

            {/* V94: Notifications */}
            <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
                🔔 Notifications
              </Typography>
              <Stack gap={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      Enable Notifications
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      Show desktop notifications for messages
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={desktopSettings.notificationsEnabled}
                    onChange={handleDesktopSettingChange('notificationsEnabled')}
                  />
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={testNotification}
                  sx={{ fontSize: 11, alignSelf: 'flex-start' }}
                >
                  Test Notification
                </Button>
              </Stack>
            </Paper>

            {/* V94: Auto Update */}
            <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
                🔄 Auto Update
              </Typography>
              <Stack gap={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      Check for Updates Automatically
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      Automatically download and notify about updates
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={desktopSettings.autoUpdate}
                    onChange={handleDesktopSettingChange('autoUpdate')}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleCheckForUpdates}
                    disabled={updateStatus.status === 'checking' || updateStatus.status === 'downloading'}
                    sx={{ fontSize: 11 }}
                  >
                    {updateStatus.status === 'checking' ? 'Checking...' : 'Check for Updates'}
                  </Button>

                  {updateStatus.status === 'available' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleDownloadUpdate}
                      sx={{ fontSize: 11 }}
                    >
                      Download {updateStatus.version}
                    </Button>
                  )}

                  {updateStatus.status === 'downloaded' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={handleInstallUpdate}
                      sx={{ fontSize: 11 }}
                    >
                      Install & Restart
                    </Button>
                  )}
                </Box>

                {updateStatus.status === 'downloading' && updateStatus.progress !== undefined && (
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="caption" sx={{ fontSize: 10 }}>
                      Downloading: {updateStatus.progress.toFixed(1)}%
                    </Typography>
                    <Box sx={{ height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1, mt: 0.5 }}>
                      <Box sx={{ height: 4, width: `${updateStatus.progress}%`, bgcolor: 'primary.main', borderRadius: 1, transition: 'width 0.3s' }} />
                    </Box>
                  </Box>
                )}

                {updateStatus.status === 'error' && (
                  <Alert severity="error" sx={{ fontSize: 11 }}>
                    {updateStatus.error}
                  </Alert>
                )}

                {updateStatus.status === 'downloaded' && (
                  <Alert severity="success" sx={{ fontSize: 11 }}>
                    Update {updateStatus.version} is ready to install
                  </Alert>
                )}
              </Stack>
            </Paper>

            {/* V94: Data Directory */}
            <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
                📁 Data Directory
              </Typography>
              <Stack gap={2}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', wordBreak: 'break-all' }}>
                    {desktopSettings.dataDirectory || 'Loading...'}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleOpenDataDirectory}
                  startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: 11, alignSelf: 'flex-start' }}
                >
                  Open Data Directory
                </Button>
              </Stack>
            </Paper>

            {/* V94: Keyboard Shortcuts Info */}
            <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
                ⌨️ Global Shortcuts
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                Press <Chip label="Ctrl+Shift+P" size="small" sx={{ height: 18, fontSize: 10, mx: 0.5 }} /> to show PixelPal from anywhere
              </Typography>
            </Paper>
          </>
        )}

        {/* V97: Analytics Tab */}
        {effectiveTab === 'analytics' && (
          <Box sx={{ height: 'calc(100vh - 180px)', overflow: 'auto' }}>
            <AnalyticsDashboard />
          </Box>
        )}

        {effectiveTab === 'agentOptimizer' && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <PerformanceDashboard />
            <OptimizationPanel />
            <AgentLeaderboard />
          </Box>
        )}

        {effectiveTab === 'providers' && (
          <ProvidersPage splitLayout />
        )}

        {effectiveTab === 'usage' && (
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <UsageStatsPanel />
          </Box>
        )}

        {/* Only show general settings when on general tab */}
        {effectiveTab === 'general' && showGeneralBody && (
          <>
        {/* V81: AI Providers Card */}
        {!splitLayout && (
        <Paper
          sx={{
            p: 2,
            bgcolor: 'rgba(94, 106, 210, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(94, 106, 210, 0.3)',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(94, 106, 210, 0.15)' },
          }}
          onClick={() => navigate('/settings/providers')}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={2}>
              <Typography variant="h6" sx={{ fontSize: 24 }}>🤖</Typography>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  AI Providers
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  Configure OpenAI, Anthropic, Gemini, Ollama, and more
                </Typography>
              </Box>
            </Stack>
            <OpenInNewIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          </Stack>
        </Paper>
        )}

        {/* V88: Usage Statistics Card */}
        {!splitLayout && (
        <Paper
          sx={{
            p: 2,
            bgcolor: 'rgba(34, 197, 94, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(34, 197, 94, 0.3)',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.15)' },
          }}
          onClick={() => navigate('/settings/usage')}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={2}>
              <Typography variant="h6" sx={{ fontSize: 24 }}>📊</Typography>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Usage Statistics
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  Token usage, cost tracking, and budget management
                </Typography>
              </Box>
            </Stack>
            <OpenInNewIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          </Stack>
        </Paper>
        )}

        {/* V154: Evolution Engine Card */}
        <Paper
          sx={{
            p: 2,
            bgcolor: 'rgba(129, 140, 248, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(129, 140, 248, 0.3)',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.15)' },
          }}
          onClick={() => useEvolutionStore.getState().openPanel()}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={2}>
              <Typography variant="h6" sx={{ fontSize: 24 }}>🔬</Typography>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Evolution Dashboard
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  Monitor AI self-evolution patterns and strategies
                </Typography>
              </Box>
            </Stack>
            <OpenInNewIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          </Stack>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Pet Interaction Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            🐾 Pet Interaction
          </Typography>

          <Stack gap={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Periodic Greetings</InputLabel>
              <Select
                value={interactionSettings.greetingFrequency}
                label="Periodic Greetings"
                onChange={(e) =>
                  setInteractionSettings({ greetingFrequency: e.target.value as 'high' | 'medium' | 'low' | 'off' })}
              >
                <MenuItem value="high">High (every 30 minutes)</MenuItem>
                <MenuItem value="medium">Medium (hourly)</MenuItem>
                <MenuItem value="low">Low (2x daily: morning & afternoon)</MenuItem>
                <MenuItem value="off">Off</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, mb: 1, color: 'text.secondary' }}>
                Sleep Schedule
              </Typography>
              <Stack direction="row" gap={1} alignItems="center">
                <TextField
                  label="Start"
                  type="time"
                  size="small"
                  value={interactionSettings.sleepTimeStart}
                  onChange={(e) =>
                    setInteractionSettings({ sleepTimeStart: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>to</Typography>
                <TextField
                  label="End"
                  type="time"
                  size="small"
                  value={interactionSettings.sleepTimeEnd}
                  onChange={(e) =>
                    setInteractionSettings({ sleepTimeEnd: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5, display: 'block' }}>
                During this time, PixelPal will be in sleep mode with ZZZ animation.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* V48: Collaboration Role Icons */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            {t('settings.collabRoleIcons', '🤝 协作角色图标')}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', mb: 2, display: 'block' }}>
            {t('settings.collabRoleIconsHint', '自定义协作面板中各角色的图标')}
          </Typography>

          {(['MemoryExpert', 'EmotionAnalyst', 'Advisor', 'Researcher', 'Coder'] as const).map((role) => {
            const emojiOptions = ['🧠', '💜', '🎯', '🔍', '💻', '🤖', '⚡', '🎨', '📝', '🔮', '🌟', '💡', '🛡️', '⚙️', '🌐', '🔥', '💫', '🎮', '📊', '🎭'];
            const currentIcon = interactionSettings.collabRoleIcons?.[role] ?? '';
            return (
              <Box key={role} sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontSize: 11, mb: 0.5, color: 'text.secondary' }}>
                  {role === 'MemoryExpert' ? '🧠 ' + t('collab.role.memoryExpert', '记忆专家')
                    : role === 'EmotionAnalyst' ? '📊 ' + t('collab.role.emotionAnalyst', '情感分析师')
                    : role === 'Advisor' ? '💡 ' + t('collab.role.advisor', '策略顾问')
                    : role === 'Researcher' ? '🔍 ' + t('collab.role.researcher', '研究员')
                    : '💻 ' + t('collab.role.coder', '程序员')}
                  {currentIcon && ` → ${currentIcon}`}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {/* Clear option */}
                  <Box
                    onClick={() => {
                      const updated = { ...(interactionSettings.collabRoleIcons || {}) };
                      delete updated[role];
                      setInteractionSettings({ collabRoleIcons: updated as Record<PersonaRole, string> });
                    }}
                    sx={{
                      width: 28, height: 28, borderRadius: 1, border: '1px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 12,
                      bgcolor: !currentIcon ? 'rgba(134,59,255,0.3)' : 'transparent',
                      '&:hover': { borderColor: '#863bff', bgcolor: 'rgba(134,59,255,0.2)' },
                    }}
                  >
                    —
                  </Box>
                  {emojiOptions.map((emoji) => (
                    <Box
                      key={emoji}
                      onClick={() => {
                        setInteractionSettings({
                          collabRoleIcons: { ...(interactionSettings.collabRoleIcons || {}), [role]: emoji } as Record<PersonaRole, string>,
                        });
                      }}
                      sx={{
                        width: 28, height: 28, borderRadius: 1, border: '1px solid rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 14,
                        bgcolor: currentIcon === emoji ? 'rgba(134,59,255,0.3)' : 'transparent',
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: '#863bff', bgcolor: 'rgba(134,59,255,0.15)', transform: 'scale(1.15)' },
                      }}
                    >
                      {emoji}
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />
          </>
        )}

        {effectiveTab === 'general' && showThemeBlock && (
        <Paper id="macos-theme-settings" sx={{ p: 2, bgcolor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg, 10px)', border: '1px solid var(--separator)' }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            {t('settings.themeSettings')}
          </Typography>

          {/* Theme Mode Toggle */}
          <Box sx={{ mb: 2 }}>
<Typography variant="body2" sx={{ fontSize: 12, mb: 1, color: 'text.secondary' }}>
                {t('settings.themeMode')}
              </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {(['system', 'light', 'dark'] as const).map((mode) => {
                const isActive = appThemeMode === mode || (mode === 'light' && appThemeMode === 'minimax');
                const labels = { light: t('settings.light'), dark: t('settings.dark'), system: t('settings.followSystem') };
                return (
                  <Box
                    key={mode}
                    onClick={() => {
                      const { setAppThemeMode } = useStore.getState();
                      setAppThemeMode(mode);
                    }}
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: 'var(--control-radius, 6px)',
                      cursor: 'pointer',
                      border: `1px solid ${isActive ? 'var(--system-blue)' : 'var(--separator)'}`,
                      bgcolor: isActive ? 'color-mix(in srgb, var(--system-blue) 12%, transparent)' : 'transparent',
                      color: isActive ? 'var(--system-blue)' : 'text.secondary',
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all var(--duration-short, 150ms) var(--ease-macOS, ease)',
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': { borderColor: 'var(--system-blue)' },
                    }}
                  >
                    {labels[mode]}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Theme Preset Selector */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: 12, mb: 1, color: 'text.secondary' }}>
              {t('settings.themeStyle')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
              {MAC_THEME_PRESETS.map((preset) => {
                const isActive = appThemePresetId === preset.id;
                const previewBg = preset.variables['--bg-base'];
                const previewText = preset.variables['--text-primary'];
                const previewAccent = preset.variables['--system-blue'];
                return (
                  <Box
                    key={preset.id}
                    onClick={() => {
                      const { setAppThemePreset, setAppThemeMode } = useStore.getState();
                      setAppThemePreset(preset.id);
                      if (preset.id === 'light') setAppThemeMode('light');
                      else if (preset.id === 'dark') setAppThemeMode('dark');
                      applyMacThemePreset(preset);
                    }}
                    sx={{
                      p: 1,
                      borderRadius: 'var(--control-radius, 6px)',
                      cursor: 'pointer',
                      border: `2px solid ${isActive ? previewAccent : 'var(--separator)'}`,
                      bgcolor: previewBg,
                      transition: 'all var(--duration-short, 150ms) var(--ease-macOS, ease)',
                      '&:hover': { borderColor: previewAccent },
                    }}
                  >
                    {/* Color preview */}
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: previewBg, border: `1px solid ${previewText}22` }} />
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: previewText }} />
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: previewAccent }} />
                    </Box>
                    <Typography sx={{ fontSize: 9, color: previewText, fontWeight: isActive ? 600 : 400, lineHeight: 1.2 }}>
                      {preset.label}
                    </Typography>
                  </Box>
                );
              })}
              {/* Custom theme card */}
              {appThemePresetId === 'custom' && (
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: `2px solid var(--accent-color)`,
                    bgcolor: 'rgba(99,102,241,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: customTheme?.variables['--bg-primary'] || '#6366f1' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: customTheme?.variables['--text-primary'] || '#e0e0e0' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: customTheme?.variables['--accent-color'] || '#a78bfa' }} />
                  </Box>
                  <Typography sx={{ fontSize: 9, color: 'var(--accent-color)', fontWeight: 600, lineHeight: 1.2 }}>
                    {t('settings.custom')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Custom Theme Editor (collapsible) */}
          <Box>
            <Box
              onClick={() => setCustomExpanded(!customExpanded)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: 12 }}>
                {t('settings.customTheme')}
              </Typography>
              {customExpanded ? <CollapseIcon sx={{ fontSize: 18 }} /> : <ExpandIcon sx={{ fontSize: 18 }} />}
            </Box>
            <Collapse in={customExpanded}>
              <Box sx={{ pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Color pickers */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>{t('settings.backgroundColor')}</Typography>
                    <input
                      type="color"
                      value={customColors.background}
                      onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                      style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>{t('settings.textColor')}</Typography>
                    <input
                      type="color"
                      value={customColors.text}
                      onChange={(e) => setCustomColors({ ...customColors, text: e.target.value })}
                      style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>{t('settings.accentColor')}</Typography>
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })}
                      style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>{t('settings.borderColor')}</Typography>
                    <input
                      type="color"
                      value={customColors.border}
                      onChange={(e) => setCustomColors({ ...customColors, border: e.target.value })}
                      style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                    />
                  </Box>
                </Box>

                {/* Preview */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: customColors.background,
                    border: `1px solid ${customColors.border}`,
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: customColors.text, fontWeight: 600, mb: 0.5 }}>
                    {t('settings.preview')}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: customColors.text, opacity: 0.7 }}>
                    {t('settings.sampleText')}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Box sx={{ px: 1, py: 0.5, borderRadius: 0.5, bgcolor: customColors.accent, color: '#fff', fontSize: 9 }}>
                      {t('common.button')}
                    </Box>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveCustomTheme}
                  sx={{ fontSize: 12 }}
                >
                  {t('settings.saveMyTheme')}
                </Button>
              </Box>
            </Collapse>
          </Box>
        </Paper>
        )}

        {effectiveTab === 'general' && showGeneralBody && (
          <>
        <Divider sx={{ opacity: 0.1 }} />

        {/* Companion Personality Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            🐾 Companion Personality
          </Typography>

          {/* Persona Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: 12, mb: 1, color: 'text.secondary' }}>
              Choose your companion's personality
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(Object.keys(PERSONAS) as PersonaId[]).map((pid) => {
                const p = PERSONAS[pid];
                const isActive = companion.personaId === pid;
                return (
                  <Box
                    key={pid}
                    onClick={() => setPersona(pid)}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: `1px solid ${isActive ? p.color : 'rgba(255,255,255,0.15)'}`,
                      bgcolor: isActive ? `${p.color}22` : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: p.color },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                      {p.description}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Mood Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: 12, mb: 1, color: 'text.secondary' }}>
              Current mood: {MOODS[companion.moodId]?.label ?? 'happy'} {MOODS[companion.moodId]?.emoji ?? '😊'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {Object.values(MOODS).map((m) => {
                const isActive = companion.moodId === m.id;
                return (
                  <Chip
                    key={m.id}
                    label={`${m.emoji} ${m.label}`}
                    size="small"
                    onClick={() => setMood(m.id)}
                    sx={{
                      fontSize: 10,
                      height: 22,
                      cursor: 'pointer',
                      bgcolor: isActive ? 'primary.main' : 'rgba(255,255,255,0.08)',
                      border: 'none',
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Custom Name */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: 12, mb: 1, color: 'text.secondary' }}>
              Custom name
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                onBlur={() => setCustomName(customNameInput)}
                placeholder={PERSONAS[companion.personaId]?.name ?? t('settings.defaultCompanionName')}
                sx={{ flex: 1, '& input': { fontSize: 12 } }}
              />
            </Box>
          </Box>

          {/* Memory Controls */}
          <Divider sx={{ opacity: 0.1, my: 1.5 }} />
          <Typography variant="body2" sx={{ fontSize: 12, mb: 1, color: 'text.secondary', fontWeight: 600 }}>
            Memory ({memoryStats?.totalEntries ?? 0} entries)
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Switch
              size="small"
              checked={companion.memoryEnabled}
              onChange={(e) => setMemoryEnabled(e.target.checked)}
            />
            <Typography variant="caption" sx={{ fontSize: 11, alignSelf: 'center', color: 'text.secondary' }}>
              Enable memory persistence
            </Typography>
            <Switch
              size="small"
              checked={companion.autoSummarize}
              onChange={(e) => setAutoSummarize(e.target.checked)}
            />
            <Typography variant="caption" sx={{ fontSize: 11, alignSelf: 'center', color: 'text.secondary' }}>
              Auto-summarize chats
            </Typography>
          </Box>

          <Stack direction="row" gap={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                setMemoryCompacting(true);
                await compactMemory();
                const stats = await getMemoryStats();
                setMemoryStats(stats);
                setMemoryCompacting(false);
              }}
              disabled={memoryCompacting}
              sx={{ fontSize: 10 }}
            >
              {memoryCompacting ? 'Compacting...' : 'Compact Memory'}
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={async () => {
                setMemoryClearing(true);
                await clearAllMemories();
                setMemoryStats({ totalEntries: 0, byType: {} });
                setMemoryClearing(false);
              }}
              disabled={memoryClearing}
              sx={{ fontSize: 10 }}
            >
              {memoryClearing ? 'Clearing...' : 'Clear All Memory'}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={async () => {
                try {
                  const { generateWeeklySummary } = await import('../../services/summary/weeklySummary');
                  await generateWeeklySummary();
                } catch (e) {
                  console.error('Failed to generate weekly summary', e);
                }
              }}
              sx={{ fontSize: 10 }}
            >
              Generate Weekly Report
            </Button>
          </Stack>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* V102: Bot Channels Settings */}
        <BotChannelsSettings />

        <Divider sx={{ opacity: 0.1 }} />

        {/* V103: Plan Review Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
              🔍 Plan Review
            </Typography>
            <Switch
              size="small"
              checked={planReviewEnabled}
              onChange={(e) => setPlanReviewEnabled(e.target.checked)}
            />
          </Stack>
          {planReviewEnabled && (
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Review Model</InputLabel>
                <Select
                  value={reviewModel}
                  label="Review Model"
                  onChange={(e) => setReviewModel(e.target.value)}
                >
                  {models.filter(m => m.isEnabled).map(m => (
                    <MenuItem key={m.id} value={m.modelName}>{m.name} ({m.modelName})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* V104: Loop Detection Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
              🔄 Loop Detection
            </Typography>
            <Switch
              size="small"
              checked={loopDetectionEnabled}
              onChange={(e) => setLoopDetectionEnabled(e.target.checked)}
            />
          </Stack>
          {loopDetectionEnabled && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontSize: 11, mb: 0.5, color: 'text.secondary' }}>
                  Max Iterations: {maxIterations}
                </Typography>
                <Slider
                  size="small"
                  min={5}
                  max={50}
                  step={1}
                  value={maxIterations}
                  onChange={(_, v) => setMaxIterations(v as number)}
                  sx={{ fontSize: 10 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontSize: 11, mb: 0.5, color: 'text.secondary' }}>
                  Stall Threshold: {stallThreshold} consecutive identical responses
                </Typography>
                <Slider
                  size="small"
                  min={2}
                  max={10}
                  step={1}
                  value={stallThreshold}
                  onChange={(_, v) => setStallThreshold(v as number)}
                  sx={{ fontSize: 10 }}
                />
              </Box>
            </Box>
          )}
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* V105: Checkpoint Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
              💾 Checkpoint
            </Typography>
            <Switch
              size="small"
              checked={loopDetectionEnabled}
              onChange={(e) => setLoopDetectionEnabled(e.target.checked)}
            />
          </Stack>
          {loopDetectionEnabled && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}>
                Checkpoint saves allow you to resume interrupted agent tasks
              </Typography>
            </Box>
          )}
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Data Backup & Restore */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            💾 {t('settings.dataBackup')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                onClick={async () => {
                  try {
                    const { exportAllData, downloadJSON } = await import('../../services/backup/personaBackup');
                    const data = await exportAllData();
                    const date = new Date();
                    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
                    downloadJSON(data, `pixelpal_backup_${dateStr}.json`);
                    setError('');
                  } catch (err) {
                    setError(t('settings.exportFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
                  }
                }}
                sx={{ fontSize: 10 }}
              >
                {t('settings.exportAllData')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                onClick={async () => {
                  try {
                    const { messagesToCSV, downloadCSV } = await import('../../services/backup/csvExport');
                    const store = (await import('../../store')).useStore.getState();
                    const csv = messagesToCSV(store.messages);
                    const date = new Date();
                    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
                    downloadCSV(csv, `pixelpal_messages_${dateStr}.csv`);
                  } catch (err) {
                    setError(t('settings.exportFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
                  }
                }}
                sx={{ fontSize: 10 }}
              >
                {t('settings.exportMessagesCSV', '导出聊天记录(CSV)')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                component="label"
                startIcon={<UploadIcon sx={{ fontSize: 14 }} />}
                sx={{ fontSize: 10 }}
              >
                {t('settings.importData')}
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const { importPersonaData } = await import('../../services/backup/personaBackup');
                      const result = await importPersonaData(text);
                      if (result.success) {
                        setError('');
                        // Refresh memory stats
                        const stats = await getMemoryStats();
                        setMemoryStats(stats);
                      } else {
                        setError(result.message);
                      }
                    } catch (err) {
                      setError(t('settings.importFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
                    }
                    // Reset file input
                    e.target.value = '';
                  }}
                />
              </Button>
            </Box>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
              {t('settings.exportHint')}
            </Typography>
            {error && <Alert severity="error" sx={{ fontSize: 11 }}>{error}</Alert>}
          </Box>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Template Management — V31 */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            🎭 {t('settings.personaTemplateManagement')}
          </Typography>

          {/* Template tab buttons */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {([
              { key: 'local', label: t('settings.myTemplates') },
              { key: 'online', label: t('settings.onlineTemplateLibrary') },
              { key: 'install', label: t('settings.installTemplate') },
            ] as const).map(tab => (
              <Button
                key={tab.key}
                size="small"
                variant={activeTemplateTab === tab.key ? 'contained' : 'outlined'}
                onClick={() => setActiveTemplateTab(tab.key)}
                sx={{ fontSize: 10, flex: 1 }}
              >
                {tab.label}
              </Button>
            ))}
          </Box>

          {/* Local Templates tab */}
          {activeTemplateTab === 'local' && (
            <Box>
              {localTemplates.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11 }}>
                  {t('settings.noLocalTemplates')}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {localTemplates.map(template => (
                    <Box
                      key={template.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        bgcolor: 'rgba(0,0,0,0.2)',
                        borderRadius: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: 18 }}>{template.avatar}</Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {template.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {template.bio}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleCreateFromLocalTemplate(template)}
                        sx={{ fontSize: 9, minWidth: 'auto', p: 0.5 }}
                      >
                        {t('settings.createPersona')}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => removeLocalTemplate(template.id)}
                        sx={{ p: 0.5 }}
                      >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Online Templates tab */}
          {activeTemplateTab === 'online' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {ONLINE_TEMPLATES.map(template => (
                <Box
                  key={template.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 18 }}>{template.avatar}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                        {template.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {template.tags.slice(0, 2).map(tag => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ height: 14, fontSize: 8 }}
                          />
                        ))}
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block' }}>
                      {template.description}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleInstallOnlineTemplate(template)}
                    sx={{ fontSize: 9, minWidth: 'auto', p: 0.5 }}
                  >
                    {t('settings.install')}
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          {/* Install from code tab */}
          {activeTemplateTab === 'install' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder={t('settings.pasteShareCode')}
                  value={installCode}
                  onChange={(e) => {
                    setInstallCode(e.target.value);
                    setInstallPreview(null);
                    setInstallError('');
                  }}
                  fullWidth
                  sx={{ fontSize: 11 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleDecodeInstallCode}
                  sx={{ fontSize: 10, minWidth: 'auto', whiteSpace: 'nowrap' }}
                >
                  {t('settings.parse')}
                </Button>
              </Box>

              {/* Preview */}
              {installPreview && (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography sx={{ fontSize: 20 }}>{installPreview.avatar}</Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                        {installPreview.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                        {installPreview.voiceType === 'warm' ? t('persona.warm') : installPreview.voiceType === 'rational' ? t('persona.rational') : installPreview.voiceType === 'humorous' ? t('persona.humorous') : t('persona.serious')}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block' }}>
                    {installPreview.bio}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleInstallTemplate}
                    sx={{ mt: 1, fontSize: 10 }}
                  >
                    {t('settings.installThisTemplate')}
                  </Button>
                </Box>
              )}

              {installError && <Alert severity="error" sx={{ fontSize: 10 }}>{installError}</Alert>}
              {installSuccess && <Alert severity="success" sx={{ fontSize: 10 }}>{installSuccess}</Alert>}
            </Box>
          )}

          {(installSuccess || installError) && (
            <Box sx={{ mt: 1 }}>
              {installSuccess && <Alert severity="success" sx={{ fontSize: 10 }}>{installSuccess}</Alert>}
              {installError && <Alert severity="error" sx={{ fontSize: 10 }}>{installError}</Alert>}
            </Box>
          )}
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Voice Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            🎙️ Voice Settings
          </Typography>

          {/* Voice support status */}
          {!voiceSupported.stt && !voiceSupported.tts && (
            <Alert severity="warning" sx={{ fontSize: 11, mb: 2 }}>
              Your browser does not support Web Speech API (Speech Recognition or Synthesis).
            </Alert>
          )}

          {/* Voice Input (STT) */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Switch
                size="small"
                checked={voiceSettings.sttEnabled}
                onChange={(e) => setVoiceSettings({ sttEnabled: e.target.checked })}
                disabled={!voiceSupported.stt}
              />
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                Voice Input (Speech-to-Text)
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', pl: 4, display: 'block' }}>
              {voiceSupported.stt
                ? 'Click the mic button in chat to speak your message'
                : 'Not supported in this browser'}
            </Typography>
          </Box>

          {/* Voice Output (TTS) */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Switch
                size="small"
                checked={voiceSettings.ttsEnabled}
                onChange={(e) => setVoiceSettings({ ttsEnabled: e.target.checked })}
                disabled={!voiceSupported.tts}
              />
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                Voice Output (Text-to-Speech)
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', pl: 4, display: 'block' }}>
              {voiceSupported.tts
                ? 'PixelPal will speak AI responses aloud'
                : 'Not supported in this browser'}
            </Typography>
          </Box>

          {/* TTS Settings (only show if TTS is enabled and supported) */}
          {voiceSettings.ttsEnabled && voiceSupported.tts && (
            <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Voice Selection */}
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: 12 }}>Voice</InputLabel>
                <Select
                  value={voiceSettings.ttsVoice || availableVoices[0]?.name || ''}
                  label="Voice"
                  onChange={(e) => setVoiceSettings({ ttsVoice: e.target.value })}
                  sx={{ fontSize: 12 }}
                >
                  {availableVoices.map((voice) => (
                    <MenuItem key={voice.name} value={voice.name} sx={{ fontSize: 11 }}>
                      {voice.name} ({voice.lang})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Speed (Rate) */}
              <Box>
                <Typography variant="body2" sx={{ fontSize: 11, mb: 0.5, color: 'text.secondary' }}>
                  Speed: {voiceSettings.ttsRate.toFixed(1)}x
                </Typography>
                <Slider
                  size="small"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={voiceSettings.ttsRate}
                  onChange={(_, v) => setVoiceSettings({ ttsRate: v as number })}
                  sx={{ fontSize: 10 }}
                />
              </Box>

              {/* Volume */}
              <Box>
                <Typography variant="body2" sx={{ fontSize: 11, mb: 0.5, color: 'text.secondary' }}>
                  Volume: {Math.round(voiceSettings.ttsVolume * 100)}%
                </Typography>
                <Slider
                  size="small"
                  min={0}
                  max={1}
                  step={0.1}
                  value={voiceSettings.ttsVolume}
                  onChange={(_, v) => setVoiceSettings({ ttsVolume: v as number })}
                  sx={{ fontSize: 10 }}
                />
              </Box>

              {/* Test TTS Button */}
              <Button
                size="small"
                variant="outlined"
                onClick={() => voiceService.speak('Hello! This is PixelPal speaking.')}
                sx={{ fontSize: 10, alignSelf: 'flex-start' }}
              >
                🔊 Test Voice
              </Button>
            </Box>
          )}
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Language Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            {t('settings.languageLabel')}
          </Typography>

          <FormControl size="small" fullWidth>
            <InputLabel>{t('settings.selectLanguage')}</InputLabel>
            <Select
              value={useStore((s) => s.language)}
              label={t('settings.selectLanguage')}
              onChange={(e) => {
                const lang = e.target.value as 'zh' | 'en';
                useStore.getState().setLanguage(lang);
                // Sync with i18n
                import('../../services/i18n').then(({ changeLanguage }) => {
                  changeLanguage(lang);
                });
              }}
            >
              <MenuItem value="zh">{t('settings.chinese')}</MenuItem>
              <MenuItem value="en">{t('settings.english')}</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Desktop App Settings (Electron only) */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }} id="desktop-settings">
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            🖥️ Desktop App
          </Typography>

          <List dense disablePadding>
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>Run at Startup</Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    Launch PixelPal when you log in
                  </Typography>
                </Box>
                <Switch
                  size="small"
                  checked={desktopSettings.openAtLogin}
                  onChange={handleDesktopSettingChange('openAtLogin')}
                />
              </Box>
            </ListItem>

            <ListItem sx={{ px: 0, py: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>Show in System Tray</Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    Keep running in background when closed
                  </Typography>
                </Box>
                <Switch size="small" checked={true} disabled />
              </Box>
            </ListItem>

            <ListItem sx={{ px: 0, py: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>Always on Top</Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    Keep window above other windows
                  </Typography>
                </Box>
                <Switch
                  size="small"
                  checked={desktopSettings.alwaysOnTop}
                  onChange={handleDesktopSettingChange('alwaysOnTop')}
                />
              </Box>
            </ListItem>

            <ListItem sx={{ px: 0, py: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>Desktop Notifications</Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    Show system notifications
                  </Typography>
                </Box>
                <Switch
                  size="small"
                  checked={desktopSettings.notificationsEnabled}
                  onChange={handleDesktopSettingChange('notificationsEnabled')}
                />
              </Box>
            </ListItem>

            <ListItem sx={{ px: 0, py: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={testNotification}
                sx={{ fontSize: 11 }}
              >
                Test Notification
              </Button>
            </ListItem>
          </List>

          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', mt: 1, display: 'block' }}>
            Global shortcut: Ctrl+Shift+P to show window
          </Typography>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* AI Models Configuration */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
                🤖 AI Models
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                {enabledCount} model(s) configured with API keys
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              onClick={handleOpenAddDialog}
              sx={{ fontSize: 11 }}
            >
              Add Model
            </Button>
          </Box>

          {/* Models List */}
          <List dense disablePadding sx={{ mb: 1 }}>
            {sortedModels.map((model) => {
              const test = testStatus[model.id];
              return (
                <ListItem
                  key={model.id}
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: 1,
                    mb: 0.5,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Tooltip title={model.isEnabled ? 'Disable' : 'Enable'}>
                        <Switch
                          size="small"
                          checked={model.isEnabled}
                          onChange={() => handleToggleModelEnabled(model.id)}
                        />
                      </Tooltip>
                      <IconButton size="small" onClick={() => handleOpenEditDialog(model)}>
                        <EditIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteModel(model.id)}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DragIcon sx={{ fontSize: 14, opacity: 0.5, cursor: 'grab' }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {model.name}
                        </Typography>
                        <Chip
                          label={PROVIDER_LABELS[model.provider] || model.provider}
                          size="small"
                          sx={{ height: 16, fontSize: 9 }}
                        />
                        {!model.apiKey && (
                          <Chip
                            label="No API Key"
                            size="small"
                            color="warning"
                            sx={{ height: 16, fontSize: 9 }}
                          />
                        )}
                        {model.isEnabled && model.apiKey && (
                          <Chip
                            label="Ready"
                            size="small"
                            color="success"
                            sx={{ height: 16, fontSize: 9 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {model.modelName} · Priority: {model.priority}
                      </Typography>
                      {test && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 10,
                            display: 'block',
                            color: test.success ? 'success.main' : 'error.main'
                          }}
                        >
                          {test.loading ? '⏳ Testing...' : test.success ? '✓ ' + test.message : '✗ ' + test.message}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleTestModel(model)}
                      disabled={test?.loading || !model.apiKey}
                      sx={{ fontSize: 10, minWidth: 'auto', p: 0.5 }}
                    >
                      Test
                    </Button>
                  </Box>
                </ListItem>
              );
            })}
          </List>

          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', display: 'block' }}>
            Models are tried in priority order (0 = highest). If the primary model fails, the next enabled model is used automatically.
          </Typography>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Legacy AI Configuration (for backward compatibility) */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
              ⚙️ Legacy AI Config
            </Typography>
            <Button
              size="small"
              onClick={() => setModelsExpanded(!modelsExpanded)}
              endIcon={modelsExpanded ? <CollapseIcon /> : <ExpandIcon />}
              sx={{ fontSize: 10 }}
            >
              {modelsExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </Box>

          <Collapse in={modelsExpanded}>
            <Stack gap={2}>
              <Alert severity="info" sx={{ fontSize: 11 }}>
                This section is for backward compatibility. The new AI Models section above is recommended.
              </Alert>

              <FormControl size="small" fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={formData.provider}
                  label="Provider"
                  onChange={(e) => {
                    const defaultModels: Record<string, string> = {
                      openai: 'gpt-4o-mini',
                      anthropic: 'claude-3-5-sonnet-20241022',
                      minimax: 'MiniMax-Text-01',
                      xiaomi: 'mimo-v2-pro',
                      zhipu: 'glm-4',
                      qwen: 'qwen-plus',
                    };
                    const defaultBaseUrls: Record<string, string> = {
                      openai: 'https://api.openai.com/v1',
                      anthropic: 'https://api.anthropic.com/v1',
                      minimax: 'https://api.minimax.chat/v1',
                      xiaomi: 'https://account.platform.minimax.io',
                      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
                      qwen: 'https://dashscope.aliyuncs.com/api/v1',
                    };
                    setFormData({
                      ...formData,
                      provider: e.target.value as typeof formData.provider,
                      model: defaultModels[e.target.value] || 'gpt-4o-mini',
                      baseURL: defaultBaseUrls[e.target.value] || '',
                    });
                  }}
                >
                  <MenuItem value="openai">{PROVIDER_LABELS.openai}</MenuItem>
                  <MenuItem value="anthropic">{PROVIDER_LABELS.anthropic}</MenuItem>
                  <MenuItem value="minimax">{PROVIDER_LABELS.minimax}</MenuItem>
                  <MenuItem value="xiaomi">{PROVIDER_LABELS.xiaomi}</MenuItem>
                  <MenuItem value="zhipu">{PROVIDER_LABELS.zhipu}</MenuItem>
                  <MenuItem value="qwen">{PROVIDER_LABELS.qwen}</MenuItem>
                  <MenuItem value="feishu">{PROVIDER_LABELS.feishu}</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                size="small"
                fullWidth
                placeholder="e.g., gpt-4o-mini"
              />

              <TextField
                label="API Key"
                type={showKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                size="small"
                fullWidth
                placeholder="sk-..."
                InputProps={{
                  endAdornment: (
                    <Button size="small" onClick={() => setShowKey(!showKey)} sx={{ minWidth: 'auto', p: 0.5 }}>
                      {showKey ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                    </Button>
                  ),
                }}
                helperText={
                  <Typography variant="caption" sx={{ fontSize: 10 }}>
                    Stored locally in your browser. Never sent to our servers.
                  </Typography>
                }
              />

              {(formData.provider === 'custom' || formData.provider === 'azure-openai') && (
                <TextField
                  label="Base URL"
                  value={formData.baseURL || ''}
                  onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
                  size="small"
                  fullWidth
                  placeholder="https://api.openai.com/v1"
                />
              )}
            </Stack>
          </Collapse>
        </Paper>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Gmail Settings */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            📧 Gmail Integration
          </Typography>

          {emailAccount ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  Connected: <strong>{emailAccount.email}</strong>
                </Typography>
              </Box>
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={handleDisconnectGmail}
                sx={{ fontSize: 11 }}
              >
                Disconnect
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
              Connect Gmail from the Email panel using OAuth.
            </Typography>
          )}
        </Paper>

        {/* V52: Keyboard Shortcuts */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <KeyboardIcon sx={{ fontSize: 16 }} />
            <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
              ⌨️ 快捷键
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', mb: 2, display: 'block' }}>
            使用快捷键快速操作。在输入框中不生效。
          </Typography>
          <List dense disablePadding>
            {HOTKEY_DEFINITIONS.map((hotkey) => {
              const enabled = hotkeySettings[hotkey.id] ?? true;
              return (
                <ListItem
                  key={hotkey.id}
                  sx={{
                    px: 0,
                    py: 0.5,
                    bgcolor: 'rgba(0,0,0,0.15)',
                    borderRadius: 1,
                    mb: 0.5,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                  secondaryAction={
                    <Switch
                      size="small"
                      checked={enabled}
                      onChange={() => toggleHotkey(hotkey.id)}
                      sx={{ mt: 0.5 }}
                    />
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 5 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                        {hotkey.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {hotkey.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={hotkey.shortcut}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontFamily: 'monospace',
                        bgcolor: enabled ? 'rgba(94,106,210,0.2)' : 'rgba(255,255,255,0.05)',
                        color: enabled ? 'primary.main' : 'text.disabled',
                      }}
                    />
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {/* Webhook Settings */}
        <WebhookSettings />

        {/* About */}
        <Paper sx={{ p: 2, bgcolor: 'var(--bg-input)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            ℹ️ About PixelPal
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
            PixelPal — A pixel art AI companion and productivity assistant.
            <br />
            All AI features use your own API key. No data leaves your browser except to the AI provider you configure.
          </Typography>
          <VersionInfo />
        </Paper>

        {error && <Alert severity="error" sx={{ fontSize: 12 }} onClose={() => setError('')}>{error}</Alert>}
        {saved && <Alert severity="success" sx={{ fontSize: 12 }}>Settings saved!</Alert>}

        <Button
          variant="contained"
          startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
          onClick={handleLegacySave}
          fullWidth
          sx={{ fontSize: 13 }}
        >
          Save Legacy Settings
        </Button>
          </>
        )}
      </Box>

      {/* Add/Edit Model Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14 }}>
          {isAddingModel ? 'Add New Model' : 'Edit Model'}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField
              label="Model Name"
              value={dialogModel.name || ''}
              onChange={(e) => setDialogModel({ ...dialogModel, name: e.target.value })}
              size="small"
              fullWidth
              placeholder="e.g., My Custom Model"
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={dialogModel.provider || 'openai'}
                label="Provider"
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Model Name"
              value={dialogModel.modelName || ''}
              onChange={(e) => setDialogModel({ ...dialogModel, modelName: e.target.value })}
              size="small"
              fullWidth
              placeholder="e.g., gpt-4o-mini, claude-3-5-sonnet"
            />

            <TextField
              label="API Base URL"
              value={dialogModel.apiBaseUrl || ''}
              onChange={(e) => setDialogModel({ ...dialogModel, apiBaseUrl: e.target.value })}
              size="small"
              fullWidth
              placeholder="https://api.openai.com/v1"
            />

            <TextField
              label="API Key"
              type={showKey ? 'text' : 'password'}
              value={dialogModel.apiKey || ''}
              onChange={(e) => setDialogModel({ ...dialogModel, apiKey: e.target.value })}
              size="small"
              fullWidth
              placeholder="sk-..."
              InputProps={{
                endAdornment: (
                  <Button size="small" onClick={() => setShowKey(!showKey)} sx={{ minWidth: 'auto', p: 0.5 }}>
                    {showKey ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                  </Button>
                ),
              }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Temperature"
                type="number"
                value={dialogModel.temperature ?? 0.7}
                onChange={(e) => setDialogModel({ ...dialogModel, temperature: parseFloat(e.target.value) })}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ min: 0, max: 2, step: 0.1 }}
              />
              <TextField
                label="Max Tokens"
                type="number"
                value={dialogModel.maxTokens ?? 4096}
                onChange={(e) => setDialogModel({ ...dialogModel, maxTokens: parseInt(e.target.value) || 4096 })}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ min: 100, max: 100000, step: 100 }}
              />
            </Box>

            <TextField
              label="Priority (0 = highest)"
              type="number"
              value={dialogModel.priority ?? models.length}
              onChange={(e) => setDialogModel({ ...dialogModel, priority: parseInt(e.target.value) || 0 })}
              size="small"
              fullWidth
              inputProps={{ min: 0, step: 1 }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Enabled</InputLabel>
              <Select
                value={dialogModel.isEnabled ? 'true' : 'false'}
                label="Enabled"
                onChange={(e) => setDialogModel({ ...dialogModel, isEnabled: e.target.value === 'true' })}
              >
                <MenuItem value="true">Enabled</MenuItem>
                <MenuItem value="false">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} size="small">Cancel</Button>
          <Button onClick={handleSaveDialog} variant="contained" size="small" disabled={!dialogModel.name || !dialogModel.provider || !dialogModel.modelName}>
            {isAddingModel ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper to get base URLs
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  minimax: 'https://api.minimax.chat/v1',
  'minimax-cn': 'https://api.minimaxi.com/anthropic',
  xiaomi: 'https://account.platform.minimax.io',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  qwen: 'https://dashscope.aliyuncs.com/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  'azure-openai': '',
  custom: '',
};

export default Settings;
