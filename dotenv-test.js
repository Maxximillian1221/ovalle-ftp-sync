// dotenv-test.js
require('dotenv').config();

console.log('Starting dotenv test...');
console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DATABASE_URL_UNPOOLED:', process.env.DATABASE_URL_UNPOOLED);

const { PrismaClient } = require('@prisma/client');
console.log('PrismaClient imported successfully');

try {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL_UNPOOLED,
      },
    },
  });
  console.log('PrismaClient instance created');
  
  prisma.$connect()
    .then(() => {
      console.log('Connected to database successfully!');
      return prisma.$disconnect();
    })
    .catch(error => {
      console.error('Failed to connect to database:', error);
    })
    .finally(() => {
      console.log('Test completed');
    });
} catch (error) {
  console.error('Error creating PrismaClient:', error);
}
