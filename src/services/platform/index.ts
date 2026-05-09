/**
 * Platform Services
 * 
 * Platform-specific adapters for external services like Feishu/Lark
 */

export { feishuPlatform } from './FeishuPlatformAdapter';
export type {
  FeishuConfig,
  FeishuToken,
  FeishuUser,
  FeishuMessage,
  FeishuEventPayload,
} from './FeishuPlatformAdapter';
