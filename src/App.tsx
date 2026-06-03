import { useEffect } from 'react';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { Box } from './components/ui/Box';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainPage } from './pages/MainPage';
import { SkillStorePage } from './pages/SkillStorePage';
import { SkillDevPage } from './pages/SkillDevPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { SettingsSubRouteRedirect } from './pages/SettingsSubRouteRedirect';
import { KnowledgePage } from './pages/KnowledgePage';
import { useStore } from './store';
import { initCompanion } from './services/companion';
import { compactMemory } from './services/memory';
import { checkGreeting, checkReminders } from './services/actions/ActionTrigger';
import { applyPersonaTheme, resetPersonaTheme } from './utils/personaTheme';
import { getAllPersonas } from './services/persona/personaStorage';
import { generateYesterdaySummaryIfNeeded } from './services/summary/dailySummary';
import { checkAndCreateMilestones } from './services/milestone/milestoneTracker';
import { pluginRegistry } from './services/plugins/pluginRegistry';
import { initToolRegistry } from './services/tools/init';
import { applyCustomTheme } from './utils/appTheme';
import { useHotkeys } from './hooks/useHotkeys';
import { CostAlertToast } from './components/Usage/CostAlertToast';
import { unifiedMessageBus, webChannelAdapter, botConfigManager } from './services/bus';
import { useMacTheme, type MacThemeMode } from './hooks/useMacTheme';
import { createMacMuiTheme } from './theme/createMacMuiTheme';
import { MacAppShell, MacSourceList, MacItemList, MacPanelToolbar } from './components/macos';
import { useTranslation } from 'react-i18next';
import './services/i18n';
import './styles/mobile.css';
import './styles/macos-tokens.css';

function resolveShellTitle(pathname: string, activePanel: string, t: (key: string, fallback?: string) => string) {
  if (pathname.startsWith('/skill-store')) return `PixelPal — ${t('skillStore.title', '技能商店')}`;
  if (pathname.startsWith('/skill-dev')) return `PixelPal — ${t('skillDev.title', '技能开发')}`;
  return `PixelPal — ${t(`nav.${activePanel}`, activePanel)}`;
}

