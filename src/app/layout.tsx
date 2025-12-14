import Navbar from '../../components/Navbar';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Beauty Salon Booking',
    default: 'Beauty Salon Booking',
  },
  description: 'Book your beauty salon appointments easily and conveniently online.',
  keywords: ['beauty salon', 'appointment booking', 'hair', 'nails', 'spa', 'salon'],
  authors: [{ name: 'Your Name or Salon Name' }],
  openGraph: {
    title: 'Beauty Salon Booking',
    description: 'Book beauty salon appointments easily',
    type: 'website',
    locale: 'en_US',
  },
  metadataBase: new URL('https://your-domain.com'), // Replace with your actual domain
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  );
}