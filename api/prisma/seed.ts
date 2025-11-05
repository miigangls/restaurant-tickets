import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Create tickets
  const tickets = [
    {
      title: 'Filete de Res',
      description: 'Filete de res a la parrilla con papas fritas y vegetales',
      category: 'Platos Principales',
      price: 24.99,
      stock: 50,
      isActive: true,
    },
    {
      title: 'Salmón a la Parrilla',
      description: 'Salmón fresco con arroz y vegetales al vapor',
      category: 'Platos Principales',
      price: 22.99,
      stock: 30,
      isActive: true,
    },
    {
      title: 'Tiramisú',
      description: 'Clásico postre italiano',
      category: 'Postres',
      price: 7.99,
      stock: 20,
      isActive: true,
    },
  ];

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: { title: ticket.title },
      update: {},
      create: ticket,
    });
  }

  console.log('Seed completed!');
  console.log('Admin credentials: admin@demo.com / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
