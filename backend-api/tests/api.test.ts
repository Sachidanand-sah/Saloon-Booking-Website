import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import { Role } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();
const zone = 'Asia/Kathmandu';
// Two days ahead keeps every slot clear of the minimum lead time and cancellation cutoff.
const date = DateTime.now().setZone(zone).plus({ days: 2 }).toISODate()!;
const localTime = (hhmm: string) => DateTime.fromISO(`${date}T${hhmm}`, { zone }).toUTC().toISO()!;

let serviceId: string;
let staffId: string;
let customerToken: string;
let otherToken: string;
let adminToken: string;

async function signup(email: string) {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Test User', email, password: 'secret-pass' });
  expect(res.status).toBe(201);
  return res.body as { accessToken: string; refreshToken: string; user: { id: string } };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const category = await prisma.category.create({ data: { slug: 'hair', name: 'Hair' } });
  const service = await prisma.service.create({
    data: {
      slug: 'cut',
      name: 'Haircut',
      description: 'A test haircut',
      durationMins: 60,
      priceCents: 3500,
      categoryId: category.id,
    },
  });
  const staff = await prisma.staff.create({
    data: {
      name: 'Test Stylist',
      title: 'Stylist',
      services: { create: { serviceId: service.id } },
      workingHours: { create: [1, 2, 3, 4, 5, 6, 7].map(d => ({ dayOfWeek: d, startMinute: 540, endMinute: 720 })) },
    },
  });
  serviceId = service.id;
  staffId = staff.id;

  customerToken = (await signup('customer@test.dev')).accessToken;
  otherToken = (await signup('other@test.dev')).accessToken;

  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@test.dev', passwordHash: await bcrypt.hash('admin-pass', 4), role: Role.ADMIN },
  });
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'admin-pass' });
  adminToken = login.body.accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth', () => {
  it('rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Dup', email: 'CUSTOMER@test.dev', password: 'secret-pass' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a wrong password without revealing which field was wrong', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'customer@test.dev', password: 'nope-nope' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password');
  });

  it('never returns the password hash', async () => {
    const res = await request(app).get('/api/auth/me').set(auth(customerToken));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('customer@test.dev');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('rotates refresh tokens and rejects reuse', async () => {
    const { refreshToken } = await signup('rotate@test.dev');
    const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(refreshToken);
    const reused = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reused.status).toBe(401);
  });

  it('requires a token for bookings', async () => {
    expect((await request(app).get('/api/bookings')).status).toBe(401);
  });
});

describe('catalog', () => {
  it('lists services with price in currency units', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.find((s: { slug: string }) => s.slug === 'cut')).toMatchObject({ name: 'Haircut', price: 35, durationMins: 60 });
  });

  it('finds a service by slug', async () => {
    const res = await request(app).get('/api/services/cut');
    expect(res.status).toBe(200);
    expect(res.body.staff).toHaveLength(1);
  });
});

describe('availability and booking', () => {
  it('offers slots inside working hours in salon time', async () => {
    const res = await request(app).get('/api/availability').query({ serviceId, date });
    expect(res.status).toBe(200);
    const starts = res.body.slots.map((s: { startAt: string }) => s.startAt);
    expect(starts[0]).toBe(new Date(localTime('09:00')).toISOString());
    // 09:00–12:00 shift, 60-minute service, 15-minute steps → last start 11:00.
    expect(starts.at(-1)).toBe(new Date(localTime('11:00')).toISOString());
    expect(starts).toHaveLength(9);
  });

  it('rejects dates in the past', async () => {
    const res = await request(app).get('/api/availability').query({ serviceId, date: '2020-01-01' });
    expect(res.status).toBe(400);
  });

  let bookingId: string;

  it('books a free slot', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(customerToken))
      .send({ serviceId, startAt: localTime('09:00') });
    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({ status: 'CONFIRMED', price: 35, canCancel: true });
    expect(res.body.booking.staff.id).toBe(staffId);
    bookingId = res.body.booking.id;
  });

  it('refuses an overlapping booking for the same stylist', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(otherToken))
      .send({ serviceId, startAt: localTime('09:30') });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SLOT_UNAVAILABLE');
  });

  it('refuses times outside working hours', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(otherToken))
      .send({ serviceId, startAt: localTime('11:30') });
    expect(res.status).toBe(409);
  });

  it('lets exactly one of two simultaneous requests win the same slot', async () => {
    const attempt = (token: string) =>
      request(app).post('/api/bookings').set(auth(token)).send({ serviceId, startAt: localTime('10:00') });
    const results = await Promise.all([attempt(customerToken), attempt(otherToken)]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  });

  it('hides booked times from availability', async () => {
    const res = await request(app).get('/api/availability').query({ serviceId, date });
    const starts: string[] = res.body.slots.map((s: { startAt: string }) => s.startAt);
    expect(starts).not.toContain(new Date(localTime('09:00')).toISOString());
    expect(starts).not.toContain(new Date(localTime('10:00')).toISOString());
    expect(starts).toContain(new Date(localTime('11:00')).toISOString());
  });

  it("doesn't let another customer see or cancel the booking", async () => {
    expect((await request(app).get(`/api/bookings/${bookingId}`).set(auth(otherToken))).status).toBe(403);
    expect((await request(app).post(`/api/bookings/${bookingId}/cancel`).set(auth(otherToken))).status).toBe(403);
  });

  it('reschedules to a free slot', async () => {
    const res = await request(app)
      .post(`/api/bookings/${bookingId}/reschedule`)
      .set(auth(customerToken))
      .send({ startAt: localTime('11:00') });
    expect(res.status).toBe(200);
    expect(new Date(res.body.booking.startAt).toISOString()).toBe(new Date(localTime('11:00')).toISOString());
  });

  it('cancels and frees the slot', async () => {
    const res = await request(app).post(`/api/bookings/${bookingId}/cancel`).set(auth(customerToken));
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('CANCELLED');

    const again = await request(app)
      .post('/api/bookings')
      .set(auth(otherToken))
      .send({ serviceId, startAt: localTime('11:00') });
    expect(again.status).toBe(201);
  });

  it('lists only the caller’s own upcoming bookings', async () => {
    const res = await request(app).get('/api/bookings').query({ scope: 'upcoming' }).set(auth(customerToken));
    expect(res.status).toBe(200);
    expect(res.body.every((b: { status: string }) => b.status === 'CONFIRMED')).toBe(true);
  });
});

