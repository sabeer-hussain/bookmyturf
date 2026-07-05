import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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

  console.log(`Seeded ${plans.length} plans`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
