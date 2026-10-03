// Pure birthday date math. Works on calendar dates (year, month, day) in the
// device's local time zone; never on Date instants, so DST and time zones
// can't shift a birthday by a day.

export interface CalendarDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

export interface Birthday {
  birthDay: number;
  birthMonth: number;
  birthYear: number | null;
}

export interface UpcomingBirthday {
  date: CalendarDate;
  /** 0 = today. */
  daysUntil: number;
  /** Age on that date, if the birth year is known. */
  turning: number | null;
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Days in a month for a birthday whose year may be unknown (Feb allows 29). */
export function maxBirthDay(month: number, year: number | null): number {
  if (month === 2 && year === null) return 29;
  return daysInMonth(year ?? 2001, month);
}

/**
 * The date a birthday falls on in a given year. Feb 29 birthdays are
 * celebrated on Feb 28 in non-leap years. This is the only place that rule lives.
 */
export function birthdayInYear(birthday: Pick<Birthday, 'birthDay' | 'birthMonth'>, year: number): CalendarDate {
  if (birthday.birthMonth === 2 && birthday.birthDay === 29 && !isLeapYear(year)) {
    return { year, month: 2, day: 28 };
  }
  return { year, month: birthday.birthMonth, day: birthday.birthDay };
}

/** Whole days from a to b (b later → positive). */
export function daysBetween(a: CalendarDate, b: CalendarDate): number {
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
  return Math.round(ms / 86_400_000);
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Next occurrence on or after today. */
export function nextBirthday(birthday: Birthday, today: CalendarDate): UpcomingBirthday {
  let date = birthdayInYear(birthday, today.year);
  if (compareDates(date, today) < 0) date = birthdayInYear(birthday, today.year + 1);
  return {
    date,
    daysUntil: daysBetween(today, date),
    turning: birthday.birthYear === null ? null : date.year - birthday.birthYear,
  };
}

/** Sorts by next birthday (today first), then by name. Doesn't mutate. */
export function sortByUpcoming<T extends Birthday & { name: string }>(
  people: readonly T[],
  today: CalendarDate,
): (T & { upcoming: UpcomingBirthday })[] {
  return people
    .map((person) => ({ ...person, upcoming: nextBirthday(person, today) }))
    .sort((a, b) => a.upcoming.daysUntil - b.upcoming.daysUntil || a.name.localeCompare(b.name));
}

export function todayLocal(now: Date = new Date()): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
