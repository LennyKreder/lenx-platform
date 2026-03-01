import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const products = await prisma.product.findMany({
    where: { theme: 'soft_rose' },
    include: {
      slugs: { where: { isPrimary: true } },
      translations: { where: { languageCode: 'en' } },
      template: {
        include: {
          translations: { where: { languageCode: 'en' } },
        },
      },
    },
    orderBy: { year: 'asc' },
    take: 15,
  });

  console.log('=== SOFT ROSE PRODUCTS AND SLUGS ===\n');

  for (const p of products) {
    const templateName = p.template?.translations[0]?.name || 'no template';
    const productName = p.translations[0]?.name || templateName;
    console.log(`Year ${p.year}: ${productName}`);
    console.log(`  Template: ${templateName}`);
    console.log(`  Device: ${p.device}`);
    console.log(`  ContentLang: ${p.contentLanguage}`);
    if (p.slugs.length > 0) {
      for (const s of p.slugs) {
        console.log(`  Slug [${s.languageCode}]: ${s.slug}`);
      }
    } else {
      console.log(`  NO SLUGS!`);
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
