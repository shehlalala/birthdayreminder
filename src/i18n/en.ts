// English UI strings. App chrome only; public page copy lives in content/.
export const en = {
  'relation.mom': 'Mom',
  'relation.dad': 'Dad',
  'relation.sister': 'Sister',
  'relation.brother': 'Brother',
  'relation.partner': 'Partner',
  'relation.spouse': 'Spouse',
  'relation.child': 'Child',
  'relation.grandparent': 'Grandparent',
  'relation.relative': 'Relative',
  'relation.friend': 'Friend',
  'relation.bestFriend': 'Best friend',
  'relation.colleague': 'Colleague',
  'relation.boss': 'Boss',
  'relation.client': 'Client',
  'relation.neighbor': 'Neighbor',
  'relation.other': 'Other',

  'people.title': 'Birthdays',
  'people.empty': 'Add someone you care about.',
  'settings.title': 'Settings',
  'settings.goToPeople': 'Back to birthdays',
  'home.goToSettings': 'Settings',
  'common.lastUpdated': 'Last updated {date}',
  'common.faqTitle': 'Frequently asked questions',
  'private.title': 'Open in the app',
  'private.body': 'This screen is only available in the {appName} app on iPhone.',
  'notFound.title': 'Page not found',
  'notFound.body': 'This page does not exist.',
  'notFound.home': 'Go to the homepage',
} as const;

export type MessageKey = keyof typeof en;
