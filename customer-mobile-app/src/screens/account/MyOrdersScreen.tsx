import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { keys, useReservations } from '@/api/queries';
import { AppText, Button, Card, EmptyState, ErrorState, Photo, Row, Screen, Skeleton } from '@/components/ui';
import { confirmAction, formatDay, ReservationBadge } from '@/components/account/shared';
import { useToast } from '@/components/toast';
import { formatPrice } from '@/lib/format';
import { callPhone, formatAddress, openDirections } from '@/lib/places';
import { colors, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import type { Reservation } from '@/api/types';

export default function MyOrdersScreen({ navigation }: RootScreenProps<'MyOrders'>) {
  const qc = useQueryClient();
  const toast = useToast();
  const orders = useReservations();
  const [refreshing, setRefreshing] = useState(false);

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/reservations/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.reservations });
      toast('Reservation cancelled');
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  const onCancel = async (r: Reservation) => {
    const ok = await confirmAction({
      title: 'Cancel this reservation?',
      message: `We'll put the products back on the shelf at ${r.location.name}.`,
      confirmText: 'Cancel reservation',
      cancelText: 'Keep it',
      destructive: true,
    });
    if (ok) cancel.mutate(r.id);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await orders.refetch();
    setRefreshing(false);
  };

  // Ready-to-collect orders first, then newest.
  const list = [...(orders.data ?? [])].sort((a, b) => Number(b.status === 'READY') - Number(a.status === 'READY'));

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      {orders.isPending ? (
        [0, 1].map(i => <Skeleton key={i} height={200} style={{ borderRadius: radius.lg }} />)
      ) : orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : !list.length ? (
        <EmptyState
          icon="bag-handle-outline"
          title="No orders yet"
          message="Reserve products our professionals love, then pay and collect at your branch."
          action="Visit the shop"
          onAction={() => navigation.navigate('Tabs', { screen: 'Shop' })}
        />
      ) : (
        list.map(r => (
          <OrderCard key={r.id} order={r} cancelling={cancel.isPending && cancel.variables === r.id} onCancel={() => onCancel(r)} />
        ))
      )}
    </Screen>
  );
}

function OrderCard({ order: r, cancelling, onCancel }: { order: Reservation; cancelling: boolean; onCancel: () => void }) {
  const ready = r.status === 'READY';
  const count = r.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Card style={[{ padding: 0, overflow: 'hidden' }, ready && { borderColor: colors.success, borderWidth: 1.5 }]}>
      {ready ? (
        <Row gap={10} style={styles.ready}>
          <Ionicons name="bag-check" size={20} color={colors.white} />
          <View style={{ flex: 1 }}>
            <AppText variant="label" style={{ color: colors.white }}>
              Ready to collect at {r.location.name}
            </AppText>
            <AppText style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Pay at the front desk when you pick up.</AppText>
          </View>
        </Row>
      ) : null}
      <View style={{ padding: space.lg, gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">
              {count} item{count === 1 ? '' : 's'} · {formatDay(r.createdAt)}
            </AppText>
            <AppText variant="caption" style={{ fontSize: 12 }}>
              Order #{r.id.slice(-6).toUpperCase()}
            </AppText>
          </View>
          <ReservationBadge status={r.status} />
        </Row>

        {r.items.map(i => (
          <Row key={i.productId} gap={space.md}>
            <Photo uri={i.imageUrl} icon="bag-handle-outline" style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
                {i.brand}
              </AppText>
              <AppText variant="label" numberOfLines={2}>
                {i.name}
              </AppText>
              <AppText variant="caption" style={{ fontSize: 12 }}>
                {i.quantity} × {formatPrice(i.price, r.currency)}
              </AppText>
            </View>
            <AppText variant="label">{formatPrice(i.price * i.quantity, r.currency)}</AppText>
          </Row>
        ))}

        <View style={styles.totalRow}>
          <AppText variant="label">Total to pay at the salon</AppText>
          <AppText variant="price">{formatPrice(r.total, r.currency)}</AppText>
        </View>

        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Ionicons name="storefront-outline" size={16} color={colors.rose500} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">{r.location.name}</AppText>
            <AppText variant="caption">{formatAddress(r.location)}</AppText>
          </View>
        </Row>
        {r.note ? (
          <AppText variant="caption" style={{ fontStyle: 'italic' }}>
            “{r.note}”
          </AppText>
        ) : null}

        {r.canCancel ? (
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {ready ? (
              <Button title="Directions" icon="navigate-outline" size="sm" variant="outline" onPress={() => openDirections(r.location)} />
            ) : null}
            {ready && r.location.phone ? (
              <Button title="Call" icon="call-outline" size="sm" variant="outline" onPress={() => callPhone(r.location.phone!)} />
            ) : null}
            <Button title="Cancel" size="sm" variant="ghost" loading={cancelling} onPress={onCancel} accessibilityLabel="Cancel reservation" />
          </Row>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  ready: { backgroundColor: colors.success, paddingHorizontal: space.lg, paddingVertical: space.md },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
