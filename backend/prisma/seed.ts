import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create default templates
  const template1 = await prisma.template.create({
    data: {
      name: 'Modern Startup',
      description: 'Clean and modern template perfect for tech startups',
      isPublic: true,
      config: {
        theme: 'dark',
        primaryColor: '#3B82F6',
        secondaryColor: '#8B5CF6',
        fontFamily: 'Inter',
        layout: 'modern',
      },
    },
  });

  const template2 = await prisma.template.create({
    data: {
      name: 'Professional Business',
      description: 'Traditional professional template for business presentations',
      isPublic: true,
      config: {
        theme: 'light',
        primaryColor: '#1F2937',
        secondaryColor: '#059669',
        fontFamily: 'Helvetica',
        layout: 'classic',
      },
    },
  });

  console.log('Seed completed!');
  console.log({ template1, template2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
