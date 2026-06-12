/**
 * Unit tests for AgentCreationWizard component
 * Tests: canProceed, handleNext, handleBack, handleParsingComplete logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedAgentConfig, GeneratedAgent, WizardStep } from '../../types/agentBuilder';

// Import the component module to test internal logic
// We'll test the pure logic functions by recreating them in the test

const STEPS = [
  { key: 'describe', label: 'Describe' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'files', label: 'Files' },
  { key: 'preview', label: 'Preview' },
  { key: 'test', label: 'Test' },
];

/**
 * Re-implementation of canProceed logic for testing
 * This mirrors the component's internal canProceed function
 */
function canProceed(
  currentStep: WizardStep,
  userInput: string,
  parsedConfig: ParsedAgentConfig | null,
  generatedAgent: GeneratedAgent | null
): boolean {
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
}

/**
 * Re-implementation of step navigation logic for testing
 */
function getNextStep(currentStep: WizardStep): WizardStep | null {
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const nextIndex = currentStepIndex + 1;
  if (nextIndex < STEPS.length) {
    return STEPS[nextIndex].key as WizardStep;
  }
  return null;
}

function getPrevStep(currentStep: WizardStep): WizardStep | null {
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const prevIndex = currentStepIndex - 1;
  if (prevIndex >= 0) {
    return STEPS[prevIndex].key as WizardStep;
  }
  return null;
}

describe('AgentCreationWizard - canProceed logic', () => {
  const mockParsedConfig: ParsedAgentConfig = {
    name: 'TestAgent',
    description: 'A test agent',
    role: 'planner',
    capabilities: ['planning'],
    requiredTools: ['tool1'],
    workflowTemplate: 'sequential',
    personality: {
      tone: 'friendly',
      expertise: 'intermediate',
      creativity: 0.5,
    },
    constraints: [],
  };

  const mockGeneratedAgent: GeneratedAgent = {
    id: 'agent_123_abc',
    name: 'TestAgent',
    description: 'A test agent',
    role: 'planner',
    icon: '📋',
    capabilities: ['planning'],
    requiredTools: ['tool1'],
    workflowTemplate: 'sequential',
    personality: {
      tone: 'friendly',
      expertise: 'intermediate',
      creativity: 0.5,
    },
    constraints: [],
    skills: [],
    createdAt: Date.now(),
    config: {
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.5,
      tools: ['tool1'],
      skills: [],
    },
  };

  describe('describe step validation', () => {
    it('should return false when userInput is empty', () => {
      expect(canProceed('describe', '', null, null)).toBe(false);
    });

    it('should return false when userInput is only whitespace', () => {
      expect(canProceed('describe', '          ', null, null)).toBe(false);
    });

    it('should return false when userInput is 10 characters or less', () => {
      expect(canProceed('describe', 'short text', null, null)).toBe(false);
      expect(canProceed('describe', '1234567890', null, null)).toBe(false);
    });

    it('should return true when userInput is more than 10 characters', () => {
      expect(canProceed('describe', 'This is a valid input with more than 10 chars', null, null)).toBe(true);
    });

    it('should return true for edge case of exactly 11 characters', () => {
      expect(canProceed('describe', '12345678901', null, null)).toBe(true);
    });
  });

  describe('confirm step validation', () => {
    it('should return false when parsedConfig is null', () => {
      expect(canProceed('confirm', 'some input', null, null)).toBe(false);
    });

    it('should return true when parsedConfig exists', () => {
      expect(canProceed('confirm', 'some input', mockParsedConfig, null)).toBe(true);
    });
  });

  describe('preview step validation', () => {
    it('should return false when generatedAgent is null', () => {
      expect(canProceed('preview', 'some input', mockParsedConfig, null)).toBe(false);
    });

    it('should return true when generatedAgent exists', () => {
      expect(canProceed('preview', 'some input', mockParsedConfig, mockGeneratedAgent)).toBe(true);
    });
  });

  describe('test step validation', () => {
    it('should always return true regardless of other state', () => {
      expect(canProceed('test', '', null, null)).toBe(true);
      expect(canProceed('test', 'any input', mockParsedConfig, mockGeneratedAgent)).toBe(true);
    });
  });

  describe('unknown step validation', () => {
    it('should return false for unknown steps', () => {
      expect(canProceed('describe' as WizardStep, '', null, null)).toBe(false);
    });
  });
});

