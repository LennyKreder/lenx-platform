// Server-only utilities for scanning and linking product files
import 'server-only';
import { prisma } from './prisma';
import { findActualFile, type FileParams } from './files';
import { headObject, listObjects } from './s3';
import type { LanguageId, WeekStart, TimeFormat, CalendarIntegration } from '@/config/languages';
import type { ThemeId } from '@/config/themes';
import type { PlannerTypeId } from '@/config/planner-types';
import type { DeviceId, Orientation } from '@/config/devices';

// File properties configuration type
export interface FilePropertyConfig {
  templateSet?: boolean;
  timeFormat?: boolean;
  weekStart?: boolean;
  calendar?: boolean;
}

// Scanned file result
export interface ScannedFile {
  templateSet: string | null;
  timeFormat: string | null;
  weekStart: string | null;
  calendar: string | null;
  exists: boolean;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
}

// Default file properties for planners (all variants)
export const PLANNER_FILE_PROPERTIES: FilePropertyConfig = {
  templateSet: true,
  timeFormat: true,
  weekStart: true,
  calendar: true,
};

// No file properties for simple products like stickers
export const NO_FILE_PROPERTIES: FilePropertyConfig = {};

/**
 * Scan S3 for files matching a product's properties.
 * Uses the product's year, theme, and language combined with all valid
 * combinations of file properties from the template.
 */
export async function scanFilesForProduct(productId: number): Promise<ScannedFile[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { template: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  // Get file properties from template (if available) or use empty object for standalone products
  const fileProperties = (product.template?.fileProperties || {}) as FilePropertyConfig;
  const results: ScannedFile[] = [];

  // Define all possible values for each property
  const templateSets: (PlannerTypeId | null)[] = fileProperties.templateSet
    ? ['full', 'focus', 'minimal']
    : [null];
  const timeFormats: (TimeFormat | null)[] = fileProperties.timeFormat
    ? ['24h', 'ampm']
    : [null];
  const weekStarts: (WeekStart | null)[] = fileProperties.weekStart
    ? ['monday', 'sunday']
    : [null];
  const calendars: (CalendarIntegration | null)[] = fileProperties.calendar
    ? ['none', 'google', 'apple']
    : [null];

  // Generate all combinations
  for (const templateSet of templateSets) {
    for (const timeFormat of timeFormats) {
      for (const weekStart of weekStarts) {
        for (const calendar of calendars) {
          // Build FileParams for existing file resolution
          const params: FileParams = {
            year: product.year || new Date().getFullYear(),
            language: (product.contentLanguage || 'en') as LanguageId,
            theme: (product.theme || 'earth_natural') as ThemeId,
            plannerType: (templateSet || 'full') as PlannerTypeId,
            weekStart: (weekStart || 'monday') as WeekStart,
            timeFormat: (timeFormat || '24h') as TimeFormat,
            calendar: (calendar || 'none') as CalendarIntegration,
            device: (product.template?.device || 'ipad') as DeviceId,
            orientation: (product.template?.orientation || 'portrait') as Orientation,
          };

          // Use findActualFile to check if file exists in S3
          const s3Key = await findActualFile(params);
          let fileSize: number | null = null;
          let fileName: string | null = null;

          if (s3Key) {
            fileName = s3Key.split('/').pop() || null;
            const meta = await headObject(s3Key);
            if (meta) {
              fileSize = meta.size;
            }
          }

          results.push({
            templateSet,
            timeFormat,
            weekStart,
            calendar,
            exists: !!s3Key,
            filePath: s3Key,
            fileName,
            fileSize,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Link scanned files to a product by creating ProductFile records.
 * Only links files that exist in S3.
 */
export async function linkFilesToProduct(
  productId: number,
  files: ScannedFile[]
): Promise<number> {
  const existingFiles = files.filter((f) => f.exists && f.filePath);

  if (existingFiles.length === 0) {
    return 0;
  }

  // Delete existing file links for this product
  await prisma.productFile.deleteMany({
    where: { productId },
  });

  // Create new file links
  await prisma.productFile.createMany({
    data: existingFiles.map((f, index) => ({
      productId,
      templateSet: f.templateSet,
      timeFormat: f.timeFormat,
      weekStart: f.weekStart,
      calendar: f.calendar,
      filePath: f.filePath!,
      fileName: f.fileName || f.filePath!.split('/').pop()!,
      fileSize: f.fileSize,
      sortOrder: index,
    })),
  });

  return existingFiles.length;
}

/**
 * Auto-scan and link files for a product in one operation.
 */
export async function autoLinkFilesForProduct(productId: number): Promise<number> {
  const scannedFiles = await scanFilesForProduct(productId);
  return linkFilesToProduct(productId, scannedFiles);
}

/**
 * Get file statistics for a product (how many files exist vs expected).
 */
export async function getProductFileStats(productId: number): Promise<{
  expected: number;
  found: number;
  linked: number;
}> {
  const scannedFiles = await scanFilesForProduct(productId);
  const linkedFiles = await prisma.productFile.count({
    where: { productId },
  });

  return {
    expected: scannedFiles.length,
    found: scannedFiles.filter((f) => f.exists).length,
    linked: linkedFiles,
  };
}

/**
 * Resolve a download S3 key for a product given file parameters.
 */
export async function resolveProductFile(
  productId: number,
  options: {
    templateSet?: string;
    timeFormat?: string;
    weekStart?: string;
    calendar?: string;
  }
): Promise<string | null> {
  const productFile = await prisma.productFile.findFirst({
    where: {
      productId,
      isActive: true,
      ...(options.templateSet && { templateSet: options.templateSet }),
      ...(options.timeFormat && { timeFormat: options.timeFormat }),
      ...(options.weekStart && { weekStart: options.weekStart }),
      ...(options.calendar && { calendar: options.calendar }),
    },
  });

  if (!productFile) {
    return null;
  }

  // Verify the file still exists in S3
  const meta = await headObject(productFile.filePath);
  if (!meta) {
    console.error('ProductFile exists in DB but not in S3:', productFile.filePath);
    return null;
  }

  return productFile.filePath;
}

/**
 * Resolve file by download code.
 */
export async function resolveFileByDownloadCode(
  downloadCode: string,
  fileOptions: {
    templateSet?: string;
    timeFormat?: string;
    weekStart?: string;
    calendar?: string;
  }
): Promise<{ type: 'product' | 'bundle'; filePath: string } | null> {
  // Try product first
  const product = await prisma.product.findUnique({
    where: { downloadCode },
    include: { files: true },
  });

  if (product) {
    const filePath = await resolveProductFile(product.id, fileOptions);
    if (filePath) {
      return { type: 'product', filePath };
    }
  }

  // Try bundle
  const bundle = await prisma.bundle.findUnique({
    where: { downloadCode },
  });

  if (bundle) {
    return null;
  }

  return null;
}

/**
 * List all PDF files in S3 for debugging/admin purposes.
 */
export async function listAllFiles(subPath?: string): Promise<string[]> {
  const prefix = subPath || 'files/planners';
  const objects = await listObjects(prefix);
  return objects
    .filter((obj) => obj.key.endsWith('.pdf'))
    .map((obj) => obj.key);
}