function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const activePanel = useStore((s) => s.activePanel);
  const title = resolveShellTitle(location.pathname, activePanel, t);

  return (
    <MacAppShell
      title={title}
      toolbar={<MacPanelToolbar panel={activePanel} />}
      source={<MacSourceList />}
      itemList={<MacItemList panel={activePanel} />}
      detail={
        <Box
          css={{
            flex: 1,
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/skill-store" element={<SkillStorePage splitLayout />} />
            <Route path="/skill-store/:category" element={<SkillStorePage splitLayout />} />
            <Route path="/skill-dev" element={<SkillDevPage splitLayout />} />
            <Route path="/settings/providers" element={<SettingsSubRouteRedirect section="providers" />} />
            <Route path="/settings/usage" element={<SettingsSubRouteRedirect section="usage" />} />
            <Route path="/knowledge" element={<KnowledgePage splitLayout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CostAlertToast />
        </Box>
      }
    />
  );
}

function App() {
  // V52: Register global keyboard shortcuts
  useHotkeys();

  const companion = useStore((s) => s.companion);
  const personaFollowTheme = useStore((s) => s.personaFollowTheme);
  const activePersonaId = useStore((s) => s.activePersonaId);

  const appThemeMode = useStore((s) => s.appThemeMode);
  const appThemePresetId = useStore((s) => s.appThemePresetId);
  const customTheme = useStore((s) => s.customTheme);

  const macMode: MacThemeMode =
    appThemeMode === 'minimax'
      ? 'light'
      : appThemeMode === 'system'
        ? 'system'
        : appThemePresetId === 'sunset' || appThemePresetId === 'forest'
          ? (appThemePresetId as MacThemeMode)
          : (appThemeMode as MacThemeMode);

  const { resolvedPresetId } = useMacTheme({
    mode: appThemeMode === 'minimax' ? 'light' : appThemeMode === 'system' ? 'system' : macMode,
    presetId: appThemePresetId,
  });

  const muiTheme = createMacMuiTheme(resolvedPresetId === 'light' ? 'light' : 'dark');

  // Keep custom preset compatibility until custom is handled in useMacTheme.
  useEffect(() => {
    if (appThemePresetId === 'custom' && customTheme) {
      applyCustomTheme(customTheme);
    }
  }, [appThemePresetId, customTheme]);

  // Initialize companion service and memory on startup
  useEffect(() => {
    const init = async () => {
      // V101: Initialize UnifiedMessageBus with WebChannelAdapter
      unifiedMessageBus.registerAdapter(webChannelAdapter);

      // V102: Conditionally register bot channel adapters based on user config
      const config = botConfigManager.getConfig();
      if (config.telegram.enabled && config.telegram.token) {
        // Dynamic import to avoid bundling node-telegram-bot-api in GitHub Pages
        import('./services/bus/adapters/TelegramChannelAdapter')
          .then(async ({ telegramChannelAdapter }) => {
            await telegramChannelAdapter.start();
            unifiedMessageBus.registerAdapter(telegramChannelAdapter);
            console.log('[App] Telegram channel adapter registered');
          })
          .catch((e) => console.warn('[App] Failed to load Telegram adapter:', e));
      }
      if (config.discord.enabled && config.discord.token) {
        // Dynamic import to avoid bundling discord.js in GitHub Pages
        import('./services/bus/adapters/DiscordChannelAdapter')
          .then(async ({ discordChannelAdapter }) => {
            await discordChannelAdapter.start();
            unifiedMessageBus.registerAdapter(discordChannelAdapter);
            console.log('[App] Discord channel adapter registered');
          })
          .catch((e) => console.warn('[App] Failed to load Discord adapter:', e));
      }

      await initCompanion(companion.personaId, companion.moodId, companion.customName);
      // Compact memory if needed (runs in background)
      compactMemory().catch(() => {});
      // Trigger proactive actions on app open
      checkGreeting();
      checkReminders();

      // V32: Generate yesterday's summary if > 24 hours since last summary
      generateYesterdaySummaryIfNeeded().catch(() => {});

      // V35: Check active day milestones for all personas on startup
      const personas = getAllPersonas();
      for (const p of personas) {
        checkAndCreateMilestones(p.id).catch(() => {});
      }

      // V59: Load plugin system
      pluginRegistry.loadPlugins().catch(() => {});

      // V126: Initialize MCP Tool Registry
      initToolRegistry().catch(console.error);

      // Apply initial persona theme if enabled
      if (personaFollowTheme) {
        const persona = getAllPersonas().find((p) => p.id === activePersonaId);
        if (persona?.theme) {
          applyPersonaTheme(persona.theme);
        }
      } else {
        resetPersonaTheme();
      }

      // Intimacy decay: check last active time for each persona on app load
      const { personaIntimacy, setPersonaIntimacy } = useStore.getState();
      const allPersonas = getAllPersonas();
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      for (const p of allPersonas) {
        const lastActive = localStorage.getItem(`persona_lastActive_${p.id}`);
        if (lastActive) {
          const elapsed = now - parseInt(lastActive, 10);
          const current = personaIntimacy[p.id] || 0;
          if (elapsed > 30 * DAY && current > 5) {
            // Dormant: reduce to 5
            setPersonaIntimacy(p.id, 5);
          } else if (elapsed > 7 * DAY && current > 0) {
            // Decay by 5
            setPersonaIntimacy(p.id, Math.max(0, current - 5));
          }
        }
      }
    };
    init();
  }, []);

  return (
    <HashRouter>
      <ThemeProvider theme={muiTheme}>
        <AppShell />
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
