/** Shapes returned by the Lovely Glow API (backend-api). */

export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
};

export type Category = { id: string; slug: string; name: string; description: string | null; serviceCount?: number };

export type StaffSummary = { id: string; name: string; title: string; bio: string | null; avatarUrl: string | null };

export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMins: number;
  price: number;
  currency: string;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  category?: Category;
  rating?: { average: number | null; count: number };
  staff?: StaffSummary[];
};

export type Staff = StaffSummary & { services: { id: string; name: string }[] };

export type OpeningHours = { dayOfWeek: number; open: number | null; close: number | null };

export type SalonInfo = {
  timezone: string;
  currency: string;
  slotStepMins: number;
  bookingWindowDays: number;
  cancelCutoffMins: number;
  openingHours: OpeningHours[];
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
  service: { id: string; name: string };
  staff: { id: string; name: string };
};

export type Slot = { startAt: string; endAt: string; staffIds: string[] };

export type Availability = {
  date: string;
  timezone: string;
  service: { id: string; name: string; durationMins: number };
  staff: Pick<StaffSummary, 'id' | 'name' | 'title' | 'avatarUrl'>[];
  slots: Slot[];
};

export type Booking = {
  id: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  price: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  cancelledAt: string | null;
  canCancel: boolean;
  canReschedule: boolean;
  canReview: boolean;
  service: { id: string; slug: string; name: string; durationMins: number };
  staff: StaffSummary;
  customer?: { id: string; name: string; email: string; phone: string | null };
  review: { rating: number; comment: string | null } | null;
};

export type ApiError = { code: string; message: string; details?: { field: string; message: string }[] };
