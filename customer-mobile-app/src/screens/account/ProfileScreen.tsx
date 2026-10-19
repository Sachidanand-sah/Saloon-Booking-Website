import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { api, errorMessage } from '@/api/client';
import { keys, useEventRequests, useLoyalty, useMemberships, useReservations } from '@/api/queries';
import { AppText, Avatar, Button, Card, ErrorState, Row, Screen, Skeleton } from '@/components/ui';
import { confirmAction, formatDay, MembershipBadge, MenuRow, ProgressBar } from '@/components/account/shared';
import { useToast } from '@/components/toast';
import { formatPrice } from '@/lib/format';
import { callPhone } from '@/lib/places';
import { BRAND } from '@/config';
import { colors, radius, space } from '@/theme';
import type { TabScreenProps } from '@/navigation/types';
import type { Membership } from '@/api/types';

export default function ProfileScreen({ navigation }: TabScreenProps<'Profile'>) {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const loyalty = useLoyalty();
  const memberships = useMemberships();
  const events = useEventRequests();
  const orders = useReservations();
  const [refreshing, setRefreshing] = useState(false);

  const quoted = (events.data ?? []).filter(e => e.status === 'QUOTED').length;
  const ready = (orders.data ?? []).filter(o => o.status === 'READY').length;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loyalty.refetch(), memberships.refetch(), events.refetch(), orders.refetch()]);
    setRefreshing(false);
  };

  const onLogout = async () => {
    const ok = await confirmAction({
      title: 'Log out?',
      message: 'You can sign back in any time with your email and password.',
      confirmText: 'Log out',
      cancelText: 'Stay',
      destructive: true,
    });
    if (ok) await logout();
  };

  if (!user) return null;

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      {/* Header */}
      <Row gap={space.md}>
        <Avatar name={user.name} size={64} />
        <View style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {user.email}
          </AppText>
        </View>
        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Ionicons name="create-outline" size={20} color={colors.plum800} />
        </Pressable>
      </Row>

      {/* Rewards */}
      {loyalty.isPending ? (
        <Skeleton height={176} style={{ borderRadius: radius.lg }} />
      ) : loyalty.isError ? (
        <ErrorState message={errorMessage(loyalty.error)} onRetry={() => loyalty.refetch()} />
      ) : (
        <Pressable
          onPress={() => navigation.navigate('Rewards')}
          accessibilityRole="button"
          accessibilityLabel={`Lalima Rewards. ${loyalty.data.tier.name} tier, ${loyalty.data.balance} points. Open rewards`}
          style={({ pressed }) => [pressed && { opacity: 0.94 }]}
        >
          <LinearGradient colors={[colors.plum900, colors.plum700, colors.plum500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rewards}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
                Lalima Rewards
              </AppText>
              <View style={styles.tier}>
                <Ionicons name="diamond-outline" size={12} color={colors.plum900} />
                <AppText style={styles.tierText}>{loyalty.data.tier.name}</AppText>
              </View>
            </Row>
            <Row style={{ alignItems: 'flex-end', marginTop: 12 }} gap={6}>
              <AppText variant="display" style={{ color: colors.white, fontSize: 36, lineHeight: 42 }}>
                {loyalty.data.balance.toLocaleString('en-IN')}
              </AppText>
              <AppText style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>points</AppText>
            </Row>
            <AppText style={{ color: colors.rose300, fontSize: 14 }}>
              Worth {formatPrice(loyalty.data.balance * loyalty.data.programme.pointValue)} off your next visit
            </AppText>
            {loyalty.data.nextTier ? (
              <View style={{ marginTop: 16, gap: 6 }}>
                <ProgressBar
                  value={
                    (loyalty.data.lifetime - loyalty.data.tier.minPoints) /
                    Math.max(1, loyalty.data.nextTier.minPoints - loyalty.data.tier.minPoints)
                  }
                  color={colors.rose300}
                  track="rgba(255,255,255,0.18)"
                  label={`Progress to ${loyalty.data.nextTier.name}`}
                />
                <Row style={{ justifyContent: 'space-between' }}>
                  <AppText style={styles.onDarkSmall}>
                    {loyalty.data.pointsToNext.toLocaleString('en-IN')} pts to {loyalty.data.nextTier.name}
                  </AppText>
                  <Row gap={2}>
                    <AppText style={[styles.onDarkSmall, { color: colors.white }]}>View</AppText>
                    <Ionicons name="chevron-forward" size={14} color={colors.white} />
                  </Row>
                </Row>
              </View>
            ) : (
              <AppText style={[styles.onDarkSmall, { marginTop: 12 }]}>You've reached our top tier. Thank you!</AppText>
            )}
          </LinearGradient>
        </Pressable>
      )}

      {/* Package */}
      <PackageCard
        loading={memberships.isPending}
        error={memberships.isError ? errorMessage(memberships.error) : null}
        onRetry={() => memberships.refetch()}
        list={memberships.data ?? []}
        onExplore={() => navigation.navigate('Packages')}
        onCancelled={() => {
          qc.invalidateQueries({ queryKey: keys.memberships });
          toast('Package request cancelled');
        }}
        onError={m => toast(m, 'error')}
      />

      {/* Menu */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <MenuRow
          icon="heart-outline"
          label="My event requests"
          detail={quoted ? 'A quote is waiting for your reply' : undefined}
          badge={quoted ? String(quoted) : undefined}
          onPress={() => navigation.navigate('MyEvents')}
        />
        <MenuRow
          icon="bag-check-outline"
          label="My orders"
          detail={ready ? 'Ready to collect' : undefined}
          badge={ready ? String(ready) : undefined}
          onPress={() => navigation.navigate('MyOrders')}
        />
        <MenuRow icon="ribbon-outline" label="Monthly packages" onPress={() => navigation.navigate('Packages')} />
        <MenuRow icon="sparkles-outline" label="Lalima Rewards" onPress={() => navigation.navigate('Rewards')} />
        <MenuRow icon="rose-outline" label="Bridal & events" onPress={() => navigation.navigate('Events')} />
        <MenuRow icon="location-outline" label="Our locations" onPress={() => navigation.navigate('Locations')} last />
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <MenuRow icon="person-outline" label="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
        <MenuRow
          icon="call-outline"
          label="Contact the salon"
          detail={BRAND.phone}
          accessibilityHint="Calls the salon"
          onPress={() => callPhone(BRAND.phone).catch(() => toast(`Call us on ${BRAND.phone}`, 'error'))}
        />
        <MenuRow icon="log-out-outline" label="Log out" destructive onPress={onLogout} last />
      </Card>

      <AppText variant="caption" style={{ textAlign: 'center', fontSize: 12 }}>
        {BRAND.name} · {BRAND.tagline}
      </AppText>
    </Screen>
  );
}

