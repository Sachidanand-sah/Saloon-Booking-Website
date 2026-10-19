import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '@/api/client';
import { useLocations, useSalon } from '@/api/queries';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, Photo, Row, Screen, Skeleton } from '@/components/ui';
import { callPhone, formatAddress, openDirections, todayHours } from '@/lib/places';
import { colors, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

export default function LocationsScreen({ navigation }: RootScreenProps<'Locations'>) {
  const salon = useSalon();
  const branches = useLocations();
  const [refreshing, setRefreshing] = useState(false);
  const tz = salon.data?.timezone ?? 'Asia/Kathmandu';

  const onRefresh = async () => {
    setRefreshing(true);
    await branches.refetch();
    setRefreshing(false);
  };

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <View>
        <AppText variant="eyebrow">Visit us</AppText>
        <AppText variant="display" style={{ fontSize: 28, lineHeight: 34, marginTop: 4 }}>
          {branches.data ? `${branches.data.length} studios across the valley` : 'Our studios'}
        </AppText>
        <AppText variant="caption" style={{ marginTop: 6, fontSize: 14 }}>
          The same Lalima care at every branch. Your package and points work at all of them.
        </AppText>
      </View>

      {branches.isPending ? (
        [0, 1, 2].map(i => <Skeleton key={i} height={320} style={{ borderRadius: radius.lg }} />)
      ) : branches.isError ? (
        <ErrorState message={errorMessage(branches.error)} onRetry={() => branches.refetch()} />
      ) : !branches.data.length ? (
        <EmptyState icon="location-outline" title="No branches listed" message="Please check back soon." />
      ) : (
        branches.data.map(b => {
          const today = todayHours(b.openingHours, tz);
          return (
            <Card key={b.id} style={{ padding: 0, overflow: 'hidden' }}>
              <Photo uri={b.imageUrl} icon="storefront-outline" style={{ height: 170 }} />
              <View style={{ padding: space.lg, gap: space.sm }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <AppText variant="title" style={{ flex: 1 }}>
                    {b.name}
                  </AppText>
                  <Badge label={today.open ? 'Open today' : 'Closed today'} tone={today.open ? 'success' : 'neutral'} />
                </Row>
                <Row gap={8} style={{ alignItems: 'flex-start' }}>
                  <Ionicons name="location-outline" size={16} color={colors.rose500} style={{ marginTop: 2 }} />
                  <AppText style={styles.meta}>{formatAddress(b)}</AppText>
                </Row>
                <Row gap={8}>
                  <Ionicons name="time-outline" size={16} color={colors.rose500} />
                  <AppText style={styles.meta}>{today.open ? today.label.replace('Open today ', '') : today.label}</AppText>
                </Row>
                {b.phone ? (
                  <Row gap={8}>
                    <Ionicons name="call-outline" size={16} color={colors.rose500} />
                    <AppText
                      style={[styles.meta, { color: colors.plum800, textDecorationLine: 'underline' }]}
                      onPress={() => callPhone(b.phone!)}
                      accessibilityRole="link"
                      accessibilityLabel={`Call ${b.name}, ${b.phone}`}
                    >
                      {b.phone}
                    </AppText>
                  </Row>
                ) : null}
                <Row gap={space.sm} style={{ marginTop: space.sm }}>
                  <Button
                    title="Book here"
                    size="sm"
                    icon="calendar-outline"
                    onPress={() => navigation.navigate('Tabs', { screen: 'Book' })}
                    accessibilityLabel={`Book at ${b.name}`}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Directions"
                    size="sm"
                    variant="outline"
                    icon="navigate-outline"
                    onPress={() => openDirections(b)}
                    accessibilityLabel={`Directions to ${b.name}`}
                    style={{ flex: 1 }}
                  />
                </Row>
                <Button
                  title="View studio"
                  size="sm"
                  variant="ghost"
                  onPress={() => navigation.navigate('LocationDetail', { slug: b.slug })}
                  accessibilityLabel={`View ${b.name} details`}
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flex: 1, fontSize: 14, color: colors.ink },
});
