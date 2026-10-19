/**
 * Demo data for monthly packages, loyalty, events and products. Called from seed.ts.
 */
import {
  BookingStatus,
  EventRequestStatus,
  LoyaltyReason,
  MembershipStatus,
  ReservationStatus,
  type Location,
  type PrismaClient,
  type Service,
  type Staff,
  type User,
} from '@prisma/client';
import { DateTime } from 'luxon';

const rs = (rupees: number) => rupees * 100;

export async function clearExtras(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.reservationItem.deleteMany(),
    prisma.productReservation.deleteMany(),
    prisma.productService.deleteMany(),
    prisma.productRecommendation.deleteMany(),
    prisma.product.deleteMany(),
    prisma.eventRequest.deleteMany(),
    prisma.eventPackage.deleteMany(),
    prisma.loyaltyTransaction.deleteMany(),
  ]);
  // Bookings reference memberships, so they are deleted first by the main seed.
}

export async function seedExtras(
  prisma: PrismaClient,
  ctx: { services: Service[]; staff: Staff[]; customers: User[]; branches: Location[]; zone: string },
) {
  const svc = (slug: string) => ctx.services.find(s => s.slug === slug)!;
  const staffNamed = (first: string) => ctx.staff.find(s => s.name.startsWith(first))!;
  const branch = (slug: string) => ctx.branches.find(b => b.slug === slug)!;

  // ---------- Monthly packages ----------
  const plans = [
    {
      slug: 'glow-essentials',
      name: 'Glow Essentials',
      tagline: 'Effortless upkeep, every month',
      description: 'Your monthly basics covered: fresh blow-dries and neat brows, plus savings on everything else.',
      priceCents: rs(2999),
      discountPercent: 10,
      sortOrder: 1,
      perks: ['10% off all other services', 'Priority weekend slots', 'Double points on your birthday month'],
      items: [
        { serviceId: svc('blow-dry').id, quantity: 2 },
        { serviceId: svc('brow-shape-tint').id, quantity: 1 },
      ],
    },
    {
      slug: 'radiance',
      name: 'Radiance',
      tagline: 'Our most popular package',
      description: 'A monthly facial, nails and styling: the complete glow routine at a members-only price.',
      priceCents: rs(5999),
      discountPercent: 15,
      isFeatured: true,
      sortOrder: 2,
      perks: ['15% off all other services', 'Free eyebrow threading anytime', 'Priority booking at every branch'],
      items: [
        { serviceId: svc('glow-facial').id, quantity: 1 },
        { serviceId: svc('blow-dry').id, quantity: 2 },
        { serviceId: svc('gel-manicure').id, quantity: 1 },
      ],
    },
    {
      slug: 'lalima-signature',
      name: 'Lalima Signature',
      tagline: 'The full luxury ritual',
      description: 'Our most indulgent membership: a monthly hydra facial and massage, styling and pedicure, with the biggest savings.',
      priceCents: rs(11999),
      discountPercent: 20,
      sortOrder: 3,
      perks: ['20% off all other services', 'Complimentary welcome kit', 'Dedicated stylist & priority booking'],
      items: [
        { serviceId: svc('hydra-facial').id, quantity: 1 },
        { serviceId: svc('aromatherapy-massage').id, quantity: 1 },
        { serviceId: svc('blow-dry').id, quantity: 4 },
        { serviceId: svc('spa-pedicure').id, quantity: 1 },
      ],
    },
  ];
  const createdPlans = [];
  for (const { items, ...p } of plans) {
    createdPlans.push(await prisma.membershipPlan.create({ data: { ...p, items: { create: items } } }));
  }

  // Aashish has an active Radiance membership; Srijana's is waiting for payment.
  const now = DateTime.now().setZone(ctx.zone);
  await prisma.membership.create({
    data: {
      userId: ctx.customers[0].id,
      planId: createdPlans[1].id,
      locationId: branch('baneshwor').id,
      status: MembershipStatus.ACTIVE,
      priceCents: createdPlans[1].priceCents,
      startsAt: now.minus({ days: 5 }).toJSDate(),
      endsAt: now.plus({ days: 25 }).toJSDate(),
      note: 'Paid in cash at Baneshwor',
    },
  });
  await prisma.membership.create({
    data: {
      userId: ctx.customers[2].id,
      planId: createdPlans[0].id,
      locationId: branch('jhamsikhel').id,
      priceCents: createdPlans[0].priceCents,
    },
  });

  // ---------- Loyalty: welcome bonus + points for past completed visits ----------
  for (const c of ctx.customers) {
    await prisma.loyaltyTransaction.create({
      data: { userId: c.id, points: 100, reason: LoyaltyReason.SIGNUP_BONUS, note: 'Welcome to the loyalty programme' },
    });
  }
  const completed = await prisma.booking.findMany({ where: { status: BookingStatus.COMPLETED } });
  for (const b of completed) {
    const points = Math.floor(((b.priceCents - b.discountCents) / 100 / 100) * 5);
    await prisma.loyaltyTransaction.create({
      data: { userId: b.customerId, points, reason: LoyaltyReason.EARNED, bookingId: b.id, createdAt: b.endAt },
    });
  }
  // Priya is a regular: enough history to be Gold.
  await prisma.loyaltyTransaction.create({
    data: { userId: ctx.customers[1].id, points: 950, reason: LoyaltyReason.EARNED, note: 'Visits before online booking' },
  });
  for (const c of ctx.customers) {
    const sum = await prisma.loyaltyTransaction.aggregate({ where: { userId: c.id }, _sum: { points: true } });
    await prisma.user.update({ where: { id: c.id }, data: { loyaltyPoints: sum._sum.points ?? 0 } });
  }

  // ---------- Events ----------
  const events = [
    {
      slug: 'bridal-glam',
      name: 'Bridal Glam',
      description:
        'Your wedding-day look, perfected. HD bridal makeup, hairstyling and saree or lehenga draping by our senior artists, with a trial session beforehand.',
      fromPriceCents: rs(35000),
      includes: ['Pre-bridal consultation & trial', 'HD airbrush bridal makeup', 'Hairstyling with accessories', 'Saree / lehenga draping', 'Touch-up kit for the day'],
      minGuests: 1,
      maxGuests: 6,
      imageUrl: '/images/events/bridal-glam.jpg',
      sortOrder: 1,
    },
    {
      slug: 'bridal-party',
      name: 'Bridal Party & Mehendi',
      description:
        'Get the whole party ready together: makeup and hair for bridesmaids and family for mehendi, sangeet or the reception.',
      fromPriceCents: rs(25000),
      includes: ['Makeup & hairstyling for each guest', 'Group scheduling so everyone is ready on time', 'Coordinated looks with the bride'],
      minGuests: 3,
      maxGuests: 20,
      imageUrl: '/images/events/bridal-party.jpg',
      sortOrder: 2,
    },
    {
      slug: 'festival-group',
      name: 'Teej & Festival Styling',
      description:
        'Celebrate Teej, Dashain or Tihar in style. Group makeup, hair and mehendi for friends and family, at our studio or at your home.',
      fromPriceCents: rs(12000),
      includes: ['Festive makeup & hairstyling', 'Mehendi designs', 'Saree draping', 'At-studio or on-site at your venue'],
      minGuests: 4,
      maxGuests: 30,
      imageUrl: '/images/events/festival-group.jpg',
      sortOrder: 3,
    },
    {
      slug: 'photoshoot-corporate',
      name: 'Photoshoot & Corporate',
      description:
        'Camera-ready looks for photoshoots, headshots, launches and corporate events, on location or at the studio.',
      fromPriceCents: rs(15000),
      includes: ['Camera-ready makeup & grooming', 'Hair styling for each look', 'Touch-ups during the shoot'],
      minGuests: 1,
      maxGuests: 50,
      imageUrl: '/images/events/photoshoot-corporate.jpg',
      sortOrder: 4,
    },
  ];
  const createdEvents = [];
  for (const e of events) createdEvents.push(await prisma.eventPackage.create({ data: e }));

  const inDays = (d: number) => now.plus({ days: d }).toISODate()!;
  await prisma.eventRequest.create({
    data: {
      userId: ctx.customers[1].id,
      packageId: createdEvents[0].id,
      locationId: branch('baneshwor').id,
      eventDate: inDays(45),
      startTime: '07:00',
      guestCount: 3,
      notes: 'Bride plus mother and sister. Morning ceremony, red lehenga.',
      contactPhone: '+977 9800000002',
      status: EventRequestStatus.QUOTED,
      quotedPriceCents: rs(48000),
      quoteNote: 'Includes trial two weeks before, and makeup and hair for 2 family members.',
      quotedAt: now.minus({ days: 1 }).toJSDate(),
    },
  });
  await prisma.eventRequest.create({
    data: {
      userId: ctx.customers[2].id,
      packageId: createdEvents[2].id,
      eventDate: inDays(20),
      startTime: '10:00',
      guestCount: 8,
      venue: 'Family home, Budhanilkantha',
      notes: 'Teej celebration with friends. Mehendi for everyone.',
      contactPhone: '+977 9800000003',
    },
  });

  // ---------- Products recommended by our professionals ----------
  const products = [
    {
      slug: 'argan-repair-hair-oil', name: 'Argan Repair Hair Oil', brand: 'Lalima Professional', category: 'Hair care',
      price: 1850, isFeatured: true,
      description: 'Lightweight argan and camellia oil that tames frizz, adds shine and protects colour-treated hair.',
      howToUse: 'Warm 2–3 drops between palms and smooth through mid-lengths and ends, damp or dry.',
      recs: [['Sunita', 'My go-to after every balayage: it keeps the tone glossy for weeks.']],
      services: ['balayage', 'precision-haircut', 'blow-dry'],
    },
    {
      slug: 'colour-protect-shampoo', name: 'Colour Protect Shampoo', brand: 'Lalima Professional', category: 'Hair care',
      price: 1450,
      description: 'Sulphate-free cleanser that keeps colour vibrant and hair soft, even with Kathmandu hard water.',
      howToUse: 'Massage into wet hair, rinse, repeat if needed. Follow with conditioner.',
      recs: [['Sunita', 'Use this for the first month after any colour service.']],
      services: ['root-colour', 'balayage'],
    },
    {
      slug: 'keratin-smooth-conditioner', name: 'Keratin Smooth Conditioner', brand: 'Lalima Professional', category: 'Hair care',
      price: 1650,
      description: 'Keratin-infused conditioner that extends smoothing treatments and fights humidity during monsoon.',
      howToUse: 'Apply to lengths after shampooing, leave 2 minutes, rinse with cool water.',
      recs: [['Anisha', 'Makes your keratin last up to a month longer.']],
      services: ['keratin-treatment'],
    },
    {
      slug: 'vitamin-c-glow-serum', name: 'Vitamin C Glow Serum', brand: 'Lalima Skin', category: 'Skin care',
      price: 2400, isFeatured: true,
      description: 'Stabilised 15% vitamin C with hyaluronic acid to brighten dull skin and even out tone.',
      howToUse: 'Apply 3–4 drops to clean skin every morning, before moisturiser and sunscreen.',
      recs: [['Pooja', 'Keeps your post-facial glow going between appointments.']],
      services: ['glow-facial', 'hydra-facial'],
    },
    {
      slug: 'hydrating-gel-moisturiser', name: 'Hydrating Gel Moisturiser', brand: 'Lalima Skin', category: 'Skin care',
      price: 1950,
      description: 'Oil-free gel cream with ceramides and aloe. Hydrates without heaviness; ideal for combination skin.',
      howToUse: 'Smooth over face and neck morning and evening.',
      recs: [['Pooja', 'Perfect for our climate: light in summer, enough in winter.']],
      services: ['hydra-facial', 'glow-facial'],
    },
    {
      slug: 'mineral-sunscreen-spf50', name: 'Mineral Sunscreen SPF 50', brand: 'Lalima Skin', category: 'Skin care',
      price: 1550, isFeatured: true,
      description: 'Broad-spectrum zinc sunscreen with no white cast. Essential protection at Kathmandu altitude.',
      howToUse: 'Apply generously as the last step of your morning routine; reapply every 2–3 hours outdoors.',
      recs: [['Pooja', 'The one product I tell every client to use daily.'], ['Kabita', 'Wear it after every facial.']],
      services: ['glow-facial', 'hydra-facial', 'brow-shape-tint'],
    },
    {
      slug: 'cuticle-nourishing-oil', name: 'Cuticle Nourishing Oil', brand: 'Lalima Nails', category: 'Nail care',
      price: 750,
      description: 'Jojoba and vitamin E pen that keeps cuticles soft and helps gel manicures last longer.',
      howToUse: 'Brush onto cuticles daily and massage in.',
      recs: [['Sabina', 'Two swipes a day and your gel will stay perfect for three weeks.']],
      services: ['gel-manicure', 'spa-pedicure'],
    },
    {
      slug: 'lavender-body-oil', name: 'Lavender Relaxing Body Oil', brand: 'Lalima Spa', category: 'Body & spa',
      price: 1350,
      description: 'Our massage blend of lavender, chamomile and sweet almond oil, to bring the spa home.',
      howToUse: 'Massage into damp skin after a warm shower, or add a few drops to your bath.',
      recs: [['Kabita', 'The same oil we use in our aromatherapy massage.']],
      services: ['aromatherapy-massage', 'hot-stone-massage'],
    },
  ];
  const createdProducts = [];
  for (const { price, recs, services, ...p } of products) {
    createdProducts.push(
      await prisma.product.create({
        data: {
          ...p,
          priceCents: rs(price),
          imageUrl: `/images/products/${p.slug}.jpg`,
          recommendations: { create: recs.map(([who, note]) => ({ staffId: staffNamed(who).id, note })) },
          services: { create: services.map(s => ({ serviceId: svc(s).id })) },
        },
      }),
    );
  }

  await prisma.productReservation.create({
    data: {
      userId: ctx.customers[0].id,
      locationId: branch('baneshwor').id,
      status: ReservationStatus.READY,
      totalCents: createdProducts[0].priceCents + createdProducts[5].priceCents,
      items: {
        create: [
          { productId: createdProducts[0].id, quantity: 1, priceCents: createdProducts[0].priceCents },
          { productId: createdProducts[5].id, quantity: 1, priceCents: createdProducts[5].priceCents },
        ],
      },
    },
  });

  return { plans: createdPlans.length, events: createdEvents.length, products: createdProducts.length };
}
