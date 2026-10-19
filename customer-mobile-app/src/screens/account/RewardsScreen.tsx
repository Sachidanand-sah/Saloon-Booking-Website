import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '@/api/client';
import { useLoyalty } from '@/api/queries';
import { AppText, Badge, Card, EmptyState, ErrorState, Row, Screen, SectionHeader, Skeleton, type IconName } from '@/components/ui';
import { formatDay, ProgressBar } from '@/components/account/shared';
import { formatPrice } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import type { LoyaltyReason, LoyaltySummary } from '@/api/types';

const reasonLabel: Record<LoyaltyReason, string> = {
  SIGNUP_BONUS: 'Welcome bonus',
  EARNED: 'Earned',
  REDEEMED: 'Redeemed',
  REFUNDED: 'Refunded',
  ADJUSTMENT: 'Adjustment',
};

const tierColors: Record<string, [string, string]> = {
  SILVER: ['#eceaea', '#d9d5d6'],
  GOLD: ['#f6e7c8', '#e5c98f'],
  PLATINUM: [colors.plum100, colors.plum200],
};

export default function RewardsScreen({ navigation }: RootScreenProps<'Rewards'>) {
  const loyalty = useLoyalty();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await loyalty.refetch();
    setRefreshing(false);
  };

  if (loyalty.isPending) {
    return (
      <Screen edges={[]}>
        <Skeleton height={210} style={{ borderRadius: radius.lg }} />
        <Skeleton height={160} />
        <Skeleton height={140} />
      </Screen>
    );
  }
  if (loyalty.isError) {
    return (
      <Screen edges={[]}>
        <ErrorState message={errorMessage(loyalty.error)} onRetry={() => loyalty.refetch()} />
      </Screen>
    );
  }

  const d = loyalty.data;
  const p = d.programme;

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <Hero data={d} />

      <SectionHeader eyebrow="How it works" title="Earn as you glow" />
      <Card style={{ gap: space.lg }}>
        <Rule icon="sparkles-outline" title={`Earn ${p.pointsPer100} points per Rs. 100`} text="On every completed treatment, boosted by your tier." />
        <Rule
          icon="wallet-outline"
          title={`1 point = ${formatPrice(p.pointValue)}`}
          text={`Use points when you book: up to ${p.maxRedeemPercent}% of any appointment.`}
        />
        <Rule icon="gift-outline" title={`${p.signupBonus} welcome points`} text="Added the moment you join Lalima." />
        <Rule icon="trending-up-outline" title="Climb the tiers" text="Lifetime points unlock bigger multipliers and perks." />
      </Card>

      <SectionHeader eyebrow="Tiers" title="Silver, Gold & Platinum" />
      {p.tiers.map(t => {
        const current = t.key === d.tier.key;
        const [from, to] = tierColors[t.key] ?? [colors.sand, colors.linen];
        return (
          <Card
            key={t.key}
            style={[{ padding: 0, overflow: 'hidden' }, current && { borderColor: colors.rose500, borderWidth: 2 }]}
          >
            <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tierHead}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{t.name}</AppText>
                <AppText variant="caption" style={{ color: colors.plum800 }}>
                  {t.minPoints ? `${t.minPoints.toLocaleString('en-IN')}+ lifetime points` : 'Where everyone starts'}
                </AppText>
              </View>
              {current ? <Badge label="Your tier" tone="rose" icon="checkmark-circle" /> : null}
              <View style={styles.multiplier}>
                <AppText style={styles.multiplierText}>{t.multiplier}×</AppText>
              </View>
            </LinearGradient>
            <View style={{ padding: space.lg, gap: 8 }}>
              {t.perks.map(perk => (
                <Row key={perk} gap={10} style={{ alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark" size={16} color={colors.rose500} style={{ marginTop: 2 }} />
                  <AppText style={{ flex: 1, fontSize: 14 }}>{perk}</AppText>
                </Row>
              ))}
            </View>
          </Card>
        );
      })}

      <SectionHeader eyebrow="Activity" title="Points history" />
      {d.history.length ? (
        <Card style={{ padding: 0 }}>
          {d.history.map((h, i) => {
            const plus = h.points >= 0;
            return (
              <View
                key={h.id}
                style={[styles.historyRow, i < d.history.length - 1 && styles.divider]}
                accessible
                accessibilityLabel={`${reasonLabel[h.reason]}, ${plus ? 'plus' : 'minus'} ${Math.abs(h.points)} points, ${formatDay(h.createdAt)}`}
              >
                <View style={[styles.historyIcon, { backgroundColor: plus ? '#e3f1ea' : colors.rose50 }]}>
                  <Ionicons name={plus ? 'add' : 'remove'} size={16} color={plus ? colors.success : colors.rose600} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" numberOfLines={1}>
                    {h.booking?.serviceName ?? reasonLabel[h.reason]}
                  </AppText>
                  <AppText variant="caption" numberOfLines={2} style={{ fontSize: 12 }}>
                    {[h.booking ? reasonLabel[h.reason] : null, h.note, formatDay(h.createdAt)].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
                <AppText style={[styles.points, { color: plus ? colors.success : colors.rose600 }]}>
                  {plus ? '+' : '−'}
                  {Math.abs(h.points).toLocaleString('en-IN')}
                </AppText>
              </View>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          icon="sparkles-outline"
          title="No points yet"
          message="Book your first treatment to start earning."
          action="Book now"
          onAction={() => navigation.navigate('Tabs', { screen: 'Book' })}
        />
      )}
    </Screen>
  );
}

function Hero({ data: d }: { data: LoyaltySummary }) {
  const next = d.nextTier;
  return (
    <LinearGradient colors={[colors.plum900, colors.plum700, colors.plum500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Row style={{ justifyContent: 'space-between' }}>
        <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
          Your balance
        </AppText>
        <View style={styles.tierPill}>
          <Ionicons name="diamond-outline" size={12} color={colors.plum900} />
          <AppText style={styles.tierPillText}>{d.tier.name} member</AppText>
        </View>
      </Row>
      <Row gap={6} style={{ alignItems: 'flex-end', marginTop: 10 }}>
        <AppText variant="display" style={{ color: colors.white, fontSize: 44, lineHeight: 50 }}>
          {d.balance.toLocaleString('en-IN')}
        </AppText>
        <AppText style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>points</AppText>
      </Row>
      <AppText style={{ color: colors.rose300 }}>Worth {formatPrice(d.balance * d.programme.pointValue)}</AppText>
      <View style={{ marginTop: 18, gap: 8 }}>
        {next ? (
          <>
            <ProgressBar
              value={(d.lifetime - d.tier.minPoints) / Math.max(1, next.minPoints - d.tier.minPoints)}
              color={colors.rose300}
              track="rgba(255,255,255,0.18)"
              height={8}
              label={`Progress to ${next.name}`}
            />
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText style={styles.heroSmall}>{d.lifetime.toLocaleString('en-IN')} lifetime pts</AppText>
              <AppText style={styles.heroSmall}>
                {d.pointsToNext.toLocaleString('en-IN')} to {next.name}
              </AppText>
            </Row>
          </>
        ) : (
          <AppText style={styles.heroSmall}>You've reached Platinum, our highest tier.</AppText>
        )}
      </View>
    </LinearGradient>
  );
}

function Rule({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <View style={styles.ruleIcon}>
        <Ionicons name={icon} size={18} color={colors.rose600} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption">{text}</AppText>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: space.xl },
  heroSmall: { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.rose300,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tierPillText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.plum900 },
  ruleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.rose50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  multiplier: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiplierText: { fontFamily: fonts.display, fontSize: 15, color: colors.plum900 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  historyIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  points: { fontFamily: fonts.semibold, fontSize: 15 },
});
