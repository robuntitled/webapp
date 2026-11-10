import { describe, expect, it } from 'vitest';
import { formatCalendarMonthDropdownIt } from '@/lib/ui/calendar-locale';

describe('formatCalendarMonthDropdownIt', () => {
  it('returns Italian short months lowercase without trailing dot', () => {
    expect(formatCalendarMonthDropdownIt(new Date(1996, 9, 31))).toBe('ott');
    expect(formatCalendarMonthDropdownIt(new Date(2026, 0, 1))).toBe('gen');
    expect(formatCalendarMonthDropdownIt(new Date(2026, 11, 15))).toBe('dic');
  });

  it('covers all 12 months in Italian', () => {
    const labels = Array.from({ length: 12 }, (_, m) =>
      formatCalendarMonthDropdownIt(new Date(2026, m, 1))
    );
    expect(labels).toEqual([
      'gen',
      'feb',
      'mar',
      'apr',
      'mag',
      'giu',
      'lug',
      'ago',
      'set',
      'ott',
      'nov',
      'dic',
    ]);
  });
});