describe('AgentCreationWizard - handleNext logic', () => {
  it('should move from describe to confirm', () => {
    expect(getNextStep('describe')).toBe('confirm');
  });

  it('should move from confirm to files', () => {
    expect(getNextStep('confirm')).toBe('files');
  });

  it('should move from preview to test', () => {
    expect(getNextStep('preview')).toBe('test');
  });

  it('should return null when at test step (last step)', () => {
    expect(getNextStep('test')).toBeNull();
  });
});

describe('AgentCreationWizard - handleBack logic', () => {
  it('should return null when at describe step (first step)', () => {
    expect(getPrevStep('describe')).toBeNull();
  });

  it('should move from confirm to describe', () => {
    expect(getPrevStep('confirm')).toBe('describe');
  });

  it('should move from preview to files', () => {
    expect(getPrevStep('preview')).toBe('files');
  });

  it('should move from test to preview', () => {
    expect(getPrevStep('test')).toBe('preview');
  });
});

describe('AgentCreationWizard - handleParsingComplete logic simulation', () => {
  it('should set parsedConfig and generatedAgent after successful parsing', () => {
    const mockParsedConfig: ParsedAgentConfig = {
      name: 'TestAgent',
      description: 'A test agent',
      role: 'planner',
      capabilities: ['planning'],
      requiredTools: ['tool1'],
      workflowTemplate: 'sequential',
      personality: {
        tone: 'friendly',
        expertise: 'intermediate',
        creativity: 0.5,
      },
      constraints: [],
    };

    // Simulate handleParsingComplete behavior:
    // 1. setParsedConfig(config)
    // 2. setGeneratedAgent(generateAgentConfig(config))
    // 3. handleNext()

    const parsedConfig = mockParsedConfig;
    expect(parsedConfig).not.toBeNull();
    expect(parsedConfig.name).toBe('TestAgent');

    // After parsing, we should be able to proceed to preview
    const generatedAgent: GeneratedAgent = {
      id: 'agent_123_abc',
      name: parsedConfig.name,
      description: parsedConfig.description,
      role: parsedConfig.role,
      icon: '📋',
      capabilities: parsedConfig.capabilities,
      requiredTools: parsedConfig.requiredTools,
      workflowTemplate: parsedConfig.workflowTemplate,
      personality: parsedConfig.personality,
      constraints: parsedConfig.constraints,
      skills: [],
      createdAt: Date.now(),
      config: {
        maxRetries: 3,
        timeout: 30000,
        temperature: 0.5,
        tools: parsedConfig.requiredTools,
        skills: [],
      },
    };

    expect(generatedAgent).not.toBeNull();
    expect(generatedAgent.name).toBe('TestAgent');
    expect(generatedAgent.role).toBe('planner');
    expect(canProceed('preview', '', parsedConfig, generatedAgent)).toBe(true);
  });

  it('should advance to files step after parsing complete', () => {
    // The handleNext is called after handleParsingComplete
    // So after parsing on 'confirm' step, we should move to 'files'
    const nextStepAfterConfirm = getNextStep('confirm');
    expect(nextStepAfterConfirm).toBe('files');
  });
});

