import { z } from "zod";

export const fileUploadSchema = z.object({
    fileName: z.string().min(1),
    fileSize: z.number().positive(),
    mimeType: z.string(),
    orgId: z.string().min(1),
    style: z.enum(['simple', 'ml', 'powerbi']).optional(),
});

export const fileProcessSchema = z.object({
    fileId: z.string().min(1),
});
