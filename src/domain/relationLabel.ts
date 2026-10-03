import { getRelation } from '@content/relations';
import { t } from '@/i18n';
import type { RelationValue } from './person';

export function relationLabel(relation: RelationValue): string | null {
  if (!relation) return null;
  if (relation.kind === 'custom') return relation.text;
  return t(getRelation(relation.key).labelKey);
}
