import { router, Stack, useLocalSearchParams } from 'expo-router';

import { appWriteDeps } from '@/data/appDeps';
import { useLiveQuery } from '@/data/hooks';
import { openAppDatabase } from '@/data/openAppDatabase';
import { getPerson, updatePerson } from '@/data/people';
import { draftFromPerson } from '@/domain/person';
import { t } from '@/i18n';
import { Page, Paragraph } from '@/ui/primitives';
import { PersonForm } from './PersonForm';

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Not live: re-reading while the user types would reset the form.
  const { data: person, loading } = useLiveQuery((db) => getPerson(db, id), [], [id]);

  return (
    <>
      <Stack.Screen options={{ title: t('person.title.edit') }} />
      {loading ? null : person ? (
        <PersonForm
          initial={draftFromPerson(person)}
          onCancel={() => router.back()}
          onSubmit={async (input) => {
            await updatePerson(await openAppDatabase(), id, input, appWriteDeps);
            router.back();
          }}
        />
      ) : (
        <Page>
          <Paragraph>{t('person.notFound')}</Paragraph>
        </Page>
      )}
    </>
  );
}
