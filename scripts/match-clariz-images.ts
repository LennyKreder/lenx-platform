/**
 * Smart matcher for Clariz bola + klankbolhouder images.
 * Uses color synonyms + design element keywords for precise matching.
 *
 * Usage: npx tsx scripts/match-clariz-images.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CLARIZ_DIR = path.resolve('tmp/images/clariz');

// ─── Color synonyms ─────────────────────────────────────

const COLOR_SYNONYMS: Record<string, string> = {
  verzilverd: 'zilver',
  verzilverde: 'zilver',
  zilveren: 'zilver',
  gouden: 'goud',
  // Keep these as-is:
  wit: 'wit',
  zwart: 'zwart',
  roze: 'roze',
  blauw: 'blauw',
  paars: 'paars',
  groen: 'groen',
  goud: 'goud',
  zilver: 'zilver',
  lila: 'lila',
  rood: 'rood',
  brons: 'brons',
  rozegoud: 'rozegoud',
  turquoise: 'turquoise',
  oranje: 'oranje',
  fel: '', // drop "fel" (intensifier, not a color)
  met: '', // drop "met" (with)
  antique: 'antique',
  antiek: 'antique',
};

// Design elements that distinguish products
const DESIGN_KEYWORDS = new Set([
  'voetjes', 'hartjes', 'bloem', 'pootjes', 'handjes', 'mom', 'love',
  'bubbles', 'olifantjes', 'baby', 'krul', 'krullen', 'druppel', 'voetafdruk',
  'lieveheersbeestje', 'yin', 'yang', 'swirl', 'hart', 'giraffe',
  'sleutelgat', 'spinnenweb', 'voetbal', 'wereldbol', 'kompas',
  'panda', 'pinguin', 'boom', 'floral', 'peace', 'locket', 'familie',
  'spijlen', 'ruitjes', 'vlinder', 'vleugel', 'kristal', 'steentje',
  'engelenvleugel', 'swizzle', 'way',
]);

/** Normalize a filename into a set of meaningful keywords */
function extractKeywords(filename: string): Set<string> {
  const name = filename.replace(/\.[a-z]+$/i, '').toLowerCase();
  const tokens = name.split(/[-_\s]+/);

  const keywords = new Set<string>();
  for (const token of tokens) {
    // Skip common prefixes
    if (['clariz', 'bola', 'zwangerschapsbel', 'zwangerschapsketting',
         'zwangerschapsbelletje', 'zwangerschapssierraad', 'zwangerschapshanger',
         'klankbolhouder', 'verzilverde', 'houder'].includes(token)) {
      // Still extract color from compound words
      if (token in COLOR_SYNONYMS) {
        const norm = COLOR_SYNONYMS[token];
        if (norm) keywords.add(norm);
      }
      continue;
    }

    if (token in COLOR_SYNONYMS) {
      const norm = COLOR_SYNONYMS[token];
      if (norm) keywords.add(norm);
    } else if (DESIGN_KEYWORDS.has(token)) {
      keywords.add(token);
    } else if (token.length > 2) {
      keywords.add(token);
    }
  }

  return keywords;
}

/** Score match between two keyword sets */
function keywordMatch(dbKeys: Set<string>, localKeys: Set<string>): number {
  if (dbKeys.size === 0 || localKeys.size === 0) return 0;

  let overlap = 0;
  for (const k of dbKeys) {
    if (localKeys.has(k)) overlap++;
  }

  // Require at least 2 overlapping keywords for any match
  if (overlap < 2) return 0;

  const precision = overlap / dbKeys.size; // how much of DB keywords matched
  const recall = overlap / localKeys.size; // how much of local keywords matched

  // F1-like score, weighted towards precision
  return (2 * precision * recall) / (precision + recall);
}

async function main() {
  // Build local file index
  const localFiles: { name: string; keywords: Set<string> }[] = [];
  for (const f of fs.readdirSync(CLARIZ_DIR)) {
    if (f === 'desktop.ini') continue;
    const ext = path.extname(f).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
    localFiles.push({ name: f, keywords: extractKeywords(f) });
  }

  console.log(`Local Clariz files: ${localFiles.length}\n`);

  // Get Clariz products
  const products = await prisma.product.findMany({
    where: {
      site: { siteType: 'physical' },
      sku: { startsWith: 'CLZ' },
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

  const usedFiles = new Set<string>();
  let matched = 0;
  let unmatched = 0;

  for (const product of products) {
    let images = product.images;
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { continue; }
    }
    if (!Array.isArray(images) || images.length === 0) continue;

    const name = product.translations[0]?.name || '(no name)';
    const slug = product.slugs[0]?.slug || `product-${product.id}`;

    for (let i = 0; i < images.length; i++) {
      const img = images[i] as string;
      if (img.startsWith('/api/uploads/products/')) continue;

      const dbFilename = img.split('/').pop()!.split('?')[0];
      const dbKeys = extractKeywords(dbFilename);

      // Find best match
      let bestScore = 0;
      let bestFile = '';
      let bestKeys = new Set<string>();

      for (const local of localFiles) {
        const score = keywordMatch(dbKeys, local.keywords);
        if (score > bestScore) {
          bestScore = score;
          bestFile = local.name;
          bestKeys = local.keywords;
        }
      }

      const counter = String(i + 1).padStart(2, '0');
      const ext = path.extname(dbFilename).toLowerCase() || '.jpg';

      if (bestScore >= 0.5) {
        matched++;
        const dup = usedFiles.has(bestFile) ? ' ⚠ DUPLICATE' : '';
        usedFiles.add(bestFile);
        console.log(`${product.sku} — ${name}`);
        console.log(`  DB:    ${dbFilename}`);
        console.log(`  Keys:  [${[...dbKeys].join(', ')}]`);
        console.log(`  Match: ${bestFile} (${Math.round(bestScore * 100)}%)${dup}`);
        console.log(`  Local: [${[...bestKeys].join(', ')}]`);
        console.log(`  → ${slug}-${counter}${ext}`);
        console.log();
      } else {
        unmatched++;
        console.log(`${product.sku} — ${name}`);
        console.log(`  DB:    ${dbFilename}`);
        console.log(`  Keys:  [${[...dbKeys].join(', ')}]`);
        if (bestFile) {
          console.log(`  Best:  ${bestFile} (${Math.round(bestScore * 100)}%) — TOO LOW`);
        }
        console.log(`  ✗ NO MATCH`);
        console.log();
      }
    }
  }

  // Show unused local files
  const unused = localFiles.filter(f => !usedFiles.has(f.name));
  if (unused.length > 0) {
    console.log(`\n── Unused local files (${unused.length}) ──`);
    for (const f of unused) {
      console.log(`  ${f.name}`);
    }
  }

  console.log(`\nMatched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
