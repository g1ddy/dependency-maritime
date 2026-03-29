import { describe, it, expect, vi } from 'vitest';
import { generateUUID } from './transformer';

describe('generateUUID', () => {
  it('should return a valid UUID', () => {
    const result = generateUUID();
    // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(result).toMatch(uuidRegex);
  });

  it('should return different UUIDs on subsequent calls', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
  });

  it('should use crypto.randomUUID if available', () => {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      const spy = vi.spyOn(crypto, 'randomUUID');
      generateUUID();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    }
  });

  it('should use crypto.getRandomValues if randomUUID is not available', () => {
    // @ts-ignore
    if (typeof crypto !== 'undefined' && !crypto.randomUUID && crypto.getRandomValues) {
        const spy = vi.spyOn(crypto, 'getRandomValues');
        generateUUID();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    }
  });
});
