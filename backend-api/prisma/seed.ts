/**
 * Development seed: catalog, stylists, demo accounts and a few bookings/reviews.
 * Safe to re-run — it wipes and recreates everything.
 */
import { BookingStatus, PrismaClient, Role, type Service, type Staff } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import 'dotenv/config';
import { clearExtras, seedExtras } from './seed-extras';

const prisma = new PrismaClient();
const zone = process.env.SALON_TIMEZONE || 'UTC';
const h = (hour: number, minute = 0) => hour * 60 + minute;

const categories = [
  { slug: 'hair', name: 'Hair', description: 'Cuts, colour and styling by senior stylists.', sortOrder: 1 },
  { slug: 'skin', name: 'Skin & Brows', description: 'Facials and treatments for healthy, glowing skin.', sortOrder: 2 },
  { slug: 'nails', name: 'Nails', description: 'Manicures and pedicures with long-lasting finishes.', sortOrder: 3 },
  { slug: 'spa', name: 'Spa & Massage', description: 'Unwind with restorative body treatments.', sortOrder: 4 },
];

const services = [
  { slug: 'precision-haircut', category: 'hair', name: 'Precision Haircut', price: 800, durationMins: 45, isFeatured: true,
    description: 'Consultation, wash, expert cut tailored to your face shape and lifestyle, and a finishing style.' },
  { slug: 'blow-dry', category: 'hair', name: 'Blow-dry & Style', price: 600, durationMins: 30,
    description: 'Smooth, voluminous blow-dry or soft waves — perfect before an event.' },
  { slug: 'balayage', category: 'hair', name: 'Balayage', price: 8500, durationMins: 150, isFeatured: true,
    description: 'Hand-painted, natural-looking highlights with toner and gloss for a sun-kissed finish.' },
  { slug: 'root-colour', category: 'hair', name: 'Root Colour', price: 3500, durationMins: 90,
    description: 'Seamless regrowth coverage using ammonia-free professional colour.' },
  { slug: 'keratin-treatment', category: 'hair', name: 'Keratin Smoothing', price: 9000, durationMins: 120,
    description: 'Frizz-free, glossy hair for up to three months.' },
  { slug: 'glow-facial', category: 'skin', name: 'Glow Facial', price: 2500, durationMins: 60, isFeatured: true,
    description: 'Deep cleanse, gentle exfoliation, extraction and hydrating mask for radiant skin.' },
  { slug: 'hydra-facial', category: 'skin', name: 'Hydra Facial', price: 5500, durationMins: 75,
    description: 'Multi-step resurfacing and infusion treatment for instantly plumper skin.' },
  { slug: 'brow-shape-tint', category: 'skin', name: 'Eyebrow Threading & Tint', price: 400, durationMins: 30,
    description: 'Traditional threading for clean, defined brows, finished with a custom tint.' },
  { slug: 'gel-manicure', category: 'nails', name: 'Gel Manicure', price: 1500, durationMins: 45, isFeatured: true,
    description: 'Cuticle care, shaping and chip-resistant gel colour that lasts up to three weeks.' },
  { slug: 'spa-pedicure', category: 'nails', name: 'Spa Pedicure', price: 1800, durationMins: 60,
    description: 'Warm soak, exfoliation, massage and polish for soft, refreshed feet.' },
  { slug: 'aromatherapy-massage', category: 'spa', name: 'Aromatherapy Massage', price: 3500, durationMins: 60, isFeatured: true,
    description: 'Full-body massage with essential oils to relax muscles and calm the mind.' },
  { slug: 'hot-stone-massage', category: 'spa', name: 'Hot Stone Massage', price: 4500, durationMins: 75,
    description: 'Heated basalt stones melt away deep tension.' },
];

// Sun–Fri 09:00–18:00 with a lunch break, Saturday 10:00–16:00 (ISO: 1 = Mon … 7 = Sun).
const fullWeek = [7, 1, 2, 3, 4, 5].flatMap(d => [
  { dayOfWeek: d, startMinute: h(9), endMinute: h(13) },
  { dayOfWeek: d, startMinute: h(14), endMinute: h(18) },
]).concat([{ dayOfWeek: 6, startMinute: h(10), endMinute: h(16) }]);
// Late shift 11:00–19:00, day off Tuesday.
const lateWeek = [7, 1, 3, 4, 5, 6].map(d => ({ dayOfWeek: d, startMinute: h(11), endMinute: h(19) }));

