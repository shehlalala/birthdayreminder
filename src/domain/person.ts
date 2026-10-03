import { relations } from '@content/relations';
import type { RelationKey } from '@content/types';
import type { MessageKey } from '@/i18n';
import { maxBirthDay } from './birthdays';

export type RelationValue = { kind: 'preset'; key: RelationKey } | { kind: 'custom'; text: string } | null;

export interface Person {
  id: string;
  name: string;
  birthDay: number;
  birthMonth: number;
  birthYear: number | null;
  relation: RelationValue;
  note: string | null;
  syncError: string | null;
}

/** What the add/edit form produces once valid. */
export interface PersonInput {
  name: string;
  birthDay: number;
  birthMonth: number;
  birthYear: number | null;
  relation: RelationValue;
  note: string | null;
}

/** Raw form state, as the user typed it. */
export interface PersonDraft {
  name: string;
  birthDay: number | null;
  birthMonth: number | null;
  birthYear: string;
  relation: RelationValue;
  note: string;
}

export type PersonErrors = Partial<Record<'name' | 'birthday' | 'birthYear' | 'relation' | 'note', MessageKey>>;

export const LIMITS = { name: 100, relationCustom: 50, note: 500 } as const;

export function emptyDraft(): PersonDraft {
  return { name: '', birthDay: null, birthMonth: null, birthYear: '', relation: null, note: '' };
}

export function draftFromPerson(person: Person): PersonDraft {
  return {
    name: person.name,
    birthDay: person.birthDay,
    birthMonth: person.birthMonth,
    birthYear: person.birthYear === null ? '' : String(person.birthYear),
    relation: person.relation,
    note: person.note ?? '',
  };
}

/** Mirrors the database checks so users see errors before the server would reject. */
export function validatePerson(
  draft: PersonDraft,
  currentYear: number,
): { ok: true; value: PersonInput } | { ok: false; errors: PersonErrors } {
  const errors: PersonErrors = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'form.error.nameRequired';
  else if (name.length > LIMITS.name) errors.name = 'form.error.tooLong';

  let birthYear: number | null = null;
  const yearText = draft.birthYear.trim();
  if (yearText) {
    birthYear = /^\d{4}$/.test(yearText) ? Number(yearText) : NaN;
    if (Number.isNaN(birthYear) || birthYear < 1900 || birthYear > currentYear) errors.birthYear = 'form.error.year';
  }

  if (draft.birthDay === null || draft.birthMonth === null) {
    errors.birthday = 'form.error.birthdayRequired';
  } else if (draft.birthDay > maxBirthDay(draft.birthMonth, errors.birthYear ? null : birthYear)) {
    errors.birthday = draft.birthMonth === 2 && draft.birthDay === 29 ? 'form.error.notLeapYear' : 'form.error.invalidDate';
  }

  let relation = draft.relation;
  if (relation?.kind === 'custom') {
    const text = relation.text.trim();
    if (!text) relation = null;
    else if (text.length > LIMITS.relationCustom) errors.relation = 'form.error.tooLong';
    else relation = { kind: 'custom', text };
  }

  const note = draft.note.trim();
  if (note.length > LIMITS.note) errors.note = 'form.error.tooLong';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, birthDay: draft.birthDay!, birthMonth: draft.birthMonth!, birthYear, relation, note: note || null },
  };
}

const presetKeys = new Set<string>(relations.map((r) => r.key));

/** Database columns → relation. Unknown preset keys (from a newer app version) read as "Other". */
export function relationFromColumns(key: string | null, custom: string | null): RelationValue {
  if (key) return { kind: 'preset', key: (presetKeys.has(key) ? key : 'other') as RelationKey };
  if (custom) return { kind: 'custom', text: custom };
  return null;
}

export function relationToColumns(relation: RelationValue): { relation_key: string | null; relation_custom: string | null } {
  if (relation?.kind === 'preset') return { relation_key: relation.key, relation_custom: null };
  if (relation?.kind === 'custom') return { relation_key: null, relation_custom: relation.text };
  return { relation_key: null, relation_custom: null };
}
