/**
 * Preset Plugins — always available, never stored in IndexedDB
 *
 * These are loaded at runtime and registered into the PluginRegistry.
 * Their handlers are live JavaScript functions.
 */

import type { Plugin } from '../../types/plugin';

// --- Weather Plugin ---
const weatherPlugin: Plugin = {
  id: 'weather-plugin',
  name: 'Weather',
  version: '1.0.0',
  author: 'PixelPal',
  description: 'Get current weather for any city',
  icon: '🌤️',
  enabled: true,
  permissions: [],
  actions: [
    {
      id: 'getWeather',
      name: 'getWeather',
      params: ['city'],
      handler: async ({ city }) => {
        // Mock weather data
        const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Snowy'];
        const temps = { 'Beijing': 18, 'Shanghai': 22, 'Tokyo': 20, 'New York': 15, 'London': 12, 'default': 20 };
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const temp = temps[city as keyof typeof temps] ?? temps['default'];
        return JSON.stringify({ city, temperature: temp, condition, humidity: Math.floor(Math.random() * 50) + 30 });
      },
    },
  ],
};

// --- Calculator Plugin ---
const calcPlugin: Plugin = {
  id: 'calc-plugin',
  name: 'Calculator',
  version: '1.0.0',
  author: 'PixelPal',
  description: 'Evaluate mathematical expressions',
  icon: '🔢',
  enabled: true,
  permissions: [],
  actions: [
    {
      id: 'calculate',
      name: 'calculate',
      params: ['expr'],
      handler: async ({ expr }) => {
        try {
          // Safe eval — only allow math operators and numbers
          const sanitized = expr.replace(/[^0-9+\-*/.()e ]/gi, '');
          // eslint-disable-next-line no-new-func
          const result = new Function(`return (${sanitized})`)();
          return String(result);
        } catch {
          return 'Error: invalid expression';
        }
      },
    },
  ],
};

// --- Translation Plugin ---
const translatePlugin: Plugin = {
  id: 'translate-plugin',
  name: 'Translator',
  version: '1.0.0',
  author: 'PixelPal',
  description: 'Translate text between languages',
  icon: '🌐',
  enabled: true,
  permissions: [],
  actions: [
    {
      id: 'translate',
      name: 'translate',
      params: ['text', 'from', 'to'],
      handler: async ({ text, from, to }) => {
        // Mock translation — in production this would call a translation API
        return `[${from} → ${to}] ${text}`;
      },
    },
  ],
};

export const presetPlugins: Plugin[] = [
  weatherPlugin,
  calcPlugin,
  translatePlugin,
];
