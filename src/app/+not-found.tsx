import { Stack } from 'expo-router';

import { t } from '@/i18n';
import { PageHead } from '@/seo/PageHead';
import { Heading, Page, Paragraph, TextLink } from '@/ui/primitives';

export default function NotFoundScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <PageHead title={t('notFound.title')} noindex />
      <Heading level={1}>{t('notFound.title')}</Heading>
      <Paragraph>{t('notFound.body')}</Paragraph>
      <TextLink href="/">{t('notFound.home')}</TextLink>
    </Page>
  );
}
