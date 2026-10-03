import type { Colors } from './tokens';

// Statically rendered pages can't know the visitor's color scheme at build
// time, so web reads CSS variables declared in src/app/+html.tsx.
const cssVars: Colors = {
  background: 'var(--color-background)',
  surface: 'var(--color-surface)',
  text: 'var(--color-text)',
  muted: 'var(--color-muted)',
  accent: 'var(--color-accent)',
  onAccent: 'var(--color-onAccent)',
  danger: 'var(--color-danger)',
  border: 'var(--color-border)',
};

export function useColors(): Colors {
  return cssVars;
}
