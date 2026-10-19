import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { useBag } from '@/lib/bag';
import { colors, fonts } from '@/theme';

/** Round bag icon with an item-count badge. */
export function BagButton({ onPress }: { onPress: () => void }) {
  const { count } = useBag();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={count ? `My bag, ${count} item${count === 1 ? '' : 's'}` : 'My bag, empty'}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name="bag-handle-outline" size={22} color={colors.plum900} />
      {count ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{count > 99 ? '99+' : count}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.rose500,
    borderWidth: 2,
    borderColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontFamily: fonts.bold, fontSize: 10, lineHeight: 12 },
});
