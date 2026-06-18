import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed Sports
  const sports = [
    { name: 'Cricket', icon: 'cricket' },
    { name: 'Football', icon: 'football' },
    { name: 'Badminton', icon: 'badminton' },
    { name: 'Tennis', icon: 'tennis' },
    { name: 'Basketball', icon: 'basketball' },
    { name: 'Volleyball', icon: 'volleyball' },
    { name: 'Box Cricket', icon: 'box-cricket' },
    { name: 'Futsal', icon: 'futsal' },
    { name: 'Table Tennis', icon: 'table-tennis' },
    { name: 'Pickleball', icon: 'pickleball' },
  ];

  for (const sport of sports) {
    await prisma.sport.upsert({
      where: { name: sport.name },
      update: {},
      create: sport,
    });
  }
  console.log('Seeded sports');

  // Seed Subscription Plans
  const plans = [
    {
      name: 'Starter',
      description: 'For small turfs getting started',
      monthlyPrice: 999,
      annualPrice: 9999,
      commissionRate: 8.0,
      maxVenues: 1,
      maxCourts: 2,
      maxStaff: 3,
      features: ['basic_analytics', 'email_notifications'],
    },
    {
      name: 'Pro',
      description: 'For growing turf businesses',
      monthlyPrice: 2499,
      annualPrice: 24999,
      commissionRate: 5.0,
      maxVenues: 3,
      maxCourts: 10,
      maxStaff: 10,
      features: ['analytics', 'whatsapp', 'email', 'staff_management', 'custom_branding'],
    },
    {
      name: 'Enterprise',
      description: 'For multi-location turf chains',
      monthlyPrice: 4999,
      annualPrice: 49999,
      commissionRate: 3.0,
      maxVenues: 10,
      maxCourts: 50,
      maxStaff: 50,
      features: [
        'advanced_analytics',
        'whatsapp',
        'email',
        'staff_management',
        'custom_branding',
        'api_access',
        'priority_support',
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.name.toLowerCase() },
      update: {},
      create: { id: plan.name.toLowerCase(), ...plan },
    });
  }
  console.log('Seeded plans');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
