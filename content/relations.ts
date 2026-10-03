import type { Relation, RelationKey } from './types';

// Drives the relation picker in the app AND the /gifts/[relation] and
// /messages/[relation] routes. Order here is the order in the picker.
export const relations: readonly Relation[] = [
  { key: 'mom', slug: 'mom', labelKey: 'relation.mom', noun: 'mom', publicPages: true },
  { key: 'dad', slug: 'dad', labelKey: 'relation.dad', noun: 'dad', publicPages: true },
  { key: 'sister', slug: 'sister', labelKey: 'relation.sister', noun: 'sister', publicPages: true },
  { key: 'brother', slug: 'brother', labelKey: 'relation.brother', noun: 'brother', publicPages: true },
  { key: 'partner', slug: 'partner', labelKey: 'relation.partner', noun: 'partner', publicPages: true },
  { key: 'spouse', slug: 'spouse', labelKey: 'relation.spouse', noun: 'spouse', publicPages: false },
  { key: 'child', slug: 'child', labelKey: 'relation.child', noun: 'child', publicPages: true },
  { key: 'grandparent', slug: 'grandparent', labelKey: 'relation.grandparent', noun: 'grandparent', publicPages: true },
  { key: 'relative', slug: 'relative', labelKey: 'relation.relative', noun: 'relative', publicPages: false },
  { key: 'friend', slug: 'friend', labelKey: 'relation.friend', noun: 'friend', publicPages: true },
  { key: 'bestFriend', slug: 'best-friend', labelKey: 'relation.bestFriend', noun: 'best friend', publicPages: false },
  { key: 'colleague', slug: 'colleague', labelKey: 'relation.colleague', noun: 'colleague', publicPages: true },
  { key: 'boss', slug: 'boss', labelKey: 'relation.boss', noun: 'boss', publicPages: true },
  { key: 'client', slug: 'client', labelKey: 'relation.client', noun: 'client', publicPages: true },
  { key: 'neighbor', slug: 'neighbor', labelKey: 'relation.neighbor', noun: 'neighbor', publicPages: true },
  { key: 'other', slug: 'other', labelKey: 'relation.other', noun: 'someone', publicPages: false },
];

export function getRelation(key: RelationKey): Relation {
  const relation = relations.find((r) => r.key === key);
  if (!relation) throw new Error(`Unknown relation: ${key}`);
  return relation;
}

export function getRelationBySlug(slug: string): Relation | undefined {
  return relations.find((r) => r.slug === slug);
}
