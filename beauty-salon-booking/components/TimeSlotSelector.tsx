'use client';
import React, { useEffect, useMemo, useState } from 'react';

// Simple timeslots generator
const BUSINESS_START = 9; // 9 AM
const BUSINESS_END = 18; // 6 PM

function formatHM(h: number, m = 0) {
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

type Props = {
  selectedDate: string; // YYYY-MM-DD
  duration: number; // minutes
  value?: string;
  onChange: (time: string) => void;
};

export default function TimeSlotSelector({ selectedDate, duration, value, onChange }: Props) {
  const [slots, setSlots] = useState<string[]>([]);

  useEffect(() => {
    // Generate slots every 30 minutes within business hours
    const s: string[] = [];
    for (let h = BUSINESS_START; h < BUSINESS_END; h++) {
      for (let m of [0, 30]) {
        s.push(formatHM(h, m));
      }
    }
    setSlots(s);
  }, []);

  // Optionally filter out past times for today
  const available = useMemo(() => {
    if (!selectedDate) return slots;
    const todayISO = new Date().toISOString().slice(0, 10);
    if (selectedDate !== todayISO) return slots;
    const now = new Date();
    return slots.filter(t => {
      const [hh, mm] = t.split(':').map(Number);
      const slotDate = new Date(selectedDate + 'T' + t + ':00');
      return slotDate.getTime() > now.getTime() + 15 * 60 * 1000; // only show slots >15min from now
    });
  }, [selectedDate, slots]);

  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
      <option value="">Select time</option>
      {available.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}
