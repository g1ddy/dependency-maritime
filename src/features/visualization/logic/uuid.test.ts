import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateUUID } from './uuid';

describe('generateUUID', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should return a valid UUID using crypto.randomUUID if available', () => {
    const mockUuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockCrypto = {
      randomUUID: vi.fn().mockReturnValue(mockUuid),
    };
    vi.stubGlobal('crypto', mockCrypto);

    const result = generateUUID();
    expect(result).toBe(mockUuid);
    expect(mockCrypto.randomUUID).toHaveBeenCalled();
  });

  it('should return a valid UUID using crypto.getRandomValues if randomUUID is not available', () => {
    const mockCrypto = {
      getRandomValues: vi.fn((buffer: Uint8Array) => {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = i;
        }
        return buffer;
      }),
    };
    vi.stubGlobal('crypto', mockCrypto);

    const result = generateUUID();
    // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(result).toMatch(uuidRegex);
    expect(mockCrypto.getRandomValues).toHaveBeenCalled();
  });

  it('should throw an error if no cryptographically secure random number generator is available', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => generateUUID()).toThrow('No cryptographically secure random number generator available.');
  });

  it('should throw an error if crypto exists but no secure methods are available', () => {
    vi.stubGlobal('crypto', {});

    expect(() => generateUUID()).toThrow('No cryptographically secure random number generator available.');
  });

  it('should return different UUIDs on subsequent calls (integration check)', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid1).toMatch(uuidRegex);
    expect(uuid2).toMatch(uuidRegex);
  });
});
