import Link from 'next/link';
import React from 'react';
import { Service } from '../../types';
import Button from '../../components/ui/Button';

const SAMPLE_SERVICES: Service[] = [
  { id: 'haircut', title: 'Precision Haircut', durationMins: 45, price: 35, description: 'Expert styling tailored to your face shape and lifestyle.' },
  { id: 'facial', title: 'Glow Facial', durationMins: 60, price: 55, description: 'Deep cleansing and hydration for radiant, youthful skin.' },
  { id: 'manicure', title: 'Gel Manicure', durationMins: 45, price: 30, description: 'Long-lasting color and care for elegant hands.' },
  { id: 'massage', title: 'Aromatherapy Massage', durationMins: 60, price: 70, description: 'Relax and unwind with essential oils and gentle pressure.' },
];

export default function ServicesPage() {
  return (
    <section className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-display font-bold text-gray-900">Our Services</h1>
        <p className="mt-2 text-gray-600 max-w-2xl">Discover our range of premium beauty treatments designed to help you look and feel your best.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SAMPLE_SERVICES.map((s, i) => (
          <div 
            key={s.id} 
            className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex flex-col h-full justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-gray-900 group-hover:text-pink-600 transition-colors">{s.title}</h2>
                <p className="text-sm text-gray-500 mt-2">{s.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-700 font-medium">
                   <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded-full">${s.price}</span>
                   <span className="text-gray-300">•</span>
                   <span>{s.durationMins} mins</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-50">
                <Link href={`/book/${s.id}`} className="block w-full">
                  <Button className="w-full" variant="secondary">Book Appointment</Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
