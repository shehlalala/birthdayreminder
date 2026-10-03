import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { appWriteDeps } from '@/data/appDeps';
import { useLiveQuery } from '@/data/hooks';
import { openAppDatabase } from '@/data/openAppDatabase';
import { deletePerson, getPerson } from '@/data/people';
import { nextBirthday } from '@/domain/birthdays';
import { relationLabel } from '@/domain/relationLabel';
import { useToday } from '@/hooks/useToday';
import { t } from '@/i18n';
import { formatBirthday, whenLabel } from '@/i18n/dates';
import { Button } from '@/ui/controls';
import { Heading, Page, Paragraph } from '@/ui/primitives';

// Phase 4 adds gift ideas, "Need ideas?" and "Write a message" here.
export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const { data: person, loading } = useLiveQuery((db) => getPerson(db, id), ['people'], [id]);

  if (loading) return null;
  if (!person) {
    return (
      <Page>
        <Paragraph>{t('person.notFound')}</Paragraph>
      </Page>
    );
  }

  const upcoming = nextBirthday(person, today);
  const relation = relationLabel(person.relation);

  const confirmDelete = () =>
    Alert.alert(t('person.delete.confirmTitle', { name: person.name }), t('person.delete.confirmBody'), [
      { text: t('form.cancel'), style: 'cancel' },
      {
        text: t('person.delete'),
        style: 'destructive',
        onPress: async () => {
          await deletePerson(await openAppDatabase(), person.id, appWriteDeps);
          router.back();
        },
      },
    ]);

  return (
    <Page>
      <Stack.Screen options={{ title: person.name }} />
      <Heading level={1}>{person.name}</Heading>
      {relation ? <Paragraph muted>{relation}</Paragraph> : null}
      <Paragraph>
        {formatBirthday(person.birthMonth, person.birthDay)}
        {person.birthYear ? `, ${person.birthYear}` : ''} · {whenLabel(upcoming.daysUntil)}
        {upcoming.turning !== null ? ` · ${t('people.turns', { age: String(upcoming.turning) })}` : ''}
      </Paragraph>
      {person.note ? <Paragraph>{person.note}</Paragraph> : null}
      <Button
        label={t('person.edit')}
        kind="secondary"
        onPress={() => router.push({ pathname: '/people/[id]/edit', params: { id: person.id } })}
      />
      <Button label={t('person.delete')} kind="destructive" onPress={confirmDelete} />
    </Page>
  );
}
