import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateR2Key(orgId: string, projectId: string, fileName: string): string {
  // Basic sanitization
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${orgId}/${projectId}/${Date.now()}-${safeFileName}`;
}
