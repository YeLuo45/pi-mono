/**
 * agentBus - Backward compatibility re-export
 * V101: Renamed to AgentExecutionBus, keeping original export for compatibility
 */
import { agentExecutionBus } from './AgentExecutionBus';
export const agentBus = agentExecutionBus;
