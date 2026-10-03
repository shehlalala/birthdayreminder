import { en, type MessageKey } from './en';

export type { MessageKey };

// Single locale for v1. Swap the dictionary lookup when more languages land.
export function t(key: MessageKey, vars?: Record<string, string>): string {
  let text: string = en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

type PluralBase<K> = K extends `${infer B}_one` ? B : never;

/** Picks `<key>_one` or `<key>_other` and fills {count}. English rules for now. */
export function tn(key: PluralBase<MessageKey>, count: number, vars?: Record<string, string>): string {
  const form = count === 1 ? 'one' : 'other';
  return t(`${key}_${form}` as MessageKey, { ...vars, count: String(count) });
}
