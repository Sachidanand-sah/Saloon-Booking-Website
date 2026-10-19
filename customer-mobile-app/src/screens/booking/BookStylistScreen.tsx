import { useEffect, useLayoutEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocations, useService, useStaff } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { AppText, Avatar, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { ANY_STAFF, DraftSummary, StepHeader } from '@/components/booking/shared';
import { formatDuration, formatPrice } from '@/lib/format';
import { colors, radius, shadow, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

/** Step 3: a specific stylist, or "any available" for the most choice of times. */
export default function BookStylistScreen({ navigation, route }: RootScreenProps<'BookStylist'>) {
  useLayoutEffect(() => navigation.setOptions({ title: '' }), [navigation]);
  const { locationId, serviceId = '' } = route.params ?? {};
  const staff = useStaff();
  const service = useService(serviceId);
  const locations = useLocations();
  const branch = locations.data?.find(l => l.id === locationId);

  const stylists = useMemo(
    () =>
      (staff.data ?? []).filter(
        m => m.services.some(s => s.id === serviceId) && (!locationId || m.locationId === locationId),
      ),
    [staff.data, serviceId, locationId],
  );

  // Nothing to choose when only one person performs this treatment here.
  const only = staff.isSuccess && stylists.length === 1 ? stylists[0] : undefined;
  useEffect(() => {
    if (only) navigation.replace('BookTime', { ...route.params, staffId: only.id });
  }, [only, navigation, route.params]);

  const pick = (staffId: string) => navigation.navigate('BookTime', { ...route.params, staffId });

  return (
    <Screen edges={[]} onRefresh={() => staff.refetch()} refreshing={staff.isRefetching}>
      <StepHeader step={2} title="Choose your specialist" subtitle="Pick someone you love, or let us match you." />
      <DraftSummary
        items={[
          { icon: 'location-outline', label: branch?.name ?? '' },
          {
            icon: 'sparkles-outline',
            label: service.data
              ? `${service.data.name} · ${formatDuration(service.data.durationMins)} · ${formatPrice(service.data.price, service.data.currency)}`
              : '',
          },
        ]}
      />

      {staff.isPending || only ? (
        <View style={{ gap: space.md }}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} height={84} />
          ))}
        </View>
      ) : staff.isError ? (
        <ErrorState message={errorMessage(staff.error)} onRetry={() => staff.refetch()} />
      ) : stylists.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No specialists available"
          message="Nobody at this branch performs this treatment right now. Try another branch."
          action="Go back"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <Option
            title="Any available"
            subtitle="Most choice of times"
            onPress={() => pick(ANY_STAFF)}
            highlight
            leading={
              <View style={styles.anyIcon}>
                <Ionicons name="people" size={24} color={colors.rose500} />
              </View>
            }
          />
          {stylists.map(m => (
            <Option
              key={m.id}
              title={m.name}
              subtitle={m.title}
              detail={m.bio ?? undefined}
              onPress={() => pick(m.id)}
              leading={<Avatar name={m.name} uri={m.avatarUrl} size={56} />}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Option({
  title,
  subtitle,
  detail,
  leading,
  highlight,
  onPress,
}: {
  title: string;
  subtitle: string;
  detail?: string;
  leading: React.ReactNode;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [styles.option, !highlight && shadow, highlight && styles.optionAny, pressed && { opacity: 0.9 }]}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" style={{ fontSize: 17 }}>
          {title}
        </AppText>
        <AppText variant="caption" style={{ color: highlight ? colors.rose600 : colors.muted }}>
          {subtitle}
        </AppText>
        {detail ? (
          <AppText variant="caption" numberOfLines={2} style={{ fontSize: 12, marginTop: 2 }}>
            {detail}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    minHeight: 84,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionAny: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.rose300, backgroundColor: colors.rose50 },
  anyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