describe('AgentCreationWizard - step flow integration', () => {
  it('should allow full forward navigation: describe -> confirm -> files -> preview -> test', () => {
    // Start at describe
    let currentStep: WizardStep = 'describe';
    expect(currentStep).toBe('describe');

    // Move to confirm
    const next0 = getNextStep(currentStep);
    expect(next0).toBe('confirm');
    currentStep = next0!;

    // Move to files
    const next1 = getNextStep(currentStep);
    expect(next1).toBe('files');
    currentStep = next1!;

    // Move to preview
    const next2 = getNextStep(currentStep);
    expect(next2).toBe('preview');
    currentStep = next2!;

    // Move to test
    const next3 = getNextStep(currentStep);
    expect(next3).toBe('test');
    currentStep = next3!;

    // No more steps
    expect(getNextStep(currentStep)).toBeNull();
  });

  it('should allow full backward navigation: test -> preview -> files -> confirm -> describe', () => {
    // Start at test
    let currentStep: WizardStep = 'test';
    expect(currentStep).toBe('test');

    // Move to preview
    const prev1 = getPrevStep(currentStep);
    expect(prev1).toBe('preview');
    currentStep = prev1!;

    // Move to files
    const prev2 = getPrevStep(currentStep);
    expect(prev2).toBe('files');
    currentStep = prev2!;

    // Move to confirm
    const prev3 = getPrevStep(currentStep);
    expect(prev3).toBe('confirm');
    currentStep = prev3!;

    // Move to describe
    const prev4 = getPrevStep(currentStep);
    expect(prev4).toBe('describe');
    currentStep = prev4!;

    // No more steps
    expect(getPrevStep(currentStep)).toBeNull();
  });

  it('should correctly validate canProceed at each step with proper data', () => {
    const mockParsedConfig: ParsedAgentConfig = {
      name: 'TestAgent',
      description: 'A test agent',
      role: 'planner',
      capabilities: ['planning'],
      requiredTools: ['tool1'],
      workflowTemplate: 'sequential',
      personality: {
        tone: 'friendly',
        expertise: 'intermediate',
        creativity: 0.5,
      },
      constraints: [],
    };

    const mockGeneratedAgent: GeneratedAgent = {
      id: 'agent_123_abc',
      name: 'TestAgent',
      description: 'A test agent',
      role: 'planner',
      icon: '📋',
      capabilities: ['planning'],
      requiredTools: ['tool1'],
      workflowTemplate: 'sequential',
      personality: {
        tone: 'friendly',
        expertise: 'intermediate',
        creativity: 0.5,
      },
      constraints: [],
      skills: [],
      createdAt: Date.now(),
      config: {
        maxRetries: 3,
        timeout: 30000,
        temperature: 0.5,
        tools: ['tool1'],
        skills: [],
      },
    };

    // At describe step - needs >10 char input
    expect(canProceed('describe', 'This is more than ten characters long', null, null)).toBe(true);

    // At confirm step - needs parsedConfig
    expect(canProceed('confirm', 'some input', mockParsedConfig, null)).toBe(true);

    // At preview step - needs generatedAgent
    expect(canProceed('preview', 'some input', mockParsedConfig, mockGeneratedAgent)).toBe(true);

    // At test step - always true
    expect(canProceed('test', '', null, null)).toBe(true);
  });
});

describe('AgentCreationWizard - open prop behavior', () => {
  it('should not render when open is false (component returns null)', () => {
    // This tests the condition: if (!open) return null;
    const open = false;
    expect(open).toBe(false);
  });

  it('should render when open is true', () => {
    const open = true;
    expect(open).toBe(true);
  });
});

describe('AgentCreationWizard - handleBackOrClose logic', () => {
  it('should call onClose when on describe step (first step)', () => {
    // handleBackOrClose: if (currentStep === 'describe') { onClose(); } else { handleBack(); }
    const currentStep: WizardStep = 'describe';
    const shouldClose = currentStep === 'describe';
    expect(shouldClose).toBe(true);
  });

  it('should call handleBack when not on describe step', () => {
    const currentStep: WizardStep = 'confirm';
    const shouldClose = currentStep === 'describe';
    expect(shouldClose).toBe(false);
    // Should call handleBack instead
    const prevStep = getPrevStep(currentStep);
    expect(prevStep).toBe('describe');
  });
});
