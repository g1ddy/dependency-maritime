// Simple UUID generator for browser/node compatibility
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers and Node.js 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to crypto.getRandomValues (most browsers and Node.js 17+ via globalThis.crypto)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint8Array(16);
    crypto.getRandomValues(randomValues);

    // Set version to 4 (UUID v4)
    randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
    // Set variant to RFC 4122
    randomValues[8] = (randomValues[8] & 0x3f) | 0x80;

    const hex = Array.from(randomValues).map(b => b.toString(16).padStart(2, '0'));

    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join('')
    ].join('-');
  }

  throw new Error('No cryptographically secure random number generator available.');
}
