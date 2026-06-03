/**
 * Browser dev stub — discord.js requires Node.js and is not bundled for web.
 * Install discord.js and run in Electron main process for real Discord integration.
 */

export const GatewayIntentBits = {
  Guilds: 1,
  GuildMessages: 512,
  MessageContent: 32768,
} as const;

export class Client {
  constructor(_options?: unknown) {}

  on(_event: string, _handler: (...args: unknown[]) => void): void {}

  async login(_token: string): Promise<string> {
    console.warn('[Discord] discord.js stub loaded — Node.js runtime required for Discord bot');
    return _token;
  }

  async destroy(): Promise<void> {}

  channels = {
    fetch: async (_id: string) => null,
  };
}
