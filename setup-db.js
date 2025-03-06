// setup-db.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    // Check if Session table exists
    let tableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      tableExists = true;
    } catch (error) {
      console.log('Session table does not exist, creating it...');
    }

    if (!tableExists) {
      // Create Session table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shop" TEXT NOT NULL,
          "state" TEXT NOT NULL,
          "isOnline" BOOLEAN NOT NULL DEFAULT false,
          "scope" TEXT,
          "expires" TIMESTAMP,
          "accessToken" TEXT NOT NULL,
          "userId" BIGINT,
          "firstName" TEXT,
          "lastName" TEXT,
          "email" TEXT,
          "accountOwner" BOOLEAN NOT NULL DEFAULT false,
          "locale" TEXT,
          "collaborator" BOOLEAN DEFAULT false,
          "emailVerified" BOOLEAN DEFAULT false
        );
      `;
      console.log('Session table created successfully');
    } else {
      console.log('Session table already exists');
    }

    // Check if FtpConfig table exists
    tableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "FtpConfig" LIMIT 1`;
      tableExists = true;
    } catch (error) {
      console.log('FtpConfig table does not exist, creating it...');
    }

    if (!tableExists) {
      // Create FtpConfig table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "FtpConfig" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shop" TEXT NOT NULL UNIQUE,
          "host" TEXT NOT NULL,
          "port" INTEGER NOT NULL DEFAULT 21,
          "username" TEXT NOT NULL,
          "password" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `;
      console.log('FtpConfig table created successfully');
    } else {
      console.log('FtpConfig table already exists');
    }

    // Check if OrderSync table exists
    tableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "OrderSync" LIMIT 1`;
      tableExists = true;
    } catch (error) {
      console.log('OrderSync table does not exist, creating it...');
    }

    if (!tableExists) {
      // Create OrderSync table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "OrderSync" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shop" TEXT NOT NULL,
          "orderId" TEXT NOT NULL,
          "orderNumber" TEXT NOT NULL,
          "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "syncStatus" TEXT NOT NULL DEFAULT 'pending',
          "errorMessage" TEXT,
          UNIQUE("shop", "orderId")
        );
      `;
      console.log('OrderSync table created successfully');
    } else {
      console.log('OrderSync table already exists');
    }

    // Check if InventorySync table exists
    tableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "InventorySync" LIMIT 1`;
      tableExists = true;
    } catch (error) {
      console.log('InventorySync table does not exist, creating it...');
    }

    if (!tableExists) {
      // Create InventorySync table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "InventorySync" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "shop" TEXT NOT NULL,
          "sku" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "syncStatus" TEXT NOT NULL DEFAULT 'pending',
          "errorMessage" TEXT,
          UNIQUE("shop", "sku")
        );
      `;
      console.log('InventorySync table created successfully');
    } else {
      console.log('InventorySync table already exists');
    }

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
