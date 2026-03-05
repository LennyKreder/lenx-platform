/**
 * Migrate product images from media.lenx.nl → Hetzner S3 (lenxlabs26 bucket).
 *
 * For each product:
 * 1. Fix double-encoded JSON strings → proper arrays
 * 2. Download images from media.lenx.nl (or construct URL for bare filenames)
 * 3. Upload original + WebP thumbnail to S3 under uploads/products/
 * 4. Update DB images array to /api/uploads/products/{filename}
 *
 * Usage: npx tsx scripts/migrate-product-images.ts
 *        npx tsx scripts/migrate-product-images.ts --dry-run
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

// ─── Config ──────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const s3 = new S3Client({
  endpoint: `https://${process.env.S3_ENDPOINT || 'nbg1.your-objectstorage.com'}`,
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'lenxlabs26';
const S3_PREFIX = 'uploads/products';
const MEDIA_BASE = 'https://media.lenx.nl/images';

// Thumbnail settings (match admin upload)
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;
const THUMB_QUALITY = 80;

// MIME types
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// ─── Helpers ─────────────────────────────────────────────

function getBrandFolder(sku: string): string {
  const code = sku.toUpperCase();
  if (code.startsWith('CLZ') || code.startsWith('CL')) return 'clariz';
  if (code.startsWith('JB') || code.startsWith('VL')) return 'jellybean';
  if (code.startsWith('BB')) return 'beebi';
  if (code.startsWith('MS')) return 'menstricup';
  if (code.startsWith('MC') || code.startsWith('AQUA') || code.startsWith('H')) return 'matcare';
  return 'matcare';
}

/** Turn any image value into a downloadable URL */
function toDownloadUrl(img: string, sku: string): string | null {
  if (!img || !img.trim()) return null;
  // Already a full URL
  if (img.startsWith('https://') || img.startsWith('http://')) return img;
  // Bare filename → prefix with media base
  const folder = getBrandFolder(sku);
  return `${MEDIA_BASE}/${folder}/${img}`;
}

/** Extract just the filename from a URL or path */
function extractFilename(url: string): string {
  return url.split('/').pop()!.split('?')[0];
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

function getThumbnailKey(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  return `${base}-thumb.webp`;
}

/** Check if an S3 object already exists */
async function s3Exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Upload buffer to S3 */
async function s3Upload(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

/** Download a file from a URL, returns buffer or null on failure */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`    ⚠ HTTP ${response.status} for ${url}`);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (err) {
    console.warn(`    ⚠ Download failed: ${url} — ${err}`);
    return null;
  }
}

/** Generate WebP thumbnail */
async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no changes) ===' : '=== Migrating product images to S3 ===');

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, images: true },
  });

  let totalProducts = 0;
  let totalImages = 0;
  let uploaded = 0;
  let skippedExisting = 0;
  let skippedAlreadyS3 = 0;
  let failed = 0;

  for (const product of products) {
    let images = product.images;

    // Fix double-encoded strings
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
      } catch {
        console.warn(`  Skip ${product.sku}: could not parse images`);
        continue;
      }
    }

    if (!Array.isArray(images) || images.length === 0) continue;

    totalProducts++;
    const newImages: string[] = [];
    let changed = false;

    for (const img of images as string[]) {
      totalImages++;

      // Already migrated to S3
      if (img.startsWith('/api/uploads/products/')) {
        skippedAlreadyS3++;
        newImages.push(img);
        continue;
      }

      const downloadUrl = toDownloadUrl(img, product.sku || '');
      if (!downloadUrl) {
        newImages.push(img);
        continue;
      }

      const filename = extractFilename(downloadUrl);
      const ext = getExtension(filename);
      const contentType = MIME_TYPES[ext] || 'image/jpeg';
      const s3Key = `${S3_PREFIX}/${filename}`;
      const thumbKey = `${S3_PREFIX}/${getThumbnailKey(filename)}`;
      const newUrl = `/api/uploads/products/${filename}`;

      if (DRY_RUN) {
        console.log(`  [dry] ${product.sku}: ${downloadUrl} → ${newUrl}`);
        newImages.push(newUrl);
        changed = true;
        uploaded++;
        continue;
      }

      // Check if already in S3
      const exists = await s3Exists(s3Key);
      if (exists) {
        skippedExisting++;
        newImages.push(newUrl);
        changed = true;
        continue;
      }

      // Download
      const buffer = await downloadImage(downloadUrl);
      if (!buffer) {
        failed++;
        newImages.push(img); // keep original on failure
        continue;
      }

      // Upload original
      await s3Upload(s3Key, buffer, contentType);

      // Upload thumbnail
      try {
        const thumb = await generateThumbnail(buffer);
        await s3Upload(thumbKey, thumb, 'image/webp');
      } catch (err) {
        console.warn(`    ⚠ Thumbnail failed for ${filename}: ${err}`);
      }

      newImages.push(newUrl);
      changed = true;
      uploaded++;
      console.log(`  ✓ ${product.sku}: ${filename}`);
    }

    // Update DB if any images changed
    if (changed && !DRY_RUN) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: newImages },
      });
    }
  }

  console.log('\n=== Done ===');
  console.log(`Products with images: ${totalProducts}`);
  console.log(`Total images: ${totalImages}`);
  console.log(`Uploaded to S3: ${uploaded}`);
  console.log(`Already in S3 (skipped): ${skippedAlreadyS3}`);
  console.log(`Already in bucket (skipped): ${skippedExisting}`);
  console.log(`Failed: ${failed}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
