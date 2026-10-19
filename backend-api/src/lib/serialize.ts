import type { Booking, Category, Location, Review, Service, Staff, User } from '@prisma/client';
import { config } from '../config/env';
import { toPrice } from './money';

export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  createdAt: u.createdAt,
});

export const category = (c: Category) => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  description: c.description,
});

export const staffSummary = (s: Staff) => ({
  id: s.id,
  name: s.name,
  title: s.title,
  bio: s.bio,
  avatarUrl: s.avatarUrl,
  locationId: s.locationId,
});

export const location = (l: Location) => ({
  id: l.id,
  slug: l.slug,
  name: l.name,
  description: l.description,
  addressLine1: l.addressLine1,
  addressLine2: l.addressLine2,
  city: l.city,
  phone: l.phone,
  email: l.email,
  latitude: l.latitude,
  longitude: l.longitude,
  imageUrl: l.imageUrl,
  isActive: l.isActive,
});

export const service = (s: Service & { category?: Category }) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  description: s.description,
  durationMins: s.durationMins,
  price: toPrice(s.priceCents),
  currency: config.CURRENCY,
  imageUrl: s.imageUrl,
  isFeatured: s.isFeatured,
  isActive: s.isActive,
  category: s.category ? category(s.category) : undefined,
});

type BookingWithRelations = Booking & {
  service: Service;
  staff: Staff;
  customer?: User;
  review?: Review | null;
  location?: Location | null;
};

export const booking = (b: BookingWithRelations, now = new Date()) => {
  const changeable =
    (b.status === 'CONFIRMED' || b.status === 'PENDING') &&
    b.startAt.getTime() - now.getTime() >= config.CANCEL_CUTOFF_MINS * 60_000;
  return {
    id: b.id,
    status: b.status,
    startAt: b.startAt,
    endAt: b.endAt,
    price: toPrice(b.priceCents),
    currency: config.CURRENCY,
    notes: b.notes,
    createdAt: b.createdAt,
    cancelledAt: b.cancelledAt,
    canCancel: changeable,
    canReschedule: changeable,
    canReview: b.status === 'COMPLETED' && !b.review,
    service: { id: b.service.id, slug: b.service.slug, name: b.service.name, durationMins: b.service.durationMins },
    staff: staffSummary(b.staff),
    location: b.location ? location(b.location) : null,
    customer: b.customer ? { id: b.customer.id, name: b.customer.name, email: b.customer.email, phone: b.customer.phone } : undefined,
    review: b.review ? { rating: b.review.rating, comment: b.review.comment } : null,
  };
};
