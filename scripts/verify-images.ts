import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const skus = ['CLZ101', 'CLZ185', 'JB400', 'JB960', 'MC075', 'MC044', 'MsC294', 'VL909', 'MC296'];
  for (const sku of skus) {
    const p = await prisma.product.findFirst({
      where: { sku },
      select: { sku: true, images: true, translations: { select: { name: true }, take: 1 } },
    });
    if (p) {
      console.log(`${p.sku}: ${p.translations[0]?.name}`);
      console.log(`  images: ${JSON.stringify(p.images)}`);
    }
  }
  await prisma.$disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
