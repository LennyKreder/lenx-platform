/**
 * Backfill script for order numbers
 * Run with: npx tsx scripts/backfill-order-numbers.ts
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Safe charset - excludes ambiguous characters (0, O, 1, I, L)
const SAFE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PREFIX = 'LBL';
const OFFSET = 10000;
const SUFFIX_LENGTH = 2;

function generateSuffix(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SAFE_CHARSET[Math.floor(Math.random() * SAFE_CHARSET.length)];
  }
  return result;
}

function generateOrderNumber(id: number): string {
  const baseNumber = id + OFFSET;
  const suffix = generateSuffix(SUFFIX_LENGTH);
  return `${PREFIX}-${baseNumber}-${suffix}`;
}

async function backfill() {
  console.log('Starting order number backfill...');

  const ordersWithoutNumber = await prisma.order.findMany({
    where: {
      orderNumber: null,
    },
    select: { id: true },
  });

  console.log(`Found ${ordersWithoutNumber.length} orders without order numbers.`);

  for (const order of ordersWithoutNumber) {
    const orderNumber = generateOrderNumber(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { orderNumber },
    });
    console.log(`  Order ${order.id} -> ${orderNumber}`);
  }

  console.log('Backfill complete!');
}

backfill()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
