import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCategories, useServices } from '@/api/queries';
import { errorMessage } from '@/api/client';
import { AppText, Chip, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { ServiceCard } from '@/components/cards';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

export default function ServicesScreen({ navigation, route }: RootScreenProps<'Services'>) {
  const services = useServices();
  const categories = useCategories();
  const [cat, setCat] = useState(route.params?.category ?? 'all');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (services.data ?? []).filter(
      s =>
        s.isActive &&
        (cat === 'all' || s.category?.slug === cat) &&
        (!term || s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term) || s.category?.name.toLowerCase().includes(term)),
    );
  }, [services.data, cat, search]);

  return (
    <Screen edges={[]} onRefresh={() => services.refetch()} refreshing={services.isRefetching}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search treatments"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search treatments"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {search ? (
          <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => setSearch('')} accessibilityLabel="Clear search" accessibilityRole="button" />
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg }} style={styles.bleed}>
        <Chip label="All" selected={cat === 'all'} onPress={() => setCat('all')} />
        {(categories.data ?? []).map(c => (
          <Chip key={c.id} label={c.name} selected={cat === c.slug} onPress={() => setCat(c.slug)} />
        ))}
      </ScrollView>

      {services.isPending ? (
        <View style={{ gap: space.md }}>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} height={110} />
          ))}
        </View>
      ) : services.isError ? (
        <ErrorState message={errorMessage(services.error)} onRetry={() => services.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No treatments found"
          message={search ? `Nothing matches "${search.trim()}". Try another word.` : 'Nothing in this category yet.'}
          action="Show all"
          onAction={() => {
            setSearch('');
            setCat('all');
          }}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <AppText variant="caption">
            {list.length} {list.length === 1 ? 'treatment' : 'treatments'}
          </AppText>
          {list.map(s => (
            <ServiceCard key={s.id} service={s} onPress={() => navigation.navigate('ServiceDetail', { slug: s.slug })} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg, flexGrow: 0 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.body, fontSize: 15, color: colors.ink },
});
