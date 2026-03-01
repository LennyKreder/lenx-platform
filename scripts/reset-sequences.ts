/**
 * Reset autoincrement sequences for truncated tables.
 * Run with: npx tsx scripts/reset-sequences.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Sequences to reset (exact names from pg_sequences)
const sequencesToReset = [
  'orderitem_id_seq',
  'order_id_seq',
  'customeraccess_id_seq',
  'customer_id_seq',
  'discountcodeusage_id_seq',
  'discountcode_id_seq',
  'discount_id_seq',
  'bundleitem_id_seq',
  'bundletranslation_id_seq',
  'bundle_id_seq',
  'review_id_seq',
  'productfile_id_seq',
  'producttranslation_id_seq',
  'product_id_seq',
  'tagtranslation_id_seq',
  'tag_id_seq',
];

async function main() {
  console.log('Resetting sequences for truncated tables...\n');

  for (const sequenceName of sequencesToReset) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER SEQUENCE "${sequenceName}" RESTART WITH 1`
      );
      console.log(`✓ Reset ${sequenceName}`);
    } catch (e) {
      console.log(`✗ Could not reset ${sequenceName}: ${(e as Error).message}`);
    }
  }

  // Special handling for slugroute - set to continue after existing slugs
  const maxSlugId = await prisma.slugRoute.aggregate({
    _max: { id: true },
  });
  const nextSlugId = (maxSlugId._max.id || 0) + 1;

  try {
    await prisma.$executeRawUnsafe(
      `ALTER SEQUENCE "slugroute_id_seq" RESTART WITH ${nextSlugId}`
    );
    console.log(`✓ Set slugroute_id_seq to ${nextSlugId}`);
  } catch (e) {
    console.log(`✗ Could not reset slugroute_id_seq: ${(e as Error).message}`);
  }

  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
