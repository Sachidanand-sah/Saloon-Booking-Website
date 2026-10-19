import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '@/api/client';
import { useEventPackages, useEventRequests } from '@/api/queries';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, Photo, Row, Screen, SectionHeader, Skeleton } from '@/components/ui';
import { HowItWorks } from '@/components/account/shared';
import { formatPrice } from '@/lib/format';
import { colors, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import type { EventPackage } from '@/api/types';

const steps = [
  { icon: 'clipboard-outline' as const, title: 'Tell us about your day', text: 'Choose a package, date, guest count and where you would like us.' },
  { icon: 'chatbubbles-outline' as const, title: 'Get a tailored quote', text: 'Our events team replies with a personal quote, usually within a day.' },
  { icon: 'heart-outline' as const, title: 'Accept and relax', text: 'Accept in the app and we reserve our artists for your date.' },
];

export const guestRange = (p: Pick<EventPackage, 'minGuests' | 'maxGuests'>) =>
  p.maxGuests
    ? p.minGuests === p.maxGuests
      ? `${p.minGuests} guest${p.minGuests === 1 ? '' : 's'}`
      : `${p.minGuests}–${p.maxGuests} guests`
    : `${p.minGuests}+ guests`;

export default function EventsScreen({ navigation }: RootScreenProps<'Events'>) {
  const packages = useEventPackages();
  const requests = useEventRequests();
  const [refreshing, setRefreshing] = useState(false);
  const open = (requests.data ?? []).filter(r => r.status === 'NEW' || r.status === 'QUOTED').length;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([packages.refetch(), requests.refetch()]);
    setRefreshing(false);
  };

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <Photo uri="/images/events/bridal-glam.jpg" icon="heart-outline" style={styles.hero}>
        <LinearGradient colors={['rgba(42,22,38,0.05)', 'rgba(42,22,38,0.9)']} style={styles.heroOverlay}>
          <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
            Weddings · Mehendi · Parties
          </AppText>
          <AppText variant="display" style={{ color: colors.white, fontSize: 28, lineHeight: 34, marginTop: 4 }}>
            Look your best on the days that matter
          </AppText>
          <AppText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 }}>
            Senior artists at our studios or at your venue anywhere in the valley.
          </AppText>
          <Button
            title="Request a quote"
            variant="light"
            icon="sparkles-outline"
            onPress={() => navigation.navigate('EventRequest')}
            style={{ alignSelf: 'flex-start', marginTop: space.lg }}
          />
        </LinearGradient>
      </Photo>

      {open ? (
        <Card onPress={() => navigation.navigate('MyEvents')} style={styles.openCard}>
          <Ionicons name="mail-unread-outline" size={20} color={colors.rose600} />
          <AppText variant="label" style={{ flex: 1 }}>
            You have {open} open request{open === 1 ? '' : 's'}
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.rose600} />
        </Card>
      ) : null}

      <SectionHeader eyebrow="Packages" title="Made for celebrations" />
      {packages.isPending ? (
        [0, 1].map(i => <Skeleton key={i} height={380} style={{ borderRadius: radius.lg }} />)
      ) : packages.isError ? (
        <ErrorState message={errorMessage(packages.error)} onRetry={() => packages.refetch()} />
      ) : !packages.data.length ? (
        <EmptyState icon="heart-outline" title="Packages coming soon" message="Call the salon and our events team will help plan your day." />
      ) : (
        packages.data.map(p => (
          <Card key={p.id} style={{ padding: 0, overflow: 'hidden' }}>
            <Photo uri={p.imageUrl} icon="heart-outline" style={{ height: 190 }}>
              <View style={styles.guestTag}>
                <Badge label={guestRange(p)} icon="people-outline" tone="neutral" />
              </View>
            </Photo>
            <View style={{ padding: space.lg, gap: space.sm }}>
              <AppText variant="title">{p.name}</AppText>
              <AppText style={{ fontSize: 14, color: colors.muted, lineHeight: 21 }}>{p.description}</AppText>
              <View style={{ gap: 6, marginTop: 4 }}>
                {p.includes.map(i => (
                  <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                    <Ionicons name="checkmark" size={16} color={colors.rose500} style={{ marginTop: 2 }} />
                    <AppText style={{ flex: 1, fontSize: 14 }}>{i}</AppText>
                  </Row>
                ))}
              </View>
              <Row style={styles.footer}>
                <View>
                  <AppText variant="caption" style={{ fontSize: 12 }}>
                    From
                  </AppText>
                  <AppText variant="price" style={{ fontSize: 22 }}>
                    {formatPrice(p.fromPrice, p.currency)}
                  </AppText>
                </View>
                <Button
                  title="Request a quote"
                  size="md"
                  onPress={() => navigation.navigate('EventRequest', { packageSlug: p.slug })}
                  accessibilityLabel={`Request a quote for ${p.name}`}
                />
              </Row>
            </View>
          </Card>
        ))
      )}

      <SectionHeader eyebrow="How it works" title="From first message to big day" />
      <HowItWorks steps={steps} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 340, borderRadius: radius.lg },
  heroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: space.xl },
  openCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.rose50, borderColor: colors.rose100 },
  guestTag: { position: 'absolute', top: 12, left: 12 },
  footer: {
    justifyContent: 'space-between',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexWrap: 'wrap',
    gap: space.md,
  },
});
