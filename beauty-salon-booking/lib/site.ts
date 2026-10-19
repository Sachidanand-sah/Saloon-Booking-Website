/** Brand and contact details shown across the site. Edit these for your salon. */
export const site = {
  name: 'Lovely Glow',
  tagline: 'Beauty studio & spa',
  description:
    'Award-winning hair, skin, nail and spa treatments by senior stylists. Book online in under a minute.',
  phone: '+1 (555) 014-2290',
  email: 'hello@lovelyglow.com',
  address: { line1: '24 Blossom Avenue', line2: 'Suite 3', city: 'Springfield' },
  mapUrl: 'https://maps.google.com/?q=24+Blossom+Avenue',
  social: { instagram: 'https://instagram.com/', facebook: 'https://facebook.com/' },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};