function PackageCard({
  loading,
  error,
  onRetry,
  list,
  onExplore,
  onCancelled,
  onError,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  list: Membership[];
  onExplore: () => void;
  onCancelled: () => void;
  onError: (message: string) => void;
}) {
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/memberships/${id}/cancel`),
    onSuccess: onCancelled,
    onError: e => onError(errorMessage(e)),
  });

  if (loading) return <Skeleton height={150} style={{ borderRadius: radius.lg }} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  const active = list.find(m => m.status === 'ACTIVE');
  const pending = list.find(m => m.status === 'PENDING');

  if (!active && !pending) {
    return (
      <Card style={{ backgroundColor: colors.rose50, borderColor: colors.rose100 }}>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
          <View style={styles.pkgIcon}>
            <Ionicons name="ribbon-outline" size={20} color={colors.rose600} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">Save with a monthly package</AppText>
            <AppText variant="caption" style={{ marginTop: 2 }}>
              Facials, nails and styling included every month, plus member pricing on everything else.
            </AppText>
          </View>
        </Row>
        <Button title="Explore packages" size="sm" variant="primary" onPress={onExplore} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
      </Card>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      {active ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="eyebrow">My package</AppText>
              <AppText variant="title" style={{ marginTop: 2 }}>
                {active.plan.name}
              </AppText>
              {active.endsAt ? <AppText variant="caption">Valid until {formatDay(active.endsAt)}</AppText> : null}
            </View>
            <MembershipBadge status="ACTIVE" />
          </Row>
          {active.usage?.length ? (
            <View style={{ marginTop: space.lg, gap: space.md }}>
              {active.usage.map(u => (
                <View key={u.serviceId} style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
                      {u.serviceName}
                    </AppText>
                    <AppText variant="caption" style={{ color: u.remaining ? colors.plum800 : colors.muted }}>
                      {u.remaining} of {u.included} left
                    </AppText>
                  </Row>
                  <ProgressBar value={u.remaining / Math.max(1, u.included)} label={`${u.serviceName}: ${u.remaining} of ${u.included} left`} />
                </View>
              ))}
            </View>
          ) : null}
          {active.plan.discountPercent ? (
            <Row gap={6} style={{ marginTop: space.lg }}>
              <Ionicons name="pricetag-outline" size={14} color={colors.rose600} />
              <AppText variant="caption" style={{ color: colors.rose600 }}>
                {active.plan.discountPercent}% off every other treatment, applied automatically
              </AppText>
            </Row>
          ) : null}
        </Card>
      ) : null}
      {pending ? (
        <Card style={{ borderColor: '#ecd9bd', backgroundColor: '#fffaf2' }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="eyebrow" style={{ color: colors.warning }}>
                {active ? 'Next package' : 'My package'}
              </AppText>
              <AppText variant="heading" style={{ marginTop: 2 }}>
                {pending.plan.name}
              </AppText>
            </View>
            <MembershipBadge status="PENDING" />
          </Row>
          <AppText style={{ marginTop: 8, fontSize: 14 }}>
            Pay {formatPrice(pending.price, pending.currency)}
            {pending.location ? ` at ${pending.location.name}` : ' at any branch'} to activate it.
          </AppText>
          <Button
            title="Cancel request"
            size="sm"
            variant="outline"
            loading={cancel.isPending}
            style={{ marginTop: 14, alignSelf: 'flex-start' }}
            onPress={async () => {
              const ok = await confirmAction({
                title: 'Cancel this package request?',
                message: `Your ${pending.plan.name} request will be withdrawn.`,
                confirmText: 'Cancel request',
                cancelText: 'Keep it',
                destructive: true,
              });
              if (ok) cancel.mutate(pending.id);
            }}
          />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewards: { borderRadius: radius.lg, padding: space.xl },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.rose300,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tierText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.plum900 },
  onDarkSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  pkgIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
