import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    importKey: vi.fn(),
    generateKey: vi.fn(),
    deriveKey: vi.fn(),
    wrapKey: vi.fn(),
    unwrapKey: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i % 256;
    }
    return arr;
  }),
};

const cryptoKey = {
  type: 'secret',
  algorithm: { name: 'AES-GCM', length: 256 },
  extractable: true,
  usages: ['encrypt', 'decrypt'],
} as unknown as CryptoKey;

describe('EncryptedStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', mockCrypto);
    vi.clearAllMocks();
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt data and return EncryptedBlob', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      await es.initialize(cryptoKey);
      
      const testData = { name: 'test', value: 123 };
      const encryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      mockCrypto.subtle.encrypt.mockResolvedValue(encryptedData);
      
      const result = await es.encrypt(testData);
      
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('version', 'V1');
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should decrypt data back to original', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      await es.initialize(cryptoKey);
      
      const testData = { name: 'test', value: 123 };
      const originalBytes = new TextEncoder().encode(JSON.stringify(testData));
      mockCrypto.subtle.decrypt.mockResolvedValue(originalBytes);
      
      const encrypted = {
        iv: btoa(String.fromCharCode(...new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))),
        data: btoa(String.fromCharCode(...new Uint8Array([13, 14, 15, 16, 17, 18, 19, 20]))),
        version: 'V1' as const,
      };
      
      const decrypted = await es.decrypt(encrypted);
      expect(decrypted).toEqual(testData);
    });
  });

  describe('encryptField/decryptField', () => {
    it('should encrypt a single field', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      await es.initialize(cryptoKey);
      
      mockCrypto.subtle.encrypt.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
      
      const result = await es.encryptField('sensitive data');
      
      expect(typeof result).toBe('string');
      expect(result).not.toBe('sensitive data');
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should decrypt a field back to original value', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      await es.initialize(cryptoKey);
      
      const testValue = 'secret value';
      const encodedBytes = new TextEncoder().encode(JSON.stringify(testValue));
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedBytes);
      
      // Create a valid encrypted field (IV + data)
      const iv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const data = new Uint8Array([13, 14, 15, 16, 17, 18, 19, 20]);
      const combined = new Uint8Array(iv.length + data.length);
      combined.set(iv, 0);
      combined.set(data, iv.length);
      
      const result = await es.decryptField(btoa(String.fromCharCode(...combined)));
      expect(result).toBe(testValue);
    });

    it('should handle different field types', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      await es.initialize(cryptoKey);
      
      const testValues = [42, 'string', { nested: true }, [1, 2, 3]];
      
      for (const value of testValues) {
        const encodedBytes = new TextEncoder().encode(JSON.stringify(value));
        mockCrypto.subtle.decrypt.mockResolvedValue(encodedBytes);
        
        mockCrypto.subtle.encrypt.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
        const encrypted = await es.encryptField(value);
        expect(typeof encrypted).toBe('string');
        
        const iv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const data = new Uint8Array([5, 6, 7, 8]);
        const combined = new Uint8Array(iv.length + data.length);
        combined.set(iv, 0);
        combined.set(data, iv.length);
        
        mockCrypto.subtle.decrypt.mockResolvedValue(encodedBytes);
        const decrypted = await es.decryptField(btoa(String.fromCharCode(...combined)));
        expect(decrypted).toEqual(value);
      }
    });
  });

  describe('invalid blob handling', () => {
    it('should throw error when decrypting with uninitialized storage', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      
      const invalidBlob = {
        iv: 'invalid',
        data: 'invalid',
        version: 'V1' as const,
      };
      
      await expect(es.decrypt(invalidBlob)).rejects.toThrow('not initialized');
    });

    it('should handle tampered data gracefully', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      await es.initialize(cryptoKey);
      
      const tamperedBlob = {
        iv: btoa(String.fromCharCode(...new Uint8Array(12))),
        data: btoa(String.fromCharCode(...new Uint8Array(100))),
        version: 'V1' as const,
      };
      
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('decryption failed'));
      
      await expect(es.decrypt(tamperedBlob)).rejects.toThrow();
    });
  });

  describe('large object encryption', () => {
    it('should handle large objects', async () => {
      const { EncryptedStorage } = await import('../EncryptedStorage');
      const es = new EncryptedStorage();
      await es.initialize(cryptoKey);
      
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          content: 'x'.repeat(1000),
        })),
      };
      
      const encodedBytes = new TextEncoder().encode(JSON.stringify(largeData));
      mockCrypto.subtle.encrypt.mockResolvedValue(new Uint8Array(encodedBytes));
      mockCrypto.subtle.decrypt.mockResolvedValue(encodedBytes);
      
      const encrypted = await es.encrypt(largeData);
      const decrypted = await es.decrypt(encrypted);
      
      expect(decrypted).toEqual(largeData);
    });
  });
});
