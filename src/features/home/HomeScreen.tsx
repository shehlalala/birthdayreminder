import { Redirect } from 'expo-router';

// In the app, `/` is the birthday list.
export default function HomeScreen() {
  return <Redirect href="/people" />;
}
