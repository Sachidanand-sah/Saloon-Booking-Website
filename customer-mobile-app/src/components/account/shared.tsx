import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, Card, type IconName } from '@/components/ui';
import { colors, fonts, radius, space } from '@/theme';
import type { EventRequestStatus, MembershipStatus, ReservationStatus } from '@/api/types';

/** Native confirmation dialog, with window.confirm on web. Resolves true when confirmed. */
export function confirmAction({
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Not now',
  destructive = false,
}: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(message ? `${title}\n\n${message}` : title);
    return Promise.resolve(!!ok);
  }
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function ProgressBar({
  value,
  color = colors.rose500,
  track = colors.sand,
  height = 6,
  label,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Numbered "How it works" steps. */
export function HowItWorks({ steps }: { steps: { icon: IconName; title: string; text: string }[] }) {
  return (
    <View style={{ gap: space.md }}>
      {steps.map((s, i) => (
        <Card key={s.title} style={styles.step}>
          <View style={styles.stepIcon}>
            <Ionicons name={s.icon} size={20} color={colors.rose600} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="eyebrow" style={{ color: colors.muted }}>
              Step {i + 1}
            </AppText>
            <AppText variant="heading" style={{ fontSize: 17, marginTop: 2 }}>
              {s.title}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 2 }}>
              {s.text}
            </AppText>
          </View>
        </Card>
      ))}
    </View>
  );
}

/** A tappable settings-style row. */
export function MenuRow({
  icon,
  label,
  detail,
  badge,
  onPress,
  destructive,
  last,
  accessibilityHint,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  badge?: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
  accessibilityHint?: string;
}) {
  const tint = destructive ? colors.danger : colors.plum800;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuDivider, pressed && { backgroundColor: colors.ivory }]}
    >
      <View style={[styles.menuIcon, destructive && { backgroundColor: '#f6e0df' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={[styles.menuLabel, destructive && { color: colors.danger }]}>{label}</AppText>
        {detail ? (
          <AppText variant="caption" numberOfLines={1} style={{ fontSize: 12 }}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.menuBadge}>
          <AppText style={styles.menuBadgeText}>{badge}</AppText>
        </View>
      ) : null}
      {!destructive ? <Ionicons name="chevron-forward" size={18} color={colors.plum300} /> : null}
    </Pressable>
  );
}

type Tone = 'neutral' | 'plum' | 'rose' | 'success' | 'warning' | 'danger';

const membershipMeta: Record<MembershipStatus, [string, Tone]> = {
  PENDING: ['Awaiting payment', 'warning'],
  ACTIVE: ['Active', 'success'],
  EXPIRED: ['Expired', 'neutral'],
  CANCELLED: ['Cancelled', 'neutral'],
};
const eventMeta: Record<EventRequestStatus, [string, Tone]> = {
  NEW: ['Awaiting quote', 'warning'],
  QUOTED: ['Quote ready', 'rose'],
  CONFIRMED: ['Confirmed', 'success'],
  DECLINED: ['Declined', 'neutral'],
  CANCELLED: ['Cancelled', 'neutral'],
  COMPLETED: ['Completed', 'plum'],
};
const reservationMeta: Record<ReservationStatus, [string, Tone]> = {
  PENDING: ['Being prepared', 'warning'],
  READY: ['Ready to collect', 'success'],
  COLLECTED: ['Collected', 'plum'],
  CANCELLED: ['Cancelled', 'neutral'],
};

export const MembershipBadge = ({ status }: { status: MembershipStatus }) => (
  <Badge label={membershipMeta[status][0]} tone={membershipMeta[status][1]} />
);
export const EventStatusBadge = ({ status }: { status: EventRequestStatus }) => (
  <Badge label={eventMeta[status][0]} tone={eventMeta[status][1]} />
);
export const ReservationBadge = ({ status }: { status: ReservationStatus }) => (
  <Badge label={reservationMeta[status][0]} tone={reservationMeta[status][1]} />
);

/** "Oct 19, 2026" for a YYYY-MM-DD date or an ISO timestamp (shown in salon time). */
export function formatDay(value: string, opts: Intl.DateTimeFormatOptions = {}) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : 'Asia/Kathmandu',
    ...opts,
  }).format(new Date(dateOnly ? `${value}T12:00:00Z` : value));
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.rose50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.plum50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.plum900 },
  menuBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: colors.rose500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
});
