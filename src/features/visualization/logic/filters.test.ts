import { describe, it, expect } from 'vitest';
import { classifyNode } from './filters';

describe('Filter Logic - classifyNode', () => {
  it('should classify Core modules correctly', () => {
    expect(classifyNode('src/schema/dependency-cruiser.ts')).toBe('core');
    expect(classifyNode('src/core/app.ts')).toBe('core');
    expect(classifyNode('src/shared/constants.ts')).toBe('core');
    expect(classifyNode('src/services/api.ts')).toBe('core');
  });

  it('should classify Util modules correctly', () => {
    expect(classifyNode('src/lib/utils.ts')).toBe('util');
    expect(classifyNode('src/utils/format.ts')).toBe('util');
    expect(classifyNode('src/hooks/use-auth.ts')).toBe('util');
    // Ensure Util takes precedence over UI if both match?
    // Wait, my logic was Core > Util > UI.
    // If a file is src/features/visualization/utils.ts -> matches /features/ (UI) and /utils/ (Util)?
    // No, aliases are substrings.
    // "src/features/visualization/utils.ts" contains "/features/" and "utils.ts" (not "/utils/").
    // Let's test exact alias matches.
    expect(classifyNode('src/helpers/date.ts')).toBe('util');
  });

  it('should classify UI modules correctly', () => {
    expect(classifyNode('src/components/ui/button.tsx')).toBe('ui');
    expect(classifyNode('src/features/visualization/GraphOverlay.tsx')).toBe('ui');
    expect(classifyNode('src/pages/Home.tsx')).toBe('ui');
    expect(classifyNode('src/views/Dashboard.tsx')).toBe('ui');
  });

  it('should handle priority correctly', () => {
    // Core > Util
    // path containing both /core/ and /lib/ ? Unlikely structure but possible.
    expect(classifyNode('src/core/lib/helper.ts')).toBe('core');

    // Util > UI
    // path containing /features/ and /hooks/
    // "src/features/auth/hooks/useLogin.ts" -> contains "/features/" and "/hooks/"
    // My logic: Core checked first, then Util, then UI.
    // So "/hooks/" (Util) should match before "/features/" (UI).
    expect(classifyNode('src/features/auth/hooks/useLogin.ts')).toBe('util');
  });

  it('should classify unmapped modules as other', () => {
    expect(classifyNode('src/App.tsx')).toBe('other');
    expect(classifyNode('src/main.tsx')).toBe('other');
    expect(classifyNode('README.md')).toBe('other');
  });

  it('should handle Windows style paths', () => {
    expect(classifyNode('src\\core\\app.ts')).toBe('core');
    expect(classifyNode('src\\features\\ui\\Button.tsx')).toBe('ui');
  });
});
