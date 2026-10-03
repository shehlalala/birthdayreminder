import { describe, expect, it } from 'vitest';

import { birthdayInYear, maxBirthDay, nextBirthday, sortByUpcoming, todayLocal } from './birthdays';

const today = { year: 2026, month: 10, day: 3 };
const bday = (birthMonth: number, birthDay: number, birthYear: number | null = null) => ({ birthDay, birthMonth, birthYear });

describe('nextBirthday', () => {
  it('is today with 0 days', () => {
    expect(nextBirthday(bday(10, 3, 1996), today)).toEqual({ date: today, daysUntil: 0, turning: 30 });
  });

  it('counts days later this year', () => {
    expect(nextBirthday(bday(10, 10), today)).toMatchObject({ daysUntil: 7, turning: null });
  });

  it('rolls over to next year once passed', () => {
    const result = nextBirthday(bday(10, 2, 1990), today);
    expect(result.date).toEqual({ year: 2027, month: 10, day: 2 });
    expect(result.daysUntil).toBe(364);
    expect(result.turning).toBe(37);
  });

  it('handles the year boundary', () => {
    expect(nextBirthday(bday(1, 1), { year: 2026, month: 12, day: 31 }).daysUntil).toBe(1);
  });

  it('crosses a leap day correctly', () => {
    expect(nextBirthday(bday(3, 1), { year: 2028, month: 2, day: 28 }).daysUntil).toBe(2);
  });
});

describe('Feb 29 birthdays', () => {
  it('fall on Feb 28 in non-leap years and Feb 29 in leap years', () => {
    expect(birthdayInYear(bday(2, 29), 2027)).toEqual({ year: 2027, month: 2, day: 28 });
    expect(birthdayInYear(bday(2, 29), 2028)).toEqual({ year: 2028, month: 2, day: 29 });
    expect(birthdayInYear(bday(2, 29), 2100)).toEqual({ year: 2100, month: 2, day: 28 });
    expect(birthdayInYear(bday(2, 29), 2000)).toEqual({ year: 2000, month: 2, day: 29 });
  });

  it('count as today on Feb 28 of a non-leap year, with the right age', () => {
    expect(nextBirthday(bday(2, 29, 2000), { year: 2027, month: 2, day: 28 })).toMatchObject({ daysUntil: 0, turning: 27 });
  });

  it('allow day 29 in February only when the year is unknown or leap', () => {
    expect(maxBirthDay(2, null)).toBe(29);
    expect(maxBirthDay(2, 2000)).toBe(29);
    expect(maxBirthDay(2, 2001)).toBe(28);
    expect(maxBirthDay(4, null)).toBe(30);
  });
});

describe('sortByUpcoming', () => {
  it('puts today first, then soonest, then name', () => {
    const people = [
      { name: 'Zed', ...bday(12, 1) },
      { name: 'Bea', ...bday(10, 3) },
      { name: 'Al', ...bday(10, 3) },
      { name: 'Passed', ...bday(10, 1) },
      { name: 'Soon', ...bday(10, 5) },
    ];
    expect(sortByUpcoming(people, today).map((p) => p.name)).toEqual(['Al', 'Bea', 'Soon', 'Zed', 'Passed']);
  });
});

it('todayLocal uses local calendar fields', () => {
  expect(todayLocal(new Date(2026, 0, 31, 23, 59))).toEqual({ year: 2026, month: 1, day: 31 });
});
