import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generalLimiter, uploadLimiter } from "@/lib/rate-limit";

const isProtectedRoute = createRouteMatcher([
    '/(.*)/projects(.*)',
    '/(.*)/settings(.*)',
    '/onboarding(.*)',
]);

const isUploadApi = createRouteMatcher(['/api/upload(.*)']);

export default clerkMiddleware(async (auth, req) => {
    // 1. Rate Limiting Logic
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
    const { userId } = await auth();

    // Check general rate limit (100/min per IP)
    const { success: generalSuccess } = await generalLimiter.limit(ip);
    if (!generalSuccess) {
        return new NextResponse("Too Many Requests", { status: 429 });
    }

    // Check upload rate limit (20/hr per User or IP)
    if (isUploadApi(req)) {
        const identifier = userId ?? ip;
        const { success: uploadSuccess } = await uploadLimiter.limit(identifier);
        if (!uploadSuccess) {
            return new NextResponse("Upload limit reached. Try again later.", { status: 429 });
        }
    }

    // 2. Auth Protection Logic
    if (isProtectedRoute(req)) await auth.protect();

    // 3. Basic Security Headers
    const response = NextResponse.next();
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");

    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
