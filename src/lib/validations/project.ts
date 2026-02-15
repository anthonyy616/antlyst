import { z } from "zod";

export const projectCreateSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    organizationId: z.string().min(1),
    description: z.string().optional(),
});

export const projectUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
});