// Demo branches in the Kathmandu valley — replace with your real addresses in Admin → Branches.
const branches = [
  {
    slug: 'baneshwor', name: 'Lalima Baneshwor', sortOrder: 1,
    description: 'Our flagship studio at New Baneshwor: a light-filled space with private rooms for facials and massage.',
    addressLine1: 'New Baneshwor Road', addressLine2: 'Near New Baneshwor Chowk', city: 'Kathmandu-10, 44600',
    phone: '+977 1-5550101', email: 'baneshwor@lalimabeauty.com.np', latitude: 27.6893, longitude: 85.3356,
    imageUrl: '/images/branches/baneshwor.jpg',
  },
  {
    slug: 'jhamsikhel', name: 'Lalima Jhamsikhel', sortOrder: 2,
    description: 'A relaxed neighbourhood salon in the heart of Jhamsikhel, known for colour and nail art.',
    addressLine1: 'Jhamsikhel Road', addressLine2: 'Near Sanepa Chowk', city: 'Lalitpur-3, 44700',
    phone: '+977 1-5550102', email: 'jhamsikhel@lalimabeauty.com.np', latitude: 27.6783, longitude: 85.3065,
    imageUrl: '/images/branches/jhamsikhel.jpg',
  },
  {
    slug: 'durbar-marg', name: 'Lalima Durbar Marg', sortOrder: 3,
    description: 'Our boutique city-centre lounge for express styling, manicures and after-work spa rituals.',
    addressLine1: 'Durbar Marg', addressLine2: 'Second floor, Marg Arcade', city: 'Kathmandu 44600',
    phone: '+977 1-5550103', email: 'durbarmarg@lalimabeauty.com.np', latitude: 27.7112, longitude: 85.3173,
    imageUrl: '/images/branches/durbar-marg.jpg',
  },
];

const staff = [
  { name: 'Sunita Shrestha', title: 'Creative Director', categories: ['hair'], hours: fullWeek, email: 'sunita@lalima.test', branch: 'baneshwor',
    bio: 'Fifteen years of colour and cutting experience in Kathmandu and Delhi; balayage specialist.' },
  { name: 'Anisha Maharjan', title: 'Senior Stylist', categories: ['hair'], hours: lateWeek, branch: 'jhamsikhel',
    bio: 'Precision cuts, smoothing treatments and red-carpet styling.' },
  { name: 'Pooja Gurung', title: 'Skin Therapist', categories: ['skin', 'spa'], hours: fullWeek, branch: 'baneshwor',
    bio: 'Licensed aesthetician focused on results-driven facials.' },
  { name: 'Sabina Tamang', title: 'Nail Artist', categories: ['nails', 'skin'], hours: lateWeek, branch: 'jhamsikhel',
    bio: 'Gel, nail art and the most relaxing pedicure in the valley.' },
  { name: 'Rojina Rai', title: 'Senior Stylist', categories: ['hair', 'nails'], hours: lateWeek, branch: 'durbar-marg',
    bio: 'Fast, flawless blow-dries and minimalist nail looks for busy schedules.' },
  { name: 'Kabita Magar', title: 'Spa Therapist', categories: ['spa', 'skin'], hours: fullWeek, branch: 'durbar-marg',
    bio: 'Hot stone and aromatherapy specialist with a calming, intuitive touch.' },
];

