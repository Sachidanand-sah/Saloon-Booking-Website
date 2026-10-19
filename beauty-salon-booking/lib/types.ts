/** Shapes returned by the Lalima Beauty API (backend-api). */

export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  loyaltyPoints: number;
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
  /** Membership saving + redeemed points. */
  discount: number;
  /** Amount to pay at the salon. */
  total: number;
  pointsRedeemed: number;
  membershipApplied: boolean;
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

// ---------- Monthly packages ----------

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export type Plan = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  discountPercent: number;
  perks: string[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  includes: { serviceId: string; serviceName: string; serviceSlug: string; quantity: number; value: number }[];
};

export type MembershipUsage = { serviceId: string; serviceName: string; included: number; used: number; remaining: number };

export type Membership = {
  id: string;
  status: MembershipStatus;
  price: number;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  note: string | null;
  createdAt: string;
  plan: Plan;
  location: { id: string; slug: string; name: string } | null;
  customer?: { id: string; name: string; email: string; phone: string | null };
  /** Only for the currently active membership. */
  usage: MembershipUsage[] | null;
};

// ---------- Loyalty ----------

export type LoyaltyTier = { key: 'SILVER' | 'GOLD' | 'PLATINUM'; name: string; minPoints: number; multiplier: number; perks: string[] };

export type LoyaltyProgramme = {
  pointsPer100: number;
  pointValue: number;
  maxRedeemPercent: number;
  signupBonus: number;
  tiers: LoyaltyTier[];
};

export type LoyaltyReason = 'SIGNUP_BONUS' | 'EARNED' | 'REDEEMED' | 'REFUNDED' | 'ADJUSTMENT';

export type LoyaltySummary = {
  balance: number;
  lifetime: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNext: number;
  programme: LoyaltyProgramme;
  history: {
    id: string;
    points: number;
    reason: LoyaltyReason;
    note: string | null;
    createdAt: string;
    booking: { id: string; serviceName: string; startAt: string } | null;
  }[];
};

/** GET /bookings/quote: price breakdown before confirming. */
export type BookingQuote = {
  currency: string;
  price: number;
  membership: { planName: string; kind: 'included' | 'discount'; discount: number } | null;
  afterMembership: number;
  points: { balance: number; maxRedeemable: number; pointValue: number };
};

// ---------- Events ----------

export type EventRequestStatus = 'NEW' | 'QUOTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';

export type EventPackage = {
  id: string;
  slug: string;
  name: string;
  description: string;
  fromPrice: number;
  currency: string;
  includes: string[];
  minGuests: number;
  maxGuests: number | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type EventRequest = {
  id: string;
  status: EventRequestStatus;
  eventDate: string;
  startTime: string | null;
  guestCount: number;
  venue: string | null;
  notes: string | null;
  contactPhone: string;
  quotedPrice: number | null;
  quoteNote: string | null;
  quotedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  currency: string;
  canRespond: boolean;
  canCancel: boolean;
  package: { id: string; slug: string; name: string; imageUrl: string | null };
  location: Location | null;
  customer?: { id: string; name: string; email: string; phone: string | null };
};

// ---------- Products ----------

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  howToUse: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  recommendedBy: (StaffSummary & { note: string })[];
  services: { id: string; slug: string; name: string }[];
};

export type ReservationStatus = 'PENDING' | 'READY' | 'COLLECTED' | 'CANCELLED';

export type Reservation = {
  id: string;
  status: ReservationStatus;
  total: number;
  currency: string;
  note: string | null;
  createdAt: string;
  canCancel: boolean;
  location: Location;
  items: { productId: string; name: string; brand: string; imageUrl: string | null; quantity: number; price: number }[];
  customer?: { id: string; name: string; email: string; phone: string | null };
};
