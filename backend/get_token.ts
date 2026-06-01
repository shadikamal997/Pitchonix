import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found');
    process.exit(1);
  }
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  const token = sign({ sub: user.id, email: user.email }, secret, { expiresIn: '1d' });
  console.log(token);
}
run().finally(() => prisma.$disconnect());
