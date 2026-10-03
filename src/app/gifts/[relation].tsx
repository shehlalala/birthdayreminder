import { Stack, useLocalSearchParams } from 'expo-router';

import { getGiftGuideBySlug, giftGuideSlugs } from '@content/index';
import { ContentPage } from '@/features/content/ContentPage';
import NotFoundScreen from '../+not-found';

// One static HTML page per gift guide in content/.
export function generateStaticParams(): { relation: string }[] {
  return giftGuideSlugs().map((relation) => ({ relation }));
}

export default function GiftGuideRoute() {
  const { relation } = useLocalSearchParams<{ relation: string }>();
  const guide = getGiftGuideBySlug(relation);
  if (!guide) return <NotFoundScreen />;
  return (
    <>
      <Stack.Screen options={{ title: guide.title }} />
      <ContentPage content={guide} path={`/gifts/${relation}`} />
    </>
  );
}
