import Link from 'next/link';
import React from 'react';
import { Service } from '../../types';

const SAMPLE_SERVICES: Service[] = [
  { id: 'haircut', title: 'Haircut', durationMins: 45, price: 25, description: 'Classic cut & style' },
  { id: 'facial', title: 'Facial', durationMins: 60, price: 40, description: 'Deep cleansing facial' },
  { id: 'manicure', title: 'Manicure', durationMins: 30, price: 20, description: 'Nails grooming & polish' },
  { id: 'massage', title: 'Massage', durationMins: 60, price: 50, description: 'Relaxing full-body massage' },
];

export default function HomePage() {
  return (
    <div>
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold">Lovely Glow Beauty Salon</h1>
        <p className="mt-3 text-gray-600">Book your pampering session. Fast, simple, secure (local demo).</p>
        <Link href="/services" className="inline-block mt-6 bg-pink-500 text-white px-6 py-2 rounded-md">
          Book Appointment
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Popular Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAMPLE_SERVICES.map(s => (
            <div key={s.id} className="p-4 bg-white rounded-lg shadow">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.description}</p>
              <div className="mt-2 flex justify-between items-center">
                <div className="text-gray-700">${s.price} • {s.durationMins}m</div>
                <Link href={`/book/${s.id}`} className="text-sm text-pink-600">Book</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
