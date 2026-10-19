import { addDays, formatDuration, formatPrice, isoWeekday, minutesToLabel } from '@/lib/format';
import { formatAddress, imageUri } from '@/lib/places';

describe('formatPrice', () => {
  it('formats rupees the Nepali way', () => {
    expect(formatPrice(800)).toBe('Rs. 800');
    expect(formatPrice(150000)).toBe('Rs. 1,50,000');
    expect(formatPrice(1499.5)).toBe('Rs. 1,499.5');
  });
});

describe('dates and durations', () => {
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(150)).toBe('2 hr 30 min');
  });

  it('does calendar arithmetic without time zones', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(isoWeekday('2026-10-19')).toBe(1); // Monday
    expect(isoWeekday('2026-10-25')).toBe(7); // Sunday
  });

  it('labels opening hours', () => {
    expect(minutesToLabel(540)).toBe('9am');
    expect(minutesToLabel(1170)).toBe('7:30pm');
  });
});

describe('places', () => {
  it('builds addresses and absolute image URLs', () => {
    expect(formatAddress({ name: 'X', addressLine1: 'New Baneshwor Road', addressLine2: null, city: 'Kathmandu', latitude: null, longitude: null })).toBe(
      'New Baneshwor Road, Kathmandu',
    );
    expect(imageUri('/images/a.jpg')).toMatch(/^https?:\/\/.+\/images\/a\.jpg$/);
    expect(imageUri('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(imageUri(null)).toBeNull();
  });
});
