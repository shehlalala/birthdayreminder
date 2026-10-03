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
