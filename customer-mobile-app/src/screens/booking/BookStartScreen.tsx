import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBookings, useLocations, useSalon } from '@/api/queries';
import { AppText, Button, ErrorState, Photo, Row, Screen, SectionHeader, Skeleton } from '@/components/ui';
import { BranchCard, StepHeader } from '@/components/booking/shared';
import { errorMessage } from '@/api/client';
import { formatDate } from '@/lib/format';
import { colors, fonts, radius, shadow, space } from '@/theme';
import type { TabScreenProps } from '@/navigation/types';

/** Book tab: step 1, choose a branch (plus quick "book again" shortcuts). */
export default function BookStartScreen({ navigation }: TabScreenProps<'Book'>) {
  const salon = useSalon();
  const locations = useLocations();
  const past = useBookings('past');
  const tz = salon.data?.timezone;

  const branches = useMemo(() => (locations.data ?? []).filter(b => b.isActive), [locations.data]);
  const single = branches.length === 1 ? branches[0] : undefined;

  // Most recent visit per treatment, only where that branch still offers it.
  const again = useMemo(() => {
    const seen = new Set<string>();
    const out: { serviceId: string; name: string; locationId: string; locationName: string; startAt: string }[] = [];
    for (const b of past.data ?? []) {
      if (b.status !== 'COMPLETED' || seen.has(b.service.id)) continue;
      const branch = branches.find(x => x.id === b.location?.id) ?? single;
      if (!branch || !branch.serviceIds.includes(b.service.id)) continue;
      seen.add(b.service.id);
      out.push({
        serviceId: b.service.id,
        name: b.service.name,
        locationId: branch.id,
        locationName: branch.name,
        startAt: b.startAt,
      });
      if (out.length === 6) break;
    }
    return out;
  }, [past.data, branches, single]);

  const refreshing = locations.isRefetching || past.isRefetching;
  const onRefresh = () => {
    locations.refetch();
    past.refetch();
    salon.refetch();
  };

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <StepHeader
        step={0}
        title={single ? 'Your studio' : 'Choose a branch'}
        subtitle={
          single ? 'Live availability for every treatment.' : 'Pick the studio that suits you. Times are live for each branch.'
        }
      />

      {again.length ? (
        <View style={{ gap: space.md }}>
          <SectionHeader eyebrow="Your favourites" title="Book again" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: space.lg, paddingBottom: 8 }}
            style={styles.bleed}
          >
            {again.map(a => (
              <Pressable
                key={a.serviceId}
                accessibilityRole="button"
                accessibilityLabel={`Book ${a.name} again at ${a.locationName}`}
                onPress={() => navigation.navigate('BookStylist', { locationId: a.locationId, serviceId: a.serviceId })}
                style={({ pressed }) => [styles.again, shadow, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.againIcon}>
                  <Ionicons name="refresh" size={18} color={colors.rose500} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <AppText variant="label" numberOfLines={1}>
                    {a.name}
                  </AppText>
                  <AppText variant="caption" style={{ fontSize: 12 }} numberOfLines={1}>
                    {a.locationName.replace(/^Lalima\s+/, '')} · last {formatDate(a.startAt, tz, { weekday: undefined })}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {locations.isPending ? (
        <View style={{ gap: space.md }}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} height={100} />
          ))}
        </View>
      ) : locations.isError ? (
        <ErrorState message={errorMessage(locations.error)} onRetry={() => locations.refetch()} />
      ) : branches.length === 0 ? (
        <ErrorState message="Online booking is paused right now. Please call us to book." />
      ) : single ? (
        <View style={{ gap: space.md }}>
          <Photo uri={single.imageUrl} style={{ height: 170, borderRadius: radius.lg }} icon="location-outline" />
          <BranchCard branch={single} timeZone={tz} />
          <Button
            title="Choose a treatment"
            icon="arrow-forward"
            size="lg"
            onPress={() => navigation.navigate('BookService', { locationId: single.id })}
          />
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {again.length ? <AppText variant="heading">All branches</AppText> : null}
          {branches.map(b => (
            <BranchCard
              key={b.id}
              branch={b}
              timeZone={tz}
              onPress={() => navigation.navigate('BookService', { locationId: b.id })}
            />
          ))}
          <Pressable
            onPress={() => navigation.navigate('Locations')}
            accessibilityRole="link"
            hitSlop={8}
            style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
          >
            <Row gap={6}>
              <Ionicons name="map-outline" size={16} color={colors.rose600} />
              <AppText style={{ fontFamily: fonts.semibold, color: colors.rose600, fontSize: 14 }}>
                Not sure which is closest? See the map
              </AppText>
            </Row>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg },
  again: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 260,
    minHeight: 56,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingLeft: 8,
    paddingRight: 18,
    paddingVertical: 8,
  },
  againIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.rose50,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
