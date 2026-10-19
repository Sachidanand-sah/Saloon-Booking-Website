import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText, Card, Photo } from '@/components/ui';
import { firstName, formatPrice } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';
import type { Product } from '@/api/types';

/** Grid tile for the shop: photo, brand, name, price and a quick add-to-bag button. */
export function ProductCard({
  product: p,
  width,
  onPress,
  onAdd,
}: {
  product: Product;
  width: number;
  onPress: () => void;
  onAdd: () => void;
}) {
  const pro = p.recommendedBy[0];
  return (
    <Card style={[styles.card, { width }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${p.name} by ${p.brand}, ${formatPrice(p.price, p.currency)}`}
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      >
        <Photo uri={p.imageUrl} icon="bag-handle-outline" style={{ height: width }}>
          {!p.inStock ? (
            <View style={styles.soldOut}>
              <AppText style={styles.soldOutText}>Out of stock</AppText>
            </View>
          ) : null}
        </Photo>
        <View style={styles.body}>
          <AppText variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
            {p.brand}
          </AppText>
          <AppText variant="label" numberOfLines={2} style={{ minHeight: 40 }}>
            {p.name}
          </AppText>
          {pro ? (
            <View style={styles.pro}>
              <Ionicons name="sparkles" size={11} color={colors.rose500} />
              <AppText style={styles.proText} numberOfLines={1}>
                Recommended by {firstName(pro.name)}
              </AppText>
            </View>
          ) : null}
          <View style={styles.footer}>
            <AppText variant="price" style={{ fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
              {formatPrice(p.price, p.currency)}
            </AppText>
          </View>
      </View>
      </Pressable>
      {/* Sibling of the card's main pressable so buttons aren't nested. */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => undefined);
          onAdd();
        }}
        disabled={!p.inStock}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={p.inStock ? `Add ${p.name} to bag` : `${p.name} is out of stock`}
        accessibilityState={{ disabled: !p.inStock }}
        style={({ pressed }) => [styles.add, !p.inStock && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.92 }] }]}
      >
        <Ionicons name="add" size={20} color={colors.white} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  body: { padding: space.md, gap: 3 },
  pro: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  proText: { flex: 1, fontFamily: fonts.medium, fontSize: 11, color: colors.rose600 },
  footer: { flexDirection: 'row', alignItems: 'center', height: 36, marginTop: 6, paddingRight: 44 },
  add: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.plum900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOut: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(42,22,38,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  soldOutText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11 },
});
