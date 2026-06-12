/**
 * ChainEditorDialog — full chain definition editor (V79)
 */

import React, { useState, useEffect } from 'react';
import { MyDialog as Dialog, MyAlpha , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyFormControl as FormControl, MyInputLabel as InputLabel, MyMenuItem as MenuItem } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MyTextField as TextField, MyButton as Button, MyIconButton as IconButton, MyStack as Stack, MyChip as Chip, MySelect as Select, MyDivider as Divider, MyCircularProgress as CircularProgress, MyAlert as Alert } from '../MUI替代';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import { skillRegistry } from '../../services/skills/skillRegistry';
import type { ChainDefinition, ChainStep } from '../../services/skills/types';
import { executeChain, resolveStringTemplate } from '../../services/chains/chainEngine';
import { ChainResultsCard } from './ChainResultsCard';
import type { ChainExecutionResult } from '../../services/skills/types';

interface ChainEditorDialogProps {
  open: boolean;
  chain?: ChainDefinition | null;
  onClose: () => void;
  onSave: (chain: ChainDefinition) => void;
}

const newStep = (): ChainStep => ({
  id: `step-${Date.now()}`,
  skillId: '',
  condition: 'always',
  inputTemplate: {},
  outputKey: '',
});

const newChain = (): ChainDefinition => ({
  id: `chain-${Date.now()}`,
  name: '',
  description: '',
  triggerKeywords: [],
  steps: [newStep()],
  enabled: true,
});

