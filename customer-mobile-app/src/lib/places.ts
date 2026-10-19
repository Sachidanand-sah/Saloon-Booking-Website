import { Linking } from 'react-native';
import type { Location, OpeningHours } from '@/api/types';
import { SITE_URL } from '@/config';
import { isoWeekday, minutesToLabel, todayIn } from './format';

type Place = Pick<Location, 'name' | 'addressLine1' | 'addressLine2' | 'city' | 'latitude' | 'longitude'>;

export const formatAddress = (l: Place) => [l.addressLine1, l.addressLine2, l.city].filter(Boolean).join(', ');

const query = (l: Place) =>
  l.latitude != null && l.longitude != null ? `${l.latitude},${l.longitude}` : `${l.name}, ${formatAddress(l)}`;

/** Opens turn-by-turn directions in Google Maps (the app if installed, otherwise the browser). */
export const openDirections = (l: Place) =>
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query(l))}`);

export const callPhone = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`);

export function todayHours(hours: OpeningHours[], timeZone: string) {
  const today = hours.find(h => h.dayOfWeek === isoWeekday(todayIn(timeZone)));
  if (!today || today.open === null || today.close === null) return { open: false, label: 'Closed today' };
  return { open: true, label: `Open today ${minutesToLabel(today.open)} – ${minutesToLabel(today.close)}` };
}

/** Photos bundled with the website are stored as site paths like /images/services/x.jpg. */
export const imageUri = (url: string | null | undefined) =>
  !url ? null : url.startsWith('/') ? `${SITE_URL}${url}` : url;
