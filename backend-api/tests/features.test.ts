import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import { Role } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();
const zone = 'Asia/Kathmandu';
const date = DateTime.now().setZone(zone).plus({ days: 3 }).toISODate()!;
const at = (hhmm: string) => DateTime.fromISO(`${date}T${hhmm}`, { zone }).toUTC().toISO()!;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;
let member: string;
let other: string;
let cutId: string; // Rs. 1,000, included in the plan
let colourId: string; // Rs. 4,000, discounted by the plan
let staffId: string;
let branchId: string;

async function signup(email: string) {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Feature Tester', email, password: 'secret-pass' });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

beforeAll(async () => {
  const category = await prisma.category.create({ data: { slug: 'feat-hair', name: 'Feature Hair' } });
  const mk = (slug: string, priceCents: number) =>
    prisma.service.create({
      data: { slug, name: slug, description: 'Feature test service', durationMins: 60, priceCents, categoryId: category.id },
    });
  const cut = await mk('feat-cut', 100_000);
  const colour = await mk('feat-colour', 400_000);
  cutId = cut.id;
  colourId = colour.id;
  branchId = (await prisma.location.create({ data: { slug: 'feat-branch', name: 'Feature Branch', addressLine1: '1 Test Rd', city: 'Kathmandu' } })).id;
  staffId = (
    await prisma.staff.create({
      data: {
        name: 'Feature Stylist',
        title: 'Stylist',
        locationId: branchId,
        services: { create: [{ serviceId: cut.id }, { serviceId: colour.id }] },
        workingHours: { create: [1, 2, 3, 4, 5, 6, 7].map(d => ({ dayOfWeek: d, startMinute: 540, endMinute: 1080 })) },
      },
    })
  ).id;

  await prisma.user.create({
    data: { name: 'Admin', email: 'feat-admin@test.dev', passwordHash: await bcrypt.hash('admin-pass', 4), role: Role.ADMIN },
  });
  adminToken = (await request(app).post('/api/auth/login').send({ email: 'feat-admin@test.dev', password: 'admin-pass' })).body
    .accessToken;
  member = await signup('member@test.dev');
  other = await signup('other-feat@test.dev');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('loyalty', () => {
  it('gives new customers a welcome bonus and Silver tier', async () => {
    const res = await request(app).get('/api/loyalty/me').set(auth(member));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ balance: 100, lifetime: 100, tier: { key: 'SILVER' }, nextTier: { key: 'GOLD' } });
    expect(res.body.history[0].reason).toBe('SIGNUP_BONUS');
  });

  it('publishes the programme rules', async () => {
    const res = await request(app).get('/api/loyalty/programme');
    expect(res.body).toMatchObject({ pointsPer100: 5, pointValue: 1, maxRedeemPercent: 50 });
    expect(res.body.tiers.map((t: { key: string }) => t.key)).toEqual(['SILVER', 'GOLD', 'PLATINUM']);
  });

  let bookingId: string;

  it('redeems points at booking, capped at the balance', async () => {
    const quote = await request(app).get('/api/bookings/quote').query({ serviceId: colourId, startAt: at('09:00') }).set(auth(other));
    expect(quote.body.points).toMatchObject({ balance: 100, maxRedeemable: 100 });

    const res = await request(app)
      .post('/api/bookings')
      .set(auth(other))
      .send({ serviceId: colourId, startAt: at('09:00'), redeemPoints: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({ price: 4000, discount: 100, total: 3900, pointsRedeemed: 100 });
    bookingId = res.body.booking.id;
    expect((await request(app).get('/api/loyalty/me').set(auth(other))).body.balance).toBe(0);
  });

  it('returns redeemed points when the booking is cancelled', async () => {
    await request(app).post(`/api/bookings/${bookingId}/cancel`).set(auth(other)).expect(200);
    const me = await request(app).get('/api/loyalty/me').set(auth(other));
    expect(me.body.balance).toBe(100);
    expect(me.body.history[0].reason).toBe('REFUNDED');
  });

  it('awards points once when a visit is completed, and takes them back if undone', async () => {
    const b = await request(app).post('/api/bookings').set(auth(other)).send({ serviceId: colourId, startAt: at('13:00') });
    const id = b.body.booking.id;
    const complete = () => request(app).patch(`/api/admin/bookings/${id}`).set(auth(adminToken)).send({ status: 'COMPLETED' });
    await complete().expect(200);
    await complete().expect(200); // idempotent
    // Rs. 4,000 paid → 40 × 5 = 200 points.
    expect((await request(app).get('/api/loyalty/me').set(auth(other))).body.balance).toBe(300);

    await request(app).patch(`/api/admin/bookings/${id}`).set(auth(adminToken)).send({ status: 'CONFIRMED' }).expect(200);
    expect((await request(app).get('/api/loyalty/me').set(auth(other))).body.balance).toBe(100);
  });

  it('lets admins adjust points but not below zero', async () => {
    const id = (await prisma.user.findUniqueOrThrow({ where: { email: 'other-feat@test.dev' } })).id;
    await request(app).post(`/api/admin/customers/${id}/loyalty`).set(auth(adminToken)).send({ points: 50, note: 'Goodwill' }).expect(200);
    const tooMuch = await request(app).post(`/api/admin/customers/${id}/loyalty`).set(auth(adminToken)).send({ points: -1000, note: 'Oops' });
    expect(tooMuch.status).toBe(400);
  });
});

describe('monthly packages', () => {
  let planId: string;
  let membershipId: string;

  it('lets admins create a plan with included services', async () => {
    const res = await request(app)
      .post('/api/admin/plans')
      .set(auth(adminToken))
      .send({
        name: 'Test Plan',
        slug: 'test-plan',
        description: 'A plan used in tests',
        price: 2999,
        discountPercent: 10,
        perks: ['Perk one'],
        items: [{ serviceId: cutId, quantity: 1 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.includes[0]).toMatchObject({ serviceId: cutId, quantity: 1, value: 1000 });
    planId = res.body.id;
    expect((await request(app).get('/api/plans')).body.some((p: { id: string }) => p.id === planId)).toBe(true);
  });

  it('creates a pending membership and blocks a second pending one', async () => {
    const res = await request(app).post('/api/memberships').set(auth(member)).send({ planId, locationId: branchId });
    expect(res.status).toBe(201);
    expect(res.body.membership).toMatchObject({ status: 'PENDING', price: 2999 });
    membershipId = res.body.membership.id;
    const again = await request(app).post('/api/memberships').set(auth(member)).send({ planId });
    expect(again.status).toBe(409);
  });

  it('gives no benefit until activated', async () => {
    const quote = await request(app).get('/api/bookings/quote').query({ serviceId: cutId, startAt: at('10:00') }).set(auth(member));
    expect(quote.body.membership).toBeNull();
  });

  it('applies included services free, then the percentage discount', async () => {
    const act = await request(app).post(`/api/admin/memberships/${membershipId}/activate`).set(auth(adminToken)).send({});
    expect(act.status).toBe(200);
    expect(act.body.membership.status).toBe('ACTIVE');

    const free = await request(app).post('/api/bookings').set(auth(member)).send({ serviceId: cutId, startAt: at('10:00') });
    expect(free.body.booking).toMatchObject({ price: 1000, discount: 1000, total: 0, membershipApplied: true });

    // The one included cut is used up, so the next one gets 10% off.
    const second = await request(app).post('/api/bookings').set(auth(member)).send({ serviceId: cutId, startAt: at('11:00') });
    expect(second.body.booking).toMatchObject({ discount: 100, total: 900 });

    const colour = await request(app).get('/api/bookings/quote').query({ serviceId: colourId, startAt: at('12:00') }).set(auth(member));
    expect(colour.body.membership).toMatchObject({ kind: 'discount', discount: 400 });

    const mine = await request(app).get('/api/memberships').set(auth(member));
    expect(mine.body[0].usage[0]).toMatchObject({ included: 1, used: 1, remaining: 0 });
  });

  it('renews an active package by one more period', async () => {
    const before = (await request(app).get('/api/memberships').set(auth(member))).body[0].endsAt;
    const res = await request(app).post(`/api/admin/memberships/${membershipId}/renew`).set(auth(adminToken));
    expect(new Date(res.body.membership.endsAt).getTime() - new Date(before).getTime()).toBe(30 * 86_400_000);
  });
});

describe('events', () => {
  let requestId: string;
  const eventDate = DateTime.now().setZone(zone).plus({ days: 30 }).toISODate()!;

  beforeAll(async () => {
    await request(app)
      .post('/api/admin/event-packages')
      .set(auth(adminToken))
      .send({ name: 'Test Bridal', slug: 'test-bridal', description: 'Bridal package for tests', fromPrice: 30000, minGuests: 1, maxGuests: 4 })
      .expect(201);
  });

  it('validates the request', async () => {
    const base = { packageId: 'test-bridal', guestCount: 2, contactPhone: '+977 9800000000', locationId: branchId };
    const past = await request(app).post('/api/event-requests').set(auth(member)).send({ ...base, eventDate: '2020-01-01' });
    expect(past.status).toBe(400);
    const tooMany = await request(app).post('/api/event-requests').set(auth(member)).send({ ...base, eventDate, guestCount: 9 });
    expect(tooMany.status).toBe(400);
    const nowhere = await request(app)
      .post('/api/event-requests')
      .set(auth(member))
      .send({ ...base, eventDate, locationId: undefined });
    expect(nowhere.status).toBe(400);
  });

  it('goes from request to quote to confirmed', async () => {
    const res = await request(app)
      .post('/api/event-requests')
      .set(auth(member))
      .send({ packageId: 'test-bridal', eventDate, startTime: '07:00', guestCount: 2, venue: 'Hotel Yak & Yeti', contactPhone: '+977 9800000000' });
    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({ status: 'NEW', canRespond: false });
    requestId = res.body.request.id;

    const quote = await request(app).post(`/api/admin/event-requests/${requestId}/quote`).set(auth(adminToken)).send({ price: 42000, note: 'Includes trial' });
    expect(quote.body.request).toMatchObject({ status: 'QUOTED', quotedPrice: 42000, canRespond: true });

    expect((await request(app).post(`/api/event-requests/${requestId}/accept`).set(auth(other))).status).toBe(404);
    const accepted = await request(app).post(`/api/event-requests/${requestId}/accept`).set(auth(member));
    expect(accepted.body.request.status).toBe('CONFIRMED');
    expect((await request(app).post(`/api/event-requests/${requestId}/decline`).set(auth(member))).status).toBe(400);
  });
});

describe('products', () => {
  let productId: string;

  it('shows products with the professionals who recommend them', async () => {
    const created = await request(app)
      .post('/api/admin/products')
      .set(auth(adminToken))
      .send({
        name: 'Test Serum',
        slug: 'test-serum',
        brand: 'Lalima Skin',
        category: 'Skin care',
        description: 'A serum used in tests',
        price: 2400,
        recommendations: [{ staffId, note: 'Use it daily' }],
        serviceIds: [cutId],
      });
    expect(created.status).toBe(201);
    productId = created.body.id;

    const byService = await request(app).get('/api/products').query({ serviceId: 'feat-cut' });
    expect(byService.body[0]).toMatchObject({ slug: 'test-serum', price: 2400 });
    expect(byService.body[0].recommendedBy[0]).toMatchObject({ name: 'Feature Stylist', note: 'Use it daily' });
  });

  it('reserves products for pickup, merging duplicate lines', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set(auth(member))
      .send({ locationId: branchId, items: [{ productId, quantity: 1 }, { productId, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.reservation).toMatchObject({ status: 'PENDING', total: 7200 });
    expect(res.body.reservation.items).toHaveLength(1);

    const ready = await request(app).patch(`/api/admin/reservations/${res.body.reservation.id}`).set(auth(adminToken)).send({ status: 'READY' });
    expect(ready.body.reservation.status).toBe('READY');
    const cancel = await request(app).post(`/api/reservations/${res.body.reservation.id}/cancel`).set(auth(member));
    expect(cancel.body.reservation.status).toBe('CANCELLED');
  });

  it('refuses out-of-stock products', async () => {
    await request(app).patch(`/api/admin/products/${productId}`).set(auth(adminToken)).send({ inStock: false }).expect(200);
    const res = await request(app).post('/api/reservations').set(auth(member)).send({ locationId: branchId, items: [{ productId, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/out of stock/);
  });

  it('reports to-do counts for the dashboard', async () => {
    const res = await request(app).get('/api/admin/inbox').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pendingMemberships');
    expect(res.body.upcomingEvents).toBeGreaterThanOrEqual(1);
  });
});
