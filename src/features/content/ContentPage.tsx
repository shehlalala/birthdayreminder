import type { GiftGuide, Guide, MessageTemplates } from '@content/index';
import { t } from '@/i18n';
import { PageHead } from '@/seo/PageHead';
import { Heading, List, ListItem, Page, Paragraph } from '@/ui/primitives';
import { formatIsoDate } from './formatIsoDate';

// Renders any public content item the same way in the app and on the web:
// H1, answer summary as the first paragraph, question-style H2 sections,
// FAQs, and the last-updated date.
export function ContentPage({ content, path }: { content: GiftGuide | MessageTemplates | Guide; path: string }) {
  return (
    <Page>
      <PageHead title={content.title} description={content.description} path={path} />
      <Heading level={1}>{content.title}</Heading>
      <Paragraph>{content.answerSummary}</Paragraph>

      {content.sections.map((section) => (
        <SectionBlock key={section.heading} {...section} />
      ))}

      {content.faqs.length > 0 ? (
        <>
          <Heading level={2}>{t('common.faqTitle')}</Heading>
          {content.faqs.map((faq) => (
            <FaqBlock key={faq.question} {...faq} />
          ))}
        </>
      ) : null}

      <Paragraph muted>{t('common.lastUpdated', { date: formatIsoDate(content.updatedAt) })}</Paragraph>
    </Page>
  );
}

function SectionBlock({ heading, paragraphs, items }: GiftGuide['sections'][number]) {
  return (
    <>
      <Heading level={2}>{heading}</Heading>
      {paragraphs?.map((p) => <Paragraph key={p}>{p}</Paragraph>)}
      {items?.length ? (
        <List>
          {items.map((item) => (
            <ListItem key={item.title} title={item.title}>
              {item.description}
            </ListItem>
          ))}
        </List>
      ) : null}
    </>
  );
}

function FaqBlock({ question, answer }: { question: string; answer: string }) {
  return (
    <>
      <Heading level={3}>{question}</Heading>
      <Paragraph>{answer}</Paragraph>
    </>
  );
}
