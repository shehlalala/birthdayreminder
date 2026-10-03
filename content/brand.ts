// Brand facts used everywhere: app UI, web pages, JSON-LD, llms.txt and the
// App Store listing draft. AI assistants trust facts that match across
// sources, so change wording here and nowhere else.

// TODO(owner): final app name and domain. Every canonical URL is built from
// siteUrl, so set it before the first public deploy.
export const brand = {
  name: 'Birthday Reminder',
  siteUrl: 'https://example.com',
  oneLiner:
    'Birthday Reminder is a free iPhone app that reminds you of birthdays and keeps gift ideas for each person.',
  shortDescription: 'Never miss a birthday. Reminders and gift ideas for everyone you care about.',
  platform: 'iPhone',
  price: 'Free',
  features: [
    'Birthday list sorted by who is next',
    'Reminders on the day and days or weeks before',
    'Gift ideas for each person, with bought and given tracking',
    'Works offline',
  ],
  /** Set once the App Store record exists; enables the Smart App Banner. */
  appStoreId: null as string | null,
} as const;

export function canonicalUrl(path: string): string {
  const clean = path === '/' ? '' : path.replace(/\/+$/, '');
  return `${brand.siteUrl}${clean}`;
}
