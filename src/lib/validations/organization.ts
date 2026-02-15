import { z } from "zod";

export const organizationCreateSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be alphanumeric with hyphens"),
});

export const organizationUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
});
