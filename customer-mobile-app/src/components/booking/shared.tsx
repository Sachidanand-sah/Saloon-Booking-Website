import type { ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Availability, Booking, LocationListItem } from '@/api/types';
import { AppText, Card, Photo, Row, StatusBadge, type IconName } from '@/components/ui';
import { formatDate, formatPrice, formatTime } from '@/lib/format';
import { formatAddress, todayHours } from '@/lib/places';
import { colors, fonts, radius, shadow, space } from '@/theme';

export const ANY_STAFF = 'any';

// ---------- Data ----------

export const availabilityKey = (serviceId: string, date: string, staffId?: string, locationId?: string) =>
  ['availability', serviceId, staffId ?? ANY_STAFF, locationId ?? 'all', date] as const;

export function useAvailability(serviceId: string | undefined, date: string, staffId?: string, locationId?: string) {
  const staff = staffId && staffId !== ANY_STAFF ? staffId : undefined;
  return useQuery({
    queryKey: availabilityKey(serviceId ?? '', date, staff, locationId),
    queryFn: () =>
      api.get<Availability>(
        `/availability?serviceId=${serviceId}&date=${date}` +
          (staff ? `&staffId=${staff}` : '') +
          (locationId ? `&locationId=${locationId}` : ''),
      ),
    enabled: !!serviceId && !!date,
    staleTime: 15_000,
  });
}

/** Native confirm dialog; falls back to window.confirm on web where Alert buttons don't exist. */
export function confirmAction(title: string, message: string, confirmLabel: string, destructive = true) {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise<boolean>(resolve => {
    Alert.alert(title, message, [
      { text: 'Keep it', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

// ---------- Flow chrome ----------

const STEPS = ['Branch', 'Treatment', 'Specialist', 'Date & time', 'Confirm'];

/** Eyebrow + title + slim progress bar shown at the top of every booking step. */
export function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="eyebrow">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </AppText>
      <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressSeg, i <= step && { backgroundColor: i === step ? colors.plum900 : colors.rose300 }]} />
        ))}
      </View>
      <AppText variant="title" style={{ marginTop: 6 }}>
        {title}
      </AppText>
      {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
    </View>
  );
}

/** Compact recap of choices so far ("Lalima Baneshwor · Balayage · with Sunita"). */
export function DraftSummary({ items }: { items: { icon: IconName; label: string }[] }) {
  const shown = items.filter(i => i.label);
  if (!shown.length) return null;
  return (
    <View style={styles.draft}>
      {shown.map(i => (
        <Row key={i.icon + i.label} gap={6} style={{ maxWidth: '100%' }}>
          <Ionicons name={i.icon} size={14} color={colors.rose500} />
          <AppText variant="caption" style={{ color: colors.plum800, flexShrink: 1 }} numberOfLines={1}>
            {i.label}
          </AppText>
        </Row>
      ))}
    </View>
  );
}

/** Bottom bar that stays put under a scrolling screen. */
export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.footer}>
      {children}
    </SafeAreaView>
  );
}

// ---------- Branches ----------

export function BranchCard({
  branch,
  timeZone,
  onPress,
  action,
}: {
  branch: LocationListItem;
  timeZone?: string;
  onPress?: () => void;
  /** Call-to-action label shown under the details (e.g. "Book here"). */
  action?: string;
}) {
  const today = timeZone ? todayHours(branch.openingHours, timeZone) : null;
  return (
    <Card onPress={onPress} style={styles.branch}>
      <Photo uri={branch.imageUrl} style={styles.branchPhoto} icon="location-outline" />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" style={{ fontSize: 17 }} numberOfLines={1}>
          {branch.name}
        </AppText>
        <Row gap={4} style={{ alignItems: 'flex-start' }}>
          <Ionicons name="location-outline" size={13} color={colors.muted} style={{ marginTop: 2 }} />
          <AppText variant="caption" numberOfLines={2} style={{ flex: 1 }}>
            {formatAddress(branch)}
          </AppText>
        </Row>
        {today ? (
          <Row gap={6}>
            <View style={[styles.dot, { backgroundColor: today.open ? colors.success : colors.muted }]} />
            <AppText variant="caption" style={{ fontSize: 12, color: today.open ? colors.success : colors.muted }}>
              {today.label}
            </AppText>
          </Row>
        ) : null}
        {action ? (
          <Row gap={4} style={{ marginTop: 4 }}>
            <AppText style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.rose600 }}>{action}</AppText>
            <Ionicons name="arrow-forward" size={14} color={colors.rose600} />
          </Row>
        ) : null}
      </View>
      {onPress && !action ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Card>
  );
}

// ---------- Bookings ----------

