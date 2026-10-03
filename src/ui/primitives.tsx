import { Link as RouterLink, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type TextProps } from 'react-native';

import { useColors } from './theme';
import { space, type } from './tokens';

// Semantic building blocks. On web, react-native-web turns `role` into real
// elements (<h1>-<h3>, <p>, <ul>/<li>, <main>, <a href>), which is what
// crawlers and AI assistants read. On iOS they are native views that
// VoiceOver announces with the same roles.

type Level = 1 | 2 | 3;

export function Heading({ level, children }: { level: Level; children: ReactNode }) {
  const colors = useColors();
  return (
    <Text
      role="heading"
      aria-level={level}
      style={[type[`h${level}`], styles.heading, { color: colors.text }]}
    >
      {children}
    </Text>
  );
}

// React Native's Role type has no 'paragraph'; web understands it.
const paragraphRole = Platform.OS === 'web' ? ({ role: 'paragraph' } as unknown as TextProps) : {};

export function Paragraph({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const colors = useColors();
  return (
    <Text {...paragraphRole} style={[type.body, styles.paragraph, { color: muted ? colors.muted : colors.text }]}>
      {children}
    </Text>
  );
}

export function List({ children }: { children: ReactNode }) {
  return (
    <View role="list" style={styles.list}>
      {children}
    </View>
  );
}

export function ListItem({ title, children }: { title?: string; children?: ReactNode }) {
  const colors = useColors();
  return (
    <View role="listitem" style={styles.listItem}>
      <Text style={[type.body, { color: colors.text }]}>
        {title ? <Text style={styles.strong}>{title}</Text> : null}
        {title && children ? ' — ' : null}
        {children}
      </Text>
    </View>
  );
}

export function TextLink({ href, children, label }: { href: Href; children: ReactNode; label?: string }) {
  const colors = useColors();
  return (
    <RouterLink
      href={href}
      role="link"
      accessibilityLabel={label}
      style={[type.body, styles.link, { color: colors.accent }]}
    >
      {children}
    </RouterLink>
  );
}

/** Screen container. Exactly one <Heading level={1}> per Page. */
export function Page({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      <View role="main" style={styles.main}>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: space.lg, marginBottom: space.sm },
  paragraph: { marginBottom: space.md },
  list: { marginBottom: space.md, gap: space.sm },
  listItem: { paddingLeft: space.md },
  strong: { fontWeight: '600' },
  link: { textDecorationLine: 'underline', marginBottom: space.md },
  scroll: { flexGrow: 1 },
  main: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: space.md, paddingBottom: space.xl },
});
