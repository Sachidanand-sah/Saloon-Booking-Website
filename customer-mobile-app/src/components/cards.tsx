import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, Card, Photo, Row } from './ui';
import { colors, radius, space } from '@/theme';
import { formatDuration, formatPrice } from '@/lib/format';
import type { Service } from '@/api/types';

/** Wide service card used in lists. */
export function ServiceCard({ service, onPress }: { service: Service; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={styles.row}>
      <Photo uri={service.imageUrl} category={service.category?.slug} style={styles.thumb} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" numberOfLines={1}>
          {service.name}
        </AppText>
        <AppText variant="caption" numberOfLines={2}>
          {service.description}
        </AppText>
        <Row style={{ marginTop: 6, justifyContent: 'space-between' }}>
          <Row gap={4}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <AppText variant="caption">{formatDuration(service.durationMins)}</AppText>
          </Row>
          <AppText variant="price">{formatPrice(service.price, service.currency)}</AppText>
        </Row>
      </View>
    </Card>
  );
}

/** Tall card for horizontal carousels. */
export function ServiceTile({ service, onPress, width = 220 }: { service: Service; onPress: () => void; width?: number }) {
  return (
    <Card onPress={onPress} style={{ width, padding: 0, overflow: 'hidden' }}>
      <Photo uri={service.imageUrl} category={service.category?.slug} style={{ height: 140 }}>
        {service.category ? (
          <View style={styles.tag}>
            <Badge label={service.category.name} tone="neutral" />
          </View>
        ) : null}
      </Photo>
      <View style={{ padding: space.md, gap: 4 }}>
        <AppText variant="heading" numberOfLines={1}>
          {service.name}
        </AppText>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText variant="caption">{formatDuration(service.durationMins)}</AppText>
          <AppText variant="price" style={{ fontSize: 16 }}>
            {formatPrice(service.price, service.currency)}
          </AppText>
        </Row>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, padding: space.md, alignItems: 'center' },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  tag: { position: 'absolute', top: 10, left: 10 },
});
