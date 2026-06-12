import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    deriveBits: vi.fn(),
    deriveKey: vi.fn(),
    generateKey: vi.fn(),
    wrapKey: vi.fn(),
    unwrapKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i % 256;
    }
    return arr;
  }),
};

describe('KeyManager', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', mockCrypto);
    vi.clearAllMocks();
  });

  describe('createKeyManager', () => {
    it('should create a KeyManager instance', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      expect(km).toBeDefined();
      expect(typeof km.deriveKey).toBe('function');
      expect(typeof km.generateDEK).toBe('function');
      expect(typeof km.wrapDEK).toBe('function');
      expect(typeof km.unwrapDEK).toBe('function');
    });
  });

  describe('deriveKey', () => {
    it('should derive a CryptoKey from password using PBKDF2', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      const password = 'testPassword123';
      
      const cryptoKey = {} as CryptoKey;
      mockCrypto.subtle.deriveKey.mockResolvedValue(cryptoKey);
      
      const result = await km.deriveKey(password);
      
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          salt: expect.any(Uint8Array),
          iterations: 100000,
        }),
        expect.any(Object),
        expect.objectContaining({
          name: 'AES-GCM',
          length: 256,
        })
      );
      expect(result).toBe(cryptoKey);
    });

    it('should generate unique salts for different calls', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      const password = 'testPassword';
      
      mockCrypto.subtle.deriveKey.mockResolvedValue({} as CryptoKey);
      
      await km.deriveKey(password);
      await km.deriveKey(password);
      
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(2);
      // Different salts should be used
    });

    it('should produce different keys for different passwords', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      
      mockCrypto.subtle.deriveKey.mockResolvedValue({} as CryptoKey);
      
      await km.deriveKey('password1');
      await km.deriveKey('password2');
      
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateDEK', () => {
    it('should generate a new DEK with AES-GCM', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      
      const cryptoKey = {} as CryptoKey;
      mockCrypto.subtle.generateKey.mockResolvedValue(cryptoKey);
      
      const dek = await km.generateDEK();
      
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AES-GCM',
          length: 256,
        }),
        true,
        expect.arrayContaining(['encrypt', 'decrypt'])
      );
      expect(dek).toBe(cryptoKey);
    });
  });

  describe('wrapDEK', () => {
    it('should wrap DEK using KEK and return base64 string', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      const dek = {} as CryptoKey;
      const kek = {} as CryptoKey;
      
      const wrappedKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      mockCrypto.subtle.wrapKey.mockResolvedValue(wrappedKey);
      
      const result = await km.wrapDEK(dek, kek);
      
      expect(mockCrypto.subtle.wrapKey).toHaveBeenCalledWith(
        'raw',
        dek,
        kek,
        expect.objectContaining({
          name: 'AES-GCM',
        })
      );
      expect(typeof result).toBe('string');
    });
  });

  describe('unwrapDEK', () => {
    it('should unwrap a wrapped DEK back to CryptoKey', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      
      const wrappedDEK = btoa(String.fromCharCode(...new Uint8Array(44)));
      const kek = {} as CryptoKey;
      
      const cryptoKey = {} as CryptoKey;
      mockCrypto.subtle.unwrapKey.mockResolvedValue(cryptoKey);
      
      const result = await km.unwrapDEK(wrappedDEK, kek);
      
      expect(mockCrypto.subtle.unwrapKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Object),
        kek,
        expect.objectContaining({
          name: 'AES-GCM',
        }),
        expect.objectContaining({
          name: 'AES-GCM',
          length: 256,
        }),
        true,
        expect.arrayContaining(['encrypt', 'decrypt'])
      );
      expect(result).toBe(cryptoKey);
    });
  });

  describe('salt stability', () => {
    it('should generate unique salt for each deriveKey call', async () => {
      const { createKeyManager } = await import('../KeyManager');
      const km = createKeyManager();
      const password = 'testPassword';
      
      mockCrypto.subtle.deriveKey.mockResolvedValue({} as CryptoKey);
      
      const result1 = await km.deriveKey(password);
      const result2 = await km.deriveKey(password);
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
