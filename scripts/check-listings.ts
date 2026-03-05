import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check a few migrated products
  const skus = ['CLZ101', 'CLZ185', 'MC075', 'JB400'];
  for (const sku of skus) {
    const p = await prisma.product.findFirst({
      where: { sku },
      select: {
        id: true, sku: true, images: true,
        listings: {
          select: { id: true, isPublished: true, channel: { select: { type: true } } },
        },
      },
    });
    if (p) {
      console.log(`${p.sku} (id=${p.id}): images=${JSON.stringify(p.images)}`);
      console.log(`  listings: ${JSON.stringify(p.listings)}`);
    }
  }

  // Check new products that appear in shop
  console.log('\n--- New products shown in shop ---');
  const newSkus = ['CLZ266', 'CLZ265', 'CLZ258'];
  for (const sku of newSkus) {
    const p = await prisma.product.findFirst({
      where: { sku },
      select: {
        id: true, sku: true, images: true,
        listings: {
          select: { id: true, isPublished: true, channel: { select: { type: true } } },
        },
      },
    });
    if (p) {
      console.log(`${p.sku} (id=${p.id}): images=${JSON.stringify(p.images)}`);
      console.log(`  listings: ${JSON.stringify(p.listings)}`);
    }
  }

  // Count: how many products with images but no listing vs with listing
  const withImages = await prisma.product.count({
    where: {
      site: { siteType: 'physical' },
      images: { not: { equals: [] as any } },
    },
  });
  const withImagesAndListing = await prisma.product.count({
    where: {
      site: { siteType: 'physical' },
      images: { not: { equals: [] as any } },
      listings: { some: { isPublished: true, channel: { type: 'webshop' } } },
    },
  });
  console.log(`\nProducts with images: ${withImages}`);
  console.log(`Products with images AND published listing: ${withImagesAndListing}`);

  await prisma.$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
