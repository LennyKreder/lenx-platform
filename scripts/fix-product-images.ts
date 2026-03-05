/**
 * Fix product images:
 * 1. Double-encoded JSON strings → proper JSON arrays
 * 2. Bare filenames → full media URLs (https://media.lenx.nl/images/{brand}/...)
 *
 * Usage: npx tsx scripts/fix-product-images.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const MEDIA_BASE = 'https://media.lenx.nl/images';

// SKU prefix → media subfolder
function getBrandFolder(sku: string): string {
  const code = sku.toUpperCase();
  if (code.startsWith('CLZ') || code.startsWith('CL')) return 'clariz';
  if (code.startsWith('JB') || code.startsWith('VL')) return 'jellybean';
  if (code.startsWith('BB')) return 'beebi';
  if (code.startsWith('MS')) return 'menstricup';
  if (code.startsWith('MC') || code.startsWith('AQUA') || code.startsWith('H')) return 'matcare';
  return 'matcare'; // fallback
}

function fixImageUrl(url: string, sku: string): string {
  if (!url) return url;
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Bare filename — prefix with media base + brand folder
  const folder = getBrandFolder(sku);
  return `${MEDIA_BASE}/${folder}/${url}`;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, images: true },
  });

  let fixedEncoding = 0;
  let fixedUrls = 0;
  let alreadyOk = 0;
  let empty = 0;

  for (const product of products) {
    let images = product.images;
    let needsUpdate = false;

    // Step 1: Fix double-encoded strings
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
        needsUpdate = true;
        fixedEncoding++;
      } catch {
        console.warn(`  Could not parse images for ${product.sku}: ${String(images).slice(0, 100)}`);
        continue;
      }
    }

    if (!Array.isArray(images) || images.length === 0) {
      if (needsUpdate) {
        await prisma.product.update({
          where: { id: product.id },
          data: { images: [] },
        });
      }
      empty++;
      continue;
    }

    // Step 2: Fix bare filenames → full URLs
    const fixedImages = images.map((img: string) => fixImageUrl(img, product.sku || ''));
    const urlsChanged = fixedImages.some((url: string, i: number) => url !== images[i]);

    if (urlsChanged) {
      fixedUrls++;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: fixedImages },
      });
      console.log(`  Fixed ${product.sku}: ${fixedImages.length} image(s)${urlsChanged ? ' (URLs prefixed)' : ''}`);
    } else {
      alreadyOk++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Fixed encoding: ${fixedEncoding}`);
  console.log(`Fixed URLs: ${fixedUrls}`);
  console.log(`Already OK: ${alreadyOk}`);
  console.log(`Empty/null: ${empty}`);
  console.log(`Total: ${products.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});
