import { useMemo, useState, useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useCategories, useLocations, useServices } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { Chip, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { ServiceCard } from '@/components/cards';
import { DraftSummary, StepHeader } from '@/components/booking/shared';
import { space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

/** Step 2: treatments offered at the chosen branch. */
export default function BookServiceScreen({ navigation, route }: RootScreenProps<'BookService'>) {
  useLayoutEffect(() => navigation.setOptions({ title: '' }), [navigation]);
  const { locationId } = route.params ?? {};
  const services = useServices();
  const categories = useCategories();
  const locations = useLocations();
  const [cat, setCat] = useState('all');

  const branch = locations.data?.find(l => l.id === locationId);
  const available = useMemo(
    () => (services.data ?? []).filter(s => s.isActive && (!branch || branch.serviceIds.includes(s.id))),
    [services.data, branch],
  );
  const usedCats = (categories.data ?? []).filter(c => available.some(s => s.category?.slug === c.slug));
  const list = cat === 'all' ? available : available.filter(s => s.category?.slug === cat);

  const loading = services.isPending || locations.isPending;
  const error = services.error ?? locations.error;

  return (
    <Screen
      edges={[]}
      onRefresh={() => {
        services.refetch();
        locations.refetch();
      }}
      refreshing={services.isRefetching}
    >
      <StepHeader step={1} title="Choose a treatment" subtitle={branch ? `Available at ${branch.name}` : undefined} />
      {branch ? <DraftSummary items={[{ icon: 'location-outline', label: branch.name }]} /> : null}

      {usedCats.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg }}
          style={styles.bleed}
        >
          {[{ slug: 'all', name: 'All' }, ...usedCats].map(c => (
            <Chip key={c.slug} label={c.name} selected={cat === c.slug} onPress={() => setCat(c.slug)} />
          ))}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={{ gap: space.md }}>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} height={110} />
          ))}
        </View>
      ) : error ? (
        <ErrorState
          message={errorMessage(error)}
          onRetry={() => {
            services.refetch();
            locations.refetch();
          }}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="Nothing here yet"
          message="This branch doesn't offer treatments in this category. Try another category or branch."
          action="Choose another branch"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {list.map(s => (
            <ServiceCard
              key={s.id}
              service={s}
              onPress={() => navigation.navigate('BookStylist', { ...route.params, serviceId: s.id })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ bleed: { marginHorizontal: -space.lg, flexGrow: 0 } });
