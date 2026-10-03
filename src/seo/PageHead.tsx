import Head from 'expo-router/head';

import { brand, canonicalUrl } from '@content/index';

// <head> for every page. Public pages pass `path` so they get a canonical
// URL; private (app-only) screens pass `noindex` and never a canonical.
// Open Graph, JSON-LD and the Smart App Banner are added in Phase 7.
type Props =
  | { title: string; description: string; path: string; noindex?: false }
  | { title: string; description?: string; path?: undefined; noindex: true };

export function PageHead({ title, description, path, noindex }: Props) {
  const fullTitle = title === brand.name ? title : `${title} | ${brand.name}`;
  return (
    <Head>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      {path !== undefined ? <link rel="canonical" href={canonicalUrl(path)} /> : null}
    </Head>
  );
}
