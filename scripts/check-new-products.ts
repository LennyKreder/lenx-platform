import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get all products with empty images that have published listings
  const products = await prisma.product.findMany({
    where: {
      site: { siteType: 'physical' },
      listings: { some: { isPublished: true, channel: { type: 'webshop' } } },
      OR: [
        { images: { equals: [] as any } },
        { images: { equals: null as any } },
      ],
    },
    select: {
      id: true,
      sku: true,
      images: true,
      translations: { select: { name: true }, take: 1 },
      slugs: { where: { isPrimary: true }, select: { slug: true }, take: 1 },
    },
    orderBy: { sku: 'asc' },
  });

  console.log(`Products with published listings but NO images: ${products.length}\n`);
  for (const p of products) {
    const name = p.translations[0]?.name || '(no name)';
    const slug = p.slugs[0]?.slug || '?';
    console.log(`${p.sku || '?'}\t${slug}\t${name}`);
  }

  await prisma.$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
