import { useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '@/api/client';
import { useLocation, useSalon } from '@/api/queries';
import { AppText, Avatar, Button, Card, ErrorState, Photo, Row, Screen, SectionHeader, Skeleton } from '@/components/ui';
import { ServiceCard } from '@/components/cards';
import { DAY_NAMES, isoWeekday, minutesToLabel, todayIn } from '@/lib/format';
import { callPhone, formatAddress, openDirections, todayHours } from '@/lib/places';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

export default function LocationDetailScreen({ navigation, route }: RootScreenProps<'LocationDetail'>) {
  const salon = useSalon();
  const loc = useLocation(route.params.slug);
  const [refreshing, setRefreshing] = useState(false);
  const tz = salon.data?.timezone ?? 'Asia/Kathmandu';
  const name = loc.data?.name;

  useLayoutEffect(() => {
    navigation.setOptions({ title: name ?? '' });
  }, [navigation, name]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loc.refetch();
    setRefreshing(false);
  };

  if (loc.isPending) {
    return (
      <Screen edges={[]}>
        <Skeleton height={240} style={{ borderRadius: radius.lg }} />
        <Skeleton height={60} />
        <Skeleton height={220} />
      </Screen>
    );
  }
  if (loc.isError) {
    return (
      <Screen edges={[]}>
        <ErrorState message={errorMessage(loc.error)} onRetry={() => loc.refetch()} />
      </Screen>
    );
  }

  const l = loc.data;
  const today = todayHours(l.openingHours, tz);
  const todayIdx = isoWeekday(todayIn(tz));
  const services = l.services.filter(s => s.isActive !== false);

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <Photo uri={l.imageUrl} icon="storefront-outline" style={styles.hero}>
        <LinearGradient colors={['transparent', 'rgba(42,22,38,0.85)']} style={styles.heroOverlay}>
          <AppText variant="eyebrow" style={{ color: colors.rose300 }}>
            {l.city}
          </AppText>
          <AppText variant="display" style={{ color: colors.white, fontSize: 28, lineHeight: 34 }}>
            {l.name}
          </AppText>
          <Row gap={6} style={{ marginTop: 4 }}>
            <View style={[styles.dot, { backgroundColor: today.open ? '#7fd1a8' : colors.rose300 }]} />
            <AppText style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{today.label}</AppText>
          </Row>
        </LinearGradient>
      </Photo>

      {l.description ? <AppText style={{ fontSize: 15, lineHeight: 23, color: colors.ink }}>{l.description}</AppText> : null}

      <Card style={{ gap: space.md }}>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Ionicons name="location-outline" size={18} color={colors.rose500} style={{ marginTop: 2 }} />
          <AppText style={{ flex: 1, fontSize: 15 }}>{formatAddress(l)}</AppText>
        </Row>
        {l.phone ? (
          <Row gap={10}>
            <Ionicons name="call-outline" size={18} color={colors.rose500} />
            <AppText style={{ flex: 1, fontSize: 15 }}>{l.phone}</AppText>
          </Row>
        ) : null}
        <Row gap={space.sm}>
          <Button title="Directions" icon="navigate-outline" size="sm" onPress={() => openDirections(l)} style={{ flex: 1 }} />
          {l.phone ? (
            <Button
              title="Call"
              icon="call-outline"
              size="sm"
              variant="outline"
              onPress={() => callPhone(l.phone!)}
              accessibilityLabel={`Call ${l.name}`}
              style={{ flex: 1 }}
            />
          ) : null}
        </Row>
      </Card>

      <SectionHeader eyebrow="Opening hours" title="When to find us" />
      <Card style={{ paddingVertical: space.sm }}>
        {[1, 2, 3, 4, 5, 6, 7].map(day => {
          const h = l.openingHours.find(x => x.dayOfWeek === day);
          const isToday = day === todayIdx;
          const closed = !h || h.open === null || h.close === null;
          return (
            <View
              key={day}
              style={[styles.hoursRow, isToday && styles.hoursToday]}
              accessible
              accessibilityLabel={`${DAY_NAMES[day - 1]}${isToday ? ', today' : ''}: ${closed ? 'closed' : `${minutesToLabel(h.open!)} to ${minutesToLabel(h.close!)}`}`}
            >
              <AppText style={[styles.hoursDay, isToday && { fontFamily: fonts.semibold, color: colors.plum900 }]}>
                {DAY_NAMES[day - 1]}
                {isToday ? ' · Today' : ''}
              </AppText>
              <AppText style={[styles.hoursTime, closed && { color: colors.muted }, isToday && { fontFamily: fonts.semibold }]}>
                {closed ? 'Closed' : `${minutesToLabel(h.open!)} – ${minutesToLabel(h.close!)}`}
              </AppText>
            </View>
          );
        })}
      </Card>

      {l.staff.length ? (
        <>
          <SectionHeader eyebrow="The team" title={`Meet ${l.name}`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.teamRow}>
            {l.staff.map(s => (
              <View key={s.id} style={styles.member} accessible accessibilityLabel={`${s.name}, ${s.title}`}>
                <Avatar name={s.name} uri={s.avatarUrl} size={68} />
                <AppText variant="label" numberOfLines={1} style={{ marginTop: 8, textAlign: 'center' }}>
                  {s.name.split(' ')[0]}
                </AppText>
                <AppText variant="caption" numberOfLines={2} style={{ fontSize: 11, textAlign: 'center' }}>
                  {s.title}
                </AppText>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {services.length ? (
        <>
          <SectionHeader eyebrow="Treatments" title="Available here" />
          {services.map(s => (
            <ServiceCard key={s.id} service={s} onPress={() => navigation.navigate('ServiceDetail', { slug: s.slug })} />
          ))}
        </>
      ) : null}

      <Button
        title={`Book at ${l.name}`}
        size="lg"
        icon="calendar-outline"
        onPress={() => navigation.navigate('Tabs', { screen: 'Book' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, borderRadius: radius.lg },
  heroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: space.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, paddingHorizontal: space.sm, borderRadius: radius.sm },
  hoursToday: { backgroundColor: colors.rose50 },
  hoursDay: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  hoursTime: { fontFamily: fonts.medium, fontSize: 14, color: colors.plum900 },
  bleed: { marginHorizontal: -space.lg },
  teamRow: { gap: space.md, paddingHorizontal: space.lg },
  member: { width: 88, alignItems: 'center' },
});
