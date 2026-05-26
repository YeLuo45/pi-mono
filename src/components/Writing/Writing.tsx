import React, { useState } from 'react';
import { MyBox as Box, MyTypography as Typography, MyTextField as TextField, MyButton as Button, MyCircularProgress as CircularProgress, MyTabs as Tabs, MyAlert as Alert, MyDivider as Divider , MyTab as Tab } from '../MUI替代';
import { AutoAwesome as SparkIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { writingChatCompletion, initModelRegistry } from '../../services/ai/model-registry-adapter';

type WritingMode = 'generate' | 'continue' | 'polish' | 'summarize';

const MODE_LABELS: Record<WritingMode, { label: string; desc: string; placeholder: string }> = {
  generate: {
    label: 'Generate',
    desc: 'Create an article from an outline',
    placeholder: 'Enter your article outline in Markdown format...\n\nExample:\n# Introduction\n- Hook the reader\n- State the thesis\n\n# Main Body\n- Point 1 with supporting evidence\n- Point 2 with examples\n- Point 3 analysis\n\n# Conclusion\n- Summarize key points\n- Call to action',
  },
  continue: {
    label: 'Continue',
    desc: 'Continue writing from existing content',
    placeholder: 'Paste your existing content here...',
  },
  polish: {
    label: 'Polish',
    desc: 'Improve and refine your writing',
    placeholder: 'Paste content to polish...',
  },
  summarize: {
    label: 'Summarize',
    desc: 'Create a concise summary',
    placeholder: 'Paste content to summarize...',
  },
};

export const Writing: React.FC = () => {
  const aiConfig = useStore((s) => s.aiConfig);
  const models = useStore((s) => s.models);
  const [mode, setMode] = useState<WritingMode>('generate');
  const [outline, setOutline] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize model registry when models change
  React.useEffect(() => {
    initModelRegistry(models);
  }, [models]);

  const handleGenerate = async () => {
    if (!outline.trim() && (mode === 'generate' || mode === 'continue' || mode === 'polish' || mode === 'summarize')) {
      setError('Please enter some content first.');
      return;
    }
    // Check if any model has an API key configured
    const hasEnabledModel = models.some(m => m.isEnabled && m.apiKey && m.apiKey.trim());
    if (!hasEnabledModel) {
      setError('No AI model configured. Please go to Settings and enter at least one API Key.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');

    try {
      const existingContent = mode === 'continue' || mode === 'polish' || mode === 'summarize' ? outline : '';
      const outlineText = mode === 'generate' ? outline : '';

      const response = await writingChatCompletion(
        mode === 'generate' ? outlineText : existingContent,
        mode,
        existingContent,
        aiConfig
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result).catch(() => {});
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          ✍️ AI Writing
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
          Generate, continue, polish, or summarize content with AI
        </Typography>
      </Box>

      {/* Mode tabs */}
      <Tabs
        value={mode}
        onChange={(_, v) => { setMode(v); setResult(''); setError(''); }}
        variant="fullWidth"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: 11, textTransform: 'none', py: 0.5 },
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {(Object.keys(MODE_LABELS) as WritingMode[]).map((m) => (
          <Tab key={m} value={m} label={MODE_LABELS[m].label} />
        ))}
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ m: 1.5, fontSize: 12 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Input area */}
      <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto' }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
          {MODE_LABELS[mode].desc}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={mode === 'generate' ? 8 : 6}
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          placeholder={MODE_LABELS[mode].placeholder}
          disabled={isLoading}
          sx={{
            '& .MuiInputBase-root': { fontSize: 12, fontFamily: 'monospace' },
            '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
            flex: 1,
          }}
        />

        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={14} /> : <SparkIcon sx={{ fontSize: 16 }} />}
          onClick={handleGenerate}
          disabled={isLoading || !outline.trim()}
          fullWidth
          sx={{ fontSize: 12 }}
        >
          {isLoading ? 'Generating...' : `${MODE_LABELS[mode].label} with AI`}
        </Button>

        <Divider sx={{ opacity: 0.2 }} />

        {/* Result area */}
        {(result || isLoading) && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'primary.light' }}>
                AI OUTPUT
              </Typography>
              {result && (
                <Button size="small" onClick={handleCopy} sx={{ fontSize: 10, minWidth: 'auto', p: 0.5 }}>
                  Copy
                </Button>
              )}
            </Box>
            {isLoading && !result ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', py: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  Generating content...
                </Typography>
              </Box>
            ) : (
              <TextField
                fullWidth
                multiline
                rows={8}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': { fontSize: 12, fontFamily: 'monospace' },
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  flex: 1,
                }}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Writing;
