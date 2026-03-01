import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const action = process.argv[2];

  if (action === 'delete') {
    // Delete all non-all-access bundles
    const bundlesToDelete = await prisma.bundle.findMany({
      where: { isAllAccess: false },
      select: { id: true },
    });

    const bundleIds = bundlesToDelete.map((b) => b.id);
    console.log(`Deleting ${bundleIds.length} bundles...`);

    await prisma.bundleItem.deleteMany({ where: { bundleId: { in: bundleIds } } });
    await prisma.customerAccess.deleteMany({ where: { bundleId: { in: bundleIds } } });
    await prisma.slugRoute.deleteMany({ where: { bundleId: { in: bundleIds } } });
    await prisma.bundleTranslation.deleteMany({ where: { bundleId: { in: bundleIds } } });
    await prisma.bundle.deleteMany({ where: { id: { in: bundleIds } } });

    console.log('Done!');
    return;
  }

  // Default: show bundles
  const bundles = await prisma.bundle.findMany({
    include: {
      translations: { select: { languageCode: true, name: true } },
      slugs: { select: { languageCode: true, slug: true, isPrimary: true } },
    },
    orderBy: { id: 'asc' },
  });

  console.log('=== BUNDLES AND SLUGS ===\n');

  for (const bundle of bundles) {
    const enName = bundle.translations.find(t => t.languageCode === 'en')?.name || bundle.translations[0]?.name;
    console.log(`Bundle ID ${bundle.id}: ${enName}`);
    console.log(`  contentLanguage: ${bundle.contentLanguage || '(all)'}`);
    console.log(`  isAllAccess: ${bundle.isAllAccess}`);
    console.log('  Slugs:');
    for (const slug of bundle.slugs) {
      console.log(`    - [${slug.languageCode}] ${slug.slug} (primary: ${slug.isPrimary})`);
    }
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
