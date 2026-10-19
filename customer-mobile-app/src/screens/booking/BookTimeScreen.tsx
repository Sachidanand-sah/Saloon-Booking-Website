import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocations, useSalon, useService, useStaff } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { AppText, Button, Card, ErrorState, Row, Screen, Skeleton, type IconName } from '@/components/ui';
import { ANY_STAFF, DraftSummary, StepHeader, useAvailability } from '@/components/booking/shared';
import { addDays, formatDate, formatTime, hourIn, isoWeekday, todayIn } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

const periods: { label: string; icon: IconName; test: (h: number) => boolean }[] = [
  { label: 'Morning', icon: 'partly-sunny-outline', test: h => h < 12 },
  { label: 'Afternoon', icon: 'sunny-outline', test: h => h >= 12 && h < 17 },
  { label: 'Evening', icon: 'moon-outline', test: h => h >= 17 },
];

/** Step 4: date strip in salon time + live slots for that day. */
export default function BookTimeScreen({ navigation, route }: RootScreenProps<'BookTime'>) {
  useLayoutEffect(() => navigation.setOptions({ title: '' }), [navigation]);
  const { locationId, serviceId = '', staffId, rescheduleId } = route.params ?? {};
  const salon = useSalon();
  const service = useService(serviceId);
  const locations = useLocations();
  const staff = useStaff();
  const branch = locations.data?.find(l => l.id === locationId);
  const stylist = staffId && staffId !== ANY_STAFF ? staff.data?.find(m => m.id === staffId) : undefined;
  const tz = salon.data?.timezone ?? 'Asia/Kathmandu';

  const today = todayIn(tz);
  const days = useMemo(
    () => Array.from({ length: Math.min(30, salon.data?.bookingWindowDays ?? 30) }, (_, i) => addDays(today, i)),
    [today, salon.data?.bookingWindowDays],
  );
  // Branch hours win over salon-wide hours when we know them.
  const hours = branch?.openingHours ?? salon.data?.openingHours ?? [];
  const isClosed = (d: string) => {
    if (!hours.length) return false;
    const h = hours.find(o => o.dayOfWeek === isoWeekday(d));
    return !h || h.open === null;
  };
  const firstOpen = days.find(d => !isClosed(d)) ?? today;
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked && days.includes(picked) ? picked : firstOpen;

  const avail = useAvailability(serviceId, date, staffId, staffId && staffId !== ANY_STAFF ? undefined : locationId);
  const nextOpen = days.find(d => d > date && !isClosed(d));

  // Keep the selected day visible after it changes (e.g. "check next day").
  const [strip, setStrip] = useState<ScrollView | null>(null);
  useEffect(() => {
    const i = days.indexOf(date);
    if (strip && i > 2) strip.scrollTo({ x: (i - 2) * 70, animated: true });
  }, [strip, date, days]);

  const pick = (startAt: string) => navigation.navigate('BookConfirm', { ...route.params, startAt });

  return (
    <Screen edges={[]} onRefresh={() => avail.refetch()} refreshing={avail.isRefetching}>
      {rescheduleId ? (
        <View style={{ gap: 4 }}>
          <AppText variant="eyebrow">Reschedule</AppText>
          <AppText variant="title">Choose a new time</AppText>
        </View>
      ) : (
        <StepHeader step={3} title="Pick a date & time" />
      )}
      <DraftSummary
        items={[
          { icon: 'location-outline', label: branch?.name ?? '' },
          { icon: 'sparkles-outline', label: service.data?.name ?? '' },
          { icon: 'person-outline', label: stylist ? `with ${stylist.name}` : staffId === ANY_STAFF ? 'Any specialist' : '' },
        ]}
      />

      <ScrollView
        ref={setStrip}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg, paddingVertical: 4 }}
        style={styles.bleed}
        accessibilityRole="tablist"
      >
        {days.map(d => {
          const closed = isClosed(d);
          const active = d === date;
          const at = `${d}T12:00:00Z`;
          const label = formatDate(at, 'UTC', { weekday: 'long', month: 'long' });
          return (
            <Pressable
              key={d}
              disabled={closed}
              onPress={() => setPicked(d)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled: closed }}
              accessibilityLabel={closed ? `${label}, closed` : label}
              style={[styles.day, active && styles.dayActive, closed && styles.dayClosed]}
            >
              <AppText style={[styles.dayWeek, active && { color: colors.rose300 }, closed && styles.closedText]}>
                {d === today ? 'Today' : formatDate(at, 'UTC', { weekday: 'short', month: undefined, day: undefined })}
              </AppText>
              <AppText style={[styles.dayNum, active && { color: colors.white }, closed && styles.closedText]}>
                {Number(d.slice(8))}
              </AppText>
              <AppText style={[styles.dayMonth, active && { color: 'rgba(255,255,255,0.75)' }, closed && styles.closedText]}>
                {closed ? 'Closed' : formatDate(at, 'UTC', { weekday: undefined, day: undefined, month: 'short' })}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <Row gap={6}>
        <Ionicons name="globe-outline" size={14} color={colors.muted} />
        <AppText variant="caption" style={{ fontSize: 12 }}>
          {formatDate(`${date}T12:00:00Z`, 'UTC', { weekday: 'long', month: 'long' })} · times in Nepal time
        </AppText>
      </Row>

      {avail.isPending || salon.isPending ? (
        <View style={styles.grid}>
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} height={46} style={styles.slot} />
          ))}
        </View>
      ) : avail.isError ? (
        <ErrorState message={errorMessage(avail.error)} onRetry={() => avail.refetch()} />
      ) : avail.data.slots.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={26} color={colors.rose500} />
          </View>
          <AppText variant="heading" style={{ marginTop: 14, textAlign: 'center' }}>
            Fully booked
          </AppText>
          <AppText variant="caption" style={{ marginTop: 6, textAlign: 'center', maxWidth: 260 }}>
            No times left on this day{stylist ? ` with ${stylist.name}` : ''}. Check the next day
            {stylist ? ' or choose another specialist' : ''}.
          </AppText>
          {nextOpen ? (
            <Button title="Check next day" size="sm" variant="outline" icon="arrow-forward" onPress={() => setPicked(nextOpen)} style={{ marginTop: 18 }} />
          ) : null}
        </Card>
      ) : (
        <View style={{ gap: space.xl }}>
          {periods.map(p => {
            const slots = avail.data.slots.filter(s => p.test(hourIn(s.startAt, tz)));
            if (!slots.length) return null;
            return (
              <View key={p.label} style={{ gap: space.md }}>
                <Row gap={8}>
                  <Ionicons name={p.icon} size={16} color={colors.rose500} />
                  <AppText variant="label">{p.label}</AppText>
                  <AppText variant="caption" style={{ fontSize: 12 }}>
                    {slots.length} {slots.length === 1 ? 'time' : 'times'}
                  </AppText>
                </Row>
                <View style={styles.grid}>
                  {slots.map(s => (
                    <Pressable
                      key={s.startAt}
                      onPress={() => pick(s.startAt)}
                      accessibilityRole="button"
                      accessibilityLabel={`Book at ${formatTime(s.startAt, tz)}`}
                      style={({ pressed }) => [styles.slot, styles.slotBtn, pressed && styles.slotPressed]}
                    >
                      <AppText style={styles.slotText}>{formatTime(s.startAt, tz)}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg, flexGrow: 0 },
  day: {
    width: 62,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  dayActive: { backgroundColor: colors.plum900, borderColor: colors.plum900 },
  dayClosed: { backgroundColor: colors.sand, borderColor: 'transparent' },
  closedText: { color: colors.muted, opacity: 0.6 },
  dayWeek: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
  dayNum: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.plum900, marginTop: 2 },
  dayMonth: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Three per row at any phone width.
  slot: { width: '31.5%', flexGrow: 1, maxWidth: '33%' },
  slotBtn: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  slotPressed: { borderColor: colors.rose500, backgroundColor: colors.rose50 },
  slotText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.plum900, fontVariant: ['tabular-nums'] },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.rose50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
