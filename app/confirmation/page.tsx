'use client';
import { useEffect, useState, Suspense } from 'react';
import { loadAppointments } from '../../lib/storage';
import { Appointment } from '../../types';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ConfirmationContent() {
  const search = useSearchParams();
  const apptId = search?.get('apptId') || '';
  const [appt, setAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!apptId) return;
    const list = loadAppointments();
    const found = list.find(a => a.id === apptId) || null;
    setAppt(found);
  }, [apptId]);

  if (!appt) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Appointment not found</h1>
        <p className="mt-2">If you just booked, try refreshing. <Link href="/services" className="text-pink-600">Book another</Link></p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-semibold">Booking Confirmed</h1>
      <p className="text-gray-600 mt-2">Thanks, {appt.name}! Your appointment has been successfully scheduled.</p>

      <div className="mt-4 space-y-2">
        <div><strong>Service:</strong> {appt.serviceTitle}</div>
        <div><strong>Date:</strong> {appt.date}</div>
        <div><strong>Time:</strong> {appt.time}</div>
        <div><strong>Phone:</strong> {appt.phone || '—'}</div>
        <div><strong>Email:</strong> {appt.email || '—'}</div>
        <div><strong>Status:</strong> {appt.status}</div>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/services" className="px-4 py-2 border rounded">Book another</Link>
        <Link href="/admin" className="px-4 py-2 bg-pink-500 text-white rounded">Admin</Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div>Loading confirmation...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
