import { t, tn } from './index';

// Locale-aware date labels for the app UI (not used on static web pages,
// where build-time and visitor locales could differ).

export function monthName(month: number, style: 'long' | 'short' = 'long'): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(undefined, { month: style });
}

/** "May 12" */
export function formatBirthday(month: number, day: number): string {
  return new Date(2000, month - 1, day).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/** "Today", "Tomorrow", "In 5 days" */
export function whenLabel(daysUntil: number): string {
  if (daysUntil === 0) return t('people.when.today');
  if (daysUntil === 1) return t('people.when.tomorrow');
  return tn('people.when.days', daysUntil);
}
