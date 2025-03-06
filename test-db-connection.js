// test-db-connection.js
import { PrismaClient } from '@prisma/client';

console.log('Starting database connection test...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('DATABASE_URL_UNPOOLED:', process.env.DATABASE_URL_UNPOOLED ? 'Set' : 'Not set');

// Create a new Prisma client with detailed logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Attempting to connect to the database...');
    
    // Try a simple query to test the connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Connection successful!', result);
    
    // Try to query the Session table
    try {
      console.log('Checking Session table...');
      const sessionCount = await prisma.session.count();
      console.log('Session table exists and has', sessionCount, 'records');
    } catch (error) {
      console.error('Error querying Session table:', error.message);
      if (error.cause) {
        console.error('Cause:', error.cause.message);
      }
    }
    
    // List all tables in the database
    try {
      console.log('Listing all tables in the database...');
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      console.log('Tables in database:', tables);
    } catch (error) {
      console.error('Error listing tables:', error.message);
    }
    
  } catch (error) {
    console.error('Database connection failed:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
    }
  } finally {
    await prisma.$disconnect();
    console.log('Test completed and connection closed');
  }
}

testConnection();
