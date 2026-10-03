import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { UpcomingBirthday } from '@/domain/birthdays';
import type { Person } from '@/domain/person';
import { relationLabel } from '@/domain/relationLabel';
import { t } from '@/i18n';
import { formatBirthday, whenLabel } from '@/i18n/dates';
import { Button } from '@/ui/controls';
import { useColors } from '@/ui/theme';
import { space, type } from '@/ui/tokens';

export type PersonWithUpcoming = Person & { upcoming: UpcomingBirthday };

export function PersonRow({ person }: { person: PersonWithUpcoming }) {
  const colors = useColors();
  const { daysUntil, turning, date } = person.upcoming;
  const isToday = daysUntil === 0;
  const label = relationLabel(person.relation);
  // "Mom · Mom" reads oddly when the name is the relation.
  const relation = label && label.toLocaleLowerCase() !== person.name.trim().toLocaleLowerCase() ? label : null;
  const details = [relation, formatBirthday(date.month, date.day)].filter(Boolean).join(' · ');
  const when = whenLabel(daysUntil);
  const turns = turning !== null ? t('people.turns', { age: String(turning) }) : null;

  return (
    <Pressable
      role="button"
      accessibilityLabel={[person.name, details, when, turns].filter(Boolean).join(', ')}
      onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.id } })}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isToday ? colors.accent : colors.surface,
          borderColor: isToday ? colors.accent : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={[type.h3, { color: isToday ? colors.onAccent : colors.text }]} numberOfLines={1}>
          {person.name}
        </Text>
        <Text style={[type.small, { color: isToday ? colors.onAccent : colors.muted }]} numberOfLines={1}>
          {details}
        </Text>
        {person.syncError ? <Text style={[type.small, { color: isToday ? colors.onAccent : colors.danger }]}>{t('people.notSynced')}</Text> : null}
      </View>
      <View style={styles.rowSide}>
        <Text style={[type.small, styles.when, { color: isToday ? colors.onAccent : colors.accent }]}>{isToday ? '🎂' : when}</Text>
        {turns ? <Text style={[type.small, { color: isToday ? colors.onAccent : colors.muted }]}>{turns}</Text> : null}
      </View>
    </Pressable>
  );
}

export function EmptyState() {
  const colors = useColors();
  return (
    <View style={[styles.empty, { backgroundColor: colors.background }]}>
      <Text style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no">
        🎂
      </Text>
      <Text style={[type.h3, styles.emptyText, { color: colors.text }]}>{t('people.empty')}</Text>
      <Button label={t('people.add')} onPress={() => router.push('/people/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: space.md, gap: space.md },
  rowMain: { flex: 1, gap: 2 },
  rowSide: { alignItems: 'flex-end', gap: 2 },
  when: { fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  illustration: { fontSize: 72 },
  emptyText: { textAlign: 'center' },
});
