import { bossGiftGuide } from './gifts/boss';
import { getRelation, getRelationBySlug } from './relations';
import type { GiftGuide } from './types';

export { brand, canonicalUrl } from './brand';
export { relations, getRelation, getRelationBySlug } from './relations';
export type * from './types';

// Registry of gift guides. A /gifts/[relation] page is generated for every
// entry here; add a file under content/gifts/ and list it below.
export const giftGuides: readonly GiftGuide[] = [bossGiftGuide];

export function getGiftGuideBySlug(slug: string): GiftGuide | undefined {
  const relation = getRelationBySlug(slug);
  if (!relation) return undefined;
  return giftGuides.find((g) => g.relation === relation.key);
}

export function giftGuideSlugs(): string[] {
  return giftGuides.map((g) => getRelation(g.relation).slug);
}
