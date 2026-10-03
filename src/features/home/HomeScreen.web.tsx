import { brand, getRelation, giftGuides } from '@content/index';
import { PageHead } from '@/seo/PageHead';
import { Heading, List, ListItem, Page, Paragraph, TextLink } from '@/ui/primitives';

// Public homepage. Copy comes from content/brand.ts; full homepage content
// is written in Phase 8.
export default function HomeScreen() {
  return (
    <Page>
      <PageHead title={brand.name} description={brand.shortDescription} path="/" />
      <Heading level={1}>{brand.name}</Heading>
      <Paragraph>{brand.oneLiner}</Paragraph>
      <List>
        {brand.features.map((feature) => (
          <ListItem key={feature}>{feature}</ListItem>
        ))}
      </List>
      <Heading level={2}>Gift ideas</Heading>
      {giftGuides.map((guide) => (
        <TextLink key={guide.relation} href={`/gifts/${getRelation(guide.relation).slug}`}>
          {guide.title}
        </TextLink>
      ))}
    </Page>
  );
}
