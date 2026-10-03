import { Link, Stack } from 'expo-router';
import { SectionList, StyleSheet, Text } from 'react-native';

import { useLiveQuery } from '@/data/hooks';
import { listPeople } from '@/data/people';
import { sortByUpcoming } from '@/domain/birthdays';
import { useToday } from '@/hooks/useToday';
import { t } from '@/i18n';
import { useColors } from '@/ui/theme';
import { space, type } from '@/ui/tokens';
import { EmptyState, PersonRow } from './PersonRow';

export default function PeopleScreen() {
  const colors = useColors();
  const today = useToday();
  const { data: people, loading } = useLiveQuery(listPeople, ['people'], []);

  const sorted = sortByUpcoming(people ?? [], today);
  const sections = [
    { key: 'today', title: t('people.today'), data: sorted.filter((p) => p.upcoming.daysUntil === 0) },
    { key: 'upcoming', title: t('people.upcoming'), data: sorted.filter((p) => p.upcoming.daysUntil > 0) },
  ].filter((s) => s.data.length > 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('people.title'),
          headerLeft: () => (
            <Link href="/settings" role="link" accessibilityLabel={t('home.goToSettings')} style={[type.body, { color: colors.accent }]}>
              {t('home.goToSettings')}
            </Link>
          ),
          headerRight: () => (
            <Link href="/people/new" role="button" accessibilityLabel={t('people.add')} style={[styles.add, { color: colors.accent }]}>
              +
            </Link>
          ),
        }}
      />
      {!loading && sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={styles.list}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text role="heading" style={[type.small, styles.sectionTitle, { color: colors.muted }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => <PersonRow person={item} />}
          stickySectionHeadersEnabled={false}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.md, paddingBottom: space.xl, gap: space.sm },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginTop: space.md, marginBottom: space.xs },
  add: { fontSize: 30, lineHeight: 32, paddingHorizontal: space.sm },
});
