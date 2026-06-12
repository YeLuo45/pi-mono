/**
 * EncryptedStorage - AES-256-GCM Encrypted Storage Layer
 * Provides encrypt/decrypt and field-level encryption
 */

import type { EncryptedBlob } from './KeyManager';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

export class EncryptedStorage {
  private key: CryptoKey | null = null;

  /**
   * Initialize storage with a CryptoKey
   */
  async initialize(key: CryptoKey): Promise<void> {
    this.key = key;
  }

  /**
   * Initialize storage with a password
   */
  async initializeWithPassword(password: string): Promise<void> {
    const { createKeyManager } = await import('./KeyManager');
    const km = createKeyManager();
    this.key = await km.deriveKey(password);
  }

  /**
   * Encrypt an object and return an EncryptedBlob
   */
  async encrypt(data: object): Promise<EncryptedBlob> {
    if (!this.key) {
      throw new Error('EncryptedStorage not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
      },
      this.key,
      encodedData
    );

    return {
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      version: 'V1' as const,
    };
  }

  /**
   * Decrypt an EncryptedBlob back to an object
   */
  async decrypt(blob: EncryptedBlob): Promise<object> {
    if (!this.key) {
      throw new Error('EncryptedStorage not initialized');
    }

    const iv = Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0));
    const encryptedData = Uint8Array.from(atob(blob.data), c => c.charCodeAt(0));

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      this.key,
      encryptedData
    );

    const decoded = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decoded);
  }

  /**
   * Encrypt a single field value to a string
   */
  async encryptField(value: unknown): Promise<string> {
    if (!this.key) {
      throw new Error('EncryptedStorage not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(value));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
      },
      this.key,
      encodedData
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt a field value back to its original type
   */
  async decryptField(encrypted: string): Promise<unknown> {
    if (!this.key) {
      throw new Error('EncryptedStorage not initialized');
    }

    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      this.key,
      encryptedData
    );

    const decoded = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decoded);
  }
}