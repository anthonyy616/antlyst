import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  // We don't throw here to allow build time to pass, but it will fail at runtime if used
  console.warn("Missing R2 environment variables");
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "antlyst-uploads";

// Helper to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Get object from R2 as buffer
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error("Failed to download file body");
  }

  return streamToBuffer(response.Body as Readable);
}

// Get object from R2 as string
export async function getFileContent(key: string): Promise<string> {
  const buffer = await getObjectBuffer(key);
  return buffer.toString('utf-8');
}

// Upload object to R2
export async function uploadObject(
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);
}

// Get public URL for R2 object
export function getR2PublicUrl(key: string): string {
  if (R2_PUBLIC_DOMAIN) {
    return `https://${R2_PUBLIC_DOMAIN}/${key}`;
  }
  // Fallback to bucket URL if public domain not configured
  return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

// Get signed URL for uploading to R2
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}