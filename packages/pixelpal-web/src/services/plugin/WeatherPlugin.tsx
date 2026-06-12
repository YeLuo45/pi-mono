// WeatherPlugin — Open-Meteo API integration
// No API key required. Uses free Open-Meteo weather + geocoding APIs.
import React from 'react';
import { MyTypography as Typography, MyTextField as TextField, MyButton as Button, MyPaper as Paper, MyStack as Stack, MyChip as Chip, MyCircularProgress as CircularProgress } from '../../components/MUI替代';
import { Box } from '../../components/ui/Box';
import { WbSunny, Cloud, Grain, Air, WaterDrop } from '@mui/icons-material';
import { createPluginStorage } from './pluginStorage';
import { PluginService } from './PluginService';
import type { Plugin } from './types';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

interface WeatherData {
  city: string;
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  humidity?: number;
  timestamp: number;
}

const WEATHER_CODES: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: 'Clear sky', icon: <WbSunny sx={{ color: '#FFB300' }} /> },
  1: { label: 'Mainly clear', icon: <WbSunny sx={{ color: '#FFB300' }} /> },
  2: { label: 'Partly cloudy', icon: <Cloud sx={{ color: '#90A4AE' }} /> },
  3: { label: 'Overcast', icon: <Cloud sx={{ color: '#78909C' }} /> },
  45: { label: 'Foggy', icon: <Cloud sx={{ color: '#B0BEC5' }} /> },
  48: { label: 'Depositing rime fog', icon: <Cloud sx={{ color: '#B0BEC5' }} /> },
  51: { label: 'Light drizzle', icon: <WaterDrop sx={{ color: '#4FC3F7' }} /> },
  53: { label: 'Moderate drizzle', icon: <WaterDrop sx={{ color: '#29B6F6' }} /> },
  55: { label: 'Dense drizzle', icon: <WaterDrop sx={{ color: '#039BE5' }} /> },
  61: { label: 'Slight rain', icon: <WaterDrop sx={{ color: '#4FC3F7' }} /> },
  63: { label: 'Moderate rain', icon: <WaterDrop sx={{ color: '#29B6F6' }} /> },
  65: { label: 'Heavy rain', icon: <WaterDrop sx={{ color: '#0277BD' }} /> },
  71: { label: 'Slight snow', icon: <Grain sx={{ color: '#E0E0E0' }} /> },
  73: { label: 'Moderate snow', icon: <Grain sx={{ color: '#BDBDBD' }} /> },
  75: { label: 'Heavy snow', icon: <Grain sx={{ color: '#9E9E9E' }} /> },
  80: { label: 'Slight rain showers', icon: <WaterDrop sx={{ color: '#4FC3F7' }} /> },
  81: { label: 'Moderate rain showers', icon: <WaterDrop sx={{ color: '#29B6F6' }} /> },
  82: { label: 'Violent rain showers', icon: <WaterDrop sx={{ color: '#0277BD' }} /> },
  95: { label: 'Thunderstorm', icon: <Cloud sx={{ color: '#546E7A' }} /> },
  96: { label: 'Thunderstorm with slight hail', icon: <Cloud sx={{ color: '#455A64' }} /> },
  99: { label: 'Thunderstorm with heavy hail', icon: <Cloud sx={{ color: '#37474F' }} /> },
};

async function geocode(city: string): Promise<{ lat: number; lon: number } | null> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data.results?.length) return null;
  return { lat: data.results[0].latitude, lon: data.results[0].longitude };
}

