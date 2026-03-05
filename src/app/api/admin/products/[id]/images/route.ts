import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { listObjects, putObject, deleteObject } from '@/lib/s3';
import { evictCache } from '@/lib/s3-cache';
import { generateSlug } from '@/lib/slug-utils';
import { getThemeName } from '@/config/themes';
import sharp from 'sharp';

const S3_UPLOADS_PREFIX = 'uploads/products';

// Get the next counter for a product's images based on base slug
async function getNextImageCounter(baseSlug: string): Promise<number> {
  try {
    const objects = await listObjects(`${S3_UPLOADS_PREFIX}/${baseSlug}-`);
    const pattern = new RegExp(`${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.[a-z]+$`, 'i');
    let maxCounter = 0;

    for (const obj of objects) {
      const filename = obj.key.split('/').pop() || '';
      const match = filename.match(pattern);
      if (match) {
        const counter = parseInt(match[1], 10);
        if (counter > maxCounter) {
          maxCounter = counter;
        }
      }
    }

    return maxCounter + 1;
  } catch {
    return 1;
  }
}

// Build base slug from product properties: {template-name}-{theme}-{device}-{contentLanguage}-{year}
function buildImageBaseSlug(
  templateName: string | null,
  theme: string | null,
  device: string | null,
  contentLanguage: string | null,
  year: number | null,
  productSlug: string | null,
  productId: number
): string {
  // For products without a template (physical), use the product slug
  if (!templateName && productSlug) {
    return productSlug;
  }

  const parts: string[] = [];

  if (templateName) {
    parts.push(generateSlug(templateName));
  } else {
    parts.push(`product-${productId}`);
  }

  if (theme) {
    parts.push(generateSlug(getThemeName(theme, 'en')));
  }

  if (device) {
    parts.push(generateSlug(device));
  }

  if (contentLanguage) {
    parts.push(contentLanguage.toLowerCase());
  }

  if (year) {
    parts.push(String(year));
  }

  return parts.join('-');
}

// Generate SEO-friendly filename: {baseSlug}-{counter}.{ext}
function generateFilename(baseSlug: string, counter: number, originalName: string): string {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase() : '';
  return `${baseSlug}-${String(counter).padStart(2, '0')}${ext}`;
}

// Thumbnail settings
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;
const THUMB_QUALITY = 80;

// Generate a WebP thumbnail buffer from an image buffer
async function generateThumbnailBuffer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}

// Get the thumbnail filename for an original image filename
function getThumbnailFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
  return `${base}-thumb.webp`;
}

// MIME types for content type detection
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/products/[id]/images - Upload images
export async function POST(request: NextRequest, context: RouteContext) {
  const siteId = await getAdminSiteId();

  const { id } = await context.params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  // Check product exists, belongs to store, and get properties for SEO-friendly filenames
  const product = await prisma.product.findFirst({
    where: { id: productId, siteId },
    select: {
      id: true,
      images: true,
      theme: true,
      device: true,
      year: true,
      contentLanguage: true,
      template: {
        select: {
          translations: {
            where: { languageCode: 'en' },
            select: { name: true },
            take: 1,
          },
        },
      },
      slugs: {
        where: { isPrimary: true },
        select: { slug: true },
        take: 1,
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Build base slug: uses product slug for physical, template properties for digital
  const templateName = product.template?.translations[0]?.name || null;
  const productSlug = product.slugs[0]?.slug || null;
  const baseSlug = buildImageBaseSlug(
    templateName,
    product.theme,
    product.device,
    product.contentLanguage,
    product.year,
    productSlug,
    productId
  );

  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Get starting counter for new images
    let counter = await getNextImageCounter(baseSlug);

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Allowed: JPEG, PNG, WebP, GIF`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size is 5MB`);
        continue;
      }

      // Generate SEO-friendly filename and upload to S3
      const filename = generateFilename(baseSlug, counter, file.name);
      const s3Key = `${S3_UPLOADS_PREFIX}/${filename}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Detect content type from extension
      const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
      const contentType = MIME_TYPES[ext] || file.type;

      await putObject(s3Key, buffer, contentType);

      // Generate and upload thumbnail
      const thumbFilename = getThumbnailFilename(filename);
      const thumbS3Key = `${S3_UPLOADS_PREFIX}/${thumbFilename}`;
      try {
        const thumbBuffer = await generateThumbnailBuffer(buffer);
        await putObject(thumbS3Key, thumbBuffer, 'image/webp');
      } catch (thumbError) {
        console.error(`Failed to generate thumbnail for ${filename}:`, thumbError);
      }

      // URL path - stays the same (API route serves from S3 now)
      const url = `/api/uploads/products/${filename}`;
      uploadedUrls.push(url);
      counter++;
    }

    if (uploadedUrls.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    // Update product with new images (append to existing)
    const currentImages = (product.images as string[]) || [];
    const updatedImages = [...currentImages, ...uploadedUrls];

    await prisma.product.update({
      where: { id: productId },
      data: { images: updatedImages },
    });

    return NextResponse.json({
      success: true,
      images: updatedImages,
      uploaded: uploadedUrls,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id]/images - Remove an image
export async function DELETE(request: NextRequest, context: RouteContext) {
  const siteId = await getAdminSiteId();

  const { id } = await context.params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Check product exists and belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
      select: { id: true, images: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const currentImages = (product.images as string[]) || [];

    // Check if image exists in product
    if (!currentImages.includes(imageUrl)) {
      return NextResponse.json({ error: 'Image not found in product' }, { status: 404 });
    }

    // Remove from database
    const updatedImages = currentImages.filter((img) => img !== imageUrl);
    await prisma.product.update({
      where: { id: productId },
      data: { images: updatedImages },
    });

    // Delete file and thumbnail from S3 (handles both old /uploads/ and new /api/uploads/ paths)
    if (imageUrl.startsWith('/uploads/products/') || imageUrl.startsWith('/api/uploads/products/')) {
      const filename = imageUrl.split('/').pop()!;
      const s3Key = `${S3_UPLOADS_PREFIX}/${filename}`;
      const thumbS3Key = `${S3_UPLOADS_PREFIX}/${getThumbnailFilename(filename)}`;
      try {
        await deleteObject(s3Key);
        await evictCache(s3Key);
      } catch {
        // Object might not exist, ignore error
      }
      try {
        await deleteObject(thumbS3Key);
        await evictCache(thumbS3Key);
      } catch {
        // Thumbnail might not exist, ignore error
      }
    }

    return NextResponse.json({
      success: true,
      images: updatedImages,
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products/[id]/images - Reorder images
export async function PUT(request: NextRequest, context: RouteContext) {
  const siteId = await getAdminSiteId();

  const { id } = await context.params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    const { images } = await request.json();

    if (!Array.isArray(images)) {
      return NextResponse.json({ error: 'Images must be an array' }, { status: 400 });
    }

    // Check product exists and belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update with new order
    await prisma.product.update({
      where: { id: productId },
      data: { images },
    });

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('Error reordering images:', error);
    return NextResponse.json(
      { error: 'Failed to reorder images' },
      { status: 500 }
    );
  }
}
