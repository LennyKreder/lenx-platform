import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find the matcare site
  const site = await prisma.site.findFirst({ where: { siteType: 'physical' } });
  if (!site) { console.log('No physical site'); return; }
  console.log(`Site: ${site.name} (id=${site.id})\n`);

  // Get products with published webshop listings (what the shop shows)
  const products = await prisma.product.findMany({
    where: {
      siteId: site.id,
      listings: {
        some: {
          isPublished: true,
          channel: { type: 'webshop', siteId: site.id },
        },
      },
    },
    select: {
      id: true,
      sku: true,
      images: true,
      translations: { select: { name: true }, take: 1 },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  for (const p of products) {
    const name = p.translations[0]?.name || '(no name)';
    console.log(`${p.sku || '?'} (id=${p.id}): ${name}`);
    console.log(`  images: ${JSON.stringify(p.images)}`);
  }

  console.log(`\nTotal published products: ${products.length}`);

  await prisma.$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
