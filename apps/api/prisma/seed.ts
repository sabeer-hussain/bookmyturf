import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await seedPlans();
  await seedSports();

  console.log('Seeding complete!');
}

async function seedPlans() {
  console.log('Seeding plans...');

  const plans = [
    {
      id: 'plan-starter',
      name: 'Starter',
      description: 'Perfect for single-venue turf owners getting started',
      monthlyPrice: 999,
      annualPrice: 9990,
      commissionRate: 8,
      maxVenues: 3,
      maxCourts: 5,
      maxStaff: 3,
      features: {
        booking: true,
        analytics: false,
        whatsappNotifications: false,
        emailNotifications: true,
        customBranding: false,
        prioritySupport: false,
      },
    },
    {
      id: 'plan-pro',
      name: 'Pro',
      description: 'For growing turf businesses with multiple courts',
      monthlyPrice: 2499,
      annualPrice: 24990,
      commissionRate: 5,
      maxVenues: 10,
      maxCourts: 25,
      maxStaff: 10,
      features: {
        booking: true,
        analytics: true,
        whatsappNotifications: true,
        emailNotifications: true,
        customBranding: true,
        prioritySupport: false,
      },
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise',
      description: 'Unlimited access for large sports facility chains',
      monthlyPrice: 4999,
      annualPrice: 49990,
      commissionRate: 3,
      maxVenues: 999,
      maxCourts: 999,
      maxStaff: 999,
      features: {
        booking: true,
        analytics: true,
        whatsappNotifications: true,
        emailNotifications: true,
        customBranding: true,
        prioritySupport: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  console.log(`  ✓ ${plans.length} plans seeded`);
}

async function seedSports() {
  console.log('Seeding sports...');

  const sports = [
    { name: 'Cricket', icon: 'cricket' },
    { name: 'Box Cricket', icon: 'box-cricket' },
    { name: 'Football', icon: 'football' },
    { name: 'Futsal', icon: 'futsal' },
    { name: 'Badminton', icon: 'badminton' },
    { name: 'Pickleball', icon: 'pickleball' },
    { name: 'Tennis', icon: 'tennis' },
    { name: 'Basketball', icon: 'basketball' },
    { name: 'Volleyball', icon: 'volleyball' },
    { name: 'Table Tennis', icon: 'table-tennis' },
  ];

  for (const sport of sports) {
    await prisma.sport.upsert({
      where: { name: sport.name },
      update: { icon: sport.icon },
      create: sport,
    });
  }

  console.log(`  ✓ ${sports.length} sports seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
