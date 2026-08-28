import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCREENSHOTS = Object.freeze({
  dashboard: 'screenshot-dashboard.png',
  inspector: 'screenshot-inspector.png',
  upload: 'screenshot-upload.png',
});

export const SCREENSHOT_DIR = path.resolve('docs/images');
export const SCREENSHOT_FILENAMES = Object.freeze(Object.values(SCREENSHOTS));

export function screenshotPath(key) {
  const filename = SCREENSHOTS[key];
  if (!filename) {
    throw new Error(`Unknown canonical screenshot key: ${key}`);
  }
  return path.join(SCREENSHOT_DIR, filename);
}

export function assertUniqueScreenshotFilenames() {
  const unique = new Set(SCREENSHOT_FILENAMES);
  if (unique.size !== SCREENSHOT_FILENAMES.length) {
    throw new Error('Canonical screenshot filenames must be unique; duplicate names would overwrite documentation assets.');
  }
}

export async function resetCanonicalScreenshots() {
  assertUniqueScreenshotFilenames();
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const entries = await readdir(SCREENSHOT_DIR, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /^screenshot-.*\.png$/.test(entry.name))
      .map((entry) => rm(path.join(SCREENSHOT_DIR, entry.name))),
  );
}

export async function verifyCanonicalScreenshots() {
  assertUniqueScreenshotFilenames();

  const entries = await readdir(SCREENSHOT_DIR, { withFileTypes: true });
  const actual = entries
    .filter((entry) => entry.isFile() && /^screenshot-.*\.png$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const expected = [...SCREENSHOT_FILENAMES].sort();

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Canonical screenshot set mismatch. Expected ${expected.join(', ')}; found ${actual.join(', ') || 'none'}.`,
    );
  }

  for (const filename of expected) {
    const file = await stat(path.join(SCREENSHOT_DIR, filename));
    if (file.size === 0) {
      throw new Error(`Canonical screenshot ${filename} is empty.`);
    }
  }
}

const invokedDirectly = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false;

if (invokedDirectly) {
  const command = process.argv[2];
  if (command === '--reset') {
    await resetCanonicalScreenshots();
  } else if (command === '--verify') {
    await verifyCanonicalScreenshots();
  } else {
    throw new Error('Expected --reset or --verify.');
  }
}
