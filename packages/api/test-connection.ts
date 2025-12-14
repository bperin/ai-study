import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Initializing PrismaClient...');
  const prisma = new PrismaClient();
  const start = Date.now();
  try {
    console.log('Connecting...');
    await prisma.$connect();
    console.log(`Connected in ${Date.now() - start}ms`);
    
    console.log('Running query...');
    const queryStart = Date.now();
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
    console.log(`Query took ${Date.now() - queryStart}ms`);
    console.log(`Total time: ${Date.now() - start}ms`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();