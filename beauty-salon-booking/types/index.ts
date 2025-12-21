

export type Service = {
  id: string;
  title: string;
  description?: string;
  durationMins: number;
  price: number;
};

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

export type Appointment = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm
  name: string;
  email?: string;
  phone?: string;
  createdAt: string; // ISO timestamp
  status: AppointmentStatus;
};
