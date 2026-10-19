/**
 * Server addresses come from .env (EXPO_PUBLIC_*). On a real phone these must be your
 * computer's LAN IP, not localhost.
 */
const strip = (url: string) => url.replace(/\/$/, '');

export const API_URL = strip(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api');
export const SITE_URL = strip(process.env.EXPO_PUBLIC_SITE_URL ?? 'http://localhost:3000');

export const BRAND = {
  name: 'Lalima Beauty',
  tagline: 'Beauty studio & spa · Kathmandu',
  phone: '+977 1-5550100',
  email: 'namaste@lalimabeauty.com.np',
};
