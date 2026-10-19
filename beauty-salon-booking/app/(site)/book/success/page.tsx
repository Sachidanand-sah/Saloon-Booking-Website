import type { Metadata } from 'next';
import { BookingSuccess } from '@/components/booking/success';

export const metadata: Metadata = { title: 'Booking confirmed', robots: { index: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="bg-gradient-to-b from-sand/60 to-ivory pb-24 pt-28 sm:pt-36">
      <div className="container-page">
        <BookingSuccess id={id} />
      </div>
    </div>
  );
}