export const ChainEditorDialog: React.FC<ChainEditorDialogProps> = ({
  open,
  chain,
  onClose,
  onSave,
}) => {
  const [data, setData] = useState<ChainDefinition>(newChain());
  const [triggerInput, setTriggerInput] = useState('');
  const [testInput, setTestInput] = useState('');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<ChainExecutionResult | null>(null);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Load skills
  useEffect(() => {
    const loadSkills = async () => {
      await skillRegistry.loadSkills();
      const allSkills = skillRegistry.getSortedSkills();
      setSkills(allSkills.map((s) => ({ id: s.id, name: s.name })));
    };
    void loadSkills();
  }, []);

  // Initialize from prop
  useEffect(() => {
    if (open) {
      if (chain) {
        setData({ ...chain });
        setTriggerInput(chain.triggerKeywords.join(' '));
      } else {
        setData(newChain());
        setTriggerInput('');
      }
      setTestResult(null);
      setErrors([]);
    }
  }, [open, chain]);

  const handleSave = () => {
    const newErrors: string[] = [];
    if (!data.name.trim()) newErrors.push('Chain name is required');
    if (!data.steps.length) newErrors.push('At least one step is required');
    if (!triggerInput.trim()) newErrors.push('Trigger keywords are required');
    data.steps.forEach((step, i) => {
      if (!step.skillId) newErrors.push(`Step ${i + 1}: skill is required`);
      if (!step.outputKey) newErrors.push(`Step ${i + 1}: output key is required`);
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const updated: ChainDefinition = {
      ...data,
      triggerKeywords: triggerInput.split(/[\s,]+/).map((k) => k.trim()).filter(Boolean),
    };
    onSave(updated);
    onClose();
  };

  const handleAddStep = () => {
    setData((prev) => ({ ...prev, steps: [...prev.steps, newStep()] }));
  };

  const handleRemoveStep = (idx: number) => {
    setData((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== idx) }));
  };

  const handleStepChange = (idx: number, field: keyof ChainStep, value: string) => {
    setData((prev) => {
      const steps = [...prev.steps];
      steps[idx] = { ...steps[idx], [field]: value };
      return { ...prev, steps };
    });
  };

  const handleInputTemplateChange = (stepIdx: number, key: string, value: string) => {
    setData((prev) => {
      const steps = [...prev.steps];
      const inputs = { ...steps[stepIdx].inputTemplate, [key]: value };
      steps[stepIdx] = { ...steps[stepIdx], inputTemplate: inputs };
      return { ...prev, steps };
    });
  };

  const handleAddInputKey = (stepIdx: number) => {
    setData((prev) => {
      const steps = [...prev.steps];
      const inputs = { ...steps[stepIdx].inputTemplate, '': '' };
      steps[stepIdx] = { ...steps[stepIdx], inputTemplate: inputs };
      return { ...prev, steps };
    });
  };

  const handleRemoveInputKey = (stepIdx: number, key: string) => {
    setData((prev) => {
      const steps = [...prev.steps];
      const inputs = { ...steps[stepIdx].inputTemplate };
      delete inputs[key];
      steps[stepIdx] = { ...steps[stepIdx], inputTemplate: inputs };
      return { ...prev, steps };
    });
  };

  const handleRunTest = async () => {
    setTestRunning(true);
    setTestResult(null);

    try {
      const result = await executeChain(data, {
        triggerMessage: testInput,
        metadata: { testMode: true },
      });
      setTestResult(result);
    } catch (err) {
      // handled
    } finally {
      setTestRunning(false);
    }
  };

  // Available variables for picker
  const availableVars = [
    '{{triggerMessage}}',
    '{{context.city}}',
    '{{context.date}}',
    '{{context.days}}',
    '{{context.language}}',
    '{{context.focus}}',
    '{{context.source}}',
    '{{context.style}}',
    '{{context.template}}',
    ...data.steps.map((s) => `{{${s.outputKey}}}`).filter(Boolean),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 17, 23, 0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography sx={{ fontSize: 18 }}>⛓️</Typography>
        <Typography variant="h6" sx={{ fontSize: 16, flex: 1 }}>
          {chain ? 'Edit Chain' : 'New Chain'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ opacity: 0.1 }} />

      <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Errors */}
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors([])}>
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </Alert>
        )}

        {/* Basic info */}
        <Stack spacing={2} mb={2}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Chain Name"
              value={data.name}
              onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
              size="small"
              sx={{ flex: 1 }}
              placeholder="e.g., My Workflow"
            />
            <TextField
              label="Description"
              value={data.description}
              onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))}
              size="small"
              sx={{ flex: 1 }}
              placeholder="What does this chain do?"
            />
          </Box>

          <TextField
            label="Trigger Keywords"
            value={triggerInput}
            onChange={(e) => setTriggerInput(e.target.value)}
            size="small"
            placeholder="#trip #plan (space-separated, # prefix triggers in chat)"
            helperText="Messages starting with # will trigger this chain"
          />
        </Stack>

        <Divider sx={{ my: 2, opacity: 0.1 }} />

        {/* Steps */}
        <Typography variant="subtitle2" sx={{ fontSize: 13, mb: 1.5, fontWeight: 700 }}>
          Steps
        </Typography>

        <Stack spacing={1.5} mb={2}>
          {data.steps.map((step, idx) => (
            <Box
              key={step.id}
              sx={{
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Chip label={idx + 1} size="small" sx={{ bgcolor: 'rgba(156,39,176,0.2)', color: '#9c27b0', fontWeight: 700, height: 20 }} />
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                  Step {idx + 1}
                </Typography>
                {data.steps.length > 1 && (
                  <IconButton size="small" onClick={() => handleRemoveStep(idx)} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Stack spacing={1.5}>
                {/* Skill + Condition */}
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Skill</InputLabel>
                    <Select
                      value={step.skillId}
                      label="Skill"
                      onChange={(e) => handleStepChange(idx, 'skillId', e.target.value)}
                    >
                      <MenuItem value=""><em>Select skill...</em></MenuItem>
                      {skills.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={step.condition}
                      label="Condition"
                      onChange={(e) => handleStepChange(idx, 'condition', e.target.value)}
                    >
                      <MenuItem value="always">always</MenuItem>
                      <MenuItem value='if:step_result contains "value"'>if: contains</MenuItem>
                      <MenuItem value="if:step_result > 0">if: comparison</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Output key */}
                <TextField
                  label="Output Key"
                  value={step.outputKey}
                  onChange={(e) => handleStepChange(idx, 'outputKey', e.target.value)}
                  size="small"
                  placeholder="e.g., step1_result"
                  helperText="Variable name to store this step's output"
                />

                {/* Input template */}
                <Box>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    Input Template (supports {'{{variable}}'} interpolation)
                  </Typography>
                  <Stack spacing={0.5}>
                    {Object.entries(step.inputTemplate).map(([key, val]) => (
                      <Box key={key} sx={{ display: 'flex', gap: 0.5 }}>
                        <TextField
                          label="Key"
                          value={key}
                          onChange={(e) => {
                            const newInputs = { ...step.inputTemplate };
                            delete newInputs[key];
                            newInputs[e.target.value] = val;
                            const steps = [...data.steps];
                            steps[idx] = { ...steps[idx], inputTemplate: newInputs };
                            setData((p) => ({ ...p, steps }));
                          }}
                          size="small"
                          sx={{ width: 120 }}
                        />
                        <TextField
                          label="Value"
                          value={val}
                          onChange={(e) => handleInputTemplateChange(idx, key, e.target.value)}
                          size="small"
                          sx={{ flex: 1 }}
                          placeholder={'{{variable}}'}
                        />
                        <IconButton size="small" onClick={() => handleRemoveInputKey(idx, key)} sx={{ color: 'error.main' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddInputKey(idx)} sx={{ alignSelf: 'flex-start', fontSize: 11 }}>
                      Add Input
                    </Button>
                  </Stack>

                  {/* Variable picker */}
                  <Box sx={{ mt: 0.75 }}>
                    <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>
                      Available:{' '}
                      {availableVars.map((v) => (
                        <Chip
                          key={v}
                          label={v}
                          size="small"
                          onClick={() => {}}
                          sx={{
                            height: 14,
                            fontSize: 8,
                            bgcolor: 'rgba(94,106,210,0.15)',
                            color: 'rgba(94,106,210,0.9)',
                            mr: 0.25,
                            cursor: 'pointer',
                            '& .MuiChip-label': { px: 0.5 },
                          }}
                        />
                      ))}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>

        {/* Add step */}
        <Button startIcon={<AddIcon />} onClick={handleAddStep} sx={{ mb: 2 }}>
          Add Step
        </Button>

        <Divider sx={{ my: 2, opacity: 0.1 }} />

        {/* Test */}
        <Typography variant="subtitle2" sx={{ fontSize: 13, mb: 1.5, fontWeight: 700 }}>
          Test Chain
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <TextField
            label="Test Input"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            size="small"
            placeholder="Enter test message..."
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            startIcon={testRunning ? <CircularProgress size={14} /> : <RunIcon />}
            onClick={handleRunTest}
            disabled={testRunning || !testInput.trim()}
            sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: alpha('#9c27b0', 0.8) } }}
          >
            Run Chain
          </Button>
        </Box>

        {testResult && (
          <ChainResultsCard result={testResult} chainName={data.name} />
        )}
      </DialogContent>

      <Divider sx={{ opacity: 0.1 }} />

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} size="small">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: alpha('#9c27b0', 0.8) } }}
        >
          Save Chain
        </Button>
      </DialogActions>
    </Dialog>
  );
};
