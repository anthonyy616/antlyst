import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PROCESSING_SECONDS = 60 * 15; // 15 minutes
export const MAX_FILE_RETRIES = 3;

/** Kills long-running server functions before they leak cold serverless starts. */
export function withTimeout<T>(
  name: string,
  fn: () => Promise<T>,
  seconds: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[timeout] ${name} exceeded ${seconds}s`));
    }, seconds * 1000);

    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function generateRequestId(): string {
  return randomUUID();
}

/** Rate-limit/retry metadata we expose through a small diagnostics JSON. */
export interface UploadPolicy {
  maxBytes: number;
  maxRetries: number;
  enabled: boolean;
}

export const uploadPolicy: UploadPolicy = {
  maxBytes: MAX_UPLOAD_BYTES,
  maxRetries: MAX_FILE_RETRIES,
  enabled: true,
};
