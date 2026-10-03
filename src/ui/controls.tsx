import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useColors } from './theme';
import { space, type } from './tokens';

// Interactive controls for app screens. Every one has a role and a label for
// VoiceOver (and on-screen agents).

type ButtonKind = 'primary' | 'secondary' | 'destructive';

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
}) {
  const colors = useColors();
  const filled = kind === 'primary';
  const color = kind === 'destructive' ? colors.danger : colors.accent;
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: color, backgroundColor: filled ? color : 'transparent', opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[type.body, styles.buttonText, { color: filled ? colors.onAccent : color }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      role="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      hitSlop={4}
      style={[
        styles.chip,
        { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent : colors.surface },
      ]}
    >
      <Text style={[type.small, { color: selected ? colors.onAccent : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View role="radiogroup" accessibilityLabel={label} style={styles.chipGroup}>
      {children}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[type.small, styles.label, { color: colors.muted }]}>{children}</Text>;
}

export function FieldError({ message }: { message?: string }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <Text role="alert" style={[type.small, styles.error, { color: colors.danger }]}>
      {message}
    </Text>
  );
}

export function TextField({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          type.body,
          styles.input,
          props.multiline && styles.multiline,
          { color: colors.text, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surface },
        ]}
      />
      {hint && !error ? <Text style={[type.small, { color: colors.muted }]}>{hint}</Text> : null}
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: space.md, alignItems: 'center', marginTop: space.sm },
  buttonText: { fontWeight: '600' },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  label: { marginBottom: space.xs, fontWeight: '600' },
  error: { marginTop: space.xs },
  field: { marginBottom: space.lg },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: space.md, paddingVertical: 12 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
