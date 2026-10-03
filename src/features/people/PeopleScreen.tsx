import { Stack } from 'expo-router';

import { t } from '@/i18n';
import { Heading, Page, Paragraph, TextLink } from '@/ui/primitives';

// Phase 3 replaces this with the real list (SQLite-backed, sorted by next birthday).
export default function PeopleScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: t('people.title') }} />
      <Heading level={1}>{t('people.title')}</Heading>
      <Paragraph muted>{t('people.empty')}</Paragraph>
      <TextLink href="/settings">{t('home.goToSettings')}</TextLink>
      {/* Temporary: shows the shared content screen running natively. */}
      <TextLink href="/gifts/boss">Sample gift guide</TextLink>
    </Page>
  );
}
