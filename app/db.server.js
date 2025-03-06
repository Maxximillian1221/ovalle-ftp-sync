import { PrismaClient } from "@prisma/client";

// Simple Prisma client setup with logging
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  prisma.$disconnect();
});

export default prisma;
