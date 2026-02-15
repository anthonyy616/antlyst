
 Phase 5: Monetization & SEO (Priority: Business Critical)

 Feature 12: Payment Gateways

 Dependencies:

- npm install stripe @stripe/stripe-js (US/International)
- npm install paystack (Nigeria)

 Files to create:

- src/lib/stripe.ts - Stripe client
- src/lib/paystack.ts - Paystack client
- src/lib/coinbase.ts - Crypto payments (Coinbase Commerce)
- src/app/api/stripe/checkout/route.ts
- src/app/api/stripe/webhook/route.ts
- src/app/api/paystack/initialize/route.ts
- src/app/api/paystack/webhook/route.ts
- src/app/api/crypto/charge/route.ts
- src/app/(public)/pricing/page.tsx
- src/app/(protected)/billing/page.tsx

 Schema additions (prisma/schema.prisma):
 model Subscription {
   id               String    @id @default(cuid())
   userId           String    @unique
   user             User      @relation(fields: [userId], references: [id])
   tier             String    // free, starter, pro, enterprise
   status           String    // active, canceled, past_due
   provider         String    // stripe, paystack, crypto
   externalId       String?
   currentPeriodEnd DateTime?
   createdAt        DateTime  @default(now())
   updatedAt        DateTime  @updatedAt
 }

 Implementation:

 1. Add Subscription model to Prisma schema
 2. Implement Stripe checkout + webhooks for US/international
 3. Implement Paystack for Nigerian payments
 4. Implement Coinbase Commerce for crypto
 5. Create pricing page with region-based payment selection
 6. Create billing dashboard for subscription management

 ---

Implementation Order (Recommended)
 ┌──────┬─────────────┬──────────────────────────────────┐
 │ Week │  Features   │              Focus               │
 ├──────┼─────────────┼──────────────────────────────────┤
 │ 1    │ 1, 2, 4, 11 │ Quick wins + Security foundation │
 ├──────┼─────────────┼──────────────────────────────────┤
 │ 2    │ 5, 6, 8     │ Core dashboard functionality     │
 ├──────┼─────────────┼──────────────────────────────────┤
 │ 3    │ 7, 9, 10    │ Export + AI integration          │
 ├──────┼─────────────┼──────────────────────────────────┤
 │ 4    │ 3, 13       │ Performance + SEO                │
 ├──────┼─────────────┼──────────────────────────────────┤
 │ 5    │ 12          │ Payment gateways                 │
 └──────┴─────────────┴──────────────────────────────────┘
 ---

 Environment Variables Required

# Existing

 DATABASE_URL=
 CLERK_SECRET_KEY=
 R2_ACCESS_KEY_ID=
 R2_SECRET_ACCESS_KEY=

# New - Add these

 UPSTASH_REDIS_REST_URL=
 UPSTASH_REDIS_REST_TOKEN=
 GROQ_API_KEY=
 STRIPE_SECRET_KEY=
 STRIPE_WEBHOOK_SECRET=
 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
 PAYSTACK_SECRET_KEY=
 COINBASE_COMMERCE_API_KEY=

 ---
 Verification Steps

 1. Hero Images: Visit landing page, verify images 2 & 4 show dashboard mockups
 2. Collapsible Sidebar: Toggle on desktop, verify width changes smoothly; test on mobile
 3. Chart Zoom/Pan: Load dashboard, scroll to zoom, drag to pan
 4. PowerBI Engine: Select PowerBI style, verify grid layout with draggable widgets
 5. Chart Editor: Change axes, chart type, colors - verify chart updates
 6. Export: Click export, verify PDF/PNG downloads correctly
 7. Smart Plotting: Upload CSV with mixed columns, verify only numeric used for values
 8. AI Analyst: Ask question about data, verify contextual response
 9. Rate Limiting: Rapid-fire API requests, verify 429 after limit
 10. Payments: Complete test checkout with Stripe test mode
 11. SEO: Check meta tags in browser dev tools, validate sitemap.xml
