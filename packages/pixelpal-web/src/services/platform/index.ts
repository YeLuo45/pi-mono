/**
 * Platform Services
 * 
 * Platform-specific adapters for external services like Feishu/Lark
 * 
 * @deprecated V69后请使用 src/platform/ 目录下的新接口
 */

export { feishuPlatform } from './FeishuPlatformAdapter';
export type {
  FeishuConfig,
  FeishuToken,
  FeishuUser,
  FeishuMessage,
  FeishuEventPayload,
} from './FeishuPlatformAdapter';
