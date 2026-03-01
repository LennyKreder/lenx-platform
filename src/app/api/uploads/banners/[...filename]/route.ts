import { NextRequest, NextResponse } from 'next/server';
import { getCachedObject } from '@/lib/s3-cache';

const S3_UPLOADS_PREFIX = 'uploads/banners';

// MIME types for images
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

interface RouteContext {
  params: Promise<{ filename: string[] }>;
}

// GET /api/uploads/banners/[...filename] - Serve banner images from S3
export async function GET(request: NextRequest, context: RouteContext) {
  const { filename } = await context.params;

  // Validate each path segment to prevent directory traversal
  for (const segment of filename) {
    if (segment === '..' || segment === '.' || segment.includes('\\') || segment.includes('\0')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
  }

  const imageName = filename.join('/');

  // Get extension for MIME type
  const dotIndex = imageName.lastIndexOf('.');
  const ext = dotIndex >= 0 ? imageName.slice(dotIndex).toLowerCase() : '';

  // Check if it's an allowed image type
  if (!MIME_TYPES[ext]) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Build fallback chain matching banner-utils variant order:
  // {base}-{lang}-dark → {base}-{lang} → {base}-dark → {base}
  const baseName = imageName.slice(0, dotIndex);
  const fallbackKeys = [imageName];

  let base = baseName;
  const hasDark = base.endsWith('-dark');
  if (hasDark) base = base.slice(0, -5);
  const hasLang = !!base.match(/-[a-z]{2}$/);
  if (hasLang) base = base.slice(0, -3);

  if (hasDark && hasLang) {
    fallbackKeys.push(`${base}-dark${ext}`);  // lang stripped, keep dark
  }
  if (hasDark || hasLang) {
    fallbackKeys.push(`${base}${ext}`);        // base only
  }

  // Deduplicate while preserving order
  const uniqueKeys = [...new Set(fallbackKeys)];

  for (const key of uniqueKeys) {
    try {
      const s3Key = `${S3_UPLOADS_PREFIX}/${key}`;
      const { buffer, size } = await getCachedObject(s3Key);
      const mimeType = MIME_TYPES[ext];

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': size.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // Try next fallback
    }
  }

  return NextResponse.json({ error: 'File not found' }, { status: 404 });
}
