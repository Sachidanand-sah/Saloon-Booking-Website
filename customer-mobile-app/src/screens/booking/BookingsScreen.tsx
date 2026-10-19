import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useBookings, useSalon } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { AppText, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { BookingCard } from '@/components/booking/shared';
import { colors, fonts, radius, space } from '@/theme';
import type { TabScreenProps } from '@/navigation/types';

type Scope = 'upcoming' | 'past';

export default function BookingsScreen({ navigation }: TabScreenProps<'Bookings'>) {
  const [scope, setScope] = useState<Scope>('upcoming');
  const salon = useSalon();
  const list = useBookings(scope);
  const tz = salon.data?.timezone;

  return (
    <Screen onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <View style={{ gap: 4 }}>
        <AppText variant="eyebrow">Appointments</AppText>
        <AppText variant="display" style={{ fontSize: 28 }} accessibilityRole="header">
          My bookings
        </AppText>
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(['upcoming', 'past'] as const).map(s => {
          const active = scope === s;
          return (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && styles.segmentActive]}
            >
              <AppText style={[styles.segmentText, active && { color: colors.white }]}>
                {s === 'upcoming' ? 'Upcoming' : 'Past'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {list.isPending ? (
        <View style={{ gap: space.md }}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} height={150} />
          ))}
        </View>
      ) : list.isError ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        scope === 'upcoming' ? (
          <EmptyState
            icon="calendar-outline"
            title="Nothing booked yet"
            message="Your next glow-up is a few taps away. Live times across all our studios."
            action="Book now"
            onAction={() => navigation.navigate('Book')}
          />
        ) : (
          <EmptyState
            icon="time-outline"
            title="No past visits"
            message="Once you've visited us, your appointments and reviews will appear here."
            action="Book now"
            onAction={() => navigation.navigate('Book')}
          />
        )
      ) : (
        <View style={{ gap: space.md }}>
          {list.data.map(b => (
            <BookingCard key={b.id} booking={b} timeZone={tz} onPress={() => navigation.navigate('BookingDetail', { id: b.id })} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.sand,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentItem: { flex: 1, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.plum900 },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.plum800 },
});
