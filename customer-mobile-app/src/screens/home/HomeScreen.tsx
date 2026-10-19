import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import {
  useBookings,
  useCategories,
  useLocations,
  useLoyalty,
  usePlans,
  useProducts,
  useSalon,
  useServices,
} from '@/api/queries';
import { AppText, Button, Card, Chip, Photo, Row, Screen, SectionHeader, Skeleton, type IconName } from '@/components/ui';
import { ServiceTile } from '@/components/cards';
import { firstName, formatDate, formatPrice, formatTime } from '@/lib/format';
import { formatAddress, todayHours } from '@/lib/places';
import { colors, radius, space } from '@/theme';
import type { TabScreenProps } from '@/navigation/types';

const categoryIcon: Record<string, IconName> = {
  hair: 'cut-outline',
  skin: 'sparkles-outline',
  nails: 'hand-left-outline',
  spa: 'flower-outline',
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const salon = useSalon();
  const loyalty = useLoyalty();
  const upcoming = useBookings('upcoming');
  const categories = useCategories();
  const featured = useServices('?featured=true');
  const plans = usePlans();
  const products = useProducts('?featured=true');
  const branches = useLocations();
  const tz = salon.data?.timezone;
  const next = upcoming.data?.[0];
  const featuredPlan = plans.data?.find(p => p.isFeatured) ?? plans.data?.[0];

  const refreshing = upcoming.isRefetching || loyalty.isRefetching;
  const onRefresh = () => qc.invalidateQueries();

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      {/* Greeting + points */}
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption">{greeting()},</AppText>
          <AppText variant="display" style={{ fontSize: 28 }}>
            {user ? firstName(user.name) : 'Welcome'}
          </AppText>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Rewards')}
          style={styles.points}
          accessibilityRole="button"
          accessibilityLabel={`${loyalty.data?.balance ?? 0} reward points, ${loyalty.data?.tier.name ?? ''} tier`}
        >
          <Ionicons name="sparkles" size={16} color={colors.rose500} />
          <View>
            <AppText variant="label" style={{ fontSize: 15 }}>
              {loyalty.data?.balance.toLocaleString('en-IN') ?? '—'}
            </AppText>
            <AppText variant="caption" style={{ fontSize: 11, marginTop: -2 }}>
              {loyalty.data?.tier.name ?? 'Rewards'} pts
            </AppText>
          </View>
        </Pressable>
      </Row>

      {/* Next appointment or booking CTA */}
      {next ? (
        <Card onPress={() => navigation.navigate('BookingDetail', { id: next.id })} style={{ padding: 0, overflow: 'hidden' }}>
          <LinearGradient colors={[colors.plum900, colors.plum700]} style={styles.next}>
            <View style={{ flex: 1 }}>
              <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
                Your next visit
              </AppText>
              <AppText variant="title" style={{ color: colors.white, marginTop: 4 }}>
                {next.service.name}
              </AppText>
              <AppText style={{ color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 14 }}>
                {formatDate(next.startAt, tz, { weekday: 'long' })} · {formatTime(next.startAt, tz)}
              </AppText>
              <AppText style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                with {next.staff.name}
                {next.location ? ` · ${next.location.name}` : ''}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.rose300} />
          </LinearGradient>
        </Card>
      ) : upcoming.isPending ? (
        <Skeleton height={120} />
      ) : (
        <LinearGradient colors={[colors.plum900, colors.plum700, colors.plum500]} style={styles.hero}>
          <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
            Treat yourself
          </AppText>
          <AppText variant="title" style={{ color: colors.white, marginTop: 6 }}>
            Book your next glow-up
          </AppText>
          <AppText style={{ color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 14 }}>
            Live availability across all three studios.
          </AppText>
          <Button title="Book now" variant="light" icon="calendar-outline" onPress={() => navigation.navigate('Book')} style={{ marginTop: 16, alignSelf: 'flex-start' }} />
        </LinearGradient>
      )}

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={styles.bleed}>
        <View style={{ width: space.sm }} />
        {(categories.data ?? []).map(c => (
          <Chip
            key={c.id}
            label={c.name}
            icon={categoryIcon[c.slug] ?? 'sparkles-outline'}
            onPress={() => navigation.navigate('Services', { category: c.slug })}
          />
        ))}
        <Chip label="All services" onPress={() => navigation.navigate('Services')} />
        <View style={{ width: space.sm }} />
      </ScrollView>

      {/* Featured services */}
      <SectionHeader eyebrow="Signature treatments" title="Most loved" action="See all" onAction={() => navigation.navigate('Services')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: space.lg, paddingBottom: 6 }} style={styles.bleed}>
        {featured.isPending
          ? [0, 1].map(i => <Skeleton key={i} height={210} style={{ width: 220 }} />)
          : (featured.data ?? []).map(s => (
              <ServiceTile key={s.id} service={s} onPress={() => navigation.navigate('ServiceDetail', { slug: s.slug })} />
            ))}
      </ScrollView>

      {/* Packages + events */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card onPress={() => navigation.navigate('Packages')} style={[styles.promo, { backgroundColor: colors.rose50 }]}>
          <Ionicons name="ribbon-outline" size={22} color={colors.rose600} />
          <AppText variant="heading" style={{ marginTop: 10 }}>
            Monthly packages
          </AppText>
          <AppText variant="caption" style={{ marginTop: 2 }}>
            {featuredPlan ? `From ${formatPrice(Math.min(...(plans.data ?? []).map(p => p.price)), featuredPlan.currency)}/mo` : 'Members save every visit'}
          </AppText>
        </Card>
        <Card onPress={() => navigation.navigate('Events')} style={[styles.promo, { padding: 0, overflow: 'hidden' }]}>
          <Photo uri="/images/events/bridal-glam.jpg" style={{ flex: 1, minHeight: 130 }} icon="heart-outline">
            <LinearGradient colors={['transparent', 'rgba(42,22,38,0.85)']} style={styles.promoOverlay}>
              <AppText variant="heading" style={{ color: colors.white }}>
                Bridal & events
              </AppText>
              <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Get a quote
              </AppText>
            </LinearGradient>
          </Photo>
        </Card>
      </View>

      {/* Recommended products */}
      {products.data?.length ? (
        <>
          <SectionHeader eyebrow="Recommended by our pros" title="Take the glow home" action="Shop" onAction={() => navigation.navigate('Shop')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: space.lg, paddingBottom: 6 }} style={styles.bleed}>
            {products.data.map(p => (
              <Card key={p.id} onPress={() => navigation.navigate('ProductDetail', { slug: p.slug })} style={{ width: 160, padding: 0, overflow: 'hidden' }}>
                <Photo uri={p.imageUrl} style={{ height: 140 }} icon="bag-handle-outline" />
                <View style={{ padding: space.md, gap: 2 }}>
                  <AppText variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
                    {p.brand}
                  </AppText>
                  <AppText variant="label" numberOfLines={2}>
                    {p.name}
                  </AppText>
                  <AppText variant="price" style={{ fontSize: 15, marginTop: 2 }}>
                    {formatPrice(p.price, p.currency)}
                  </AppText>
                </View>
              </Card>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* Branches */}
      <SectionHeader eyebrow="Visit us" title="Our studios" action="Map" onAction={() => navigation.navigate('Locations')} />
      {(branches.data ?? []).map(b => {
        const today = tz ? todayHours(b.openingHours, tz) : null;
        return (
          <Card key={b.id} onPress={() => navigation.navigate('LocationDetail', { slug: b.slug })} style={{ flexDirection: 'row', gap: space.md, padding: space.md, alignItems: 'center' }}>
            <Photo uri={b.imageUrl} style={{ width: 64, height: 64, borderRadius: radius.md }} icon="location-outline" />
            <View style={{ flex: 1 }}>
              <AppText variant="heading" style={{ fontSize: 17 }}>
                {b.name}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {formatAddress(b)}
              </AppText>
              {today ? (
                <AppText variant="caption" style={{ color: today.open ? colors.success : colors.muted, fontSize: 12 }}>
                  {today.label}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg },
  points: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  next: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  hero: { borderRadius: radius.lg, padding: space.xl },
  promo: { flex: 1, minHeight: 130 },
  promoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: space.md },
});
