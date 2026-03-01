import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import path from 'path';

const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;
const THUMB_QUALITY = 80;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

async function main() {
  const uploadsDir = process.argv[2];
  if (!uploadsDir) {
    console.error('Usage: tsx scripts/generate-thumbnails.ts <uploads-products-dir>');
    console.error('Example: tsx scripts/generate-thumbnails.ts /app/uploads/products');
    process.exit(1);
  }

  const resolvedDir = path.resolve(uploadsDir);
  console.log(`Scanning: ${resolvedDir}`);

  const files = await readdir(resolvedDir);
  const imageFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) && !f.includes('-thumb.');
  });

  console.log(`Found ${imageFiles.length} images (excluding existing thumbnails)`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of imageFiles) {
    const ext = path.extname(file);
    const base = file.slice(0, -ext.length);
    const thumbName = `${base}-thumb.webp`;
    const thumbPath = path.join(resolvedDir, thumbName);

    // Skip if thumbnail already exists
    try {
      await stat(thumbPath);
      skipped++;
      continue;
    } catch {
      // Thumbnail doesn't exist, generate it
    }

    try {
      const inputPath = path.join(resolvedDir, file);
      await sharp(inputPath)
        .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbPath);
      generated++;
      console.log(`  Generated: ${thumbName}`);
    } catch (err) {
      failed++;
      console.error(`  Failed: ${file}`, err);
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`);
}

main();
