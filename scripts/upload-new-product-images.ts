/**
 * Upload images for NEW products that have published listings but empty images arrays.
 * These are products added after the original import.
 *
 * Usage:
 *   npx tsx scripts/upload-new-product-images.ts           # dry-run
 *   npx tsx scripts/upload-new-product-images.ts --execute  # upload
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
import * as fs from 'fs';
import * as path from 'path';

const EXECUTE = process.argv.includes('--execute');

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
const IMAGES_DIR = path.resolve('tmp/images');

const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;
const THUMB_QUALITY = 80;

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// ─── SKU → local filename mapping for new products ───────

const MAPPING: Record<string, string> = {
  // New Clariz bola products
  CLZ257: 'clariz-zwangerschapsbel-bola-panda-goud.jpg',
  CLZ258: 'clariz-zwangerschapsbel-bola-pinguin-zilver.jpg.jpg',
  CLZ259: 'clariz-zwangerschapsbel-bola-pinguin-goud.jpg.jpg',
  CLZ260: 'clariz-zwangerschapsbel-bola-zilver-boom.jpg',
  CLZ261: 'clariz-zwangerschapsbel-bola-hart-handjes-voetjes.jpg',
  CLZ262: 'clariz-zwangerschapsbel-bola-hart-giraffe.jpg',
  CLZ263: 'clariz-zwangerschapsbel-bola-wereldbol.jpg',
  CLZ264: 'clariz-zwangerschapsbel-bola-kompas.jpg',
  CLZ265: 'clariz-zwangerschapsbel-bola-wit-baby-goud.JPG',
  CLZ266: 'clariz-zwangerschapsbel-bola-zilver-bubbles.jpg',
  CLZ267: 'clariz-zwangerschapsbel-bola-zilver-mom-goud.JPG',
  CLZ268: 'clariz-zwangerschapsbel-bola-wit-voetjes-brons.jpg',
  h036: 'clariz-klankbolhouder-zilver-bloem.jpg',

  // JB nagelknippers
  JB001: 'jelly-bean-nail-polish-nagelknipper-oranje.jpg',
  JB002: 'jelly-bean-nail-polish-nagelknipper-groen.jpg',
  JB003: 'jelly-bean-nail-polish-nagelknipper-paars.jpg',

  // JB "new" colors (not in first batch)
  JB909: 'jelly-bean-nail-polish-uv-nagellak-909-koala.jpg',
  JB912: 'jelly-bean-nail-polish-uv-nagellak-912-midnight.jpg',
  JB913: 'jelly-bean-nail-polish-uv-nagellak-913-cloud-grey.jpg',
  JB917: 'jelly-bean-nail-polish-uv-nagellak-917-cherry-blossom.jpg',
  JB919: 'jelly-bean-nail-polish-uv-nagellak-919-blush.jpg',
  JB920: 'jelly-bean-nail-polish-uv-nagellak-920-mauve.jpg',
  JB925: 'jelly-bean-nail-polish-uv-nagellak-925-velvet.jpg',
  JB926: 'jelly-bean-nail-polish-uv-nagellak-926-scarlet.jpg',
  JB927: 'jelly-bean-nail-polish-uv-nagellak-927-crimson.jpg',
  JB928: 'jelly-bean-nail-polish-uv-nagellak-928-maroon.jpg',
  JB931: 'jelly-bean-nail-polish-uv-nagellak-931-sage.jpg',
  JB932: 'jelly-bean-nail-polish-uv-nagellak-932-blueberry.jpg',
  JB934: 'jelly-bean-nail-polish-uv-nagellak-934-sky-blue.jpg',
  JB935: 'jelly-bean-nail-polish-uv-nagellak-935-grasshopper.jpg',
  JB939: 'jelly-bean-nail-polish-uv-nagellak-939-cobalt.jpg',

  // JB spider gels
  JBSG01: 'jelly-bean-nail-polish-spidergel-01-white.jpg',
  JBSG02: 'jelly-bean-nail-polish-spidergel-02-black.jpg',
  JBSG03: 'jelly-bean-nail-polish-spidergel-03-metal-black.jpg',
  JBSG04: 'jelly-bean-nail-polish-spidergel-04-silver.jpg',
  JBSG05: 'jelly-bean-nail-polish-spidergel-05-gold.jpg',
  JBSG06: 'jelly-bean-nail-polish-spidergel-06-champagne.jpg',
  JBSG07: 'jelly-bean-nail-polish-spidergel-07-red.jpg',
  JBSG08: 'jelly-bean-nail-polish-spidergel-08-purple.jpg',
  JBSG09: 'jelly-bean-nail-polish-spidergel-09-blue.jpg',
  JBSG10: 'jelly-bean-nail-polish-spidergel-10-pink.jpg',
  JBSG11: 'jelly-bean-nail-polish-spidergel-11-green.jpg',
  JBSG12: 'jelly-bean-nail-polish-spidergel-12-yellow.jpg',
  JBSG13: 'jelly-bean-nail-polish-spidergel-essential-pack.jpg',

  // JB liner (new SKU for black)
  JBL09: 'jelly-bean-nail-polish-uv-nagellak-liner-gold.jpg', // placeholder — no black liner file

  // JB packs (new SKUs)
  JBPRIMPK: 'jelly-bean-nail-polish-uv-nagellak-pack-primerpack.jpg',
  JBPRIMPK6W: 'jelly-bean-nail-polish-uv-nagellak-pack-primerpack-6W.jpg',

  // Mat Care new products
  MCBBTG: 'mat-care-bbt-ovulatiethermometer-flexibele-tip.jpg',
  MCBBTR: 'mat-care-bbt-ovulatiethermometer-geheugenfunctie.jpg',
  MC021: 'mat-care-zwangerschapstest-midstream-ultra-6-stuks.jpg',
  MCZM3: 'mat-care-zwangerschapstest-midstream-ultra-3-stuks.jpg',
  MCZC3: 'mat-care-zwangerschapstest-cassette-ultra-3-stuks.jpg',
  MCZC6: 'mat-care-zwangerschapstest-cassette-ultra-6-stuks.jpg',
  MCMC2: 'mat-care-menopauzetest-cassette-2-stuks.jpg',
  MCMS2: 'mat-care-menopauzetest-strip-2-stuks.jpg',
  MCPF1: 'mat-care-pfeiffertest-1-stuk.jpg',
  MCPH1: 'mat-care-vaginale-phtest-1-stuk.jpg',
  MCPH2: 'mat-care-vaginale-phtest-2-stuks.jpg',
  MC103: 'mat-care-vaginale-phtest-5-stuks.jpg',
  MCK100: 'mat-care-ketostrips-ketonentest-ketose-teststrips-ketosticks-ketotest-100-stuks.jpg', // no local file, will skip

  // Aquasonic 3 stuks
  'Aquasonic ': 'mat-care-ultrasound-doppler-gel-250-ml.jpg',
};

// ─── Helpers ─────────────────────────────────────────────

function buildFileIndex(): Map<string, string> {
  const index = new Map<string, string>();
  const exts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'desktop.ini') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (exts.has(path.extname(entry.name).toLowerCase())) {
        index.set(entry.name.toLowerCase(), full);
        // Handle double extension
        if (entry.name.toLowerCase().endsWith('.jpg.jpg')) {
          index.set(entry.name.toLowerCase().replace('.jpg.jpg', '.jpg'), full);
        }
      }
    }
  }

  walk(IMAGES_DIR);
  return index;
}

function getExtension(filename: string): string {
  // Handle double extension
  if (filename.toLowerCase().endsWith('.jpg.jpg')) return '.jpg';
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

function getThumbnailKey(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  return `${base}-thumb.webp`;
}

async function s3Exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function s3Upload(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log(EXECUTE ? '=== EXECUTING ===' : '=== DRY RUN ===');

  const fileIndex = buildFileIndex();

  // Get products with published listings but empty images
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

  console.log(`Products with empty images: ${products.length}\n`);

  let uploaded = 0;
  let skipped = 0;

  for (const product of products) {
    const sku = product.sku || '';
    const slug = product.slugs[0]?.slug || `product-${product.id}`;
    const name = product.translations[0]?.name || '(no name)';

    const localFilename = MAPPING[sku];
    if (!localFilename) {
      console.log(`  SKIP ${sku}: ${name} — no mapping`);
      skipped++;
      continue;
    }

    // Find local file (case insensitive)
    const localPath = fileIndex.get(localFilename.toLowerCase());
    if (!localPath) {
      console.log(`  SKIP ${sku}: ${name} — file not found: ${localFilename}`);
      skipped++;
      continue;
    }

    const ext = getExtension(localFilename);
    const targetName = `${slug}-01${ext}`;
    const s3Key = `${S3_PREFIX}/${targetName}`;
    const thumbKey = `${S3_PREFIX}/${getThumbnailKey(targetName)}`;
    const newUrl = `/api/uploads/products/${targetName}`;

    if (!EXECUTE) {
      console.log(`${sku}: ${localFilename} → ${targetName}`);
      uploaded++;
      continue;
    }

    // Check if already exists
    if (await s3Exists(s3Key)) {
      console.log(`  EXISTS ${sku}: ${targetName}`);
      // Still update DB
      await prisma.product.update({
        where: { id: product.id },
        data: { images: [newUrl] },
      });
      uploaded++;
      continue;
    }

    // Read, upload, thumbnail
    const buffer = fs.readFileSync(localPath);
    const contentType = MIME_TYPES[ext] || 'image/jpeg';

    await s3Upload(s3Key, buffer, contentType);

    try {
      const thumb = await generateThumbnail(buffer);
      await s3Upload(thumbKey, thumb, 'image/webp');
    } catch (err) {
      console.warn(`    ⚠ Thumbnail failed: ${err}`);
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { images: [newUrl] },
    });

    uploaded++;
    console.log(`  ✓ ${sku}: ${targetName}`);
  }

  console.log(`\nUploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
