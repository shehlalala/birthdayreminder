import { brand } from '@content/index';
import { t } from '@/i18n';
import { PageHead } from '@/seo/PageHead';
import { Heading, Page, Paragraph, TextLink } from '@/ui/primitives';

// What the web shows at an app-only URL. No user data, noindex, no canonical.
export function PrivatePlaceholder() {
  return (
    <Page>
      <PageHead title={t('private.title')} noindex />
      <Heading level={1}>{t('private.title')}</Heading>
      <Paragraph>{t('private.body', { appName: brand.name })}</Paragraph>
      <TextLink href="/">{brand.name}</TextLink>
    </Page>
  );
}
