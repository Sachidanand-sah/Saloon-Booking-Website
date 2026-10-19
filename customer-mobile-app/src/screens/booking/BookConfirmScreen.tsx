import { useState, useLayoutEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, RequestError } from '@/api/client';
import { useLocations, useSalon, useService, useStaff } from '@/api/queries';
import type { Booking, BookingQuote } from '@/api/types';
import { AppText, Button, Card, Divider, Input, Row, Screen, Skeleton } from '@/components/ui';
import { useToast } from '@/components/toast';
import { ANY_STAFF, InfoRow, PriceLine, StepHeader, StickyFooter } from '@/components/booking/shared';
import { formatDate, formatDuration, formatPrice, formatTime } from '@/lib/format';
import { rescheduleReminder } from '@/lib/reminders';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

/** Step 5: summary, price breakdown with member benefit and points, then confirm. */
export default function BookConfirmScreen({ navigation, route }: RootScreenProps<'BookConfirm'>) {
  useLayoutEffect(() => navigation.setOptions({ title: '' }), [navigation]);
  const { locationId, serviceId = '', staffId, rescheduleId, startAt } = route.params;
  const qc = useQueryClient();
  const toast = useToast();
  const salon = useSalon();
  const service = useService(serviceId);
  const locations = useLocations();
  const staff = useStaff();
  const branch = locations.data?.find(l => l.id === locationId);
  const stylist = staffId && staffId !== ANY_STAFF ? staff.data?.find(m => m.id === staffId) : undefined;
  const tz = salon.data?.timezone;

  const [notes, setNotes] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quote = useQuery({
    queryKey: ['quote', serviceId, startAt],
    queryFn: () => api.get<BookingQuote>(`/bookings/quote?serviceId=${serviceId}&startAt=${encodeURIComponent(startAt)}`),
    enabled: !rescheduleId && !!serviceId,
  });

  const q = quote.data;
  const maxPoints = q?.points.maxRedeemable ?? 0;
  const redeem = usePoints ? maxPoints : 0;
  const total = q ? Math.max(0, q.afterMembership - redeem * q.points.pointValue) : (service.data?.price ?? 0);
  const currency = q?.currency ?? service.data?.currency ?? 'NPR';
  const endAt = service.data ? new Date(new Date(startAt).getTime() + service.data.durationMins * 60_000).toISOString() : null;
  const cutoffHours = Math.round((salon.data?.cancelCutoffMins ?? 120) / 60);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const specific = staffId && staffId !== ANY_STAFF ? staffId : undefined;
      const res = rescheduleId
        ? await api.post<{ booking: Booking }>(`/bookings/${rescheduleId}/reschedule`, { startAt, staffId: specific })
        : await api.post<{ booking: Booking }>('/bookings', {
            serviceId,
            staffId: specific,
            locationId,
            startAt,
            notes: notes.trim() || undefined,
            redeemPoints: redeem > 0 ? redeem : undefined,
          });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking'] });
      qc.invalidateQueries({ queryKey: ['loyalty'] });
      qc.invalidateQueries({ queryKey: ['memberships'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['quote'] });
      if (rescheduleId) {
        rescheduleReminder(res.booking, tz).catch(() => undefined);
        toast('Your appointment has been moved.');
      }
      navigation.replace('BookSuccess', { bookingId: res.booking.id });
    } catch (e) {
      setSubmitting(false);
      if (e instanceof RequestError && e.status === 409) {
        toast(e.message, 'error');
        qc.invalidateQueries({ queryKey: ['availability'] });
        qc.invalidateQueries({ queryKey: ['quote'] });
        if (e.code === 'SLOT_UNAVAILABLE') navigation.goBack();
        else setError(e.message);
      } else {
        setError(errorMessage(e));
      }
    }
  };

  const ready = !!service.data && (rescheduleId ? true : !!q);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen edges={[]} scroll={false}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {rescheduleId ? (
            <View style={{ gap: 4 }}>
              <AppText variant="eyebrow">Reschedule</AppText>
              <AppText variant="title">Confirm your new time</AppText>
            </View>
          ) : (
            <StepHeader step={4} title="Review & confirm" />
          )}

          {/* When */}
          <View style={styles.when}>
            <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
              {rescheduleId ? 'New time' : 'Your appointment'}
            </AppText>
            <AppText variant="title" style={{ color: colors.white, marginTop: 6 }}>
              {formatDate(startAt, tz, { weekday: 'long', month: 'long' })}
            </AppText>
            <AppText style={styles.whenTime}>
              {formatTime(startAt, tz)}
              {endAt ? ` – ${formatTime(endAt, tz)}` : ''}
            </AppText>
          </View>

          {/* What, who, where */}
          <Card style={{ gap: space.md }}>
            {service.isPending ? (
              <Skeleton height={44} />
            ) : (
              <InfoRow
                icon="sparkles-outline"
                label="Treatment"
                value={service.data ? `${service.data.name} · ${formatDuration(service.data.durationMins)}` : 'Treatment'}
              />
            )}
            <InfoRow
              icon="person-outline"
              label="Specialist"
              value={stylist ? `${stylist.name} · ${stylist.title}` : rescheduleId && !staffId ? 'Your current specialist if free' : 'First available specialist'}
            />
            {branch ? <InfoRow icon="location-outline" label="Branch" value={branch.name} /> : null}
          </Card>

          {/* Price */}
          {rescheduleId ? (
            <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: colors.rose50, borderColor: colors.rose100 }}>
              <Ionicons name="information-circle-outline" size={20} color={colors.rose600} />
              <AppText variant="caption" style={{ flex: 1, color: colors.plum800 }}>
                Your price, member benefits and any points you used stay the same.
              </AppText>
            </Card>
          ) : quote.isPending ? (
            <Skeleton height={150} />
          ) : quote.isError ? (
            <Card style={{ gap: 10, alignItems: 'center' }}>
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                We couldn&apos;t check your member price and points.
              </AppText>
              <Button title="Try again" size="sm" variant="outline" onPress={() => quote.refetch()} />
            </Card>
          ) : q ? (
            <Card style={{ gap: 12 }}>
              <AppText variant="heading">Price</AppText>
              <PriceLine label="Treatment price" value={formatPrice(q.price, currency)} strike={q.membership?.kind === 'included'} />
              {q.membership ? (
                <Row style={{ alignItems: 'flex-start' }} gap={6}>
                  <Ionicons name="ribbon-outline" size={15} color={colors.success} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <PriceLine
                      tone="success"
                      label={
                        q.membership.kind === 'included'
                          ? `Included in your ${q.membership.planName} package`
                          : `${q.membership.planName} member ${q.price ? Math.round((q.membership.discount / q.price) * 100) : 0}% off`
                      }
                      value={q.membership.kind === 'included' ? formatPrice(0, currency) : `−${formatPrice(q.membership.discount, currency)}`}
                    />
                  </View>
                </Row>
              ) : null}

              {maxPoints > 0 ? (
                <View style={styles.points}>
                  <Ionicons name="sparkles" size={18} color={colors.rose500} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">Use my points</AppText>
                    <AppText variant="caption" style={{ fontSize: 12 }}>
                      {`${q.points.balance.toLocaleString('en-IN')} available · save up to ${formatPrice(maxPoints * q.points.pointValue, currency)}`}
                    </AppText>
                  </View>
                  <Switch
                    value={usePoints}
                    onValueChange={setUsePoints}
                    accessibilityLabel="Use my points"
                    trackColor={{ false: colors.linen, true: colors.rose500 }}
                    thumbColor={colors.white}
                    {...(Platform.OS === 'web' ? ({ activeThumbColor: colors.white } as object) : {})}
                    ios_backgroundColor={colors.linen}
                  />
                </View>
              ) : null}
              {redeem > 0 ? (
                <PriceLine
                  tone="success"
                  label={`${redeem.toLocaleString('en-IN')} points`}
                  value={`−${formatPrice(redeem * q.points.pointValue, currency)}`}
                />
              ) : null}

              <Divider />
              <PriceLine bold label="To pay at the salon" value={formatPrice(total, currency)} />
            </Card>
          ) : null}

          {!rescheduleId ? (
            <Input
              label="Anything we should know? (optional)"
              placeholder="Allergies, hair length, a special occasion…"
              value={notes}
              onChangeText={setNotes}
              maxLength={500}
              multiline
            />
          ) : null}

          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <AppText variant="caption" style={{ color: colors.danger, flex: 1 }}>
                {error}
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        <StickyFooter>
          <Button
            size="lg"
            title={rescheduleId ? 'Confirm new time' : `Confirm booking · ${formatPrice(total, currency)}`}
            onPress={submit}
            loading={submitting}
            disabled={!ready}
          />
          <AppText variant="caption" style={{ textAlign: 'center', fontSize: 12, marginTop: 8 }}>
            Pay at the salon · free changes up to {cutoffHours} hours before
          </AppText>
        </StickyFooter>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl, gap: space.lg },
  when: { backgroundColor: colors.plum900, borderRadius: radius.lg, padding: space.xl },
  whenTime: { fontFamily: fonts.medium, fontSize: 17, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  points: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.rose50,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 56,
  },
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#f6e0df',
    borderRadius: radius.md,
    padding: space.md,
  },
});
