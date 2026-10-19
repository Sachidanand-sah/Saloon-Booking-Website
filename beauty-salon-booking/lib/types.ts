/** Shapes returned by the Lalima Beauty API (backend-api). */

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

export type StaffSummary = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  locationId: string | null;
};

export type Location = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  isActive: boolean;
};

/** GET /locations item. */
export type LocationListItem = Location & { staffCount: number; serviceIds: string[]; openingHours: OpeningHours[] };

/** GET /locations/:slug. */
export type LocationDetail = Location & { openingHours: OpeningHours[]; staff: StaffSummary[]; services: Service[] };

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

export type Staff = StaffSummary & {
  services: { id: string; name: string }[];
  location: { id: string; slug: string; name: string } | null;
};

export type OpeningHours = { dayOfWeek: number; open: number | null; close: number | null };

export type SalonInfo = {
  timezone: string;
  currency: string;
  slotStepMins: number;
  bookingWindowDays: number;
  cancelCutoffMins: number;
  locationCount: number;
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
  location: Location | null;
  customer?: { id: string; name: string; email: string; phone: string | null };
  review: { rating: number; comment: string | null } | null;
};

export type ApiError = { code: string; message: string; details?: { field: string; message: string }[] };
