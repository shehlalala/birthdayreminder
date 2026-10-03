import { describe, expect, it } from 'vitest';

import { giftGuides, giftGuideSlugs, relations } from './index';
import { en } from '../src/i18n/en';

describe('relations', () => {
  it('have unique keys and URL-safe unique slugs', () => {
    expect(new Set(relations.map((r) => r.key)).size).toBe(relations.length);
    expect(new Set(relations.map((r) => r.slug)).size).toBe(relations.length);
    for (const r of relations) expect(r.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('each have a translated label', () => {
    for (const r of relations) expect(en[r.labelKey]).toBeTruthy();
  });
});

describe('gift guides', () => {
  it('exist only for relations that get public pages', () => {
    for (const g of giftGuides) {
      const relation = relations.find((r) => r.key === g.relation);
      expect(relation?.publicPages, g.relation).toBe(true);
    }
  });

  it('have one guide per relation', () => {
    expect(new Set(giftGuideSlugs()).size).toBe(giftGuides.length);
  });

  it('have a short answer summary, meta description and valid date', () => {
    for (const g of giftGuides) {
      const sentences = g.answerSummary.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, g.relation).toBeLessThanOrEqual(2);
      expect(g.description.length, g.relation).toBeLessThanOrEqual(160);
      expect(g.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.sections.length).toBeGreaterThan(0);
    }
  });
});
