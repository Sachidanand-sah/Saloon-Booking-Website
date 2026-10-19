import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { useBooking, useLocations, useSalon } from '@/api/queries';
import type { Booking } from '@/api/types';
import { AppText, Button, Card, Divider, ErrorState, Input, Row, Screen, Skeleton, StatusBadge } from '@/components/ui';
import { useToast } from '@/components/toast';
import { InfoRow, PriceLine, confirmAction } from '@/components/booking/shared';
import { formatDate, formatDuration, formatPrice, formatTime } from '@/lib/format';
import { callPhone, formatAddress, openDirections } from '@/lib/places';
import { cancelReminder } from '@/lib/reminders';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

export default function BookingDetailScreen({ navigation, route }: RootScreenProps<'BookingDetail'>) {
  const { id } = route.params;
  const qc = useQueryClient();
  const toast = useToast();
  const salon = useSalon();
  const locations = useLocations();
  const booking = useBooking(id);
  const [cancelling, setCancelling] = useState(false);
  const tz = salon.data?.timezone;
  const b = booking.data;

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['booking', id] });
    qc.invalidateQueries({ queryKey: ['loyalty'] });
    qc.invalidateQueries({ queryKey: ['memberships'] });
  };

  const cancel = async () => {
    if (!b) return;
    const refund = b.pointsRedeemed ? ` Your ${b.pointsRedeemed} points will be returned.` : '';
    const ok = await confirmAction(
      'Cancel this appointment?',
      `${b.service.name} on ${formatDate(b.startAt, tz, { weekday: 'long', month: 'long' })} at ${formatTime(b.startAt, tz)}.${refund}`,
      'Cancel booking',
    );
    if (!ok) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${b.id}/cancel`);
      await cancelReminder(b.id);
      refreshAll();
      qc.invalidateQueries({ queryKey: ['availability'] });
      toast('Your appointment has been cancelled.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (booking.isPending) {
    return (
      <Screen edges={[]}>
        <Skeleton height={150} />
        <Skeleton height={220} />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (booking.isError || !b) {
    return (
      <Screen edges={[]}>
        <ErrorState message={errorMessage(booking.error)} onRetry={() => booking.refetch()} />
      </Screen>
    );
  }

  const active = b.status === 'PENDING' || b.status === 'CONFIRMED';
  const branchActive = !!b.location && !!locations.data?.some(l => l.id === b.location!.id && l.isActive && l.serviceIds.includes(b.service.id));
  const cutoffHours = Math.round((salon.data?.cancelCutoffMins ?? 120) / 60);

  return (
    <Screen edges={[]} onRefresh={() => booking.refetch()} refreshing={booking.isRefetching}>
      <View style={[styles.hero, !active && { backgroundColor: colors.plum700 }]}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
            {active ? 'Upcoming visit' : 'Appointment'}
          </AppText>
          <StatusBadge status={b.status} />
        </Row>
        <AppText variant="title" style={{ color: colors.white, marginTop: 8 }}>
          {b.service.name}
        </AppText>
        <AppText style={styles.heroDate}>{formatDate(b.startAt, tz, { weekday: 'long', month: 'long', year: 'numeric' })}</AppText>
        <AppText style={styles.heroTime}>
          {formatTime(b.startAt, tz)} – {formatTime(b.endAt, tz)} · {formatDuration(b.service.durationMins)}
        </AppText>
      </View>

      <Card style={{ gap: space.md }}>
        <InfoRow icon="person-outline" label="Specialist" value={`${b.staff.name} · ${b.staff.title}`} />
        {b.location ? (
          <>
            <InfoRow icon="location-outline" label={b.location.name} value={formatAddress(b.location)} />
            <Row gap={space.sm} style={{ flexWrap: 'wrap', marginLeft: 50 }}>
              <Button
                title="Directions"
                icon="navigate-outline"
                size="sm"
                variant="outline"
                onPress={() => openDirections(b.location!)}
                accessibilityLabel={`Directions to ${b.location.name}`}
              />
              {b.location.phone ? (
                <Button
                  title="Call"
                  icon="call-outline"
                  size="sm"
                  variant="outline"
                  onPress={() => callPhone(b.location!.phone!)}
                  accessibilityLabel={`Call ${b.location.name}`}
                />
              ) : null}
            </Row>
          </>
        ) : null}
        {b.notes ? <InfoRow icon="chatbubble-ellipses-outline" label="Your note" value={b.notes} /> : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText variant="heading">Payment</AppText>
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
        <Divider />
        <PriceLine bold label={b.status === 'COMPLETED' ? 'Paid at the salon' : active ? 'Pay at the salon' : 'Total'} value={formatPrice(b.total, b.currency)} />
      </Card>

      {active ? (
        <View style={{ gap: space.md }}>
          {b.canReschedule ? (
            <Button
              title="Reschedule"
              icon="calendar-outline"
              size="lg"
              onPress={() =>
                navigation.navigate('BookTime', {
                  serviceId: b.service.id,
                  locationId: b.location?.id,
                  staffId: b.staff.id,
                  rescheduleId: b.id,
                })
              }
            />
          ) : null}
          {b.canCancel ? (
            <Button title="Cancel appointment" variant="ghost" size="lg" loading={cancelling} onPress={cancel} style={{ borderColor: colors.line }} />
          ) : null}
          {!b.canCancel && !b.canReschedule ? (
            <Card style={styles.note}>
              <Ionicons name="information-circle-outline" size={18} color={colors.rose600} />
              <AppText variant="caption" style={{ flex: 1, color: colors.plum800 }}>
                Changes are possible up to {cutoffHours} hours before. Please call the branch if your plans change.
              </AppText>
            </Card>
          ) : null}
        </View>
      ) : null}

      {b.canReview ? <ReviewForm booking={b} onDone={refreshAll} /> : null}
      {b.review ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="heading">Your review</AppText>
          <Stars value={b.review.rating} size={20} />
          {b.review.comment ? <AppText style={{ fontSize: 14 }}>{b.review.comment}</AppText> : null}
        </Card>
      ) : null}

      {!active && branchActive ? (
        <Button
          title="Book again"
          icon="refresh"
          size="lg"
          variant={b.canReview ? 'outline' : 'primary'}
          onPress={() => navigation.navigate('BookStylist', { locationId: b.location!.id, serviceId: b.service.id })}
        />
      ) : null}
    </Screen>
  );
}

function Stars({ value, size = 32, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: onChange ? 4 : 2 }} accessibilityLabel={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => {
        const icon = <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? '#d9a441' : colors.plum200} />;
        return onChange ? (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ selected: n === value }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

const ratingWords = ['', 'Not great', 'Could be better', 'Good', 'Lovely', 'Absolutely loved it'];

function ReviewForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/bookings/${booking.id}/review`, { rating, comment: comment.trim() || undefined });
      toast('Thank you for your review!');
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md, backgroundColor: colors.rose50, borderColor: colors.rose100 }}>
      <View>
        <AppText variant="heading">How was your visit?</AppText>
        <AppText variant="caption">Tell us about {booking.service.name} with {booking.staff.name.split(' ')[0]}.</AppText>
      </View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Stars value={rating} onChange={setRating} />
        <AppText style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.rose600, minHeight: 18 }}>{ratingWords[rating]}</AppText>
      </View>
      <Input
        label="Comment (optional)"
        placeholder="What did you love?"
        value={comment}
        onChangeText={setComment}
        maxLength={1000}
        multiline
      />
      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <Button title="Submit review" onPress={submit} loading={busy} disabled={rating === 0} />
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.plum900, borderRadius: radius.lg, padding: space.xl },
  heroDate: { fontFamily: fonts.medium, fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  heroTime: { fontFamily: fonts.body, fontSize: 14, color: colors.rose300, marginTop: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.rose50, borderColor: colors.rose100 },
});
