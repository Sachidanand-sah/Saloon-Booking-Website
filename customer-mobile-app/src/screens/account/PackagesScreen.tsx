import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, RequestError } from '@/api/client';
import { keys, useLocations, useMemberships, usePlans } from '@/api/queries';
import { AppText, Button, Card, EmptyState, ErrorState, Row, Screen, SectionHeader, Skeleton } from '@/components/ui';
import { HowItWorks } from '@/components/account/shared';
import { useToast } from '@/components/toast';
import { formatPrice } from '@/lib/format';
import { formatAddress } from '@/lib/places';
import { colors, fonts, radius, shadow, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import type { LocationListItem, Membership, Plan } from '@/api/types';

const steps = [
  { icon: 'sparkles-outline' as const, title: 'Choose your package', text: 'Pick the plan that fits your routine and request it in seconds.' },
  { icon: 'storefront-outline' as const, title: 'Pay at any branch', text: 'Settle up at the front desk on your next visit. We activate it on the spot.' },
  {
    icon: 'calendar-outline' as const,
    title: 'Enjoy, automatically',
    text: 'Book in the app as usual. Included treatments and your member discount apply on their own.',
  },
];

export default function PackagesScreen({ navigation }: RootScreenProps<'Packages'>) {
  const plans = usePlans();
  const memberships = useMemberships();
  const branches = useLocations();
  const [joining, setJoining] = useState<Plan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([plans.refetch(), memberships.refetch()]);
    setRefreshing(false);
  };

  const mineFor = (plan: Plan) =>
    memberships.data?.find(m => m.plan.id === plan.id && (m.status === 'ACTIVE' || m.status === 'PENDING'));

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <View>
        <AppText variant="eyebrow">Members save every visit</AppText>
        <AppText variant="display" style={{ fontSize: 28, lineHeight: 34, marginTop: 4 }}>
          Your glow routine, one monthly price
        </AppText>
        <AppText variant="caption" style={{ marginTop: 6, fontSize: 14 }}>
          Treatments included every month, member pricing on everything else, and no contracts.
        </AppText>
      </View>

      {plans.isPending ? (
        [0, 1, 2].map(i => <Skeleton key={i} height={380} style={{ borderRadius: radius.lg }} />)
      ) : plans.isError ? (
        <ErrorState message={errorMessage(plans.error)} onRetry={() => plans.refetch()} />
      ) : !plans.data.length ? (
        <EmptyState icon="ribbon-outline" title="No packages right now" message="New monthly packages are coming soon. Check back shortly." />
      ) : (
        plans.data.map(p => (
          <PlanCard
            key={p.id}
            plan={p}
            mine={mineFor(p)}
            membershipsLoading={memberships.isPending}
            onChoose={() => setJoining(p)}
            onManage={() => navigation.navigate('Tabs', { screen: 'Profile' })}
          />
        ))
      )}

      <SectionHeader eyebrow="How it works" title="Three steps to member pricing" />
      <HowItWorks steps={steps} />

      <JoinSheet
        plan={joining}
        branches={branches.data ?? []}
        branchesLoading={branches.isPending}
        onClose={() => setJoining(null)}
        onViewAccount={() => {
          setJoining(null);
          navigation.navigate('Tabs', { screen: 'Profile' });
        }}
      />
    </Screen>
  );
}

