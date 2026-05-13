/**
 * Agent Creation Wizard Component - V100
 * 
 * 4-step wizard for creating Agents via natural language.
 * Fixed: Added backdrop, close on backdrop click, Next button logic.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Backdrop,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Check as CheckIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { IntentParsingPanel } from './IntentParsingPanel';
import { ConfigPreviewCard } from './ConfigPreviewCard';
import { SkillRecommendationPanel } from './SkillRecommendation';
import { WorkflowDiagram } from './WorkflowDiagram';
import { generateAgentConfig, updateAgentWithSkills } from '../../services/agentBuilder/agentGenerator';
import type { ParsedAgentConfig, GeneratedAgent, WizardStep, WorkflowTemplate } from '../../types/agentBuilder';
import { generateWorkflow } from '../../services/agentBuilder/agentGenerator';

interface AgentCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (agent: GeneratedAgent, soul: string, userProfile: string, memory: string) => void;
}

const STEPS = [
  { key: 'describe', label: 'Describe' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'files', label: 'Files' },
  { key: 'preview', label: 'Preview' },
  { key: 'test', label: 'Test' },
];

export const AgentCreationWizard: React.FC<AgentCreationWizardProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('describe');
  const [userInput, setUserInput] = useState('');
  const [parsedConfig, setParsedConfig] = useState<ParsedAgentConfig | null>(null);
  const [generatedAgent, setGeneratedAgent] = useState<GeneratedAgent | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // V101: Persona files
  const [soul, setSoul] = useState('');
  const [userProfile, setUserProfile] = useState('');
  const [memory, setMemory] = useState('');

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key as WizardStep);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key as WizardStep);
    }
  };

  const handleParsingComplete = (config: ParsedAgentConfig) => {
    setParsedConfig(config);
    
    // Generate the agent
    setIsProcessing(true);
    try {
      const agent = generateAgentConfig(config);
      setGeneratedAgent(agent);
      handleNext();
    } catch (err) {
      setError('Failed to generate Agent configuration');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkillsChange = (skillIds: string[]) => {
    setSelectedSkills(skillIds);
    if (generatedAgent) {
      const updatedAgent = updateAgentWithSkills(generatedAgent, skillIds);
      setGeneratedAgent(updatedAgent);
    }
  };

  const handleWorkflowTemplateChange = (template: WorkflowTemplate) => {
    if (parsedConfig && generatedAgent) {
      const updatedParsed = { ...parsedConfig, workflowTemplate: template };
      setParsedConfig(updatedParsed);
      const updatedAgent = generateAgentConfig(updatedParsed);
      updatedAgent.skills = selectedSkills;
      setGeneratedAgent(updatedAgent);
    }
  };

  const handleTest = async () => {
    if (!generatedAgent) return;

    setIsProcessing(true);
    try {
      // In a real implementation, we would run a test conversation
      // For now, we just complete the wizard
      onComplete(generatedAgent, soul, userProfile, memory);
    } catch (err) {
      setError('Test failed. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'describe':
        return userInput.trim().length > 10;
      case 'confirm':
        return parsedConfig !== null;
      case 'files':
        return true; // Files step is optional
      case 'preview':
        return generatedAgent !== null;
      case 'test':
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'describe':
        return (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Describe your Agent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tell me what kind of Agent you'd like to create. Use natural language to describe its purpose, capabilities, and personality.
              </Typography>
            </Box>

            <TextField
              multiline
              rows={6}
              placeholder="Example: I want an Agent that helps me with coding tasks. It should be a friendly expert programmer who can write, debug, and explain code. It should have a playful personality but stay focused on getting the job done..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.02)',
                },
              }}
            />

            <Alert severity="info" icon={<AIIcon />}>
              <Typography variant="body2">
                <strong>Tips:</strong> Include details about the Agent's role, personality, capabilities, and any specific tools or workflows you need.
              </Typography>
            </Alert>
          </Stack>
        );

      case 'confirm':
        return (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Review & Edit
              </Typography>
              <Typography variant="body2" color="text.secondary">
                I've parsed your description. Feel free to edit any details before proceeding.
              </Typography>
            </Box>

            {isProcessing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 4, justifyContent: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Analyzing your request...
                </Typography>
              </Box>
            ) : (
              <IntentParsingPanel
                userInput={userInput}
                onConfirm={handleParsingComplete}
                onCancel={handleBack}
              />
            )}
          </Stack>
        );

      case 'files':
        return (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Persona Files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define the Agent's soul, user profile, and memory. These files shape the Agent's personality and memory.
              </Typography>
            </Box>

            {/* Soul */}
            <TextField
              label="Soul (人格设定)"
              value={soul}
              onChange={(e) => setSoul(e.target.value)}
              multiline
              rows={4}
              fullWidth
              size="small"
              placeholder="You are a warm and supportive friend who is empathetic, good at listening..."
            />

            {/* User Profile */}
            <TextField
              label="User Profile (用户偏好)"
              value={userProfile}
              onChange={(e) => setUserProfile(e.target.value)}
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="User appreciates deep conversations. They prefer emotional support over practical advice when stressed..."
            />

            {/* Memory */}
            <TextField
              label="Memory (对话记忆)"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="First met on a stressful day. User opened up about work challenges. We had meaningful conversations about life goals..."
            />
          </Stack>
        );

      case 'preview':
        return (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Agent Preview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review your Agent configuration and customize skills and workflow.
              </Typography>
            </Box>

            {generatedAgent && (
              <>
                <ConfigPreviewCard agent={generatedAgent} readOnly />

                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Select Skills
                  </Typography>
                  <SkillRecommendationPanel
                    agentCapabilities={generatedAgent.capabilities}
                    selectedSkills={selectedSkills}
                    onSelectionChange={handleSkillsChange}
                  />
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Workflow
                  </Typography>
                  {parsedConfig && (
                    <WorkflowDiagram
                      workflow={generateWorkflow(parsedConfig)}
                      onTemplateChange={handleWorkflowTemplateChange}
                    />
                  )}
                </Paper>
              </>
            )}
          </Stack>
        );

      case 'test':
        return (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Test Your Agent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your Agent is ready! Click the button below to start a test conversation.
              </Typography>
            </Box>

            {generatedAgent && (
              <ConfigPreviewCard agent={generatedAgent} readOnly />
            )}

            <Alert severity="success" icon={<CheckIcon />}>
              <Typography variant="body2">
                Your Agent "{generatedAgent?.name}" has been created and is ready to use!
              </Typography>
            </Alert>

            <Button
              variant="contained"
              size="large"
              startIcon={isProcessing ? <CircularProgress size={20} /> : <CheckIcon />}
              onClick={handleTest}
              disabled={isProcessing}
              sx={{ alignSelf: 'flex-start' }}
            >
              {isProcessing ? 'Testing...' : 'Start Using Agent'}
            </Button>
          </Stack>
        );

      default:
        return null;
    }
  };

  const handleBackOrClose = () => {
    if (currentStep === 'describe') {
      onClose();
    } else {
      handleBack();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop - click to close */}
      <Backdrop
        sx={{ zIndex: 999, bgcolor: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />

      <Paper
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: 700,
        maxHeight: '90vh',
        bgcolor: 'rgba(15, 17, 23, 0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ flex: 1 }}>
          Create New Agent
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Stepper */}
      <Box sx={{ px: 3, pt: 2, pb: 1 }}>
        <Stepper activeStep={currentStepIndex} alternativeLabel>
          {STEPS.map((step) => (
            <Step key={step.key}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {renderStepContent()}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          p: 2,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Button
          startIcon={<BackIcon />}
          onClick={handleBackOrClose}
          variant="outlined"
        >
          {currentStep === 'describe' ? 'Cancel' : 'Back'}
        </Button>

        {currentStep !== 'describe' && currentStep !== 'files' && currentStep !== 'test' && (
          <Button
            endIcon={<NextIcon />}
            onClick={handleNext}
            variant="contained"
            disabled={!canProceed()}
          >
            Next
          </Button>
        )}

        {currentStep === 'files' && (
          <Button
            endIcon={<NextIcon />}
            onClick={handleNext}
            variant="contained"
          >
            Next
          </Button>
        )}

        {currentStep === 'test' && (
          <Button
            endIcon={<CheckIcon />}
            onClick={handleTest}
            variant="contained"
            disabled={isProcessing || !generatedAgent}
          >
            {isProcessing ? 'Testing...' : 'Start Using Agent'}
          </Button>
        )}
      </Box>
    </Paper>
    </>
  );
};

export default AgentCreationWizard;
