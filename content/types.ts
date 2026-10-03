// Shapes for all public content. Everything under content/ is the single
// source of truth for app screens, web pages, <head> metadata, JSON-LD,
// sitemap.xml and llms.txt. Never put user data in here.

export type RelationKey =
  | 'mom'
  | 'dad'
  | 'sister'
  | 'brother'
  | 'partner'
  | 'spouse'
  | 'child'
  | 'grandparent'
  | 'relative'
  | 'friend'
  | 'bestFriend'
  | 'colleague'
  | 'boss'
  | 'client'
  | 'neighbor'
  | 'other';

export interface Relation {
  key: RelationKey;
  /** URL segment for /gifts/[slug] and /messages/[slug]. */
  slug: string;
  /** i18n key for the label shown in the relation picker. */
  labelKey: `relation.${RelationKey}`;
  /** Short noun used inside public copy ("your boss"). */
  noun: string;
  /**
   * Whether this relation gets its own public gift and message pages.
   * False for relations whose pages would be thin or near-duplicates
   * of another relation (e.g. best friend vs friend).
   */
  publicPages: boolean;
}

export interface ContentItem {
  title: string;
  description: string;
}

export interface ContentSection {
  /** Rendered as an H2. Phrase it the way people ask an AI assistant. */
  heading: string;
  paragraphs?: string[];
  items?: ContentItem[];
}

export interface Faq {
  question: string;
  answer: string;
}

export type ContentStatus = 'draft' | 'published';

interface PageContent {
  /** H1 and <title>. */
  title: string;
  /** Meta description, ~150 characters. */
  description: string;
  /** 1–2 plain sentences that directly answer the page's question. Rendered first. */
  answerSummary: string;
  sections: ContentSection[];
  faqs: Faq[];
  /** ISO date (YYYY-MM-DD). Shown as "last updated". */
  updatedAt: string;
  status: ContentStatus;
}

export interface GiftGuide extends PageContent {
  relation: RelationKey;
}

export interface MessageTemplates extends PageContent {
  relation: RelationKey;
}

export interface Guide extends PageContent {
  slug: string;
}
