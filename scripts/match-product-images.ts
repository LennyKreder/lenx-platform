/**
 * Match product image references (from DB) to actual local files in tmp/images/.
 * Outputs a TSV file for human review, then can be used for migration.
 *
 * Usage: npx tsx scripts/match-product-images.ts
 *
 * Outputs: tmp/image-matches.tsv
 */

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const IMAGES_DIR = path.resolve('tmp/images');

// ─── Build local file index ─────────────────────────────

function buildFileIndex(dir: string): Map<string, string> {
  const index = new Map<string, string>();
  const exts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (exts.has(path.extname(entry.name).toLowerCase())) {
        index.set(entry.name.toLowerCase(), full);
      }
    }
  }

  walk(dir);
  return index;
}

function extractFilename(img: string): string {
  return img.split('/').pop()!.split('?')[0];
}

function tokenize(filename: string): string[] {
  const name = filename.replace(/\.[a-z]+$/, '');
  return name.toLowerCase().split(/[-_\s]+/).filter(w => w.length > 1);
}

function similarityScore(dbFilename: string, localFilename: string): number {
  const dbTokens = tokenize(dbFilename);
  const localTokens = tokenize(localFilename);
  if (dbTokens.length === 0 || localTokens.length === 0) return 0;

  const dbSet = new Set(dbTokens);
  const localSet = new Set(localTokens);

  let overlap = 0;
  for (const t of dbSet) {
    if (localSet.has(t)) overlap++;
  }

  const union = new Set([...dbTokens, ...localTokens]).size;
  return overlap / union;
}

/** Find top matches for a DB image reference within a brand folder */
function findMatches(
  dbImage: string,
  fileIndex: Map<string, string>,
  brandFolder: string
): { file: string; localName: string; score: number }[] {
  const dbFilename = extractFilename(dbImage).toLowerCase();

  // Exact match
  if (fileIndex.has(dbFilename)) {
    return [{ file: fileIndex.get(dbFilename)!, localName: dbFilename, score: 1.0 }];
  }

  // Score all files in the same brand folder
  const candidates: { file: string; localName: string; score: number }[] = [];

  for (const [localName, localPath] of fileIndex) {
    const localFolder = path.basename(path.dirname(localPath));
    if (brandFolder && localFolder !== brandFolder) continue;

    const score = similarityScore(dbFilename, localName);
    if (score >= 0.4) {
      candidates.push({ file: localPath, localName, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 1); // best match only
}

function getBrandFolder(sku: string): string {
  const code = sku.toUpperCase();
  if (code.startsWith('CLZ') || code.startsWith('CL')) return 'clariz';
  if (code.startsWith('JB') || code.startsWith('VL')) return 'jellybean';
  if (code.startsWith('BB')) return 'beebi';
  if (code.startsWith('MS')) return 'menstricup';
  if (code.startsWith('MC') || code.startsWith('AQUA') || code.startsWith('H')) return 'matcare';
  return 'matcare';
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log('Building local file index...');
  const fileIndex = buildFileIndex(IMAGES_DIR);
  console.log(`Found ${fileIndex.size} image files\n`);

  const products = await prisma.product.findMany({
    where: { site: { siteType: 'physical' } },
    select: {
      id: true,
      sku: true,
      images: true,
      translations: {
        select: { name: true, languageCode: true },
        take: 1,
      },
      slugs: {
        where: { isPrimary: true },
        select: { slug: true },
        take: 1,
      },
    },
    orderBy: { sku: 'asc' },
  });

  // TSV output
  const lines: string[] = [];
  lines.push(['OK', 'SKU', 'Product Name', 'Image #', 'DB Filename', 'Matched Local File', 'Score', 'Target S3 Name'].join('\t'));

  let exact = 0;
  let fuzzy = 0;
  let noMatch = 0;
  let skipped = 0;

  for (const product of products) {
    let images = product.images;

    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { continue; }
    }
    if (!Array.isArray(images) || images.length === 0) continue;

    const name = product.translations[0]?.name || '(no name)';
    const slug = product.slugs[0]?.slug || `product-${product.id}`;
    const brand = getBrandFolder(product.sku || '');

    for (let i = 0; i < images.length; i++) {
      const img = images[i] as string;

      if (img.startsWith('/api/uploads/products/')) {
        skipped++;
        continue;
      }

      const dbFilename = extractFilename(img);
      const counter = String(i + 1).padStart(2, '0');
      const ext = path.extname(dbFilename).toLowerCase() || '.jpg';
      const targetName = `${slug}-${counter}${ext}`;

      const matches = findMatches(img, fileIndex, brand);

      if (matches.length > 0 && matches[0].score === 1.0) {
        exact++;
        lines.push(['Y', product.sku || '', name, String(i + 1), dbFilename, matches[0].localName, '100', targetName].join('\t'));
      } else if (matches.length > 0) {
        fuzzy++;
        const m = matches[0];
        const pct = Math.round(m.score * 100);
        // Auto-approve high confidence (>=75%), mark uncertain ones with ?
        const ok = pct >= 75 ? 'Y' : '?';
        lines.push([ok, product.sku || '', name, String(i + 1), dbFilename, m.localName, String(pct), targetName].join('\t'));
      } else {
        noMatch++;
        lines.push(['N', product.sku || '', name, String(i + 1), dbFilename, '', '0', targetName].join('\t'));
      }
    }
  }

  const outFile = path.resolve('tmp/image-matches.tsv');
  fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf-8');

  console.log(`Written to: ${outFile}`);
  console.log(`\nExact matches (Y, 100%): ${exact}`);
  console.log(`Fuzzy matches: ${fuzzy}`);
  console.log(`No match (N): ${noMatch}`);
  console.log(`Already in S3 (skipped): ${skipped}`);
  console.log(`\nReview the TSV file:`);
  console.log(`  - "Y" = auto-approved (high confidence or exact)`);
  console.log(`  - "?" = needs review — change to "Y" to approve, "N" to skip`);
  console.log(`  - "N" = no match found`);
  console.log(`\nYou can also edit the "Matched Local File" column to manually pick the right file.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Match failed:', err);
  process.exit(1);
});