function PlanCard({
  plan,
  mine,
  membershipsLoading,
  onChoose,
  onManage,
}: {
  plan: Plan;
  mine?: Membership;
  membershipsLoading: boolean;
  onChoose: () => void;
  onManage: () => void;
}) {
  const featured = plan.isFeatured;
  const value = plan.includes.reduce((n, i) => n + i.value, 0);
  const fg = featured ? colors.white : colors.plum900;
  const soft = featured ? 'rgba(255,255,255,0.72)' : colors.muted;
  const line = featured ? 'rgba(255,255,255,0.15)' : colors.line;

  const body = (
    <>
      {featured ? (
        <View style={styles.popular}>
          <Ionicons name="sparkles" size={12} color={colors.white} />
          <AppText style={styles.popularText}>Most popular</AppText>
        </View>
      ) : null}
      <AppText variant="title" style={{ color: fg }}>
        {plan.name}
      </AppText>
      {plan.tagline ? (
        <AppText style={{ color: featured ? colors.rose300 : colors.rose600, fontSize: 14, marginTop: 2 }}>{plan.tagline}</AppText>
      ) : null}
      <Row gap={6} style={{ alignItems: 'flex-end', marginTop: space.lg }}>
        <AppText variant="display" style={{ color: fg, fontSize: 36, lineHeight: 42 }}>
          {formatPrice(plan.price, plan.currency)}
        </AppText>
        <AppText style={{ color: soft, fontSize: 14, marginBottom: 6 }}>
          / {plan.durationDays === 30 ? 'month' : `${plan.durationDays} days`}
        </AppText>
      </Row>
      <AppText style={{ color: soft, fontSize: 14, lineHeight: 21, marginTop: space.sm }}>{plan.description}</AppText>

      <View style={[styles.section, { borderTopColor: line }]}>
        <AppText style={[styles.sectionLabel, { color: featured ? 'rgba(255,255,255,0.6)' : colors.plum900 }]}>
          Included every month
        </AppText>
        {plan.includes.map(i => (
          <Row key={i.serviceId} gap={10} style={{ marginTop: 10 }}>
            <View style={[styles.qty, { backgroundColor: featured ? 'rgba(255,255,255,0.15)' : colors.rose50 }]}>
              <AppText style={[styles.qtyText, { color: featured ? colors.white : colors.rose600 }]}>{i.quantity}×</AppText>
            </View>
            <AppText style={{ flex: 1, color: fg, fontSize: 14 }}>{i.serviceName}</AppText>
            <AppText style={{ color: featured ? 'rgba(255,255,255,0.5)' : colors.muted, fontSize: 12, textDecorationLine: 'line-through' }}>
              {formatPrice(i.value, plan.currency)}
            </AppText>
          </Row>
        ))}
        {plan.discountPercent ? (
          <Row gap={10} style={{ marginTop: 10 }}>
            <View style={[styles.qty, { backgroundColor: featured ? 'rgba(255,255,255,0.15)' : colors.rose50 }]}>
              <Ionicons name="pricetag-outline" size={12} color={featured ? colors.white : colors.rose600} />
            </View>
            <AppText style={{ flex: 1, color: fg, fontSize: 14, fontFamily: fonts.semibold }}>
              {plan.discountPercent}% off everything else
            </AppText>
          </Row>
        ) : null}
        {value > plan.price ? (
          <AppText style={{ marginTop: 12, fontSize: 12, color: featured ? colors.rose300 : colors.success }}>
            Included treatments worth {formatPrice(value, plan.currency)}
          </AppText>
        ) : null}
      </View>

      {plan.perks.length ? (
        <View style={[styles.section, { borderTopColor: line, gap: 8 }]}>
          {plan.perks.map(perk => (
            <Row key={perk} gap={10} style={{ alignItems: 'flex-start' }}>
              <Ionicons name="checkmark" size={16} color={featured ? colors.rose300 : colors.rose500} style={{ marginTop: 2 }} />
              <AppText style={{ flex: 1, color: featured ? 'rgba(255,255,255,0.85)' : colors.ink, fontSize: 14 }}>{perk}</AppText>
            </Row>
          ))}
        </View>
      ) : null}

      {mine ? (
        <Button
          title={mine.status === 'ACTIVE' ? 'Your current package' : 'Awaiting payment'}
          icon={mine.status === 'ACTIVE' ? 'checkmark-circle-outline' : 'hourglass-outline'}
          variant={featured ? 'onDark' : 'outline'}
          size="lg"
          onPress={onManage}
          accessibilityLabel={`${mine.status === 'ACTIVE' ? 'Your current package' : 'Awaiting payment'}. Open my account`}
          style={{ marginTop: space.xl }}
        />
      ) : (
        <Button
          title={`Choose ${plan.name}`}
          variant={featured ? 'light' : 'primary'}
          size="lg"
          disabled={membershipsLoading}
          onPress={onChoose}
          style={{ marginTop: space.xl }}
        />
      )}
      {mine?.status === 'PENDING' ? (
        <AppText style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: soft }}>
          Pay {formatPrice(mine.price, mine.currency)} at {mine.location?.name ?? 'any branch'} to activate
        </AppText>
      ) : null}
    </>
  );

  if (featured) {
    return (
      <View style={[styles.card, shadow]}>
        <LinearGradient colors={[colors.plum900, colors.plum700, colors.plum500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featured}>
          {body}
        </LinearGradient>
      </View>
    );
  }
  return <Card style={{ padding: space.xl }}>{body}</Card>;
}

