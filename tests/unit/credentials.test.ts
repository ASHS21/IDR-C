import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Credential Encryption', () => {
  const TEST_KEY = 'a'.repeat(64) // 32 bytes in hex

  beforeEach(() => {
    vi.stubEnv('CREDENTIALS_KEY', TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('encrypts and decrypts credentials roundtrip', async () => {
    const { encryptCredentials, decryptCredentials } = await import('@/lib/crypto/credentials')

    const original = {
      apiKey: 'sk-test-12345',
      password: 'super-secret',
      endpoint: 'https://api.example.com',
    }

    const encrypted = encryptCredentials(original)
    expect(typeof encrypted).toBe('string')
    expect(encrypted).not.toContain('sk-test-12345')

    const decrypted = decryptCredentials(encrypted)
    expect(decrypted).toEqual(original)
  })

  it('produces different ciphertexts for the same input (random IV)', async () => {
    const { encryptCredentials } = await import('@/lib/crypto/credentials')
    const data = { key: 'value' }

    const enc1 = encryptCredentials(data)
    const enc2 = encryptCredentials(data)
    expect(enc1).not.toBe(enc2)
  })

  it('throws on tampered ciphertext', async () => {
    const { encryptCredentials, decryptCredentials } = await import('@/lib/crypto/credentials')

    const encrypted = encryptCredentials({ key: 'value' })
    const tampered = encrypted.slice(0, -4) + 'XXXX'

    expect(() => decryptCredentials(tampered)).toThrow()
  })

  it('throws when CREDENTIALS_KEY is missing', async () => {
    vi.stubEnv('CREDENTIALS_KEY', '')

    // Re-import to get fresh module
    const mod = await import('@/lib/crypto/credentials')

    expect(() => mod.encryptCredentials({ key: 'value' })).toThrow('CREDENTIALS_KEY')
  })

  it('throws when CREDENTIALS_KEY has wrong length', async () => {
    vi.stubEnv('CREDENTIALS_KEY', 'tooshort')

    const mod = await import('@/lib/crypto/credentials')

    expect(() => mod.encryptCredentials({ key: 'value' })).toThrow('64-character')
  })

  describe('safeDecryptCredentials', () => {
    it('returns plain objects as-is (legacy unencrypted)', async () => {
      const { safeDecryptCredentials } = await import('@/lib/crypto/credentials')

      const legacy = { apiKey: 'plain-text-key', url: 'https://example.com' }
      expect(safeDecryptCredentials(legacy)).toEqual(legacy)
    })

    it('decrypts encrypted strings', async () => {
      const { encryptCredentials, safeDecryptCredentials } = await import('@/lib/crypto/credentials')

      const original = { secret: 'encrypted-value' }
      const encrypted = encryptCredentials(original)
      expect(safeDecryptCredentials(encrypted)).toEqual(original)
    })

    it('returns empty object for null/undefined', async () => {
      const { safeDecryptCredentials } = await import('@/lib/crypto/credentials')

      expect(safeDecryptCredentials(null)).toEqual({})
      expect(safeDecryptCredentials(undefined)).toEqual({})
    })
  })

  describe('isEncrypted', () => {
    it('identifies encrypted strings', async () => {
      const { encryptCredentials, isEncrypted } = await import('@/lib/crypto/credentials')

      const encrypted = encryptCredentials({ key: 'value' })
      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('rejects plain objects', async () => {
      const { isEncrypted } = await import('@/lib/crypto/credentials')

      expect(isEncrypted({ key: 'value' })).toBe(false)
      expect(isEncrypted(null)).toBe(false)
      expect(isEncrypted(42)).toBe(false)
      expect(isEncrypted('short')).toBe(false)
    })
  })
})
