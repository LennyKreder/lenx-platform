/**
 * Import products from Orderhub JSON exports into the Lenx platform.
 *
 * Reads tmp/products.json (old format) and tmp/products_new.json (new format).
 * Deduplicates by EAN, preferring the new format data.
 * Maps brand prefixes to sites (MC→matcare, CLZ→clariz, JB→jellybean, BB→jellybean, etc.)
 * Creates categories, product families, products, translations, listings, inventory.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/import-orderhub.ts
 */

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Setup ──────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SITES = {
  matcare: '00000000-0000-0000-0000-000000000002',
  clariz: '00000000-0000-0000-0000-000000000003',
  jellybean: '00000000-0000-0000-0000-000000000004',
} as const;

// Brand prefix → site code
function getSiteCode(productCode: string): keyof typeof SITES | null {
  const code = productCode.toUpperCase();
  if (code.startsWith('MC') || code.startsWith('AQUA')) return 'matcare';
  if (code.startsWith('CLZ') || code.startsWith('CL')) return 'clariz';
  if (code.startsWith('JB') || code.startsWith('VL')) return 'jellybean';
  if (code.startsWith('BB')) return 'jellybean'; // Beebi products → jellybean site
  if (code.startsWith('MS')) return 'matcare'; // MenstriCup → matcare
  if (code.startsWith('H')) return 'matcare'; // fallback for 'h' prefix
  return null;
}

// Old format brand_id → site code
function getSiteCodeFromBrandId(brandId: number): keyof typeof SITES | null {
  switch (brandId) {
    case 1: return 'matcare';     // MC products
    case 2: return 'clariz';      // CLZ products
    case 3: return 'jellybean';   // JB products
    case 5: return 'jellybean';   // BB (Beebi) products
    case 6: return 'matcare';     // Aquasonic products
    case 7: return 'matcare';     // MenstriCup products
    default: return null;
  }
}

// Category ID → human-readable name (inferred from product titles)
const CATEGORY_NAMES: Record<number, string> = {
  0: 'Overig',
  19: 'Zwangerschapstesten',
  20: 'Menopauzetesten',
  21: 'Ovulatietesten',
  22: 'Ziektetesten',
  23: 'Gezondheidstesten',
  24: 'Thermometers',
  26: 'Zwangerschapsbellen',
  28: 'Medische testen',
  29: 'Zwangerschapsaccessoires',
  30: 'Nagelverzorging',
  31: 'Babyverzorging',
  32: 'Vrouwenverzorging',
  33: 'Nagellak',
  35: 'Menstruatie',
};

// Category ID → site code (which site owns this category)
function getCategorySite(catId: number): keyof typeof SITES {
  if ([26, 29].includes(catId)) return 'clariz';
  if ([33, 30].includes(catId)) return 'jellybean';
  if ([31].includes(catId)) return 'jellybean'; // Beebi = jellybean
  return 'matcare'; // Default health/medical categories to matcare
}

// ─── Types ──────────────────────────────────────────────

interface OldProduct {
  product_id: number;
  ean: string;
  code: string;
  qty: number;
  title: string;
  description: string;
  price_inc: string;
  price_ex: string;
  for_sale: number;
  main_image_url: string;
  attributes: string;
  created_at: string;
  updated_at: string;
  stock: number;
  price: string;
  delivery_code: string | null;
  brand_id: number;
  product_category_id: number;
  img1: string; img2: string; img3: string; img4: string; img5: string;
}

interface NewProduct {
  id: number;
  product_ean: string;
  product_code: string;
  product_qty: number;
  product_title: string;
  product_description: string;
  price_inc: string;
  price_ex: string;
  for_sale: number;
  main_category: number;
  extra_category_1: number;
  extra_category_2: number;
  extra_category_3: number;
  main_image: string;
  extra_image_1: string;
  extra_image_2: string;
  extra_image_3: string;
  extra_image_4: string;
  attributes: string;
  inserted: string;
  updated: string;
}

interface NormalizedProduct {
  ean: string;
  code: string;
  title: string;
  description: string;
  priceIncCents: number;
  priceExCents: number;
  forSale: boolean;
  stock: number;
  categoryId: number;
  siteCode: keyof typeof SITES;
  mainImage: string;
  extraImages: string[];
  weightGrams: number | null;
  familyName: string | null;
  attributes: Record<string, string>;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────

function priceToCents(price: string): number {
  const f = parseFloat(price);
  if (isNaN(f)) return 0;
  return Math.round(f * 100);
}

function parsePhpSerialized(str: string): Record<string, string> {
  // Simple PHP serialized object parser for stdClass
  const result: Record<string, string> = {};
  // Match s:N:"key";s:N:"value"; patterns
  const regex = /s:\d+:"([^"]+)";s:\d+:"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

