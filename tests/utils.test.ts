import { describe, it, expect } from 'vitest';
import { formatDate } from '../src/renderer/utils';

describe('formatDate', () => {
  it('formats a standard date correctly', () => {
    expect(formatDate(new Date(2026, 0, 15))).toBe('2026-01-15');
  });

  it('pads single-digit months with leading zero', () => {
    expect(formatDate(new Date(2026, 2, 5))).toBe('2026-03-05');
  });

  it('pads single-digit days with leading zero', () => {
    expect(formatDate(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('handles December 31 (year boundary)', () => {
    expect(formatDate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('handles January 1 (year start)', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('handles leap year date (Feb 29)', () => {
    expect(formatDate(new Date(2028, 1, 29))).toBe('2028-02-29');
  });

  it('handles double-digit month and day', () => {
    expect(formatDate(new Date(2026, 10, 25))).toBe('2026-11-25');
  });

  it('returns consistent format regardless of locale', () => {
    const result = formatDate(new Date(2026, 5, 9));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe('2026-06-09');
  });
});
