export type ModuleCategory = 'core' | 'util' | 'ui' | 'other';

export const FILTER_ALIASES: Record<Exclude<ModuleCategory, 'other'>, string[]> = {
  core: ['/core/', '/shared/', '/common/', '/schema/', '/api/', '/services/', '/config/'],
  util: ['/lib/', '/utils/', '/util/', '/helpers/', '/hooks/', '/types/'],
  ui: ['/ui/', '/features/', '/components/', '/pages/', '/layouts/', '/views/']
};

const PRIORITY_ORDER: Exclude<ModuleCategory, 'other'>[] = ['core', 'util', 'ui'];

/**
 * Classifies a module path into a category based on predefined aliases.
 * Priority: Core > Util > UI > Other.
 */
export function classifyNode(path: string): ModuleCategory {
  // Normalize path separators just in case
  const normalizedPath = path.replace(/\\/g, '/');

  for (const category of PRIORITY_ORDER) {
    if (FILTER_ALIASES[category].some(alias => normalizedPath.includes(alias))) {
      return category;
    }
  }

  return 'other';
}
