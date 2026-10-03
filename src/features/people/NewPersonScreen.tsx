import { router, Stack } from 'expo-router';

import { appWriteDeps } from '@/data/appDeps';
import { openAppDatabase } from '@/data/openAppDatabase';
import { createPerson } from '@/data/people';
import { emptyDraft } from '@/domain/person';
import { t } from '@/i18n';
import { PersonForm } from './PersonForm';

export default function NewPersonScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t('person.title.new') }} />
      <PersonForm
        initial={emptyDraft()}
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          await createPerson(await openAppDatabase(), input, appWriteDeps);
          router.back();
        }}
      />
    </>
  );
}
