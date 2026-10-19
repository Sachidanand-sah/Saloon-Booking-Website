import { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '@/api/client';
import { useProduct } from '@/api/queries';
import { AppText, Avatar, Badge, Button, Card, Chip, ErrorState, Photo, Row, Screen, SectionHeader, Skeleton } from '@/components/ui';
import { Stepper } from '@/components/shop/Stepper';
import { BagButton } from '@/components/shop/BagButton';
import { useToast } from '@/components/toast';
import { MAX_QTY, useBag } from '@/lib/bag';
import { formatPrice } from '@/lib/format';
import { colors, fonts, radius, shadow, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

export default function ProductDetailScreen({ navigation, route }: RootScreenProps<'ProductDetail'>) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const product = useProduct(route.params.slug);
  const bag = useBag();
  const [qty, setQty] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <BagButton onPress={() => navigation.navigate('Bag')} />,
    });
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await product.refetch();
    setRefreshing(false);
  };

  if (product.isPending) {
    return (
      <Screen edges={[]}>
        <Skeleton height={320} style={{ borderRadius: radius.lg }} />
        <Skeleton height={28} style={{ width: '60%' }} />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (product.isError) {
    return (
      <Screen edges={[]}>
        <ErrorState message={errorMessage(product.error)} onRetry={() => product.refetch()} />
      </Screen>
    );
  }

  const p = product.data;
  const inBag = bag.items.find(i => i.productId === p.id)?.quantity ?? 0;
  const room = Math.max(0, MAX_QTY - inBag);

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing} contentStyle={{ paddingBottom: 140 + insets.bottom }}>
        <Photo uri={p.imageUrl} icon="bag-handle-outline" style={styles.photo} />

        <View style={{ gap: 6 }}>
          <AppText variant="eyebrow">{p.brand}</AppText>
          <AppText variant="display" style={{ fontSize: 28, lineHeight: 34 }}>
            {p.name}
          </AppText>
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <AppText variant="price" style={{ fontSize: 24 }}>
              {formatPrice(p.price, p.currency)}
            </AppText>
            {p.inStock ? <Badge label="In stock" tone="success" icon="checkmark-circle" /> : <Badge label="Out of stock" tone="neutral" />}
          </Row>
          <AppText variant="caption">{p.category} · Reserve now, pay when you collect</AppText>
        </View>

        <AppText style={{ fontSize: 15, lineHeight: 23 }}>{p.description}</AppText>

        {p.howToUse ? (
          <Card style={{ backgroundColor: colors.rose50, borderColor: colors.rose100, gap: 6 }}>
            <Row gap={8}>
              <Ionicons name="water-outline" size={18} color={colors.rose600} />
              <AppText variant="label">How to use</AppText>
            </Row>
            <AppText style={{ fontSize: 14, lineHeight: 21 }}>{p.howToUse}</AppText>
          </Card>
        ) : null}

        {p.recommendedBy.length ? (
          <>
            <SectionHeader eyebrow="Why our pros love it" title="Recommended by" />
            {p.recommendedBy.map(r => (
              <Card key={r.id} style={{ gap: space.md }}>
                <Row gap={space.md}>
                  <Avatar name={r.name} uri={r.avatarUrl} size={48} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">{r.name}</AppText>
                    <AppText variant="caption">{r.title}</AppText>
                  </View>
                  <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.rose300} />
                </Row>
                <AppText style={styles.quote}>“{r.note}”</AppText>
              </Card>
            ))}
          </>
        ) : null}

        {p.services.length ? (
          <View style={{ gap: space.sm }}>
            <AppText variant="label">Pairs with</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {p.services.map(s => (
                <Chip
                  key={s.id}
                  label={s.name}
                  icon="sparkles-outline"
                  onPress={() => navigation.navigate('ServiceDetail', { slug: s.slug })}
                />
              ))}
            </View>
          </View>
        ) : null}
      </Screen>

      <View style={[styles.bar, shadow, { paddingBottom: insets.bottom + space.md }]}>
        {inBag ? (
          <AppText variant="caption" style={{ textAlign: 'center', fontSize: 12 }}>
            {inBag} already in your bag
          </AppText>
        ) : null}
        <Row gap={space.md}>
          <Stepper label="quantity" value={Math.min(qty, Math.max(1, room))} min={1} max={Math.max(1, room)} onChange={setQty} />
          <Button
            title={p.inStock ? (room ? `Add · ${formatPrice(p.price * Math.min(qty, room), p.currency)}` : 'Bag limit reached') : 'Out of stock'}
            icon="bag-add-outline"
            size="lg"
            disabled={!p.inStock || !room}
            onPress={() => {
              const n = Math.min(qty, room);
              bag.add(p, n);
              setQty(1);
              toast(`${n} × ${p.name} added to your bag`);
            }}
            accessibilityLabel={`Add ${Math.min(qty, room)} ${p.name} to bag`}
            style={{ flex: 1, paddingHorizontal: 12 }}
          />
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { height: 320, borderRadius: radius.lg },
  quote: { fontFamily: fonts.displayRegular, fontSize: 16, lineHeight: 24, color: colors.plum800, fontStyle: 'italic' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: 6,
  },
});
