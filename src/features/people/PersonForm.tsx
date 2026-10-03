import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { relations } from '@content/relations';
import { maxBirthDay } from '@/domain/birthdays';
import { LIMITS, validatePerson, type PersonDraft, type PersonErrors, type PersonInput } from '@/domain/person';
import { t } from '@/i18n';
import { monthName } from '@/i18n/dates';
import { Button, Chip, ChipGroup, FieldError, FieldLabel, TextField } from '@/ui/controls';
import { Page } from '@/ui/primitives';
import { space } from '@/ui/tokens';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Add/edit form. Birthday is chosen with month and day chips, so no year is needed. */
export function PersonForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: PersonDraft;
  onSubmit: (input: PersonInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<PersonErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const set = (patch: Partial<PersonDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const yearForDays = /^\d{4}$/.test(draft.birthYear) ? Number(draft.birthYear) : null;
  const dayCount = draft.birthMonth ? maxBirthDay(draft.birthMonth, yearForDays) : 31;
  const customSelected = draft.relation?.kind === 'custom';

  const submit = async () => {
    const result = validatePerson(draft, new Date().getFullYear());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveFailed(false);
    try {
      await onSubmit(result.value);
    } catch {
      setSaveFailed(true);
      setSaving(false);
    }
  };

  return (
    <Page>
      <TextField
        label={t('form.name')}
        value={draft.name}
        onChangeText={(name) => set({ name })}
        maxLength={LIMITS.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
        error={errors.name && t(errors.name)}
      />

      <View style={styles.field}>
        <FieldLabel>{t('form.month')}</FieldLabel>
        <ChipGroup label={t('form.month')}>
          {MONTHS.map((month) => (
            <Chip
              key={month}
              label={monthName(month, 'short')}
              selected={draft.birthMonth === month}
              onPress={() =>
                set({
                  birthMonth: month,
                  birthDay: draft.birthDay && draft.birthDay > maxBirthDay(month, yearForDays) ? null : draft.birthDay,
                })
              }
            />
          ))}
        </ChipGroup>
      </View>

      <View style={styles.field}>
        <FieldLabel>{t('form.day')}</FieldLabel>
        <ChipGroup label={t('form.day')}>
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
            <Chip key={day} label={String(day)} selected={draft.birthDay === day} onPress={() => set({ birthDay: day })} />
          ))}
        </ChipGroup>
        <FieldError message={errors.birthday && t(errors.birthday)} />
      </View>

      <TextField
        label={t('form.year')}
        hint={t('form.year.hint')}
        value={draft.birthYear}
        onChangeText={(birthYear) => set({ birthYear: birthYear.replace(/\D/g, '') })}
        keyboardType="number-pad"
        maxLength={4}
        error={errors.birthYear && t(errors.birthYear)}
      />

      <View style={styles.field}>
        <FieldLabel>{t('form.relation')}</FieldLabel>
        <ChipGroup label={t('form.relation')}>
          {relations.map((relation) => {
            const selected = draft.relation?.kind === 'preset' && draft.relation.key === relation.key;
            return (
              <Chip
                key={relation.key}
                label={t(relation.labelKey)}
                selected={selected}
                onPress={() => set({ relation: selected ? null : { kind: 'preset', key: relation.key } })}
              />
            );
          })}
          <Chip
            label={t('form.relation.custom')}
            selected={customSelected}
            onPress={() => set({ relation: customSelected ? null : { kind: 'custom', text: '' } })}
          />
        </ChipGroup>
        {customSelected ? (
          <View style={styles.customRelation}>
            <TextField
              label={t('form.relation.custom')}
              placeholder={t('form.relation.customPlaceholder')}
              value={draft.relation?.kind === 'custom' ? draft.relation.text : ''}
              onChangeText={(text) => set({ relation: { kind: 'custom', text } })}
              maxLength={LIMITS.relationCustom}
              autoFocus
            />
          </View>
        ) : null}
        <FieldError message={errors.relation && t(errors.relation)} />
      </View>

      <TextField
        label={t('form.note')}
        value={draft.note}
        onChangeText={(note) => set({ note })}
        maxLength={LIMITS.note}
        multiline
        error={errors.note && t(errors.note)}
      />

      <FieldError message={saveFailed ? t('form.error.saveFailed') : undefined} />
      <Button label={t('form.save')} onPress={submit} disabled={saving} />
      <Button label={t('form.cancel')} kind="secondary" onPress={onCancel} disabled={saving} />
    </Page>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space.lg },
  customRelation: { marginTop: space.md },
});
