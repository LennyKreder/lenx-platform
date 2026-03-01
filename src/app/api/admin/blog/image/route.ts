import { NextRequest, NextResponse } from 'next/server';
import { putObject, deleteObject } from '@/lib/s3';
import { evictCache } from '@/lib/s3-cache';

const S3_UPLOADS_PREFIX = 'uploads/blog';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// POST /api/admin/blog/image - Upload a blog featured image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const slug = formData.get('slug') as string | null;
    const lang = formData.get('lang') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Generate filename: {slug}-{lang}-featured.{ext} or {slug}-featured.{ext}
    const ext = file.name.includes('.')
      ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      : '.jpg';
    const langPart = lang ? `-${lang}` : '';
    const filename = `${slug}${langPart}-featured${ext}`;
    const s3Key = `${S3_UPLOADS_PREFIX}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = MIME_TYPES[ext] || file.type;

    await putObject(s3Key, buffer, contentType);

    const url = `/api/uploads/blog/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Error uploading blog image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blog/image - Remove a blog featured image from S3
export async function DELETE(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (imageUrl.startsWith('/api/uploads/blog/')) {
      const filename = imageUrl.split('/').pop()!;
      const s3Key = `${S3_UPLOADS_PREFIX}/${filename}`;
      try {
        await deleteObject(s3Key);
        await evictCache(s3Key);
      } catch {
        // Object might not exist, ignore
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
