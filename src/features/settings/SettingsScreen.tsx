import { Stack } from 'expo-router';

import { t } from '@/i18n';
import { Heading, Page, TextLink } from '@/ui/primitives';

// Phase 6 fills this in.
export default function SettingsScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <Heading level={1}>{t('settings.title')}</Heading>
      <TextLink href="/people">{t('settings.goToPeople')}</TextLink>
    </Page>
  );
}
