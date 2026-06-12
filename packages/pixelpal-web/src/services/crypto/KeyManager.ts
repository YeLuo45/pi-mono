/**
 * KeyManager - AES-256-GCM End-to-End Encryption Key Management
 * Uses Web Crypto API for secure key derivation and management
 */

export interface EncryptedBlob {
  iv: string;
  data: string;
  version: 'V1';
}

export interface KeyManager {
  deriveKey(password: string): Promise<CryptoKey>;
  generateDEK(): Promise<CryptoKey>;
  wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<string>;
  unwrapDEK(wrappedDEK: string, kek: CryptoKey): Promise<CryptoKey>;
}

export interface KeyRotationManager {
  rotateDEK(oldDEK: CryptoKey, kek: CryptoKey): Promise<string>;
  rekey(
    oldSalt: Uint8Array,
    newSalt: Uint8Array,
    oldKEK: CryptoKey,
    newDEK: CryptoKey,
    newPassword: string
  ): Promise<string>;
  getActiveDEK(): Promise<string | null>;
}

/**
 * Create a KeyManager instance for key derivation and DEK management
 */
export function createKeyManager(): KeyManager {
  const ALGORITHM = 'AES-GCM';
  const KEY_LENGTH = 256;
  const ITERATIONS = 100000;

  /**
   * Derive a 256-bit CryptoKey from password using PBKDF2
   */
  async function deriveKey(password: string): Promise<CryptoKey> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const kek = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: ITERATIONS,
      },
      keyMaterial,
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );

    return kek;
  }

  /**
   * Generate a new Data Encryption Key (DEK)
   */
  async function generateDEK(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Wrap/encrypt a DEK with a Key Encryption Key (KEK)
   * Returns base64-encoded wrapped key
   */
  async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedKey = await crypto.subtle.wrapKey(
      'raw',
      dek,
      kek,
      {
        name: ALGORITHM,
        iv,
      }
    );

    // Combine IV + wrapped key for storage
    const combined = new Uint8Array(iv.length + wrappedKey.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrappedKey), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Unwrap/decrypt a wrapped DEK using a KEK
   */
  async function unwrapDEK(wrappedDEK: string, kek: CryptoKey): Promise<CryptoKey> {
    const combined = Uint8Array.from(atob(wrappedDEK), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const wrappedKey = combined.slice(12);

    return crypto.subtle.unwrapKey(
      'raw',
      wrappedKey,
      kek,
      {
        name: ALGORITHM,
        iv,
      },
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  return {
    deriveKey,
    generateDEK,
    wrapDEK,
    unwrapDEK,
  };
}

/**
 * Create a KeyRotationManager for DEK rotation and rekeying
 */
export function createKeyRotationManager(): KeyRotationManager {
  const wrappedDEKs: string[] = [];

  /**
   * Rotate to a new DEK, keeping the old one for decryption
   */
  async function rotateDEK(oldDEK: CryptoKey, kek: CryptoKey): Promise<string> {
    const km = createKeyManager();
    const newDEK = await km.generateDEK();
    const wrappedDEK = await km.wrapDEK(newDEK, kek);
    
    // Store old DEK wrapped (in real impl, would persist to secure storage)
    wrappedDEKs.push(await km.wrapDEK(oldDEK, kek));
    
    return wrappedDEK;
  }

  /**
   * Rekey with a new password/salt
   */
  async function rekey(
    oldSalt: Uint8Array,
    newSalt: Uint8Array,
    oldKEK: CryptoKey,
    newDEK: CryptoKey,
    newPassword: string
  ): Promise<string> {
    const km = createKeyManager();
    const newKEK = await km.deriveKey(newPassword);
    
    // Wrap new DEK with new KEK
    const wrappedDEK = await km.wrapDEK(newDEK, newKEK);
    
    return wrappedDEK;
  }

  /**
   * Get the currently active DEK (most recent)
   */
  async function getActiveDEK(): Promise<string | null> {
    return wrappedDEKs.length > 0 ? wrappedDEKs[wrappedDEKs.length - 1] : null;
  }

  return {
    rotateDEK,
    rekey,
    getActiveDEK,
  };
}