/** Calendar-page style date: "OCT / 21 / Tue". */
export function DateBlock({ iso, timeZone, dim }: { iso: string; timeZone?: string; dim?: boolean }) {
  return (
    <View style={[styles.dateBlock, dim && { backgroundColor: colors.sand }]}>
      <AppText style={[styles.dateMonth, dim && { color: colors.muted }]}>
        {formatDate(iso, timeZone, { weekday: undefined, day: undefined, month: 'short' })}
      </AppText>
      <AppText style={[styles.dateDay, dim && { color: colors.plum700 }]}>
        {formatDate(iso, timeZone, { weekday: undefined, month: undefined, day: 'numeric' })}
      </AppText>
      <AppText style={[styles.dateWeek, dim && { color: colors.muted }]}>
        {formatDate(iso, timeZone, { weekday: 'short', month: undefined, day: undefined })}
      </AppText>
    </View>
  );
}

export function BookingCard({ booking, timeZone, onPress }: { booking: Booking; timeZone?: string; onPress: () => void }) {
  const inactive = booking.status === 'CANCELLED' || booking.status === 'NO_SHOW';
  return (
    <Card
      onPress={onPress}
      style={{ padding: space.md, gap: space.md }}
    >
      <View style={{ flexDirection: 'row', gap: space.md }} accessible accessibilityLabel={`${booking.service.name}, ${formatDate(booking.startAt, timeZone, { weekday: 'long', month: 'long' })} at ${formatTime(booking.startAt, timeZone)}, ${booking.status.toLowerCase()}`}>
        <DateBlock iso={booking.startAt} timeZone={timeZone} dim={inactive} />
        <View style={{ flex: 1, gap: 3 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <AppText variant="heading" style={{ fontSize: 17, flex: 1 }} numberOfLines={2}>
              {booking.service.name}
            </AppText>
            <StatusBadge status={booking.status} />
          </Row>
          <Row gap={6}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <AppText variant="caption">
              {formatTime(booking.startAt, timeZone)} – {formatTime(booking.endAt, timeZone)}
            </AppText>
          </Row>
          <Row gap={6}>
            <Ionicons name="person-outline" size={14} color={colors.muted} />
            <AppText variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
              {booking.staff.name}
            </AppText>
          </Row>
          {booking.location ? (
            <Row gap={6}>
              <Ionicons name="location-outline" size={14} color={colors.muted} />
              <AppText variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                {booking.location.name}
              </AppText>
            </Row>
          ) : null}
        </View>
      </View>
      <View style={styles.cardFoot}>
        {booking.discount > 0 && !inactive ? (
          <Row gap={4} style={{ flex: 1 }}>
            <Ionicons name="sparkles" size={13} color={colors.success} />
            <AppText variant="caption" style={{ color: colors.success, fontFamily: fonts.medium }}>
              You saved {formatPrice(booking.discount, booking.currency)}
            </AppText>
          </Row>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <AppText variant="price" style={[{ fontSize: 16 }, inactive && { color: colors.muted }]}>
          {formatPrice(booking.total, booking.currency)}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </View>
    </Card>
  );
}

/** Label/value line used in summaries and price breakdowns. */
export function InfoRow({ icon, label, value, onPress, actionIcon }: { icon: IconName; label: string; value: string; onPress?: () => void; actionIcon?: IconName }) {
  const content = (
    <>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.rose500} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" style={{ fontSize: 12 }}>
          {label}
        </AppText>
        <AppText variant="label" style={{ fontFamily: fonts.medium }}>
          {value}
        </AppText>
      </View>
      {actionIcon ? <Ionicons name={actionIcon} size={18} color={colors.rose600} /> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={({ pressed }) => [styles.info, pressed && { opacity: 0.7 }]}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.info}>{content}</View>;
}

export function PriceLine({ label, value, tone, strike, bold }: { label: string; value: string; tone?: 'success' | 'muted'; strike?: boolean; bold?: boolean }) {
  const color = tone === 'success' ? colors.success : tone === 'muted' ? colors.muted : colors.ink;
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={space.md}>
      <AppText style={[{ flex: 1, fontSize: 14, color: tone ? color : colors.muted }, bold && styles.totalText]}>{label}</AppText>
      <AppText
        style={[
          { fontSize: 14, fontFamily: fonts.medium, color },
          strike && { textDecorationLine: 'line-through', color: colors.muted },
          bold && styles.totalValue,
        ]}
      >
        {value}
      </AppText>
    </Row>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 4 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.linen },
  draft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 6,
    backgroundColor: colors.rose50,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    ...(shadow as object),
  },
  branch: { flexDirection: 'row', gap: space.md, padding: space.md, alignItems: 'center' },
  branchPhoto: { width: 76, height: 76, borderRadius: radius.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dateBlock: {
    width: 58,
    borderRadius: radius.md,
    backgroundColor: colors.plum50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  dateMonth: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.rose600 },
  dateDay: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.plum900 },
  dateWeek: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: space.sm,
  },
  info: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.rose50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.plum900 },
  totalValue: { fontFamily: fonts.display, fontSize: 20, color: colors.plum900, textDecorationLine: 'none' },
});
