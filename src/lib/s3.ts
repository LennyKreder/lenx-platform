import 'server-only';
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: `https://${process.env.S3_ENDPOINT || 'nbg1.your-objectstorage.com'}`,
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'lenxlabs26';

export interface S3Object {
  key: string;
  size: number;
}

/**
 * List objects in the bucket matching a prefix.
 */
export async function listObjects(prefix: string): Promise<S3Object[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);

  return (response.Contents || []).map((obj) => ({
    key: obj.Key!,
    size: obj.Size || 0,
  }));
}

/**
 * Fetch an object's contents as a Buffer.
 */
export async function getObject(key: string): Promise<{ buffer: Buffer; size: number }> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const bytes = await response.Body!.transformToByteArray();

  return {
    buffer: Buffer.from(bytes),
    size: response.ContentLength || bytes.length,
  };
}

/**
 * Get object metadata without downloading the file.
 */
export async function headObject(key: string): Promise<{ size: number } | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);
    return { size: response.ContentLength || 0 };
  } catch {
    return null;
  }
}

/**
 * Upload a file to S3.
 */
export async function putObject(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Delete an object from S3.
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}
