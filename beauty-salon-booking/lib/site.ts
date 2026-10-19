/**
 * Brand-wide details shown across the site. Edit these for your salon.
 * Branch addresses, phones and maps are managed in Admin → Branches.
 */
export const site = {
  name: 'Lalima Beauty',
  /** लालिमा: the warm glow of dawn. */
  tagline: 'Beauty studio & spa · Kathmandu',
  description:
    'Hair, skin, nail and spa treatments by senior specialists across the Kathmandu valley. Book online in under a minute.',
  phone: '+977 1-5550100',
  email: 'namaste@lalimabeauty.com.np',
  social: { instagram: 'https://instagram.com/', facebook: 'https://facebook.com/' },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};
