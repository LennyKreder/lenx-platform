import { NextRequest, NextResponse } from 'next/server';
import { getCachedObject } from '@/lib/s3-cache';

const S3_UPLOADS_PREFIX = 'uploads/products';

// MIME types for images and videos
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

interface RouteContext {
  params: Promise<{ filename: string[] }>;
}

// GET /api/uploads/products/[...filename] - Serve product images and videos from S3
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

  try {
    const s3Key = `${S3_UPLOADS_PREFIX}/${imageName}`;
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
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
