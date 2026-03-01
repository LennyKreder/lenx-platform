import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import { getObject } from './s3';

const CACHE_DIR = path.join(process.cwd(), '.cache', 's3');

function getCachePath(key: string): string {
  return path.join(CACHE_DIR, key);
}

/**
 * Get an S3 object with filesystem caching.
 * Same signature as getObject from s3.ts.
 */
export async function getCachedObject(key: string): Promise<{ buffer: Buffer; size: number }> {
  const cachePath = getCachePath(key);

  // Defense in depth: ensure path doesn't escape cache dir
  const resolved = path.resolve(cachePath);
  if (!resolved.startsWith(path.resolve(CACHE_DIR))) {
    throw new Error('Invalid cache key');
  }

  // Try to read from cache
  try {
    const buffer = await fs.readFile(cachePath);
    return { buffer, size: buffer.length };
  } catch {
    // Cache miss — fall through to S3
  }

  // Fetch from S3
  const result = await getObject(key);

  // Write to cache in background (don't block the response)
  writeToCache(cachePath, result.buffer);

  return result;
}

async function writeToCache(cachePath: string, buffer: Buffer): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    // Write to temp file first, then rename for atomicity
    const tmpPath = `${cachePath}.tmp.${process.pid}`;
    await fs.writeFile(tmpPath, buffer);
    await fs.rename(tmpPath, cachePath);
  } catch (err) {
    console.warn('S3 cache write failed:', err);
  }
}

/**
 * Remove a cached file (call when admin deletes an image/video from S3).
 */
export async function evictCache(key: string): Promise<void> {
  const cachePath = getCachePath(key);
  const resolved = path.resolve(cachePath);
  if (!resolved.startsWith(path.resolve(CACHE_DIR))) return;

  try {
    await fs.unlink(cachePath);
  } catch {
    // File might not be cached — that's fine
  }
}
