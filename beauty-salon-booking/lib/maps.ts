import type { Location, OpeningHours } from './types';
import { isoWeekday, minutesToLabel, todayIn } from './format';

type Place = Pick<Location, 'name' | 'addressLine1' | 'addressLine2' | 'city' | 'latitude' | 'longitude'>;

export const formatAddress = (l: Place) => [l.addressLine1, l.addressLine2, l.city].filter(Boolean).join(', ');

const query = (l: Place) =>
  l.latitude != null && l.longitude != null ? `${l.latitude},${l.longitude}` : `${l.name}, ${formatAddress(l)}`;

/** Keyless Google Maps embed for an <iframe>. */
export const mapEmbedUrl = (l: Place) => `https://www.google.com/maps?q=${encodeURIComponent(query(l))}&z=16&output=embed`;

/** Opens turn-by-turn directions in Google Maps (app on phones). */
export const directionsUrl = (l: Place) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query(l))}`;

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

/** "Open today 9am – 6pm" / "Closed today" in the salon's time zone. */
export function todayHours(hours: OpeningHours[], timeZone: string) {
  const today = hours.find(h => h.dayOfWeek === isoWeekday(todayIn(timeZone)));
  if (!today || today.open === null || today.close === null) return { open: false, label: 'Closed today' };
  return { open: true, label: `Open today ${minutesToLabel(today.open)} – ${minutesToLabel(today.close)}` };
}
