import { expect, it } from 'vitest';

import { formatIsoDate } from './formatIsoDate';

it('formats ISO dates without time zone drift', () => {
  expect(formatIsoDate('2026-10-03')).toBe('October 3, 2026');
  expect(formatIsoDate('2024-02-29')).toBe('February 29, 2024');
  expect(() => formatIsoDate('03/10/2026')).toThrow();
});
