import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { putObject, deleteObject } from '@/lib/s3';
import { evictCache } from '@/lib/s3-cache';
import { generateSlug } from '@/lib/slug-utils';
import { getThemeName } from '@/config/themes';

const S3_VIDEO_PREFIX = 'uploads/products/videos';

// Allowed video types and max size (50MB)
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

// MIME types for content type detection
const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

// Build base slug from product properties
function buildVideoBaseSlug(
  templateName: string | null,
  theme: string | null,
  device: string | null,
  contentLanguage: string | null,
  year: number | null,
  productId: number
): string {
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/products/[id]/video - Upload video
export async function POST(request: NextRequest, context: RouteContext) {
  const siteId = await getAdminSiteId();

  const { id } = await context.params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  // Check product exists, belongs to store, and get properties for SEO-friendly filename
  const product = await prisma.product.findFirst({
    where: { id: productId, siteId },
    select: {
      id: true,
      videoUrl: true,
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
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('video') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No video provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: MP4, WebM' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB' },
        { status: 400 }
      );
    }

    // Build SEO-friendly filename
    const templateName = product.template?.translations[0]?.name || null;
    const baseSlug = buildVideoBaseSlug(
      templateName,
      product.theme,
      product.device,
      product.contentLanguage,
      product.year,
      productId
    );

    // Determine extension from file name or type
    const ext = file.name.includes('.')
      ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      : file.type === 'video/webm' ? '.webm' : '.mp4';

    const filename = `${baseSlug}-video${ext}`;
    const s3Key = `${S3_VIDEO_PREFIX}/${filename}`;

    // Delete old video if exists
    if (product.videoUrl) {
      const oldFilename = product.videoUrl.split('/').pop();
      if (oldFilename) {
        try {
          await deleteObject(`${S3_VIDEO_PREFIX}/${oldFilename}`);
          await evictCache(`${S3_VIDEO_PREFIX}/${oldFilename}`);
        } catch {
          // Old file might not exist, ignore
        }
      }
    }

    // Upload new video to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = VIDEO_MIME_TYPES[ext] || file.type;
    await putObject(s3Key, buffer, contentType);

    // Update product with new video URL
    const videoUrl = `/api/uploads/products/videos/${filename}`;
    await prisma.product.update({
      where: { id: productId },
      data: { videoUrl },
    });

    return NextResponse.json({
      success: true,
      videoUrl,
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id]/video - Remove video
export async function DELETE(request: NextRequest, context: RouteContext) {
  const siteId = await getAdminSiteId();

  const { id } = await context.params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    // Check product exists and belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
      select: { id: true, videoUrl: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product.videoUrl) {
      return NextResponse.json({ error: 'No video to delete' }, { status: 404 });
    }

    // Delete from S3
    const filename = product.videoUrl.split('/').pop();
    if (filename) {
      try {
        await deleteObject(`${S3_VIDEO_PREFIX}/${filename}`);
        await evictCache(`${S3_VIDEO_PREFIX}/${filename}`);
      } catch {
        // File might not exist, continue anyway
      }
    }

    // Clear video URL in database
    await prisma.product.update({
      where: { id: productId },
      data: { videoUrl: null },
    });

    return NextResponse.json({
      success: true,
      videoUrl: null,
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
