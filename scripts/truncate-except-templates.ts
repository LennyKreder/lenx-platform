/**
 * Truncate all tables except template-related ones.
 * Run with: npx tsx scripts/truncate-except-templates.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting truncation (preserving templates)...\n');

  // Order matters due to foreign key constraints
  // Delete from child tables first, then parent tables

  // 1. Delete order-related data
  console.log('Deleting order items...');
  await prisma.orderItem.deleteMany({});

  console.log('Deleting orders...');
  await prisma.order.deleteMany({});

  // 2. Delete customer-related data
  console.log('Deleting customer access...');
  await prisma.customerAccess.deleteMany({});

  console.log('Deleting customers...');
  await prisma.customer.deleteMany({});

  // 3. Delete discount usage and codes
  console.log('Deleting discount code usage...');
  await prisma.discountCodeUsage.deleteMany({});

  console.log('Deleting discount codes...');
  await prisma.discountCode.deleteMany({});

  console.log('Deleting discounts...');
  await prisma.discount.deleteMany({});

  // 4. Delete bundle-related data
  console.log('Deleting bundle items...');
  await prisma.bundleItem.deleteMany({});

  console.log('Deleting bundle translations...');
  await prisma.bundleTranslation.deleteMany({});

  // Delete bundle slugs
  console.log('Deleting bundle slugs...');
  await prisma.slugRoute.deleteMany({
    where: { bundleId: { not: null } },
  });

  console.log('Deleting bundles...');
  await prisma.bundle.deleteMany({});

  // 5. Delete product-related data
  console.log('Deleting reviews...');
  await prisma.review.deleteMany({});

  console.log('Deleting product files...');
  await prisma.productFile.deleteMany({});

  console.log('Deleting product tags...');
  await prisma.productTag.deleteMany({});

  console.log('Deleting product translations...');
  await prisma.productTranslation.deleteMany({});

  // Delete product slugs (but keep template slugs)
  console.log('Deleting product slugs...');
  await prisma.slugRoute.deleteMany({
    where: { productId: { not: null } },
  });

  console.log('Deleting products...');
  await prisma.product.deleteMany({});

  // 6. Delete tags (but keep template tags relation)
  console.log('Deleting tag translations...');
  await prisma.tagTranslation.deleteMany({});

  // Delete tag slugs
  console.log('Deleting tag slugs...');
  await prisma.slugRoute.deleteMany({
    where: { tagId: { not: null } },
  });

  console.log('Deleting product template tags...');
  await prisma.productTemplateTag.deleteMany({});

  console.log('Deleting tags...');
  await prisma.tag.deleteMany({});

  // 7. Delete settings (optional - comment out if you want to keep)
  // console.log('Deleting settings...');
  // await prisma.settings.deleteMany({});

  console.log('\nDone! Preserved:');
  console.log('- ProductTemplate');
  console.log('- ProductTemplateTranslation');
  console.log('- Template SlugRoutes');
  console.log('- Languages');
  console.log('- Settings');

  // Show what's left
  const templateCount = await prisma.productTemplate.count();
  const templateSlugCount = await prisma.slugRoute.count({
    where: { templateId: { not: null } },
  });

  console.log(`\nRemaining: ${templateCount} templates, ${templateSlugCount} template slugs`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
