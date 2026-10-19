import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { keys, useEventRequests } from '@/api/queries';
import { AppText, Button, Card, EmptyState, ErrorState, Photo, Row, Screen, Skeleton, type IconName } from '@/components/ui';
import { confirmAction, EventStatusBadge, formatDay } from '@/components/account/shared';
import { useToast } from '@/components/toast';
import { formatPrice, minutesToLabel } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import type { EventRequest } from '@/api/types';

type Action = 'accept' | 'decline' | 'cancel';

const actionCopy: Record<Action, { title: string; message: string; confirm: string; done: string; destructive: boolean }> = {
  accept: {
    title: 'Accept this quote?',
    message: 'We will reserve our artists for your date and be in touch to confirm the details.',
    confirm: 'Accept quote',
    done: 'Quote accepted. See you on the day!',
    destructive: false,
  },
  decline: {
    title: 'Decline this quote?',
    message: 'The request will be closed. You can always send a new one.',
    confirm: 'Decline',
    done: 'Quote declined',
    destructive: true,
  },
  cancel: {
    title: 'Cancel this request?',
    message: 'The events team will stop working on your quote.',
    confirm: 'Cancel request',
    done: 'Request cancelled',
    destructive: true,
  },
};

const timeLabel = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return minutesToLabel(h * 60 + m);
};

export default function MyEventsScreen({ navigation }: RootScreenProps<'MyEvents'>) {
  const qc = useQueryClient();
  const toast = useToast();
  const requests = useEventRequests();
  const [refreshing, setRefreshing] = useState(false);

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: Action }) => api.post(`/event-requests/${id}/${action}`),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: keys.eventRequests });
      toast(actionCopy[v.action].done);
    },
    onError: e => toast(errorMessage(e), 'error'),
  });

  const run = async (r: EventRequest, action: Action) => {
    const c = actionCopy[action];
    const ok = await confirmAction({
      title: c.title,
      message: c.message,
      confirmText: c.confirm,
      cancelText: 'Go back',
      destructive: c.destructive,
    });
    if (ok) act.mutate({ id: r.id, action });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await requests.refetch();
    setRefreshing(false);
  };

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      {requests.isPending ? (
        [0, 1].map(i => <Skeleton key={i} height={220} style={{ borderRadius: radius.lg }} />)
      ) : requests.isError ? (
        <ErrorState message={errorMessage(requests.error)} onRetry={() => requests.refetch()} />
      ) : !requests.data.length ? (
        <EmptyState
          icon="heart-outline"
          title="No event requests yet"
          message="Planning a wedding, mehendi or party? Tell us about your day and we'll send a personal quote."
          action="Explore bridal & events"
          onAction={() => navigation.navigate('Events')}
        />
      ) : (
        <>
          {requests.data.map(r => (
            <RequestCard
              key={r.id}
              request={r}
              busy={act.isPending && act.variables?.id === r.id ? act.variables.action : null}
              onAction={action => run(r, action)}
            />
          ))}
          <Button title="Request another quote" variant="outline" icon="add" onPress={() => navigation.navigate('EventRequest')} />
        </>
      )}
    </Screen>
  );
}

function RequestCard({
  request: r,
  busy,
  onAction,
}: {
  request: EventRequest;
  busy: Action | null;
  onAction: (a: Action) => void;
}) {
  const quoted = r.status === 'QUOTED';
  return (
    <Card style={[{ padding: 0, overflow: 'hidden' }, quoted && { borderColor: colors.rose300 }]}>
      <Row gap={space.md} style={{ padding: space.lg, alignItems: 'flex-start' }}>
        <Photo uri={r.package.imageUrl} icon="heart-outline" style={styles.thumb} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="heading" numberOfLines={2}>
            {r.package.name}
          </AppText>
          <EventStatusBadge status={r.status} />
        </View>
      </Row>
      <View style={styles.details}>
        <Detail icon="calendar-outline" text={`${formatDay(r.eventDate, { weekday: 'short' })}${r.startTime ? ` · ${timeLabel(r.startTime)}` : ''}`} />
        <Detail icon="people-outline" text={`${r.guestCount} guest${r.guestCount === 1 ? '' : 's'}`} />
        <Detail icon="location-outline" text={r.location ? r.location.name : r.venue ?? 'Venue to confirm'} />
        {r.notes ? <Detail icon="chatbubble-ellipses-outline" text={r.notes} /> : null}
      </View>

      {r.quotedPrice != null ? (
        <View style={[styles.quote, quoted ? null : { backgroundColor: colors.ivory }]}>
          <AppText variant="eyebrow" style={{ color: quoted ? colors.rose600 : colors.muted }}>
            {quoted ? 'Your quote' : 'Quoted'}
          </AppText>
          <AppText variant="display" style={{ fontSize: 28, lineHeight: 34, marginTop: 2 }}>
            {formatPrice(r.quotedPrice, r.currency)}
          </AppText>
          {r.quoteNote ? <AppText style={{ fontSize: 14, marginTop: 4 }}>{r.quoteNote}</AppText> : null}
        </View>
      ) : r.status === 'NEW' ? (
        <Row gap={8} style={[styles.quote, { backgroundColor: colors.ivory }]}>
          <Ionicons name="time-outline" size={16} color={colors.muted} />
          <AppText variant="caption" style={{ flex: 1 }}>
            Our events team will send your quote shortly, usually within a day.
          </AppText>
        </Row>
      ) : null}

      {r.canRespond || r.canCancel ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
          {r.canRespond ? (
            <Row gap={space.sm}>
              <Button
                title="Accept quote"
                icon="checkmark"
                variant="accent"
                loading={busy === 'accept'}
                disabled={!!busy}
                onPress={() => onAction('accept')}
                style={{ flex: 1 }}
              />
              <Button
                title="Decline"
                variant="outline"
                loading={busy === 'decline'}
                disabled={!!busy}
                onPress={() => onAction('decline')}
                style={{ flex: 1 }}
              />
            </Row>
          ) : null}
          {r.canCancel ? (
            <Button
              title="Cancel request"
              variant="ghost"
              size="sm"
              loading={busy === 'cancel'}
              disabled={!!busy}
              onPress={() => onAction('cancel')}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Detail({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Row gap={10} style={{ alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={16} color={colors.rose500} style={{ marginTop: 2 }} />
      <AppText style={styles.detailText}>{text}</AppText>
    </Row>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  details: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: 8 },
  detailText: { flex: 1, fontSize: 14, fontFamily: fonts.body, color: colors.ink },
  quote: { marginHorizontal: space.lg, marginBottom: space.lg, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.rose50 },
});
