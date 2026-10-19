import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';

/** − value + control. When `onRemove` is set, the minus turns into a bin at the minimum. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 10,
  label,
  size = 'md',
  onRemove,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}) {
  const h = size === 'sm' ? 36 : 44;
  const atMin = value <= min;
  const removing = atMin && !!onRemove;
  const tap = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => undefined);
    fn();
  };
  return (
    <View style={[styles.wrap, { height: h }]} accessibilityLabel={`${label}: ${value}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={removing ? `Remove ${label}` : `Decrease ${label}`}
        disabled={atMin && !onRemove}
        hitSlop={6}
        onPress={tap(() => (removing ? onRemove!() : onChange(value - 1)))}
        style={[styles.btn, { width: h, height: h }, atMin && !onRemove && { opacity: 0.35 }]}
      >
        <Ionicons name={removing ? 'trash-outline' : 'remove'} size={size === 'sm' ? 16 : 18} color={colors.plum900} />
      </Pressable>
      <AppText style={styles.value} accessibilityLiveRegion="polite">
        {value}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        hitSlop={6}
        onPress={tap(() => onChange(value + 1))}
        style={[styles.btn, { width: h, height: h }, value >= max && { opacity: 0.35 }]}
      >
        <Ionicons name="add" size={size === 'sm' ? 16 : 18} color={colors.plum900} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  btn: { alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 28, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 15, color: colors.plum900 },
});
