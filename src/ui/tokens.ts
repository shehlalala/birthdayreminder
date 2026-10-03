// Design tokens. One accent color, warm neutrals, large readable type.
export const palette = {
  light: {
    background: '#FFFBF7',
    surface: '#FFFFFF',
    text: '#2B2420',
    muted: '#6B5F57',
    accent: '#B4472F',
    border: '#EADFD6',
  },
  dark: {
    background: '#1A1715',
    surface: '#24201D',
    text: '#F3ECE6',
    muted: '#B5A99F',
    accent: '#F08A72',
    border: '#3A332E',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const type = {
  h1: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  h3: { fontSize: 19, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 18, lineHeight: 28 },
  small: { fontSize: 15, lineHeight: 22 },
} as const;

/** CSS for web: light/dark variables used by useColors() on web. */
export const themeCss = (() => {
  const block = (colors: Colors) =>
    Object.entries(colors)
      .map(([name, value]) => `--color-${name}:${value};`)
      .join('');
  return (
    `:root{${block(palette.light)}color-scheme:light dark;}` +
    `@media (prefers-color-scheme: dark){:root{${block(palette.dark)}}}` +
    `body{background-color:var(--color-background);margin:0;}`
  );
})();
