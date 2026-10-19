import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { api, errorMessage, fieldErrors } from '@/api/client';
import { keys, useEventPackages, useLocations, useSalon } from '@/api/queries';
import { AppText, Button, Card, Chip, ErrorState, Input, Row, Screen, Skeleton } from '@/components/ui';
import { Stepper } from '@/components/shop/Stepper';
import { useToast } from '@/components/toast';
import { addDays, formatPrice, isoWeekday, minutesToLabel, todayIn } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';
import { guestRange } from './EventsScreen';

const DAYS_AHEAD = 120;
const TIMES = Array.from({ length: 13 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`);
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EventRequestScreen({ navigation, route }: RootScreenProps<'EventRequest'>) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const salon = useSalon();
  const packages = useEventPackages();
  const branches = useLocations();

  const [slug, setSlug] = useState<string | undefined>(route.params?.packageSlug);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState<number | null>(null);
  const [where, setWhere] = useState<'branch' | 'venue'>('branch');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pkg = packages.data?.find(p => p.slug === slug) ?? packages.data?.[0];
  const minGuests = pkg?.minGuests ?? 1;
  const maxGuests = pkg?.maxGuests ?? 500;
  // Keep the guest count inside the chosen package's range without an effect.
  const guestCount = Math.min(maxGuests, Math.max(minGuests, guests ?? minGuests));

  const tz = salon.data?.timezone ?? 'Asia/Kathmandu';
  const days = useMemo(() => {
    const today = todayIn(tz);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i + 1));
  }, [tz]);

  const clearError = (k: string) => setErrors(e => (e[k] ? { ...e, [k]: '' } : e));

  const submit = async () => {
    if (!pkg) return;
    const e: Record<string, string> = {};
    if (!date) e.eventDate = 'Please choose the date of your event';
    if (where === 'branch' && !locationId) e.locationId = 'Please choose a branch';
    if (where === 'venue' && venue.trim().length < 3) e.venue = 'Tell us where the event is';
    if (!PHONE.test(phone.trim())) e.contactPhone = 'Please enter a valid phone number';
    setErrors(e);
    setFormError(Object.keys(e).length ? 'Please check the highlighted fields.' : null);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const res = await api.post<{ message: string }>('/event-requests', {
        packageId: pkg.id,
        eventDate: date,
        startTime: time ?? undefined,
        guestCount,
        locationId: where === 'branch' ? locationId : undefined,
        venue: where === 'venue' ? venue.trim() : undefined,
        contactPhone: phone.trim(),
        notes: notes.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: keys.eventRequests });
      toast(res.message);
      navigation.replace('MyEvents');
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  if (packages.isPending) {
    return (
      <Screen edges={[]}>
        <Skeleton height={44} />
        <Skeleton height={90} />
        <Skeleton height={200} />
        <Skeleton height={140} />
      </Screen>
    );
  }
  if (packages.isError) {
    return (
      <Screen edges={[]}>
        <ErrorState message={errorMessage(packages.error)} onRetry={() => packages.refetch()} />
      </Screen>
    );
  }
  if (!pkg) {
    return (
      <Screen edges={[]}>
        <ErrorState message="No event packages are available right now. Please call the salon." />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={[]}>
        <AppText variant="caption" style={{ fontSize: 14 }}>
          Tell us about your day. Our events team replies with a personal quote, usually within a day.
        </AppText>

        {/* Package */}
        <Field label="Package">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.bleed}>
            {packages.data.map(p => (
              <Chip key={p.id} label={p.name} selected={p.id === pkg.id} onPress={() => setSlug(p.slug)} />
            ))}
          </ScrollView>
          <Card style={styles.pkgSummary}>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{pkg.name}</AppText>
              <AppText variant="caption" style={{ fontSize: 12 }}>
                {guestRange(pkg)}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" style={{ fontSize: 11 }}>
                From
              </AppText>
              <AppText variant="price" style={{ fontSize: 16 }}>
                {formatPrice(pkg.fromPrice, pkg.currency)}
              </AppText>
            </View>
          </Card>
        </Field>

        {/* Date */}
        <Field label="Event date" error={errors.eventDate}>
          <FlatList
            horizontal
            data={days}
            keyExtractor={d => d}
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.chipRow}
            initialNumToRender={10}
            getItemLayout={(_, index) => ({ length: 64, offset: 64 * index + space.lg, index })}
            renderItem={({ item }) => {
              const selected = item === date;
              const [, m, d] = item.split('-').map(Number);
              const wd = WEEKDAY[isoWeekday(item) - 1];
              const first = d === 1;
              return (
                <Pressable
                  onPress={() => {
                    setDate(item);
                    clearError('eventDate');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${wd} ${d} ${MONTH[m - 1]}`}
                  style={[styles.day, selected && styles.daySelected]}
                >
                  <AppText style={[styles.dayWeek, selected && { color: colors.rose300 }]}>{wd}</AppText>
                  <AppText style={[styles.dayNum, selected && { color: colors.white }]}>{d}</AppText>
                  <AppText style={[styles.dayMonth, selected && { color: 'rgba(255,255,255,0.75)' }, first && !selected && { color: colors.rose600 }]}>
                    {MONTH[m - 1]}
                  </AppText>
                </Pressable>
              );
            }}
          />
          {date ? (
            <AppText variant="caption">
              {new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
                new Date(`${date}T12:00:00Z`),
              )}
            </AppText>
          ) : null}
        </Field>

        {/* Time */}
        <Field label="Preferred start time" hint="Optional. Brides often start early, so we open from 6am for events.">
          <View style={styles.wrapRow}>
            {TIMES.map(t => (
              <Chip
                key={t}
                label={minutesToLabel(Number(t.slice(0, 2)) * 60)}
                selected={t === time}
                onPress={() => setTime(cur => (cur === t ? null : t))}
              />
            ))}
          </View>
        </Field>

        {/* Guests */}
        <Field label="Number of guests" error={errors.guestCount} hint={`This package is for ${guestRange(pkg)}, including you.`}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="heading">
              {guestCount} guest{guestCount === 1 ? '' : 's'}
            </AppText>
            <Stepper label="guests" value={guestCount} min={minGuests} max={maxGuests} onChange={setGuests} />
          </Row>
        </Field>

        {/* Where */}
        <Field label="Where would you like us?" error={where === 'branch' ? errors.locationId : errors.venue}>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {(['branch', 'venue'] as const).map(w => (
              <Pressable
                key={w}
                onPress={() => setWhere(w)}
                accessibilityRole="radio"
                accessibilityState={{ checked: where === w }}
                style={[styles.segmentItem, where === w && styles.segmentOn]}
              >
                <Ionicons
                  name={w === 'branch' ? 'storefront-outline' : 'home-outline'}
                  size={16}
                  color={where === w ? colors.white : colors.plum800}
                />
                <AppText style={[styles.segmentText, where === w && { color: colors.white }]}>
                  {w === 'branch' ? 'At a branch' : 'At my venue'}
                </AppText>
              </Pressable>
            ))}
          </View>
          {where === 'branch' ? (
            branches.isPending ? (
              <Skeleton height={38} />
            ) : (
              <View style={styles.wrapRow}>
                {(branches.data ?? []).map(b => (
                  <Chip
                    key={b.id}
                    label={b.name}
                    icon="location-outline"
                    selected={b.id === locationId}
                    onPress={() => {
                      setLocationId(b.id);
                      clearError('locationId');
                    }}
                  />
                ))}
              </View>
            )
          ) : (
            <Input
              label="Venue address"
              value={venue}
              onChangeText={v => {
                setVenue(v);
                clearError('venue');
              }}
              placeholder="e.g. Hotel Yak & Yeti, Durbar Marg"
              maxLength={300}
            />
          )}
        </Field>

        <Input
          label="Contact phone"
          value={phone}
          onChangeText={v => {
            setPhone(v);
            clearError('contactPhone');
          }}
          placeholder="98XXXXXXXX"
          keyboardType="phone-pad"
          autoComplete="tel"
          error={errors.contactPhone}
          hint="Our events team will call you on this number."
        />
        <Input
          label="Anything else?"
          value={notes}
          onChangeText={setNotes}
          placeholder="Your look, the occasion, trial dates, number of sarees to drape…"
          multiline
          maxLength={1000}
          error={errors.notes}
        />

        {formError ? (
          <Row gap={8} style={styles.formError}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <AppText style={{ flex: 1, color: colors.danger, fontSize: 14 }} accessibilityLiveRegion="polite">
              {formError}
            </AppText>
          </Row>
        ) : null}
        <Button title="Send request" size="lg" icon="paper-plane-outline" loading={busy} onPress={submit} />
        <AppText variant="caption" style={{ textAlign: 'center', fontSize: 12 }}>
          No payment now. You'll accept or decline the quote in the app.
        </AppText>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="label">{label}</AppText>
      {children}
      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg, flexGrow: 0 },
  chipRow: { gap: 8, paddingHorizontal: space.lg },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pkgSummary: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  day: {
    width: 56,
    height: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  daySelected: { backgroundColor: colors.plum900, borderColor: colors.plum900 },
  dayWeek: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  dayNum: { fontFamily: fonts.display, fontSize: 20, color: colors.plum900 },
  dayMonth: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  segment: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.sand,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.pill,
  },
  segmentOn: { backgroundColor: colors.plum900 },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.plum800 },
  formError: { padding: space.md, borderRadius: radius.md, backgroundColor: '#f6e0df' },
});