async function main() {
  await clearExtras(prisma);
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.workingHours.deleteMany(),
    prisma.staffService.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.membershipPlanItem.deleteMany(),
    prisma.membershipPlan.deleteMany(),
    prisma.service.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
    prisma.location.deleteMany(),
  ]);

  const branchIds = new Map<string, string>();
  for (const b of branches) branchIds.set(b.slug, (await prisma.location.create({ data: b })).id);

  const catIds = new Map<string, string>();
  for (const c of categories) catIds.set(c.slug, (await prisma.category.create({ data: c })).id);

  const createdServices: Service[] = [];
  for (const { category, price, ...s } of services) {
    createdServices.push(
      await prisma.service.create({ data: { ...s, priceCents: price * 100, categoryId: catIds.get(category)!, imageUrl: `/images/services/${s.slug}.jpg` } }),
    );
  }

  const hash = (p: string) => bcrypt.hash(p, 10);
  await prisma.user.create({
    data: { name: 'Salon Manager', email: 'admin@lalima.test', passwordHash: await hash('Admin@12345'), role: Role.ADMIN },
  });
  const customers = await Promise.all(
    [
      { name: 'Aashish Karki', email: 'hello@example.com', phone: '+977 9800000001' },
      { name: 'Priya Sharma', email: 'priya@example.com', phone: '+977 9800000002' },
      { name: 'Srijana Thapa', email: 'srijana@example.com', phone: '+977 9800000003' },
    ].map(async c => prisma.user.create({ data: { ...c, passwordHash: await hash('password123') } })),
  );

  const createdStaff: Staff[] = [];
  for (const { categories: cats, hours, email, branch, ...s } of staff) {
    const user = email
      ? await prisma.user.create({ data: { name: s.name, email, passwordHash: await hash('Staff@12345'), role: Role.STAFF } })
      : null;
    createdStaff.push(
      await prisma.staff.create({
        data: {
          ...s,
          userId: user?.id,
          locationId: branchIds.get(branch),
          workingHours: { create: hours },
          services: {
            create: createdServices
              .filter(svc => cats.some(c => catIds.get(c) === svc.categoryId))
              .map(svc => ({ serviceId: svc.id })),
          },
        },
      }),
    );
  }

  // Past visits with reviews (homepage testimonials) and a couple of upcoming appointments.
  const today = DateTime.now().setZone(zone).startOf('day');
  const past = [
    { c: 0, s: 'precision-haircut', st: 0, daysAgo: 12, at: h(10), rating: 5, comment: 'Best haircut I have had in years. Sunita didi really listened to what I wanted.' },
    { c: 1, s: 'glow-facial', st: 2, daysAgo: 9, at: h(15), rating: 5, comment: 'My skin was glowing for days. Calm, spotless studio and lovely staff.' },
    { c: 2, s: 'gel-manicure', st: 3, daysAgo: 6, at: h(12), rating: 4, comment: 'Beautiful nails that lasted nearly three weeks. Will be back!' },
    { c: 1, s: 'balayage', st: 0, daysAgo: 20, at: h(9), rating: 5, comment: 'The balayage is exactly the soft, natural blend I hoped for.' },
    { c: 0, s: 'aromatherapy-massage', st: 2, daysAgo: 3, at: h(16), rating: 5, comment: 'Pure relaxation from start to finish.' },
  ];
  const upcoming = [
    { c: 0, s: 'blow-dry', st: 1, daysAhead: 3, at: h(12) },
    { c: 2, s: 'hydra-facial', st: 2, daysAhead: 4, at: h(10) },
  ];

  const svc = (slug: string) => createdServices.find(s => s.slug === slug)!;
  const book = (c: number, slug: string, st: number, start: DateTime, status: BookingStatus) =>
    prisma.booking.create({
      data: {
        customerId: customers[c].id,
        serviceId: svc(slug).id,
        staffId: createdStaff[st].id,
        locationId: createdStaff[st].locationId,
        startAt: start.toJSDate(),
        endAt: start.plus({ minutes: svc(slug).durationMins }).toJSDate(),
        priceCents: svc(slug).priceCents,
        status,
      },
    });

  for (const p of past) {
    const b = await book(p.c, p.s, p.st, today.minus({ days: p.daysAgo }).plus({ minutes: p.at }), BookingStatus.COMPLETED);
    await prisma.review.create({ data: { bookingId: b.id, customerId: b.customerId, rating: p.rating, comment: p.comment } });
  }
  for (const u of upcoming) {
    await book(u.c, u.s, u.st, today.plus({ days: u.daysAhead }).plus({ minutes: u.at }), BookingStatus.CONFIRMED);
  }

  const extras = await seedExtras(prisma, {
    services: createdServices,
    staff: createdStaff,
    customers,
    branches: await prisma.location.findMany(),
    zone,
  });
  console.log(`Seeded ${extras.plans} packages, ${extras.events} event packages, ${extras.products} products.`);
  console.log(`Seeded ${branches.length} branches, ${services.length} services, ${staff.length} stylists, ${customers.length} customers.`);
  console.log('Logins: admin@lalima.test / Admin@12345 · sunita@lalima.test / Staff@12345 · hello@example.com / password123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
