/**
 * ChainRunner
 * V108: Skill Chaining stub
 */

import { ChainDefinition, ChainRunner as IChainRunner } from './types';
import { DefaultChainExecutor } from './ChainExecutor';

export class ChainRunner implements IChainRunner {
  private executor = new DefaultChainExecutor();

  async run(chain: ChainDefinition, input: Record<string, unknown>): Promise<string> {
    console.log('[ChainRunner] run called with chain:', chain.name);
    console.log('[ChainRunner] input:', input);

    const execution = await this.executor.execute(chain, input);
    console.log('[ChainRunner] execution started with id:', execution.id);

    return execution.id;
  }

  cancel(executionId: string): void {
    console.log('[ChainRunner] cancel called for executionId:', executionId);
  }
}