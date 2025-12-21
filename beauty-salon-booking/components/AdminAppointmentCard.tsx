'use client';
import React from 'react';
import { Appointment } from '../types';

type Props = {
  appointment: Appointment;
  onDelete: () => void;
  onStatusChange: (status: Appointment['status']) => void;
};

export default function AdminAppointmentCard({ appointment, onDelete, onStatusChange }: Props) {
  return (
    <div className="bg-white p-4 rounded shadow flex justify-between items-start">
      <div>
        <div className="font-semibold">{appointment.serviceTitle} — {appointment.date} @ {appointment.time}</div>
        <div className="text-sm text-gray-600">By {appointment.name} • {appointment.phone || '—'} • {appointment.email || '—'}</div>
        <div className="mt-2 text-sm">Created: {new Date(appointment.createdAt).toLocaleString()}</div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="text-sm">Status: <strong>{appointment.status}</strong></div>
        <div className="space-x-2">
          <button onClick={()=> onStatusChange('confirmed')} className="px-2 py-1 border rounded text-sm">Confirm</button>
          <button onClick={()=> onStatusChange('cancelled')} className="px-2 py-1 border rounded text-sm">Cancel</button>
          <button onClick={onDelete} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">Delete</button>
        </div>
      </div>
    </div>
  );
}
