import { Appointment } from '../types';

const APPT_KEY = 'beauty_appts_v1';

export function loadAppointments(): Appointment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(APPT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Appointment[];
  } catch (e) {
    console.error('loadAppointments error', e);
    return [];
  }
}

export function saveAppointments(appts: Appointment[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APPT_KEY, JSON.stringify(appts));
}

export function addAppointment(appt: Appointment) {
  const list = loadAppointments();
  list.push(appt);
  saveAppointments(list);
}

export function updateAppointment(updated: Appointment) {
  const list = loadAppointments().map(a => (a.id === updated.id ? updated : a));
  saveAppointments(list);
}

export function deleteAppointment(id: string) {
  const list = loadAppointments().filter(a => a.id !== id);
  saveAppointments(list);
}
