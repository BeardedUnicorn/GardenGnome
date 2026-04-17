import { describe, expect, it } from 'vitest';

import {
  deriveNextSeasonTag,
  formatSeasonDuplicateName,
} from '@/domain/garden/seasons';

describe('season helpers', () => {
  it('increments year-like season tags', () => {
    expect(deriveNextSeasonTag('2026')).toBe('2027');
  });

  it('falls back to next year when season tag is missing', () => {
    expect(deriveNextSeasonTag(null, 2030)).toBe('2030');
  });

  it('formats names for season-specific duplicates without stacking stale suffixes', () => {
    expect(formatSeasonDuplicateName('Kitchen Garden 2026', '2027')).toBe(
      'Kitchen Garden 2027',
    );
  });
});
