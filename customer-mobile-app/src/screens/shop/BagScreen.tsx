import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { keys, useLocations } from '@/api/queries';
import { AppText, Button, Card, Chip, EmptyState, Input, Photo, Row, Screen, Skeleton } from '@/components/ui';
import { confirmAction } from '@/components/account/shared';
import { Stepper } from '@/components/shop/Stepper';
import { useToast } from '@/components/toast';
import { MAX_QTY, useBag } from '@/lib/bag';
import { formatPrice } from '@/lib/format';
import { formatAddress } from '@/lib/places';
import { colors, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import type { Reservation } from '@/api/types';

export default function BagScreen({ navigation }: RootScreenProps<'Bag'>) {
  const bag = useBag();
  const branches = useLocations();
  const qc = useQueryClient();
  const toast = useToast();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Reservation | null>(null);

  const branchList = branches.data ?? [];
  const chosen = locationId ?? (branchList.length === 1 ? branchList[0].id : null);
  const branch = branchList.find(b => b.id === chosen);

  const reserve = async () => {
    if (!chosen) {
      setError('Please choose the branch you will collect from.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ message: string; reservation: Reservation }>('/reservations', {
        locationId: chosen,
        note: note.trim() || undefined,
        items: bag.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });
      bag.clear();
      setNote('');
      setDone(res.reservation);
      qc.invalidateQueries({ queryKey: keys.reservations });
      toast(res.message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    const ok = await confirmAction({
      title: 'Empty your bag?',
      message: 'All products will be removed.',
      confirmText: 'Empty bag',
      cancelText: 'Keep',
      destructive: true,
    });
    if (ok) bag.clear();
  };

  if (done) {
    return (
      <Screen edges={[]}>
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.sm }}>
          <View style={styles.doneIcon}>
            <Ionicons name="bag-check-outline" size={30} color={colors.success} />
          </View>
          <AppText variant="title" style={{ textAlign: 'center', marginTop: space.sm }}>
            Reserved for you
          </AppText>
          <AppText style={{ textAlign: 'center', color: colors.muted, maxWidth: 300 }}>
            We'll have your products ready at {done.location.name}. Pay {formatPrice(done.total, done.currency)} when you collect.
          </AppText>
          <Row gap={6} style={{ marginTop: space.sm }}>
            <Ionicons name="notifications-outline" size={14} color={colors.rose600} />
            <AppText variant="caption" style={{ color: colors.rose600 }}>
              Your order shows "Ready to collect" once it's packed.
            </AppText>
          </Row>
        </Card>
        <Button title="View my orders" size="lg" onPress={() => navigation.replace('MyOrders')} />
        <Button title="Keep shopping" variant="ghost" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  if (!bag.items.length) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon="bag-handle-outline"
          title="Your bag is empty"
          message="Browse products our professionals use and love, then reserve them for pickup."
          action="Browse the shop"
          onAction={() => navigation.navigate('Tabs', { screen: 'Shop' })}
        />
        <Button title="My orders" variant="ghost" icon="receipt-outline" onPress={() => navigation.navigate('MyOrders')} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={[]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText variant="label">
            {bag.count} item{bag.count === 1 ? '' : 's'}
          </AppText>
          <Pressable onPress={clear} hitSlop={12} accessibilityRole="button" accessibilityLabel="Empty bag">
            <AppText variant="label" style={{ color: colors.rose600 }}>
              Clear bag
            </AppText>
          </Pressable>
        </Row>

        <Card style={{ padding: 0 }}>
          {bag.items.map((i, idx) => (
            <View key={i.productId} style={[styles.line, idx < bag.items.length - 1 && styles.divider]}>
              <Pressable
                onPress={() => navigation.navigate('ProductDetail', { slug: i.slug })}
                accessibilityRole="link"
                accessibilityLabel={`${i.name}, view product`}
              >
                <Photo uri={i.imageUrl} icon="bag-handle-outline" style={styles.thumb} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
                  {i.brand}
                </AppText>
                <AppText variant="label" numberOfLines={2}>
                  {i.name}
                </AppText>
                <AppText variant="caption" style={{ fontSize: 12 }}>
                  {formatPrice(i.price, i.currency)} each
                </AppText>
                <Row style={{ justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap' }} gap={8}>
                  <Stepper
                    size="sm"
                    label={i.name}
                    value={i.quantity}
                    max={MAX_QTY}
                    onChange={v => bag.setQuantity(i.productId, v)}
                    onRemove={() => bag.remove(i.productId)}
                  />
                  <AppText variant="price" style={{ fontSize: 16 }}>
                    {formatPrice(i.price * i.quantity, i.currency)}
                  </AppText>
                </Row>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ gap: space.sm }}>
          <AppText variant="label">Collect from</AppText>
          {branches.isPending ? (
            <Skeleton height={38} />
          ) : (
            <View style={styles.wrap}>
              {branchList.map(b => (
                <Chip
                  key={b.id}
                  label={b.name}
                  icon="storefront-outline"
                  selected={chosen === b.id}
                  onPress={() => {
                    setLocationId(b.id);
                    setError(null);
                  }}
                />
              ))}
            </View>
          )}
          {branch ? <AppText variant="caption">{formatAddress(branch)}</AppText> : null}
        </View>

        <Input
          label="Note for the team (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. I'll collect on Saturday afternoon"
          maxLength={500}
          multiline
        />

        <Card style={{ gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="caption">Subtotal</AppText>
            <AppText variant="label">{formatPrice(bag.total, bag.currency)}</AppText>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="caption">Pay online</AppText>
            <AppText variant="label" style={{ color: colors.success }}>
              Nothing today
            </AppText>
          </Row>
          <View style={styles.totalRow}>
            <AppText variant="label">Pay when you collect</AppText>
            <AppText variant="price" style={{ fontSize: 22 }}>
              {formatPrice(bag.total, bag.currency)}
            </AppText>
          </View>
        </Card>

        {error ? (
          <Row gap={8} style={styles.error}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <AppText style={{ flex: 1, color: colors.danger, fontSize: 14 }} accessibilityLiveRegion="polite">
              {error}
            </AppText>
          </Row>
        ) : null}
        <Button title="Reserve for pickup" icon="bag-check-outline" size="lg" loading={busy} onPress={reserve} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: space.md, padding: space.lg },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  error: { padding: space.md, borderRadius: radius.md, backgroundColor: '#f6e0df' },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f1ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