function JoinSheet({
  plan,
  branches,
  branchesLoading,
  onClose,
  onViewAccount,
}: {
  plan: Plan | null;
  branches: LocationListItem[];
  branchesLoading: boolean;
  onClose: () => void;
  onViewAccount: () => void;
}) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingExists, setPendingExists] = useState(false);
  const [done, setDone] = useState<Membership | null>(null);

  const close = () => {
    onClose();
    setError(null);
    setPendingExists(false);
    setDone(null);
    setLocationId(null);
  };

  const chosen = locationId ?? (branches.length === 1 ? branches[0].id : null);

  const submit = async () => {
    if (!plan) return;
    if (!chosen) {
      setError('Please choose the branch where you will pay.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ message: string; membership: Membership }>('/memberships', { planId: plan.id, locationId: chosen });
      setDone(res.membership);
      qc.invalidateQueries({ queryKey: keys.memberships });
      toast(res.message);
    } catch (e) {
      if (e instanceof RequestError && e.code === 'MEMBERSHIP_PENDING') {
        setPendingExists(true);
        qc.invalidateQueries({ queryKey: keys.memberships });
      } else setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={!!plan} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]} accessibilityViewIsModal>
          <View style={styles.grabber} />
          {plan ? (
            done ? (
              <View style={{ gap: space.md }}>
                <View style={styles.doneIcon}>
                  <Ionicons name="checkmark" size={28} color={colors.success} />
                </View>
                <AppText variant="title" style={{ textAlign: 'center' }}>
                  Package requested
                </AppText>
                <AppText style={{ textAlign: 'center', color: colors.muted }}>
                  Pay {formatPrice(done.price, done.currency)} at {done.location?.name ?? 'any branch'} on your next visit. We'll activate{' '}
                  {plan.name} straight away and your benefits apply automatically when you book.
                </AppText>
                <Button title="View in my account" onPress={onViewAccount} size="lg" style={{ marginTop: space.sm }} />
                <Button title="Close" variant="ghost" onPress={close} />
              </View>
            ) : pendingExists ? (
              <View style={{ gap: space.md }}>
                <AppText variant="title">One package at a time</AppText>
                <View style={styles.warn}>
                  <Ionicons name="hourglass-outline" size={18} color={colors.warning} />
                  <AppText style={{ flex: 1, color: colors.warning, fontSize: 14 }}>
                    You already have a package waiting for payment at the salon. Pay for it to activate, or cancel it from your account to
                    choose a different one.
                  </AppText>
                </View>
                <Button title="Go to my account" onPress={onViewAccount} size="lg" />
                <Button title="Close" variant="ghost" onPress={close} />
              </View>
            ) : (
              <View style={{ gap: space.lg }}>
                <View>
                  <AppText variant="eyebrow">Join</AppText>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
                    <AppText variant="title">{plan.name}</AppText>
                    <AppText variant="price">
                      {formatPrice(plan.price, plan.currency)}
                      <AppText variant="caption"> / month</AppText>
                    </AppText>
                  </Row>
                </View>
                <View style={{ gap: space.sm }}>
                  <AppText variant="label">Where will you pay?</AppText>
                  {branchesLoading ? (
                    <Skeleton height={60} />
                  ) : (
                    branches.map(b => {
                      const selected = chosen === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => {
                            setLocationId(b.id);
                            setError(null);
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          accessibilityLabel={`${b.name}, ${formatAddress(b)}`}
                          style={[styles.branch, selected && styles.branchOn]}
                        >
                          <Ionicons
                            name={selected ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={selected ? colors.rose500 : colors.plum300}
                          />
                          <View style={{ flex: 1 }}>
                            <AppText variant="label">{b.name}</AppText>
                            <AppText variant="caption" numberOfLines={1}>
                              {formatAddress(b)}
                            </AppText>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                  <AppText variant="caption">Nothing to pay now. We activate your package when you pay at the front desk.</AppText>
                </View>
                {error ? (
                  <AppText variant="caption" style={{ color: colors.danger }} accessibilityLiveRegion="polite">
                    {error}
                  </AppText>
                ) : null}
                <Button title="Request package" size="lg" loading={submitting} onPress={submit} />
                <Button title="Cancel" variant="ghost" onPress={close} />
              </View>
            )
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg },
  featured: { borderRadius: radius.lg, padding: space.xl, paddingTop: space.xl + 8 },
  popular: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.rose500,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
  popularText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  section: { marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1 },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  qty: { minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: fonts.semibold, fontSize: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(42,22,38,0.45)' },
  sheet: {
    backgroundColor: colors.ivory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    maxHeight: '90%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.linen, marginBottom: space.lg },
  branch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  branchOn: { borderColor: colors.rose500, backgroundColor: colors.rose50 },
  warn: { flexDirection: 'row', gap: 10, padding: space.lg, borderRadius: radius.md, backgroundColor: '#f6ecdc' },
  doneIcon: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e3f1ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
