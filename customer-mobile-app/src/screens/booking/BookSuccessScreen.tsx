import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Switch, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBooking, useSalon } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { AppText, Button, Card, Divider, ErrorState, Row, Screen, Skeleton } from '@/components/ui';
import { useToast } from '@/components/toast';
import { InfoRow, PriceLine } from '@/components/booking/shared';
import { formatDate, formatPrice, formatTime } from '@/lib/format';
import { formatAddress, openDirections } from '@/lib/places';
import { hasReminder, remindersSupported, scheduleReminder, cancelReminder } from '@/lib/reminders';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

export default function BookSuccessScreen({ navigation, route }: RootScreenProps<'BookSuccess'>) {
  const { bookingId } = route.params;
  const booking = useBooking(bookingId);
  const salon = useSalon();
  const toast = useToast();
  const tz = salon.data?.timezone;
  const b = booking.data;

  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [pop]);

  const [reminder, setReminder] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  useEffect(() => {
    hasReminder(bookingId).then(setReminder).catch(() => undefined);
  }, [bookingId]);

  const toggleReminder = async (on: boolean) => {
    if (!b) return;
    setReminderBusy(true);
    if (!on) {
      await cancelReminder(b.id);
      setReminder(false);
    } else {
      const result = await scheduleReminder(b, tz);
      setReminder(result === 'scheduled');
      if (result === 'scheduled') toast("We'll remind you 2 hours before.");
      else if (result === 'denied') toast('Turn on notifications in Settings to get reminders.', 'error');
      else if (result === 'too-soon') toast('Your appointment is less than 2 hours away.', 'error');
    }
    setReminderBusy(false);
  };

  const goBookings = () => navigation.navigate('Tabs', { screen: 'Bookings' });
  const goHome = () => navigation.navigate('Tabs', { screen: 'Home' });

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: space.xl }}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Animated.View style={{ transform: [{ scale: pop }], opacity: pop }}>
          <LinearGradient colors={[colors.rose500, colors.plum500]} style={styles.check}>
            <Ionicons name="checkmark" size={44} color={colors.white} />
          </LinearGradient>
        </Animated.View>
        <AppText variant="eyebrow" style={{ marginTop: space.md }}>
          Booking confirmed
        </AppText>
        <AppText variant="display" style={{ textAlign: 'center' }} accessibilityRole="header">
          You&apos;re all set
        </AppText>
        <AppText variant="caption" style={{ textAlign: 'center', maxWidth: 290, fontSize: 14 }}>
          We can&apos;t wait to see you. A confirmation is saved in My bookings.
        </AppText>
      </View>

      {booking.isPending ? (
        <Skeleton height={320} />
      ) : booking.isError || !b ? (
        <ErrorState message={errorMessage(booking.error)} onRetry={() => booking.refetch()} />
      ) : (
        <>
          <View style={styles.ticket}>
            <AppText style={styles.ticketDate}>{formatDate(b.startAt, tz, { weekday: 'long', month: 'long' })}</AppText>
            <AppText style={styles.ticketTime}>
              {formatTime(b.startAt, tz)} – {formatTime(b.endAt, tz)}
            </AppText>
          </View>

          <Card style={{ gap: space.md }}>
            <InfoRow icon="sparkles-outline" label="Treatment" value={b.service.name} />
            <InfoRow icon="person-outline" label="Specialist" value={`${b.staff.name} · ${b.staff.title}`} />
            {b.location ? (
              <InfoRow
                icon="location-outline"
                label={b.location.name}
                value={formatAddress(b.location)}
              />
            ) : null}
            {b.location ? (
              <Button
                title="Directions"
                icon="navigate-outline"
                variant="outline"
                size="sm"
                onPress={() => openDirections(b.location!)}
                style={{ alignSelf: 'flex-start', marginLeft: 50 }}
                accessibilityLabel={`Directions to ${b.location.name}`}
              />
            ) : null}
            <Divider />
            <View style={{ gap: 10 }}>
              <PriceLine label="Treatment price" value={formatPrice(b.price, b.currency)} />
              {b.discount > 0 ? (
                <PriceLine
                  tone="success"
                  label={
                    b.membershipApplied && b.pointsRedeemed
                      ? `Member benefit + ${b.pointsRedeemed} points`
                      : b.pointsRedeemed
                        ? `${b.pointsRedeemed} points redeemed`
                        : 'Member benefit'
                  }
                  value={`−${formatPrice(b.discount, b.currency)}`}
                />
              ) : null}
              <PriceLine bold label="Pay at the salon" value={formatPrice(b.total, b.currency)} />
            </View>
          </Card>

          <Card style={styles.reminder}>
            <View style={styles.bell}>
              <Ionicons name="notifications-outline" size={20} color={colors.rose500} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label">Add a reminder</AppText>
              <AppText variant="caption" style={{ fontSize: 12 }}>
                {remindersSupported ? 'A gentle nudge 2 hours before.' : 'Reminders work in the Lalima mobile app.'}
              </AppText>
            </View>
            <Switch
              value={reminder}
              onValueChange={toggleReminder}
              disabled={!remindersSupported || reminderBusy}
              accessibilityLabel="Add a reminder 2 hours before"
              trackColor={{ false: colors.linen, true: colors.rose500 }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.linen}
            />
          </Card>
        </>
      )}

      <View style={{ gap: space.md }}>
        <Button title="View my bookings" size="lg" icon="calendar-outline" onPress={goBookings} />
        <Button title="Back to home" size="lg" variant="ghost" onPress={goHome} />
      </View>
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Ionicons name="sparkles" size={13} color={colors.rose500} />
        <AppText variant="caption" style={{ fontSize: 12 }}>
          You&apos;ll earn reward points after your visit
        </AppText>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: colors.rose100,
  },
  ticket: {
    backgroundColor: colors.plum900,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  ticketDate: { fontFamily: fonts.display, fontSize: 21, color: colors.white, textAlign: 'center' },
  ticketTime: { fontFamily: fonts.medium, fontSize: 16, color: colors.rose300, marginTop: 4 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.rose50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
