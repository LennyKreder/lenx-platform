/**
 * Export download URLs for all published products and bundles.
 *
 * Output format:
 * {
 *   "products": {
 *     "2026": { "royal_blue": { "en": "url", "nl": "url" }, ... }
 *   },
 *   "bundles": {
 *     "bundle-download-code": { "name": "Bundle Name", "urls": { "en": "url", "nl": "url" } }
 *   }
 * }
 *
 * Usage:
 *   npx tsx scripts/export-download-urls.ts                    # Output to stdout
 *   npx tsx scripts/export-download-urls.ts --output file.json # Write to file
 *   npx tsx scripts/export-download-urls.ts --output auto      # Write to FILES_PATH/download_urls.json
 */

// Load dotenv only if available (dev environment)
try { require('dotenv/config'); } catch {}

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const BASE_URL = 'https://layoutsbylenny.com';
const SUPPORTED_LANGUAGES = ['en', 'nl'];

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

interface ProductUrlsOutput {
  [year: string]: {
    [themeSlug: string]: {
      [language: string]: string;
    };
  };
}

interface BundleUrlsOutput {
  [downloadCode: string]: {
    name: string; // English name for reference
    theme: string;
    isAllAccess: boolean;
    urls: {
      [language: string]: {
        url: string;
        name: string; // Language-specific name
      };
    };
  };
}

interface DownloadUrlsOutput {
  products: ProductUrlsOutput;
  bundles: BundleUrlsOutput;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let outputPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      const outputArg = args[i + 1];
      if (outputArg === 'auto') {
        // Use FILES_PATH environment variable
        const filesPath = process.env.FILES_PATH;
        if (!filesPath) {
          console.error('Error: FILES_PATH environment variable not set');
          process.exit(1);
        }
        outputPath = path.join(filesPath, 'download_urls.json');
      } else {
        outputPath = outputArg;
      }
    }
  }

  // Initialize output structure
  const output: DownloadUrlsOutput = {
    products: {},
    bundles: {},
  };

  // Query all published products with theme, contentLanguage, and year
  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      theme: { not: null },
      contentLanguage: { not: null },
      year: { not: null },
    },
    select: {
      downloadCode: true,
      theme: true,
      contentLanguage: true,
      year: true,
    },
    orderBy: [{ year: 'asc' }, { theme: 'asc' }, { contentLanguage: 'asc' }],
  });

  // Group products by year, then theme, then contentLanguage
  for (const product of products) {
    if (!product.theme || !product.contentLanguage || !product.year) continue;

    const yearKey = String(product.year);

    if (!output.products[yearKey]) {
      output.products[yearKey] = {};
    }

    if (!output.products[yearKey][product.theme]) {
      output.products[yearKey][product.theme] = {};
    }

    // Build download URL: /{lang}/library/planner/{downloadCode}
    const url = `${BASE_URL}/${product.contentLanguage}/library/planner/${product.downloadCode}`;
    output.products[yearKey][product.theme][product.contentLanguage] = url;
  }

  // Query all published bundles
  const bundles = await prisma.bundle.findMany({
    where: {
      isPublished: true,
    },
    select: {
      downloadCode: true,
      theme: true,
      isAllAccess: true,
      translations: {
        select: {
          languageCode: true,
          name: true,
        },
      },
    },
    orderBy: [{ isAllAccess: 'desc' }, { createdAt: 'asc' }],
  });

  // Add bundles to output
  for (const bundle of bundles) {
    // Get English name as primary, fallback to first available
    const enTranslation = bundle.translations.find((t) => t.languageCode === 'en');
    const name = enTranslation?.name || bundle.translations[0]?.name || 'Bundle';

    // Determine theme: use bundle's theme, or default based on type
    // All Access bundles default to premium_gold, regular bundles to royal_blue
    const theme = bundle.theme || (bundle.isAllAccess ? 'premium_gold' : 'royal_blue');

    // Build URLs for each supported language with language-specific names
    const urls: { [lang: string]: { url: string; name: string } } = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      // Find language-specific translation
      const translation = bundle.translations.find((t) => t.languageCode === lang);
      const langName = translation?.name || name; // Fall back to English name

      urls[lang] = {
        url: `${BASE_URL}/${lang}/library/planner/${bundle.downloadCode}`,
        name: langName,
      };
    }

    output.bundles[bundle.downloadCode] = {
      name,
      theme,
      isAllAccess: bundle.isAllAccess,
      urls,
    };
  }

  // Output JSON
  const jsonOutput = JSON.stringify(output, null, 2);

  if (outputPath) {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, jsonOutput);
    console.log(`Written to: ${outputPath}`);
  } else {
    // Output to stdout
    console.log(jsonOutput);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
