import { PrismaClient } from "@prisma/client";

// Configure Prisma Client with custom connection pool settings
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Increase connection timeout and reduce connection limit
    // to avoid connection pool issues on serverless environments
    log: ['query', 'info', 'warn', 'error'],
    __internal: {
      engine: {
        connectionTimeout: 20, // Increase from default 10
        connectionLimit: 3,    // Reduce from default 5
      },
    },
  });
};

// Use global variable to prevent multiple instances in development
const globalForPrisma = globalThis;
globalForPrisma.prisma = globalForPrisma.prisma || prismaClientSingleton();

const prisma = globalForPrisma.prisma;

// Handle shutdown gracefully
if (process.env.NODE_ENV !== "production") {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
