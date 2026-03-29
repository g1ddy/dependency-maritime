// Simple UUID generator for browser/node compatibility
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Sentinel: Medium - Fix weak random number generation
  // crypto.getRandomValues is a cryptographically secure random number generator
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint8Array(31);
    crypto.getRandomValues(randomValues);
    let i = 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = randomValues[i++] & 15;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  throw new Error('No cryptographically secure random number generator available.');
}
