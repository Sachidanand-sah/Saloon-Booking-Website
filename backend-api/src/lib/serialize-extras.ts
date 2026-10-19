import type {
  EventPackage,
  EventRequest,
  Location,
  Membership,
  MembershipPlan,
  MembershipPlanItem,
  Product,
  ProductRecommendation,
  ProductReservation,
  ReservationItem,
  Service,
  Staff,
  User,
} from '@prisma/client';
import { config } from '../config/env';
import { toPrice } from './money';
import { effectiveStatus } from './membership';
import { location as serializeLocation, staffSummary } from './serialize';

const money = (cents: number) => toPrice(cents);
const currency = () => config.CURRENCY;
const contact = (u?: User) => (u ? { id: u.id, name: u.name, email: u.email, phone: u.phone } : undefined);

// ---------- Memberships ----------

type PlanWithItems = MembershipPlan & { items: (MembershipPlanItem & { service: Service })[] };

export const plan = (p: PlanWithItems) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  tagline: p.tagline,
  description: p.description,
  price: money(p.priceCents),
  currency: currency(),
  durationDays: p.durationDays,
  discountPercent: p.discountPercent,
  perks: p.perks,
  isActive: p.isActive,
  isFeatured: p.isFeatured,
  sortOrder: p.sortOrder,
  includes: p.items.map(i => ({
    serviceId: i.serviceId,
    serviceName: i.service.name,
    serviceSlug: i.service.slug,
    quantity: i.quantity,
    value: money(i.service.priceCents * i.quantity),
  })),
});

export const membership = (
  m: Membership & { plan: PlanWithItems; location?: Location | null; user?: User },
  usage?: { serviceId: string; serviceName: string; included: number; used: number; remaining: number }[],
) => ({
  id: m.id,
  status: effectiveStatus(m),
  price: money(m.priceCents),
  currency: currency(),
  startsAt: m.startsAt,
  endsAt: m.endsAt,
  note: m.note,
  createdAt: m.createdAt,
  plan: plan(m.plan),
  location: m.location ? { id: m.location.id, slug: m.location.slug, name: m.location.name } : null,
  customer: contact(m.user),
  usage: usage ?? null,
});

// ---------- Events ----------

export const eventPackage = (p: EventPackage) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  description: p.description,
  fromPrice: money(p.fromPriceCents),
  currency: currency(),
  includes: p.includes,
  minGuests: p.minGuests,
  maxGuests: p.maxGuests,
  imageUrl: p.imageUrl,
  isActive: p.isActive,
  sortOrder: p.sortOrder,
});

export const eventRequest = (r: EventRequest & { package: EventPackage; location?: Location | null; user?: User }) => ({
  id: r.id,
  status: r.status,
  eventDate: r.eventDate,
  startTime: r.startTime,
  guestCount: r.guestCount,
  venue: r.venue,
  notes: r.notes,
  contactPhone: r.contactPhone,
  quotedPrice: r.quotedPriceCents != null ? money(r.quotedPriceCents) : null,
  quoteNote: r.quoteNote,
  quotedAt: r.quotedAt,
  respondedAt: r.respondedAt,
  createdAt: r.createdAt,
  currency: currency(),
  canRespond: r.status === 'QUOTED',
  canCancel: r.status === 'NEW' || r.status === 'QUOTED',
  package: { id: r.package.id, slug: r.package.slug, name: r.package.name, imageUrl: r.package.imageUrl },
  location: r.location ? serializeLocation(r.location) : null,
  customer: contact(r.user),
});

// ---------- Products ----------

type ProductFull = Product & {
  recommendations?: (ProductRecommendation & { staff: Staff })[];
  services?: { service: Service }[];
};

export const product = (p: ProductFull) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  category: p.category,
  description: p.description,
  howToUse: p.howToUse,
  price: money(p.priceCents),
  currency: currency(),
  imageUrl: p.imageUrl,
  inStock: p.inStock,
  isActive: p.isActive,
  isFeatured: p.isFeatured,
  recommendedBy: (p.recommendations ?? [])
    .filter(r => r.staff.isActive)
    .map(r => ({ ...staffSummary(r.staff), note: r.note })),
  services: (p.services ?? []).map(s => ({ id: s.service.id, slug: s.service.slug, name: s.service.name })),
});

export const reservation = (
  r: ProductReservation & { items: (ReservationItem & { product: Product })[]; location: Location; user?: User },
) => ({
  id: r.id,
  status: r.status,
  total: money(r.totalCents),
  currency: currency(),
  note: r.note,
  createdAt: r.createdAt,
  canCancel: r.status === 'PENDING' || r.status === 'READY',
  location: serializeLocation(r.location),
  items: r.items.map(i => ({
    productId: i.productId,
    name: i.product.name,
    brand: i.product.brand,
    imageUrl: i.product.imageUrl,
    quantity: i.quantity,
    price: money(i.priceCents),
  })),
  customer: contact(r.user),
});
