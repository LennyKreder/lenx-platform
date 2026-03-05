import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const products = await prisma.product.findMany({
    where: {
      site: { siteType: 'physical' },
      sku: { not: null },
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

  for (const p of products) {
    let images = p.images;
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { continue; }
    }
    if (!Array.isArray(images) || images.length === 0) continue;

    const name = p.translations[0]?.name || '(no name)';
    const slug = p.slugs[0]?.slug || `product-${p.id}`;
    const imageList = (images as string[]).map(img => {
      if (img.startsWith('/api/uploads/')) return `[S3] ${img}`;
      return img.split('/').pop()?.split('?')[0] || img;
    });
    console.log(`${p.sku}\t${slug}\t${name}\t${JSON.stringify(imageList)}`);
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