function parseAttributes(attrStr: string): Record<string, string> {
  if (!attrStr) return {};
  // New format: JSON string
  if (attrStr.startsWith('{')) {
    try {
      return JSON.parse(attrStr);
    } catch {
      return {};
    }
  }
  // Old format: PHP serialized
  return parsePhpSerialized(attrStr);
}

function generateDownloadCode(): string {
  return 'LBL' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const oldPath = path.join(projectRoot, 'tmp', 'products.json');
  const newPath = path.join(projectRoot, 'tmp', 'products_new.json');

  const oldProducts: OldProduct[] = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));
  const newProducts: NewProduct[] = JSON.parse(fs.readFileSync(newPath, 'utf-8'));

  console.log(`Loaded ${oldProducts.length} old products, ${newProducts.length} new products`);

  // ─── Normalize & deduplicate ────────────────────────

  const byEan = new Map<string, NormalizedProduct>();

  // First add old products
  for (const p of oldProducts) {
    if (!p.ean) continue;
    const siteCode = getSiteCode(p.code) || getSiteCodeFromBrandId(p.brand_id);
    if (!siteCode) {
      console.warn(`  Skipping old product ${p.code} (${p.ean}): unknown brand`);
      continue;
    }
    const attrs = parseAttributes(p.attributes);
    const images: string[] = [];
    if (p.main_image_url) images.push(p.main_image_url);
    for (const img of [p.img1, p.img2, p.img3, p.img4, p.img5]) {
      if (img) images.push(img);
    }

    byEan.set(p.ean, {
      ean: p.ean,
      code: p.code,
      title: p.title,
      description: p.description,
      priceIncCents: priceToCents(p.price_inc),
      priceExCents: priceToCents(p.price_ex),
      forSale: p.for_sale === 1,
      stock: p.stock || p.qty || 0,
      categoryId: p.product_category_id,
      siteCode,
      mainImage: p.main_image_url || '',
      extraImages: images.slice(1),
      weightGrams: attrs['Weight'] ? parseInt(attrs['Weight']) : null,
      familyName: attrs['Family Name'] || null,
      attributes: attrs,
      createdAt: p.created_at || new Date().toISOString(),
    });
  }

  // Then overwrite with new products (preferred)
  for (const p of newProducts) {
    if (!p.product_ean) continue;
    const siteCode = getSiteCode(p.product_code);
    if (!siteCode) {
      console.warn(`  Skipping new product ${p.product_code} (${p.product_ean}): unknown brand`);
      continue;
    }
    const attrs = parseAttributes(p.attributes);
    const images: string[] = [];
    if (p.main_image) images.push(p.main_image);
    for (const img of [p.extra_image_1, p.extra_image_2, p.extra_image_3, p.extra_image_4]) {
      if (img) images.push(img);
    }

    byEan.set(p.product_ean, {
      ean: p.product_ean,
      code: p.product_code,
      title: p.product_title,
      description: p.product_description,
      priceIncCents: priceToCents(p.price_inc),
      priceExCents: priceToCents(p.price_ex),
      forSale: p.for_sale === 1,
      stock: p.product_qty || 0,
      categoryId: p.main_category,
      siteCode,
      mainImage: p.main_image || '',
      extraImages: images.slice(1),
      weightGrams: attrs['Weight'] ? parseInt(attrs['Weight']) : null,
      familyName: attrs['Family Name'] || null,
      attributes: attrs,
      createdAt: p.inserted || new Date().toISOString(),
    });
  }

  const products = [...byEan.values()];
  console.log(`\nMerged to ${products.length} unique products`);

  // Count per site
  const perSite: Record<string, number> = {};
  for (const p of products) {
    perSite[p.siteCode] = (perSite[p.siteCode] || 0) + 1;
  }
  console.log('Per site:', perSite);

  // ─── Check language exists ──────────────────────────

  const nlLang = await prisma.language.findUnique({ where: { id: 'nl' } });
  if (!nlLang) {
    await prisma.language.create({ data: { id: 'nl', name: 'Nederlands', nativeName: 'Nederlands', isActive: true } });
    console.log('Created nl language');
  }

  // ─── Create categories ──────────────────────────────

  console.log('\n--- Creating categories ---');
  const categoryIds = new Set(products.map((p) => p.categoryId));
  const categoryMap = new Map<string, number>(); // "siteCode:oldCatId" → new category ID

  for (const oldCatId of categoryIds) {
    const catName = CATEGORY_NAMES[oldCatId] || `Category ${oldCatId}`;
    // Determine which sites need this category
    const sitesNeedingCat = new Set<keyof typeof SITES>();
    for (const p of products) {
      if (p.categoryId === oldCatId) {
        sitesNeedingCat.add(p.siteCode);
      }
    }

    for (const siteCode of sitesNeedingCat) {
      const siteId = SITES[siteCode];
      const key = `${siteCode}:${oldCatId}`;

      // Check if already exists
      const existing = await prisma.category.findFirst({
        where: { siteId },
        include: { translations: { where: { languageCode: 'nl' } } },
      });
      if (existing?.translations.some((t) => t.name === catName)) {
        categoryMap.set(key, existing.id);
        continue;
      }

      const cat = await prisma.category.create({
        data: {
          siteId,
          type: 'product',
          isActive: true,
          translations: {
            create: { languageCode: 'nl', name: catName },
          },
        },
      });
      categoryMap.set(key, cat.id);
      console.log(`  Created category "${catName}" for ${siteCode} (id=${cat.id})`);
    }
  }

  // ─── Create product families ────────────────────────

  console.log('\n--- Creating product families ---');
  const familyMap = new Map<string, number>(); // "siteCode:familyName" → family ID

  const familyNames = new Set<string>();
  for (const p of products) {
    if (p.familyName) {
      familyNames.add(`${p.siteCode}:${p.familyName}`);
    }
  }

  for (const key of familyNames) {
    const [siteCode, ...nameParts] = key.split(':');
    const name = nameParts.join(':');
    const siteId = SITES[siteCode as keyof typeof SITES];

    const family = await prisma.productFamily.create({
      data: { siteId, name },
    });
    familyMap.set(key, family.id);
  }
  console.log(`  Created ${familyMap.size} product families`);

  // ─── Get webshop channels ───────────────────────────

  const channels = await prisma.salesChannel.findMany({
    where: { type: 'webshop' },
  });
  const channelBySite = new Map<string, number>();
  for (const ch of channels) {
    channelBySite.set(ch.siteId, ch.id);
  }

  // ─── Import products ────────────────────────────────

  console.log('\n--- Importing products ---');
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of products) {
    const siteId = SITES[p.siteCode];
    const channelId = channelBySite.get(siteId);

    // Check if already exists by EAN
    const existing = await prisma.product.findFirst({
      where: { siteId, ean: p.ean },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Also check by SKU
    const existingBySku = await prisma.product.findFirst({
      where: { siteId, sku: p.code },
    });
    if (existingBySku) {
      skipped++;
      continue;
    }

    const catKey = `${p.siteCode}:${p.categoryId}`;
    const categoryId = categoryMap.get(catKey) || null;
    const familyKey = p.familyName ? `${p.siteCode}:${p.familyName}` : null;
    const familyId = familyKey ? familyMap.get(familyKey) || null : null;

    // Build images array
    const images: string[] = [];
    if (p.mainImage) images.push(p.mainImage);
    for (const img of p.extraImages) {
      if (img) images.push(img);
    }

    try {
      const product = await prisma.product.create({
        data: {
          siteId,
          sku: p.code,
          ean: p.ean,
          categoryId,
          familyId,
          priceInCents: p.priceIncCents,
          costPriceInCents: p.priceExCents > 0 ? p.priceExCents : null,
          currency: 'EUR',
          weightGrams: p.weightGrams,
          images: images,
          isPublished: p.forSale,
          isFeatured: false,
          publishedAt: p.forSale ? new Date() : null,
          downloadCode: generateDownloadCode(),
          templateVariables: JSON.stringify({}),
          translations: {
            create: {
              languageCode: 'nl',
              name: p.title.slice(0, 200),
              title: p.title.slice(0, 200),
              description: p.description,
            },
          },
          // Create inventory
          inventory: {
            create: {
              quantityOnHand: p.stock,
              quantityReserved: 0,
              lowStockThreshold: 5,
            },
          },
          // Create webshop listing
          ...(channelId ? {
            listings: {
              create: {
                channelId,
                priceInCents: p.priceIncCents,
                currency: 'EUR',
                isPublished: p.forSale,
                isFeatured: false,
                publishedAt: p.forSale ? new Date() : null,
                isActive: true,
              },
            },
          } : {}),
        },
      });

      // Create slug
      const slug = p.attributes['SEO Slug'] || slugify(p.title);
      try {
        await prisma.slugRoute.create({
          data: {
            siteId,
            languageCode: 'nl',
            slug,
            entityType: 'product',
            productId: product.id,
            isPrimary: true,
          },
        });
      } catch {
        // Slug conflict — try with EAN suffix
        await prisma.slugRoute.create({
          data: {
            siteId,
            languageCode: 'nl',
            slug: `${slug}-${p.ean}`,
            entityType: 'product',
            productId: product.id,
            isPrimary: true,
          },
        });
      }

      created++;
    } catch (err) {
      const msg = `Failed to create ${p.code} (${p.ean}): ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
    }
  }

  // ─── Summary ────────────────────────────────────────

  console.log(`\n=== Import Complete ===`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) {
      console.log(`  ${e}`);
    }
  }

  // Verify counts
  for (const [code, siteId] of Object.entries(SITES)) {
    const count = await prisma.product.count({ where: { siteId } });
    const listingCount = await prisma.productListing.count({
      where: { channel: { siteId } },
    });
    console.log(`  ${code}: ${count} products, ${listingCount} listings`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
