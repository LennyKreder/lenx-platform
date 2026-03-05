/**
 * Upload product images from local files to S3 with SEO-friendly names.
 *
 * For each product:
 * 1. Find the matching local image file (using overrides + smart matching)
 * 2. Rename to {slug}-{counter}.{ext}
 * 3. Upload original + WebP thumbnail to S3
 * 4. Update DB images array
 *
 * Usage:
 *   npx tsx scripts/upload-product-images.ts           # dry-run (default)
 *   npx tsx scripts/upload-product-images.ts --execute  # actually upload
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

// ─── Config ──────────────────────────────────────────────

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

// ─── Manual overrides from review ────────────────────────
// SKU → local filename (relative to brand folder)

const OVERRIDES: Record<string, string> = {
  // Clariz bola — corrected matches
  CLZ101: 'clariz-zwangerschapsbel-bola-zilver-voetjes-goud.jpg',
  CLZ102: 'clariz-zwangerschapsbel-bola-zilver-voetjes.jpg',
  CLZ105: 'clariz-zwangerschapsbel-bola-swirl-roze.jpg',
  CLZ106: 'clariz-zwangerschapsbel-bola-swirl-paars.jpg',
  CLZ107: 'clariz-zwangerschapsbel-bola-roze-voetjes.jpg',
  CLZ108: 'clariz-zwangerschapsbel-bola-paars-voetjes.jpg',
  CLZ109: 'clariz-zwangerschapsbel-bola-wit-bubbles-goud.jpg',
  CLZ113: 'clariz-zwangerschapsbel-bola-yin-yang.jpg',
  CLZ114: 'clariz-zwangerschapsbel-bola-zwart-bloem-wit.jpg',
  CLZ115: 'clariz-zwangerschapsbel-bola-wit-bloem-zwart.jpg',
  CLZ116: 'clariz-zwangerschapsbel-bola-zwart-handjes-zilver.jpg',
  CLZ118: 'clariz-zwangerschapsbel-bola-zwart-voetjes-zilver.jpg',
  CLZ119: 'clariz-zwangerschapsbel-bola-wit-voetjes-zilver.jpg',
  CLZ120: 'clariz-zwangerschapsbel-bola-zilver-baby.jpg',
  CLZ121: 'clariz-zwangerschapsbel-bola-wit-pootjes.jpg',
  CLZ122: 'clariz-zwangerschapsbel-bola-zwart-pootjes.jpg',
  CLZ123: 'clariz-zwangerschapsbel-bola-zilver-handjes.jpg',
  CLZ124: 'clariz-zwangerschapsbel-bola-wit-handjes-zilver.jpg',
  CLZ125: 'clariz-zwangerschapsbel-bola-wit-gouden-voetjes.jpg',
  CLZ126: 'clariz-zwangerschapsbel-bola-goud-voetjes.jpg',
  CLZ127: 'clariz-zwangerschapsbel-bola-zwart-voetjes-goud.jpg',
  CLZ128: 'clariz-zwangerschapsbel-bola-zwart-mom-zilver.jpg',
  CLZ129: 'clariz-zwangerschapsbel-bola-wit-mom.jpg',
  CLZ130: 'clariz-zwangerschapsbel-bola-roze-mom.jpg',
  CLZ131: 'clariz-zwangerschapsbel-bola-zwart-bubbles.jpg',
  CLZ132: 'clariz-zwangerschapsbel-bola-wit-love.jpg',
  CLZ133: 'clariz-zwangerschapsbel-bola-groen-love.jpg',
  CLZ134: 'clariz-zwangerschapsbel-bola-voetbal.jpg',
  CLZ135: 'clariz-zwangerschapsbel-bola-sleutelgat.jpg',
  CLZ136: 'clariz-zwangerschapsbel-bola-turquoise-goud.jpg',
  CLZ137: 'clariz-zwangerschapsbel-bola-roze-paars-goud.jpg',
  CLZ138: 'clariz-zwangerschapsbel-bola-groen-goud-bloem.jpg',
  CLZ139: 'clariz-zwangerschapsbel-bola-spinnenweb.jpg',
  CLZ140: 'clariz-zwangerschapssierraad-vleugel.jpg',
  CLZ141: 'clariz-zwangerschapsbel-bola-zilver-handjes-goud.jpg',
  CLZ142: 'clariz-zwangerschapsbel-bola-zilver-baby-on-the-way.jpg',
  CLZ143: 'clariz-zwangerschapsbel-bola-zwart-wit-swizzle.jpg',
  CLZ144: 'clariz-zwangerschapsbel-bola-goud-hartjes.jpg',
  CLZ145: 'clariz-zwangerschapsbel-bola-goud-mom.jpg',
  CLZ146: 'clariz-zwangerschapsbel-bola-zilver-druppel.jpg',
  CLZ147: 'clariz-zwangerschapsbel-bola-wit-voetjes-zilver.jpg', // voetafdruk → voetjes
  CLZ148: 'clariz-zwangerschapsbel-bola-zwart-voetafdruk.jpg',
  CLZ149: 'clariz-zwangerschapsbel-bola-wit-hartjes.jpg',
  CLZ182: 'clariz-zwangerschapsbel-bola-wit-mom-goud.jpg',
  CLZ183: 'clariz-zwangerschapsbel-bola-groen-mom.jpg',
  CLZ184: 'clariz-zwangerschapsbel-bola-zilver-olifantjes-goud.jpg',
  CLZ185: 'clariz-zwangerschapsbel-bola-kristal-rozegoud.jpg',
  CLZ186: 'clariz-zwangerschapsbel-bola-kristal-lila.jpg',
  CLZ187: 'clariz-zwangerschapsbel-bola-kristal-groen.jpg',
  CLZ188: 'clariz-zwangerschapsbel-bola-kristal-blauw.jpg',
  CLZ189: 'clariz-zwangerschapsbel-bola-kristal-roze.jpg',
  CLZ190: 'clariz-zwangerschapsbel-bola-kristal-zilver.jpg',
  CLZ191: 'clariz-zwangerschapsbel-bola-kristal-goud.jpg',
  CLZ192: 'clariz-zwangerschapsbel-bola-kristal-zwart.jpg',
  CLZ193: 'clariz-zwangerschapsbel-bola-zwart-mom-goud.jpg',
  CLZ194: 'clariz-zwangerschapsbel-bola-blauw-voetjes.jpg',
  CLZ195: 'clariz-zwangerschapsbel-bola-zwart-lieveheersbeestje.jpg',
  CLZ255: 'clariz-zwangerschapsbel-bola-wit-handjes-goud.jpg',
  CLZ256: 'clariz-zwangerschapsbel-bola-zwart-baby-goud.jpg',

  // Clariz klankbol
  CLZ163: 'clariz-klankbol-oranje.jpg',
  CLZ164: 'clariz-klankbol-zwart.jpg',
  CLZ165: 'clariz-klankbol-donkerblauw.jpg',
  CLZ166: 'clariz-klankbol-geel.jpg',
  CLZ167: 'clariz-klankbol-roze.jpg',
  CLZ168: 'clariz-klankbol-blauw.jpg',
  CLZ169: 'clariz-klankbol-zilver.jpg',
  CLZ170: 'clariz-klankbol-rood.jpg',
  CLZ171: 'clariz-klankbol-paars.jpg',
  CLZ172: 'clariz-klankbol-groen.jpg',
  CLZ173: 'clariz-klankbol-brons.jpg',
  CLZ174: 'clariz-klankbol-wit.jpg',

  // Clariz klankbolhouder
  CLZ153: 'clariz-klankbolhouder-zilver-hartjes.jpg',
  CLZ155: 'clariz-klankbolhouder-zilver-ruitjes.jpg',
  CLZ156: 'clariz-klankbolhouder-zilver-pijl.jpg',
  CLZ158: 'clariz-klankbolhouder-zilver-bloem-steentje.jpg',
  CLZ159: 'clariz-klankbolhouder-zilver-bloem-ei-antiek.jpg',
  CLZ160: 'clariz-klankbolhouder-zilver-hartjes-antique.jpg',
  CLZ161: 'clariz-klankbolhouder-zilver-krullen-antique.jpg',
  CLZ162: 'clariz-klankbolhouder-zilver-krullen.jpg',
  CLZ175: 'clariz-klankbolhouder-zilver-familie.jpg',
  CLZ176: 'clariz-klankbolhouder-zilver-locket.jpg',
  CLZ177: 'clariz-klankbolhouder-zilver-vlinder.jpg',
  CLZ243: 'clariz-klankbolhouder-bomen-kristal.jpg',
  CLZ244: 'clariz-klankbolhouder-goud-familie.jpg',
  CLZ245: 'clariz-klankbolhouder-goud-floral.jpg',
  CLZ246: 'clariz-klankbolhouder-goud-hart-locket.jpg',
  CLZ247: 'clariz-klankbolhouder-goud-spijlen.jpg',
  CLZ248: 'clariz-klankbolhouder-rozegoud-locket.jpg',
  CLZ249: 'clariz-klankbolhouder-rozegoud-krul.jpg',
  CLZ250: 'clariz-klankbolhouder-zilver-krullen-hartjes.jpg',
  CLZ251: 'clariz-klankbolhouder-zilver-peace.jpg',
  CLZ252: 'clariz-klankbolhouder-zwart-floral.jpg',
  CLZ254: 'clariz-klankbolhouder-zwart-love.jpg',

  // JB coats
  JB055: 'jelly-bean-nail-polish-uv-nagellak-coat-primer.jpg',
  JB400: 'jelly-bean-nail-polish-uv-nagellak-coat-basecoat.jpg',
  JB451: 'jelly-bean-nail-polish-uv-nagellak-coat-glossy-topcoat.jpg',
  JB452: 'jelly-bean-nail-polish-uv-nagellak-coat-matt-topcoat.jpg',

  // JB lamps
  JB453: 'jelly-bean-nail-polish-sunlamp-1.jpg',
  JB454: 'jelly-bean-nail-polish-sunlamp-mini-1.jpg',

  // JB packs
  JB465: 'jelly-bean-nail-polish-uv-nagellak-pack-starterpack-6W.jpg',
  JB466: 'jelly-bean-nail-polish-uv-nagellak-pack-starterpack-80W.jpg',
  JB467: 'jelly-bean-nail-polish-uv-nagellak-pack-startset-80W.jpg',
  JB468: 'jelly-bean-nail-polish-uv-nagellak-pack-startset-6W.jpg',
  JB470: 'jelly-bean-nail-polish-uv-nagellak-pack-primerpack-80W.jpg',
  JB493: 'jelly-bean-nail-polish-uv-nagellak-pack-coatpack-xl.jpg',
  JBCOATPK: 'jelly-bean-nail-polish-uv-nagellak-pack-coatpack.jpg',
  JBESSLIN: 'jelly-bean-nail-polish-uv-nagellak-liners-art-essentials.jpg',

  // JB "new" colors (by number)
  JB911: 'jelly-bean-nail-polish-uv-nagellak-911-black.jpg',
  JB914: 'jelly-bean-nail-polish-uv-nagellak-914-white.jpg',
  JB916: 'jelly-bean-nail-polish-uv-nagellak-916-nude.jpg',
  JB918: 'jelly-bean-nail-polish-uv-nagellak-918-rose.jpg',
  JB929: 'jelly-bean-nail-polish-uv-nagellak-929-mahogany.jpg',
  JB933: 'jelly-bean-nail-polish-uv-nagellak-933-cerulean.jpg',
  JB943: 'jelly-bean-nail-polish-uv-nagellak-943-arctic-shimmer.jpg',
  JB944: 'jelly-bean-nail-polish-uv-nagellak-944-charcoal-shimmer.jpg',
  JB949: 'jelly-bean-nail-polish-uv-nagellak-949-peach-shimmer.jpg',
  JB955: 'jelly-bean-nail-polish-uv-nagellak-955-ivory-shimmer.jpg',
  JB956: 'jelly-bean-nail-polish-uv-nagellak-956-gold-shimmer.jpg',
  JB957: 'jelly-bean-nail-polish-uv-nagellak-957-silver-shimmer.jpg',
  JB958: 'jelly-bean-nail-polish-uv-nagellak-958-graphite-shimmer.jpg',
  JB959: 'jelly-bean-nail-polish-uv-nagellak-959-sangria-shimmer.jpg',
  JB960: 'jelly-bean-nail-polish-uv-nagellak-960-forest-shimmer.jpg',
  JB428: 'jelly-bean-nail-polish-uv-nagellak-936-pistachio.jpg',

  // JB liners (by number)
  JB496: 'jelly-bean-nail-polish-uv-nagellak-liner-01-orange.jpg',
  JB497: 'jelly-bean-nail-polish-uv-nagellak-liner-02-mustard.jpg',
  JB498: 'jelly-bean-nail-polish-uv-nagellak-liner-03-wine-red.jpg',
  JB499: 'jelly-bean-nail-polish-uv-nagellak-liner-04-dark-blue.jpg',
  JB500: 'jelly-bean-nail-polish-uv-nagellak-liner-05-smoky-gray.jpg',
  JB501: 'jelly-bean-nail-polish-uv-nagellak-liner-silver.jpg',
  JB502: 'jelly-bean-nail-polish-uv-nagellak-liner-gold.jpg',
  JB503: 'jelly-bean-nail-polish-uv-nagellak-liner-08-red.jpg',
  JB504: 'jelly-bean-nail-polish-uv-nagellak-liner-10-rose-red.jpg',
  JB505: 'jelly-bean-nail-polish-uv-nagellak-liner-12-taro-purple.jpg',
  JB506: 'jelly-bean-nail-polish-uv-nagellak-liner-13-bright-yellow.jpg',
  JB507: 'jelly-bean-nail-polish-uv-nagellak-liner-14-dark-green.jpg',
  JB508: 'jelly-bean-nail-polish-uv-nagellak-liner-15-neon-orange.jpg',
  JB509: 'jelly-bean-nail-polish-uv-nagellak-liner-16-neon-green.jpg',
  JB510: 'jelly-bean-nail-polish-uv-nagellak-liner-17-lemon-yellow.jpg',
  JB511: 'jelly-bean-nail-polish-uv-nagellak-liner-18-neon-pink.jpg',
  JB512: 'jelly-bean-nail-polish-uv-nagellak-liner-19-neon-violet.jpg',
  JB513: 'jelly-bean-nail-polish-uv-nagellak-liner-20-neon-red.jpg',
  JB514: 'jelly-bean-nail-polish-uv-nagellak-liner-21-orange-red.jpg',

  // VL color polishes (by number)
  VL909: 'jelly-bean-nail-polish-uv-nagellak-909-koala.jpg',
  VL911: 'jelly-bean-nail-polish-uv-nagellak-911-black.jpg',
  VL912: 'jelly-bean-nail-polish-uv-nagellak-912-midnight.jpg',
  VL913: 'jelly-bean-nail-polish-uv-nagellak-913-cloud-grey.jpg',
  VL914: 'jelly-bean-nail-polish-uv-nagellak-914-white.jpg',
  VL916: 'jelly-bean-nail-polish-uv-nagellak-916-nude.jpg',
  VL917: 'jelly-bean-nail-polish-uv-nagellak-917-cherry-blossom.jpg',
  VL918: 'jelly-bean-nail-polish-uv-nagellak-918-rose.jpg',
  VL919: 'jelly-bean-nail-polish-uv-nagellak-919-blush.jpg',
  VL920: 'jelly-bean-nail-polish-uv-nagellak-920-mauve.jpg',
  VL925: 'jelly-bean-nail-polish-uv-nagellak-925-velvet.jpg',
  VL926: 'jelly-bean-nail-polish-uv-nagellak-926-scarlet.jpg',
  VL927: 'jelly-bean-nail-polish-uv-nagellak-927-crimson.jpg',
  VL928: 'jelly-bean-nail-polish-uv-nagellak-928-maroon.jpg',
  VL929: 'jelly-bean-nail-polish-uv-nagellak-929-mahogany.jpg',
  VL931: 'jelly-bean-nail-polish-uv-nagellak-931-sage.jpg',
  VL932: 'jelly-bean-nail-polish-uv-nagellak-932-blueberry.jpg',
  VL933: 'jelly-bean-nail-polish-uv-nagellak-933-cerulean.jpg',
  VL934: 'jelly-bean-nail-polish-uv-nagellak-934-sky-blue.jpg',
  VL935: 'jelly-bean-nail-polish-uv-nagellak-935-grasshopper.jpg',
  VL936: 'jelly-bean-nail-polish-uv-nagellak-936-pistachio.jpg',
  VL939: 'jelly-bean-nail-polish-uv-nagellak-939-cobalt.jpg',
  VL943: 'jelly-bean-nail-polish-uv-nagellak-943-arctic-shimmer.jpg',
  VL944: 'jelly-bean-nail-polish-uv-nagellak-944-charcoal-shimmer.jpg',
  VL949: 'jelly-bean-nail-polish-uv-nagellak-949-peach-shimmer.jpg',
  VL955: 'jelly-bean-nail-polish-uv-nagellak-955-ivory-shimmer.jpg',
  VL956: 'jelly-bean-nail-polish-uv-nagellak-956-gold-shimmer.jpg',
  VL957: 'jelly-bean-nail-polish-uv-nagellak-957-silver-shimmer.jpg',
  VL958: 'jelly-bean-nail-polish-uv-nagellak-958-graphite-shimmer.jpg',
  VL959: 'jelly-bean-nail-polish-uv-nagellak-959-sangria-shimmer.jpg',
  VL960: 'jelly-bean-nail-polish-uv-nagellak-960-forest-shimmer.jpg',

  // MC corrections (quantity mismatches + specific matches)
  MC028: 'mat-care-zwangerschapstest-midstream-ultra-6-stuks.jpg',
  MC030: 'mat-care-zwangerschapstest-midstream-ultra-6-stuks.jpg',
  MC037: 'mat-care-vruchtbaarheidstest-man-en-vrouw-verpakking.jpg',
  MC040: 'mat-care-multidrug-panel-1-stuk.jpg',
  MC041: 'mat-care-multidrug-panel-2-stuks.jpg',
  MC042: 'mat-care-multidrug-panel-4-stuks.jpg',
  MC043: 'mat-care-multidrug-panel-8-stuks.jpg',
  MC044: 'mat-care-menopauzetest-cassette-4-stuks.jpg',
  MC045: 'mat-care-menopauzetest-cassette-8-stuks.jpg',
  MC053: 'mat-care-pfeiffertest-2-stuks.jpg',
  MC061: 'mat-care-vaginale-phtest-10-stuks.jpg',
  MC062: 'mat-care-vaginale-phtest-1-stuk.jpg',
  MC063: 'mat-care-vaginale-phtest-2-stuks.jpg',
  MC075: 'mat-care-bbt-ovulatiethermometer-flexibele-tip.jpg',
  MC081: 'mat-care-menopauzetest-strip-4-stuks.jpg',
  MC082: 'mat-care-menopauzetest-strip-8-stuks.jpg',
  MC086: 'mat-care-zwangerschapstest-strip-ultra-6-stuks.jpg',
  MC089: 'mat-care-zwangerschapstest-cassette-ultra-6-stuks.jpg',

  // MenstriCup
  MC296: 'menstricup-blauw-vooraanzicht.jpg',
  MC297: 'menstricup-blauw-vooraanzicht.jpg',
  MC298: 'menstricup-roze-vooraanzicht.jpg',
  MC299: 'menstricup-roze-vooraanzicht.jpg',
  MsC294: 'menstricup-blauw-s-l.jpg',
  MsC295: 'menstricup-roze-s-l.jpg',
};

// Products with NO local file match (old/discontinued products)
const NO_MATCH = new Set([
  'CLZ103', 'CLZ104', 'CLZ110', 'CLZ117', // old bola designs
  'CLZ150', 'CLZ151', 'CLZ154',            // old klankbolhouders
  'CLZ253',                                  // zwart hart locket (no local file)
  'Aqua1',                                   // no match
]);

// SKU prefixes to skip entirely
const SKIP_PREFIXES = ['BB']; // Beebi = obsolete/archive

// Skip SALE products (have "sale" in the slug)
function isSaleProduct(slug: string): boolean {
  return slug.includes('-sale-');
}

// ─── Helpers ─────────────────────────────────────────────

function getBrandFolder(sku: string, dbFilename?: string): string {
  const code = sku.toUpperCase();
  // MenstriCup products have MC prefix but belong to menstricup
  if (dbFilename?.toLowerCase().startsWith('menstricup')) return 'menstricup';
  if (code.startsWith('CLZ') || code.startsWith('CL')) return 'clariz';
  if (code.startsWith('JB') || code.startsWith('VL')) return 'jellybean';
  if (code.startsWith('BB')) return 'beebi';
  if (code.startsWith('MSC')) return 'menstricup';
  if (code.startsWith('MS')) return 'menstricup';
  if (code.startsWith('MC') || code.startsWith('AQUA') || code.startsWith('H')) return 'matcare';
  return 'matcare';
}

function buildFileIndex(): Map<string, string> {
  const index = new Map<string, string>(); // lowercase name → full path
  const exts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'desktop.ini') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (exts.has(path.extname(entry.name).toLowerCase())) {
        index.set(entry.name.toLowerCase(), full);
        // Also index without double extension (.jpg.jpg)
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

// ─── MC fuzzy matching ───────────────────────────────────

function tokenize(filename: string): string[] {
  return filename.replace(/\.[a-z]+$/i, '').toLowerCase().split(/[-_\s]+/).filter(w => w.length > 1);
}

function fuzzyMatch(dbFilename: string, fileIndex: Map<string, string>, brandFolder: string): string | null {
  const dbTokens = new Set(tokenize(dbFilename));
  let bestScore = 0;
  let bestFile = '';

  for (const [localName, localPath] of fileIndex) {
    const folder = path.basename(path.dirname(localPath));
    if (folder !== brandFolder) continue;

    const localTokens = new Set(tokenize(localName));
    let overlap = 0;
    for (const t of dbTokens) {
      if (localTokens.has(t)) overlap++;
    }

    const union = new Set([...dbTokens, ...localTokens]).size;
    const score = overlap / union;

    if (score > bestScore) {
      bestScore = score;
      bestFile = localName;
    }
  }

  return bestScore >= 0.4 ? bestFile : null;
}

// ─── Main ────────────────────────────────────────────────

interface MigrationItem {
  sku: string;
  productId: number;
  slug: string;
  dbImage: string;
  localFile: string;     // full path to local file
  localFilename: string; // just the filename
  targetName: string;    // SEO-friendly name for S3
  imageIndex: number;
}

async function main() {
  console.log(EXECUTE ? '=== EXECUTING: Uploading to S3 ===' : '=== DRY RUN (use --execute to upload) ===');
  console.log();

  const fileIndex = buildFileIndex();
  console.log(`Local image files indexed: ${fileIndex.size}`);

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

  console.log(`Products found: ${products.length}\n`);

  const items: MigrationItem[] = [];
  let skippedAlreadyS3 = 0;
  let skippedBeebi = 0;
  let skippedSale = 0;
  let skippedNoMatch = 0;
  let skippedNoFile = 0;

  for (const product of products) {
    const sku = product.sku || '';
    const slug = product.slugs[0]?.slug || `product-${product.id}`;
    const name = product.translations[0]?.name || '(no name)';

    // Skip Beebi
    if (SKIP_PREFIXES.some(p => sku.toUpperCase().startsWith(p))) {
      skippedBeebi++;
      continue;
    }

    // Skip SALE
    if (isSaleProduct(slug)) {
      skippedSale++;
      continue;
    }

    // Skip known no-match
    if (NO_MATCH.has(sku)) {
      skippedNoMatch++;
      continue;
    }

    let images = product.images;
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { continue; }
    }
    if (!Array.isArray(images) || images.length === 0) continue;

    for (let i = 0; i < images.length; i++) {
      const img = images[i] as string;

      // Already in S3
      if (img.startsWith('/api/uploads/products/')) {
        skippedAlreadyS3++;
        continue;
      }

      const dbFilename = img.split('/').pop()!.split('?')[0];
      const brand = getBrandFolder(sku, dbFilename);

      // 1. Check explicit override
      let localFilename: string | null = null;
      if (sku in OVERRIDES) {
        localFilename = OVERRIDES[sku];
      }

      // 2. Try exact match on DB filename
      if (!localFilename && fileIndex.has(dbFilename.toLowerCase())) {
        localFilename = dbFilename.toLowerCase();
      }

      // 3. Fuzzy match within brand folder
      if (!localFilename) {
        localFilename = fuzzyMatch(dbFilename, fileIndex, brand);
      }

      if (!localFilename || !fileIndex.has(localFilename.toLowerCase())) {
        skippedNoFile++;
        console.log(`  SKIP ${sku} — ${name}: no local file for "${dbFilename}"`);
        continue;
      }

      const localPath = fileIndex.get(localFilename.toLowerCase())!;
      const ext = getExtension(localFilename);
      const counter = String(i + 1).padStart(2, '0');
      const targetName = `${slug}-${counter}${ext}`;

      items.push({
        sku,
        productId: product.id,
        slug,
        dbImage: img,
        localFile: localPath,
        localFilename,
        targetName,
        imageIndex: i,
      });
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`To upload: ${items.length}`);
  console.log(`Already in S3: ${skippedAlreadyS3}`);
  console.log(`Skipped Beebi: ${skippedBeebi}`);
  console.log(`Skipped SALE: ${skippedSale}`);
  console.log(`Skipped no match (old): ${skippedNoMatch}`);
  console.log(`Skipped no local file: ${skippedNoFile}`);
  console.log();

  if (!EXECUTE) {
    console.log('── Planned uploads ──\n');
    for (const item of items) {
      console.log(`${item.sku}: ${item.localFilename} → ${item.targetName}`);
    }
    console.log(`\nRun with --execute to upload.`);
    await prisma.$disconnect();
    return;
  }

  // ── Execute uploads ──
  let uploaded = 0;
  let alreadyExists = 0;
  let failed = 0;

  // Group by product for DB updates
  const byProduct = new Map<number, { items: MigrationItem[]; allImages: string[] }>();

  // First, collect existing images for products we're updating
  for (const item of items) {
    if (!byProduct.has(item.productId)) {
      const product = products.find(p => p.id === item.productId)!;
      let existingImages = product.images;
      if (typeof existingImages === 'string') {
        try { existingImages = JSON.parse(existingImages); } catch { existingImages = []; }
      }
      byProduct.set(item.productId, {
        items: [],
        allImages: (existingImages as string[]) || [],
      });
    }
    byProduct.get(item.productId)!.items.push(item);
  }

  for (const [productId, { items: productItems, allImages }] of byProduct) {
    const newImages = [...allImages];

    for (const item of productItems) {
      const s3Key = `${S3_PREFIX}/${item.targetName}`;
      const thumbKey = `${S3_PREFIX}/${getThumbnailKey(item.targetName)}`;
      const newUrl = `/api/uploads/products/${item.targetName}`;

      // Check if already exists in S3
      const exists = await s3Exists(s3Key);
      if (exists) {
        alreadyExists++;
        // Update the reference
        const idx = newImages.indexOf(item.dbImage);
        if (idx >= 0) newImages[idx] = newUrl;
        console.log(`  EXISTS ${item.sku}: ${item.targetName}`);
        continue;
      }

      // Read local file
      const buffer = fs.readFileSync(item.localFile);
      const ext = getExtension(item.targetName);
      const contentType = MIME_TYPES[ext] || 'image/jpeg';

      // Upload original
      await s3Upload(s3Key, buffer, contentType);

      // Upload thumbnail
      try {
        const thumb = await generateThumbnail(buffer);
        await s3Upload(thumbKey, thumb, 'image/webp');
      } catch (err) {
        console.warn(`    ⚠ Thumbnail failed for ${item.targetName}: ${err}`);
      }

      // Update image reference
      const idx = newImages.indexOf(item.dbImage);
      if (idx >= 0) newImages[idx] = newUrl;

      uploaded++;
      console.log(`  ✓ ${item.sku}: ${item.targetName}`);
    }

    // Update DB
    await prisma.product.update({
      where: { id: productId },
      data: { images: newImages },
    });
  }

  console.log(`\n=== Done ===`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Already in S3: ${alreadyExists}`);
  console.log(`Failed: ${failed}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