describe('admin', () => {
  it('is forbidden to customers', async () => {
    expect((await request(app).get('/api/admin/stats').set(auth(customerToken))).status).toBe(403);
  });

  it('returns dashboard stats and bookings for admins', async () => {
    const stats = await request(app).get('/api/admin/stats').set(auth(adminToken));
    expect(stats.status).toBe(200);
    expect(stats.body.customers.total).toBeGreaterThanOrEqual(2);

    const list = await request(app).get('/api/admin/bookings').query({ from: date, to: date }).set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);
    expect(list.body.items[0].customer.email).toBeDefined();
  });

  it('updates working hours and rejects overlapping shifts', async () => {
    const bad = await request(app)
      .put(`/api/admin/staff/${staffId}/hours`)
      .set(auth(adminToken))
      .send([
        { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
        { dayOfWeek: 1, startMinute: 700, endMinute: 800 },
      ]);
    expect(bad.status).toBe(400);
  });
});

describe('branches', () => {
  let branchA: string;
  let branchB: string;
  let staffB: string;

  beforeAll(async () => {
    branchA = (await prisma.location.create({ data: { slug: 'north', name: 'North', addressLine1: '1 North St', city: 'Town' } })).id;
    branchB = (await prisma.location.create({ data: { slug: 'south', name: 'South', addressLine1: '2 South St', city: 'Town' } })).id;
    await prisma.staff.update({ where: { id: staffId }, data: { locationId: branchA } });
    staffB = (
      await prisma.staff.create({
        data: {
          name: 'South Stylist',
          title: 'Stylist',
          locationId: branchB,
          services: { create: { serviceId } },
          workingHours: { create: [1, 2, 3, 4, 5, 6, 7].map(d => ({ dayOfWeek: d, startMinute: 540, endMinute: 720 })) },
        },
      })
    ).id;
  });

  it('lists active branches with hours and team size', async () => {
    const res = await request(app).get('/api/locations');
    expect(res.status).toBe(200);
    const south = res.body.find((l: { slug: string }) => l.slug === 'south');
    expect(south).toMatchObject({ name: 'South', staffCount: 1, serviceIds: [serviceId] });
    expect(south.openingHours).toHaveLength(7);
  });

  it('returns a branch with its team and services', async () => {
    const res = await request(app).get('/api/locations/south');
    expect(res.status).toBe(200);
    expect(res.body.staff.map((s: { id: string }) => s.id)).toEqual([staffB]);
    expect(res.body.services[0].id).toBe(serviceId);
  });

  it('limits availability to stylists at the chosen branch', async () => {
    const res = await request(app).get('/api/availability').query({ serviceId, date, locationId: 'south' });
    expect(res.status).toBe(200);
    expect(res.body.staff.map((s: { id: string }) => s.id)).toEqual([staffB]);
  });

  it('records the branch on the booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(customerToken))
      .send({ serviceId, startAt: localTime('09:15'), locationId: branchB });
    expect(res.status).toBe(201);
    expect(res.body.booking.staff.id).toBe(staffB);
    expect(res.body.booking.location).toMatchObject({ slug: 'south', addressLine1: '2 South St' });
  });

  it('hides deactivated branches and their stylists', async () => {
    const off = await request(app).delete(`/api/admin/locations/${branchB}`).set(auth(adminToken));
    expect(off.status).toBe(204);
    expect((await request(app).get('/api/locations/south')).status).toBe(404);
    const res = await request(app).get('/api/availability').query({ serviceId, date, locationId: 'south' });
    expect(res.body.slots).toEqual([]);
  });

  it('lets admins create branches and rejects bad input', async () => {
    const bad = await request(app).post('/api/admin/locations').set(auth(adminToken)).send({ name: 'X' });
    expect(bad.status).toBe(400);
    const ok = await request(app)
      .post('/api/admin/locations')
      .set(auth(adminToken))
      .send({ name: 'East', slug: 'east', addressLine1: '3 East St', city: 'Town', latitude: 27.7, longitude: 85.3, imageUrl: '/images/branches/east.jpg' });
    expect(ok.status).toBe(201);
    expect(ok.body.imageUrl).toBe('/images/branches/east.jpg');
  });
});
