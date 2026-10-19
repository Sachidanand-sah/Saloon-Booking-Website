import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BookingWizard } from '@/components/booking/wizard';
import { Skeleton } from '@/components/ui/misc';
import { getPublic } from '@/lib/server/api';
import type { Category, LocationListItem, SalonInfo, Service, Staff } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Book an appointment',
  description: 'Choose a treatment, stylist and time — real-time availability with instant confirmation.',
};

export default async function BookPage() {
  const [services, categories, staff, salon, branches] = await Promise.all([
    getPublic<Service[]>('/services', 30),
    getPublic<Category[]>('/categories', 30),
    getPublic<Staff[]>('/staff', 30),
    getPublic<SalonInfo>('/salon', 300),
    getPublic<LocationListItem[]>('/locations', 60),
  ]);

  return (
    <div className="bg-gradient-to-b from-sand/60 to-ivory pb-24 pt-28 sm:pt-32">
      <div className="container-page">
        {services && staff && salon ? (
          <Suspense fallback={<Skeleton className="h-[480px]" />}>
            <BookingWizard
              services={services}
              categories={categories ?? []}
              staff={staff}
              salon={salon}
              branches={branches ?? []}
            />
          </Suspense>
        ) : (
          <p className="card mx-auto max-w-lg p-8 text-center text-muted">
            Online booking is temporarily unavailable. Please refresh in a moment or give us a call.
          </p>
        )}
      </div>
    </div>
  );
}
