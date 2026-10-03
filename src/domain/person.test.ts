import { describe, expect, it } from 'vitest';

import { emptyDraft, relationFromColumns, validatePerson, type PersonDraft } from './person';

const draft = (patch: Partial<PersonDraft>): PersonDraft => ({ ...emptyDraft(), name: 'Leyla', birthDay: 12, birthMonth: 5, ...patch });

describe('validatePerson', () => {
  it('accepts a minimal person and trims text', () => {
    const result = validatePerson(draft({ name: '  Leyla  ', note: '  ' }), 2026);
    expect(result).toEqual({
      ok: true,
      value: { name: 'Leyla', birthDay: 12, birthMonth: 5, birthYear: null, relation: null, note: null },
    });
  });

  it('requires a name and a birthday', () => {
    expect(validatePerson({ ...emptyDraft(), name: ' ' }, 2026)).toEqual({
      ok: false,
      errors: { name: 'form.error.nameRequired', birthday: 'form.error.birthdayRequired' },
    });
  });

  it('checks the day against the month and year', () => {
    expect(validatePerson(draft({ birthDay: 31, birthMonth: 4 }), 2026)).toMatchObject({ errors: { birthday: 'form.error.invalidDate' } });
    expect(validatePerson(draft({ birthDay: 29, birthMonth: 2 }), 2026).ok).toBe(true);
    expect(validatePerson(draft({ birthDay: 29, birthMonth: 2, birthYear: '2000' }), 2026).ok).toBe(true);
    expect(validatePerson(draft({ birthDay: 29, birthMonth: 2, birthYear: '2001' }), 2026)).toMatchObject({
      errors: { birthday: 'form.error.notLeapYear' },
    });
  });

  it('rejects years in the future or malformed', () => {
    for (const birthYear of ['2027', '1899', '99', 'abcd']) {
      expect(validatePerson(draft({ birthYear }), 2026)).toMatchObject({ errors: { birthYear: 'form.error.year' } });
    }
    expect(validatePerson(draft({ birthYear: '1996' }), 2026)).toMatchObject({ value: { birthYear: 1996 } });
  });

  it('drops a blank custom relation and limits its length', () => {
    expect(validatePerson(draft({ relation: { kind: 'custom', text: '  ' } }), 2026)).toMatchObject({ value: { relation: null } });
    expect(validatePerson(draft({ relation: { kind: 'custom', text: 'x'.repeat(51) } }), 2026)).toMatchObject({
      errors: { relation: 'form.error.tooLong' },
    });
  });
});

it('reads unknown preset keys as Other', () => {
  expect(relationFromColumns('stepcousin', null)).toEqual({ kind: 'preset', key: 'other' });
  expect(relationFromColumns(null, 'Godmother')).toEqual({ kind: 'custom', text: 'Godmother' });
  expect(relationFromColumns(null, null)).toBeNull();
});
