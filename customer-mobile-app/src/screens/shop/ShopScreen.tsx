import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '@/api/client';
import { useProducts, useReservations } from '@/api/queries';
import { AppText, Card, Chip, EmptyState, ErrorState, Row, Screen, Skeleton } from '@/components/ui';
import { ProductCard } from '@/components/shop/ProductCard';
import { BagButton } from '@/components/shop/BagButton';
import { useToast } from '@/components/toast';
import { useBag } from '@/lib/bag';
import { colors, space } from '@/theme';
import type { TabScreenProps } from '@/navigation/types';

const GAP = 12;
const MAX_WIDTH = 640;

export default function ShopScreen({ navigation }: TabScreenProps<'Shop'>) {
  const products = useProducts();
  const orders = useReservations();
  const { add } = useBag();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const cardWidth = Math.floor((Math.min(width, MAX_WIDTH) - space.lg * 2 - GAP) / 2);
  const categories = useMemo(() => [...new Set((products.data ?? []).map(p => p.category))], [products.data]);
  const list = (products.data ?? []).filter(p => !category || p.category === category);
  const ready = (orders.data ?? []).filter(o => o.status === 'READY').length;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([products.refetch(), orders.refetch()]);
    setRefreshing(false);
  };

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing} contentStyle={{ maxWidth: MAX_WIDTH, width: '100%', alignSelf: 'center' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="eyebrow">Recommended by our pros</AppText>
          <AppText variant="display" style={{ fontSize: 28 }}>
            Shop
          </AppText>
        </View>
        <BagButton onPress={() => navigation.navigate('Bag')} />
      </Row>

      <Card style={styles.info}>
        <Ionicons name="storefront-outline" size={18} color={colors.rose600} />
        <AppText variant="caption" style={{ flex: 1, color: colors.plum800 }}>
          Reserve online, then pay and collect at your favourite branch.
        </AppText>
      </Card>

      {ready ? (
        <Card onPress={() => navigation.navigate('MyOrders')} style={styles.ready}>
          <Ionicons name="bag-check" size={20} color={colors.white} />
          <AppText variant="label" style={{ flex: 1, color: colors.white }}>
            {ready === 1 ? 'An order is' : `${ready} orders are`} ready to collect
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </Card>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={!category} onPress={() => setCategory(null)} />
        {categories.map(c => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {products.isPending ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} height={cardWidth + 120} style={{ width: cardWidth, borderRadius: 20 }} />
          ))}
        </View>
      ) : products.isError ? (
        <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} />
      ) : !list.length ? (
        <EmptyState icon="bag-handle-outline" title="Nothing here yet" message="New products are on their way. Try another category." />
      ) : (
        <View style={styles.grid}>
          {list.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              width={cardWidth}
              onPress={() => navigation.navigate('ProductDetail', { slug: p.slug })}
              onAdd={() => {
                add(p);
                toast(`${p.name} added to your bag`);
              }}
            />
          ))}
        </View>
      )}

      <Card onPress={() => navigation.navigate('MyOrders')} style={styles.orders}>
        <Ionicons name="receipt-outline" size={18} color={colors.plum800} />
        <AppText variant="label" style={{ flex: 1 }}>
          My orders
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, backgroundColor: colors.rose50, borderColor: colors.rose100 },
  ready: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.success, borderColor: colors.success },
  orders: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.md },
});
