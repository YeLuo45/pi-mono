/**
 * ChainBuilder Component
 * V108: Skill Chaining stub
 */

import React, { useState } from 'react';
import { MyCard as Card, MyTypography as Typography, MyTextField as TextField, MyIconButton as IconButton, MyButton as Button, MyBox as Box , MyCardContent as CardContent } from '../MUI替代';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import type { ChainStep } from '../../services/chains/types';

export const ChainBuilder: React.FC = () => {
  const [chainName, setChainName] = useState('');
  const [steps, setSteps] = useState<ChainStep[]>([
    { id: 'step_1', name: 'Step 1', skillId: 'skill_1' },
    { id: 'step_2', name: 'Step 2', skillId: 'skill_2' },
    { id: 'step_3', name: 'Step 3', skillId: 'skill_3' },
  ]);

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const handleAddStep = () => {
    const newStep: ChainStep = {
      id: `step_${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      skillId: `skill_${steps.length + 1}`,
    };
    setSteps([...steps, newStep]);
  };

  const handleSaveChain = () => {
    console.log('[ChainBuilder] Saving chain:', { name: chainName, steps });
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>
          Chain Builder
        </Typography>

        <TextField
          fullWidth
          label="Chain Name"
          value={chainName}
          onChange={(e) => setChainName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 2 }}>
          {steps.map((step, index) => (
            <Box
              key={step.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1,
                p: 1,
                bgcolor: 'rgba(255,255,255,0.02)',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 24 }}>
                {index + 1}.
              </Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {step.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleDeleteStep(step.id)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddStep}
            sx={{ flex: 1 }}
          >
            Add Step
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveChain}
            sx={{ flex: 1 }}
          >
            Save Chain
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};