async function fetchWeather(lat: number, lon: number): Promise<Omit<WeatherData, 'city'>> {
  const url = `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  const cw = data.current_weather;
  const humidity = data.hourly?.relative_humidity_2m?.[0];
  return {
    temperature: cw.temperature,
    windSpeed: cw.windspeed,
    weatherCode: cw.weathercode,
    isDay: cw.is_day === 1,
    humidity,
    timestamp: Date.now(),
  };
}

export const WeatherPanel: React.FC<{ pluginId: string }> = ({ pluginId }) => {
  const storage = createPluginStorage(pluginId);
  const [inputCity, setInputCity] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [weather, setWeather] = React.useState<WeatherData | null>(null);
  const [error, setError] = React.useState('');
  const [lastFetched, setLastFetched] = React.useState<number | null>(null);

  // Load cached weather
  React.useEffect(() => {
    storage.get<WeatherData>('weather').then((w) => {
      if (w) {
        setWeather(w);
        setInputCity(w.city);
        setLastFetched(w.timestamp);
      }
    });
  }, []);

  const handleFetch = async () => {
    if (!inputCity.trim()) return;
    setLoading(true);
    setError('');
    try {
      const coords = await geocode(inputCity.trim());
      if (!coords) {
        setError('City not found. Try a different name.');
        return;
      }
      const data = await fetchWeather(coords.lat, coords.lon);
      const weatherData: WeatherData = { ...data, city: inputCity.trim() };
      await storage.set('weather', weatherData);
      await storage.set('lastCity', inputCity.trim());
      setWeather(weatherData);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  const codeInfo = weather ? (WEATHER_CODES[weather.weatherCode] ?? WEATHER_CODES[0]) : null;

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
        🌤️ Weather
      </Typography>

      <Stack direction="row" gap={1}>
        <TextField
          size="small"
          placeholder="Enter city name..."
          value={inputCity}
          onChange={(e) => setInputCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          sx={{ flex: 1, '& input': { fontSize: 12 } }}
        />
        <Button size="small" variant="outlined" onClick={handleFetch} disabled={loading} sx={{ fontSize: 11 }}>
          {loading ? <CircularProgress size={14} /> : 'Fetch'}
        </Button>
      </Stack>

      {error && (
        <Typography variant="caption" sx={{ fontSize: 11, color: 'error.main' }}>
          {error}
        </Typography>
      )}

      {weather && (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {codeInfo?.icon}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontSize: 14, fontWeight: 700 }}>
                {weather.city}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {codeInfo?.label}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontSize: 22, fontWeight: 800 }}>
              {Math.round(weather.temperature)} C
            </Typography>
          </Box>

          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip
              icon={<Air sx={{ fontSize: 12 }} />}
              label={`${weather.windSpeed} km/h`}
              size="small"
              sx={{ fontSize: 9, height: 20 }}
            />
            {weather.humidity !== undefined && (
              <Chip
                icon={<WaterDrop sx={{ fontSize: 12 }} />}
                label={`${weather.humidity}%`}
                size="small"
                sx={{ fontSize: 9, height: 20 }}
              />
            )}
          </Stack>

          {lastFetched && (
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', display: 'block', mt: 0.5 }}>
              Updated: {new Date(lastFetched).toLocaleTimeString()}
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export const WeatherPlugin: Plugin = {
  id: 'weather',
  name: 'Weather',
  version: '1.0.0',
  icon: '🌤️',
  panel: WeatherPanel,
  capabilities: [
    { type: 'panel' },
    {
      type: 'ai_tool',
      name: 'get_weather',
    },
    {
      type: 'trigger',
      event: 'weather_reminder',
    },
  ],
  configSchema: {
    type: 'object',
    properties: {
      defaultCity: { type: 'string', description: 'Default city for weather' },
    },
  },
  onInit: () => {
    console.log('[WeatherPlugin] Initialized');
    // Register the get_weather AI tool handler
    PluginService.registerTool('weather', 'get_weather', async (args: unknown) => {
      const { city } = args as { city?: string };
      const storage = createPluginStorage('weather');
      let targetCity = city;

      if (!targetCity) {
        // Try to get last city from storage
        const lastCity = await storage.get<string>('lastCity');
        if (lastCity) targetCity = lastCity;
      }

      if (!targetCity) {
        throw new Error('No city specified and no previously saved city found. Please provide a city name.');
      }

      // Geocode
      const geoUrl = `${GEOCODE_URL}?name=${encodeURIComponent(targetCity)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error('Geocoding request failed');
      const geoData = await geoRes.json();
      if (!geoData.results?.length) throw new Error(`City not found: ${targetCity}`);
      const { latitude: lat, longitude: lon } = geoData.results[0];

      // Fetch weather
      const weatherUrl = `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Weather fetch failed');
      const weatherData = await weatherRes.json();
      const cw = weatherData.current_weather;
      const humidity = weatherData.hourly?.relative_humidity_2m?.[0];

      const codeInfo = WEATHER_CODES[cw.weathercode] ?? WEATHER_CODES[0];

      return {
        city: targetCity,
        temperature: Math.round(cw.temperature),
        temperatureUnit: '°C',
        condition: codeInfo.label,
        windSpeed: cw.windspeed,
        humidity: humidity ?? null,
        isDay: cw.is_day === 1,
      };
    });
  },
};
