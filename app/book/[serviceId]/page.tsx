'use client';
import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Service, Appointment } from '../../../types';
import BookingForm from '../../../components/BookingForm';
import { addAppointment } from '../../../lib/storage';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_SERVICES: Service[] = [
  { id: 'haircut', title: 'Haircut', durationMins: 45, price: 25, description: 'Classic cut & style' },
  { id: 'facial', title: 'Facial', durationMins: 60, price: 40, description: 'Deep cleansing facial' },
  { id: 'manicure', title: 'Manicure', durationMins: 30, price: 20, description: 'Nails grooming & polish' },
  { id: 'massage', title: 'Massage', durationMins: 60, price: 50, description: 'Relaxing full-body massage' },
];

type Props = { params: Promise<{ serviceId: string }> };

export default function BookServicePage({ params }: Props) {
  const router = useRouter();
  const { serviceId } = use(params);
  const service = useMemo(() => SAMPLE_SERVICES.find(s => s.id === serviceId) || SAMPLE_SERVICES[0], [serviceId]);

  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(data: { name: string; email?: string; phone?: string; date: string; time: string }) {
    setSubmitting(true);
    const appt: Appointment = {
      id: uuidv4(),
      serviceId: service.id,
      serviceTitle: service.title,
      date: data.date,
      time: data.time,
      name: data.name,
      email: data.email,
      phone: data.phone,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    // persist locally
    addAppointment(appt);
    // redirect to confirmation with id in query
    router.push(`/confirmation?apptId=${encodeURIComponent(appt.id)}`);
  }

  return (
    <section className="animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4">
          ← Back to Services
        </button>
      </div>
      <BookingForm service={service} onSubmit={handleSubmit} submitting={submitting} />
    </section>
  );
}
