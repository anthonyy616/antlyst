import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 is S3-compatible
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * Generate a signed upload URL for direct client -> R2 upload
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get public URL for a file in R2
 */
export function getR2PublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function uploadObject(
  key: string,
  body: Buffer | string | Uint8Array,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await r2Client.send(command);
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error('No body in response');
  }

  // Convert stream to buffer
  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}