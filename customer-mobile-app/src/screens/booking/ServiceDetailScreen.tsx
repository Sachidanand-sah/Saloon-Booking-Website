import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocations, useProducts, useSalon, useService } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { AppText, Avatar, Badge, Button, Card, ErrorState, Photo, Row, Screen, Skeleton } from '@/components/ui';
import { BranchCard, StickyFooter } from '@/components/booking/shared';
import { formatDuration, formatPrice } from '@/lib/format';
import { colors, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

export default function ServiceDetailScreen({ navigation, route }: RootScreenProps<'ServiceDetail'>) {
  const { slug } = route.params;
  const service = useService(slug);
  const salon = useSalon();
  const locations = useLocations();
  const products = useProducts(`?serviceId=${encodeURIComponent(slug)}`);
  const scroll = useRef<ScrollView>(null);
  const [branchesY, setBranchesY] = useState(0);
  const s = service.data;

  const branches = useMemo(
    () => (s ? (locations.data ?? []).filter(l => l.isActive && l.serviceIds.includes(s.id)) : []),
    [locations.data, s],
  );

  const book = (locationId: string) => s && navigation.navigate('BookStylist', { locationId, serviceId: s.id });
  const onBook = () => {
    if (branches.length === 1) book(branches[0].id);
    else scroll.current?.scrollTo({ y: branchesY - space.lg, animated: true });
  };

  if (service.isPending) {
    return (
      <Screen edges={[]}>
        <Skeleton height={240} />
        <Skeleton height={28} style={{ width: '70%' }} />
        <Skeleton height={90} />
      </Screen>
    );
  }
  if (service.isError || !s) {
    return (
      <Screen edges={[]}>
        <ErrorState message={errorMessage(service.error)} onRetry={() => service.refetch()} />
      </Screen>
    );
  }

  const rating = s.rating;

  return (
    <Screen edges={[]} scroll={false}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: space.xl }}>
        <Photo uri={s.imageUrl} category={s.category?.slug} style={styles.hero}>
          {s.category ? (
            <View style={styles.heroTag}>
              <Badge label={s.category.name} tone="neutral" />
            </View>
          ) : null}
        </Photo>

        <View style={styles.body}>
          <View style={{ gap: 6 }}>
            <AppText variant="display" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
              {s.name}
            </AppText>
            {rating?.count ? (
              <View style={styles.rating} accessible accessibilityLabel={`Rated ${rating.average?.toFixed(1)} out of 5 from ${rating.count} reviews`}>
                <Ionicons name="star" size={15} color="#d9a441" />
                <AppText variant="label">{rating.average?.toFixed(1)}</AppText>
                <AppText variant="caption">
                  ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
                </AppText>
              </View>
            ) : null}
          </View>

          <Row gap={space.md}>
            <View style={styles.fact}>
              <Ionicons name="time-outline" size={18} color={colors.rose500} />
              <View>
                <AppText variant="caption" style={{ fontSize: 12 }}>
                  Duration
                </AppText>
                <AppText variant="label">{formatDuration(s.durationMins)}</AppText>
              </View>
            </View>
            <View style={styles.fact}>
              <Ionicons name="pricetag-outline" size={18} color={colors.rose500} />
              <View>
                <AppText variant="caption" style={{ fontSize: 12 }}>
                  Price
                </AppText>
                <AppText variant="label">{formatPrice(s.price, s.currency)}</AppText>
              </View>
            </View>
          </Row>

          <AppText style={{ fontSize: 15, lineHeight: 23 }}>{s.description}</AppText>

          {s.staff?.length ? (
            <View style={{ gap: space.md }}>
              <AppText variant="heading">Performed by</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.lg }}>
                {s.staff.map(m => (
                  <View key={m.id} style={{ width: 84, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${m.name}, ${m.title}`}>
                    <Avatar name={m.name} uri={m.avatarUrl} size={60} />
                    <AppText variant="label" style={{ fontSize: 13, textAlign: 'center' }} numberOfLines={2}>
                      {m.name}
                    </AppText>
                    <AppText variant="caption" style={{ fontSize: 11, textAlign: 'center', marginTop: -4 }} numberOfLines={1}>
                      {m.title}
                    </AppText>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {products.data?.length ? (
            <View style={{ gap: space.md }}>
              <View>
                <AppText variant="eyebrow">Aftercare</AppText>
                <AppText variant="heading" style={{ marginTop: 2 }}>
                  Recommended by our pros
                </AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ gap: 12, paddingHorizontal: space.lg, paddingBottom: 6 }}>
                {products.data.map(p => (
                  <Card key={p.id} onPress={() => navigation.navigate('ProductDetail', { slug: p.slug })} style={styles.product}>
                    <Photo uri={p.imageUrl} style={{ height: 110 }} icon="bag-handle-outline" />
                    <View style={{ padding: space.md, gap: 2 }}>
                      <AppText variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
                        {p.brand}
                      </AppText>
                      <AppText variant="label" numberOfLines={2} style={{ fontSize: 13 }}>
                        {p.name}
                      </AppText>
                      <AppText variant="price" style={{ fontSize: 15, marginTop: 2 }}>
                        {formatPrice(p.price, p.currency)}
                      </AppText>
                    </View>
                  </Card>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ gap: space.md }} onLayout={e => setBranchesY(e.nativeEvent.layout.y)}>
            <View>
              <AppText variant="eyebrow">Where</AppText>
              <AppText variant="heading" style={{ marginTop: 2 }}>
                {branches.length === 1 ? 'Available at' : 'Choose a branch'}
              </AppText>
            </View>
            {locations.isPending ? (
              <Skeleton height={100} />
            ) : locations.isError ? (
              <ErrorState message={errorMessage(locations.error)} onRetry={() => locations.refetch()} />
            ) : branches.length === 0 ? (
              <Card>
                <AppText variant="caption">This treatment isn&apos;t bookable online right now. Please call us.</AppText>
              </Card>
            ) : (
              branches.map(b => (
                <BranchCard
                  key={b.id}
                  branch={b}
                  timeZone={salon.data?.timezone}
                  onPress={() => book(b.id)}
                  action="Book here"
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {branches.length ? (
        <StickyFooter>
          <Row gap={space.md}>
            <View style={{ flexShrink: 1 }}>
              <AppText variant="price">{formatPrice(s.price, s.currency)}</AppText>
              <AppText variant="caption" style={{ fontSize: 12 }}>
                {formatDuration(s.durationMins)}
              </AppText>
            </View>
            <Button title="Book this treatment" icon="calendar-outline" onPress={onBook} style={{ flex: 1 }} />
          </Row>
        </StickyFooter>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroTag: { position: 'absolute', left: space.lg, bottom: space.lg },
  body: { padding: space.lg, gap: space.xl },
  bleed: { marginHorizontal: -space.lg, flexGrow: 0 },
  fact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
  },
  product: { width: 150, padding: 0, overflow: 'hidden' },
});
