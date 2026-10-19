/**
 * Local appointment reminders: one notification 2 hours before a booking.
 * Notification ids are kept per booking in AsyncStorage so they can be cancelled or moved.
 * Everything here is a silent no-op on web or when the user declines permission.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { formatTime } from './format';

const KEY = 'lalima.reminders';
const LEAD_MS = 2 * 60 * 60_000;
const CHANNEL = 'appointments';

export const remindersSupported = Platform.OS !== 'web';

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

type Store = Record<string, string>;

async function readStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

async function writeStore(store: Store) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Losing the id only means we can't cancel the reminder later; not worth surfacing.
  }
}

async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Appointment reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export type ReminderBooking = {
  id: string;
  startAt: string;
  service: { name: string };
  location?: { name: string } | null;
};

export type ReminderResult = 'scheduled' | 'unsupported' | 'denied' | 'too-soon';

export async function hasReminder(bookingId: string) {
  if (!remindersSupported) return false;
  return !!(await readStore())[bookingId];
}

/** Schedules (or replaces) the reminder for a booking. */
export async function scheduleReminder(booking: ReminderBooking, timeZone?: string): Promise<ReminderResult> {
  if (!remindersSupported) return 'unsupported';
  try {
    const fireAt = new Date(new Date(booking.startAt).getTime() - LEAD_MS);
    if (fireAt.getTime() <= Date.now()) return 'too-soon';
    if (!(await ensurePermission())) return 'denied';
    await cancelReminder(booking.id);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${booking.service.name} at ${formatTime(booking.startAt, timeZone)}`,
        body: booking.location
          ? `Your Lalima appointment at ${booking.location.name} is in 2 hours.`
          : 'Your Lalima appointment is in 2 hours.',
        data: { bookingId: booking.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
      },
    });
    const store = await readStore();
    store[booking.id] = id;
    await writeStore(store);
    return 'scheduled';
  } catch {
    return 'unsupported';
  }
}

export async function cancelReminder(bookingId: string) {
  if (!remindersSupported) return;
  const store = await readStore();
  const id = store[bookingId];
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  delete store[bookingId];
  await writeStore(store);
}

/** After a reschedule: move an existing reminder to the new time (does nothing if none was set). */
export async function rescheduleReminder(booking: ReminderBooking, timeZone?: string) {
  if (!(await hasReminder(booking.id))) return;
  const result = await scheduleReminder(booking, timeZone);
  if (result !== 'scheduled') await cancelReminder(booking.id);
}
