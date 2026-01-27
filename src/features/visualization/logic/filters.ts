export type ModuleCategory = 'core' | 'util' | 'ui' | 'other';

export const FILTER_ALIASES: Record<Exclude<ModuleCategory, 'other'>, string[]> = {
  core: ['/core/', '/shared/', '/common/', '/schema/', '/api/', '/services/', '/config/'],
  util: ['/lib/', '/utils/', '/util/', '/helpers/', '/hooks/', '/types/'],
  ui: ['/ui/', '/features/', '/components/', '/pages/', '/layouts/', '/views/']
};

/**
 * Classifies a module path into a category based on predefined aliases.
 * Priority: Core > Util > UI > Other.
 */
export function classifyNode(path: string): ModuleCategory {
  // Normalize path separators just in case
  const normalizedPath = path.replace(/\\/g, '/');

  // Check Core
  if (FILTER_ALIASES.core.some(alias => normalizedPath.includes(alias))) {
    return 'core';
  }

  // Check Util
  if (FILTER_ALIASES.util.some(alias => normalizedPath.includes(alias))) {
    return 'util';
  }

  // Check UI
  if (FILTER_ALIASES.ui.some(alias => normalizedPath.includes(alias))) {
    return 'ui';
  }

  return 'other';
}
