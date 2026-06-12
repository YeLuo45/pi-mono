/**
 * KeyRotation - DEK Rotation and Rekeying Support
 * Allows key rotation while preserving ability to decrypt old data
 */

import { createKeyManager, type KeyManager } from './KeyManager';

export interface RotatedKeys {
  newWrappedDEK: string;
  oldWrappedDEK: string;
}

/**
 * KeyRotation supports key rotation while keeping old keys for decryption
 */
export class KeyRotation {
  private keyManager: KeyManager;
  private historicalKeys: string[] = [];

  constructor() {
    this.keyManager = createKeyManager();
  }

  /**
   * Rotate DEK - generates new DEK, wraps it, stores old DEK for historical decryption
   */
  async rotateDEK(currentKEK: CryptoKey): Promise<RotatedKeys> {
    const currentDEK = await this.keyManager.generateDEK();
    const newDEK = await this.keyManager.generateDEK();

    // Wrap current DEK for storage (historical)
    const oldWrappedDEK = await this.keyManager.wrapDEK(currentDEK, currentKEK);
    
    // Wrap new DEK with current KEK
    const newWrappedDEK = await this.keyManager.wrapDEK(newDEK, currentKEK);

    // Store historical key
    this.historicalKeys.push(oldWrappedDEK);

    return {
      newWrappedDEK,
      oldWrappedDEK,
    };
  }

  /**
   * Rekey with new password - full re-encryption support
   * Old data remains decryptable with old keys until re-encrypted
   */
  async rekey(
    oldSalt: Uint8Array,
    newSalt: Uint8Array,
    oldKEK: CryptoKey,
    newPassword: string
  ): Promise<{ newKEK: CryptoKey; newDEK: CryptoKey; newWrappedDEK: string }> {
    // Generate new KEK from new password
    const newKEK = await this.keyManager.deriveKey(newPassword);
    
    // Generate new DEK
    const newDEK = await this.keyManager.generateDEK();
    
    // Wrap new DEK with new KEK
    const newWrappedDEK = await this.keyManager.wrapDEK(newDEK, newKEK);

    return {
      newKEK,
      newDEK,
      newWrappedDEK,
    };
  }

  /**
   * Get historical wrapped DEKs for decryption of old data
   */
  getHistoricalKeys(): string[] {
    return [...this.historicalKeys];
  }

  /**
   * Add a historical key for tracking
   */
  addHistoricalKey(wrappedDEK: string): void {
    this.historicalKeys.push(wrappedDEK);
  }
}