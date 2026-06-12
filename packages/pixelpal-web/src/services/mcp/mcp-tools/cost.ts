/**
 * costTool - Cost estimation tool
 * Estimates costs for tasks or operations based on various parameters
 */

import type { McpTool, ToolResult } from '../tool-registry.ts'

// Cost factors for different operation types
const COST_MULTIPLIERS: Record<string, number> = {
  'api_call': 0.001,
  'data_processing': 0.01,
  'storage_gb': 0.023,
  'compute_hour': 0.05,
  'network_transfer': 0.0005,
  'ai_inference': 0.1,
  'translation': 0.02,
  'summarization': 0.05,
}

// Base costs
const BASE_COSTS: Record<string, number> = {
  'simple': 0.001,
  'moderate': 0.01,
  'complex': 0.1,
}

type ComplexityLevel = 'simple' | 'moderate' | 'complex'

/**
 * Estimate cost for an operation
 * @param operationType - Type of operation (api_call, data_processing, storage_gb, compute_hour, etc.)
 * @param quantity - Quantity of units
 * @param complexity - Complexity level (simple, moderate, complex)
 */
async function costHandler(args: {
  operationType: string
  quantity: number
  complexity?: ComplexityLevel
}): Promise<ToolResult> {
  try {
    const { operationType, quantity, complexity = 'moderate' } = args

    if (!operationType || typeof operationType !== 'string') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Operation type is required' }) }],
        isError: true,
      }
    }

    if (quantity === undefined || typeof quantity !== 'number' || quantity < 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Quantity must be a non-negative number' }) }],
        isError: true,
      }
    }

    const validComplexities: ComplexityLevel[] = ['simple', 'moderate', 'complex']
    if (!validComplexities.includes(complexity)) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: false,
          error: `Invalid complexity: ${complexity}. Valid: ${validComplexities.join(', ')}`,
        }) }],
        isError: true,
      }
    }

    const rate = COST_MULTIPLIERS[operationType.toLowerCase()]
    const baseCost = BASE_COSTS[complexity]
    
    if (rate === undefined && baseCost === undefined) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: false,
          error: `Unknown operation type: ${operationType}. Known types: ${Object.keys(COST_MULTIPLIERS).join(', ')}`,
        }) }],
        isError: true,
      }
    }

    const unitCost = rate || baseCost
    const estimatedCost = unitCost * quantity
    const costWithBuffer = estimatedCost * 1.1 // 10% buffer

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          operationType,
          quantity,
          complexity,
          unitCost,
          estimatedCost: Math.round(estimatedCost * 10000) / 10000,
          costWithBuffer: Math.round(costWithBuffer * 10000) / 10000,
          currency: 'USD',
          breakdown: {
            base: unitCost,
            units: quantity,
            subtotal: estimatedCost,
            buffer: costWithBuffer - estimatedCost,
            total: costWithBuffer,
          },
        }, null, 2),
      }],
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error }) }],
      isError: true,
    }
  }
}

export const costTool: McpTool = {
  name: 'cost',
  description: 'Estimate costs for various operations including API calls, storage, compute, and AI inference',
  inputSchema: {
    type: 'object',
    properties: {
      operationType: {
        type: 'string',
        description: 'Type of operation (api_call, data_processing, storage_gb, compute_hour, network_transfer, ai_inference, translation, summarization)',
      },
      quantity: {
        type: 'number',
        description: 'Number of units for the operation',
      },
      complexity: {
        type: 'string',
        description: 'Complexity level (simple, moderate, complex)',
        default: 'moderate',
      },
    },
    required: ['operationType', 'quantity'],
  },
  handler: costHandler,
}