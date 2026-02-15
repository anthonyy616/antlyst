
 Phase 2: Core Dashboard Enhancements (Priority: High)

 Feature 5: Fix PowerBI Engine

 Dependencies: npm install react-grid-layout @types/react-grid-layout

 Files to create:

- src/components/dashboard/widgets/KPICard.tsx
- src/components/dashboard/widgets/PieChartWidget.tsx
- src/components/dashboard/widgets/TrendChart.tsx
- src/components/dashboard/widgets/DataTable.tsx

 Files to modify:

- src/components/dashboard/PowerBIEngine.tsx - Complete rewrite with ResponsiveGridLayout
- src/lib/analysis-engine.ts - Enhance generatePowerBIDashboard() with pie charts, KPIs

 Implementation:

 1. Implement draggable/resizable grid layout with react-grid-layout
 2. Create widget components: KPICard, PieChart, TrendChart, DataTable
 3. Add widget type switching and layout persistence
 4. Generate proper grid positions in analysis-engine

 ---
 Feature 6: Dashboard Chart Editor

 Files to create:

- src/components/dashboard/ChartEditor.tsx - Editor panel component
- src/lib/chart-themes.ts - Color scheme presets

 Files to modify:

- src/components/dashboard/simple-engine.tsx
- src/components/dashboard/PowerBIEngine.tsx

 Implementation:

 1. Create ChartEditor with dropdowns for:

- X/Y axis selection
- Chart type: bar | line | scatter | pie | area
- Color scheme picker
- Aggregation: sum | avg | count | min | max

 1. Integrate into dashboard engines

 ---
 Feature 7: Export Functionality

 Dependencies: npm install jspdf html2canvas

 Files to create:

- src/lib/export-service.ts - PDF/PNG/SVG export functions
- src/components/dashboard/ExportButton.tsx - Dropdown with export options

 Files to modify:

- src/components/DashboardView.tsx - Add export button
- src/components/dashboard/engine-wrapper.tsx

 Implementation:

 1. Use Plotly's native Plotly.downloadImage() for individual charts (PNG/SVG)
 2. Use html2canvas + jsPDF for full dashboard PDF export
 3. Add dropdown menu with format options

 ---
 Feature 8: Smart Plotting Logic

 Files to modify:

- src/lib/analysis-engine.ts - Enhance column classification

 Implementation:

 1. Strictly filter numeric columns (Float32/64, Int32/64) for Y-axis values
 2. Use string/categorical columns only for X-axis labels
 3. Exclude ID-like columns (all unique values)
 4. Exclude constant columns (single value)
 5. Add validation before chart generation

 ---
 Phase 3: AI Integration (Priority: Medium-High)

 Features 9 & 10: AI Analyst Agent + Data Summary

 Provider: Groq (selected - fast inference, 14k tokens/min free tier)
 Dependencies: npm install groq-sdk

 Files to create:

- src/lib/ai-service.ts - Groq client wrapper
- src/components/dashboard/AIAnalyst.tsx - Chat panel UI
- src/app/api/ai/chat/route.ts - Chat endpoint
- src/app/api/ai/summary/route.ts - Summary generation endpoint

 Files to modify:

- src/components/DashboardView.tsx - Add AI panel trigger
- .env.local - Add GROQ_API_KEY

 Implementation:

 1. Create Groq AI service using llama-3.1-70b-versatile model (fast, capable)
 2. Build floating chat panel (bottom-right) with:

- Dataset context awareness (columns, stats, sample data)
- Predefined questions: "Summarize this data", "Find anomalies", "What trends exist?"
- Freeform input for custom questions
- Markdown response rendering with syntax highlighting

 1. Add "Generate Summary" button that creates AI-powered insights
 2. Cache summaries in database (Dashboard.aiSummary field) to avoid repeated API calls
 3. Rate limit AI endpoints: 10 requests/minute per user (see Feature 11)

 Groq Setup:

 1. Sign up at console.groq.com
 2. Generate API key
 3. Add to .env.local: GROQ_API_KEY=gsk_...

 ---
 Phase 4: Security & Performance (Priority: Critical)

 Feature 11: Rate Limiting + Security + RBAC

 Dependencies: npm install @upstash/ratelimit @upstash/redis zod

 Files to create:

- src/lib/rate-limit.ts - Upstash rate limiter config
- src/lib/rbac.ts - Role-based access control utilities
- src/lib/validations/ - Zod schemas directory
  - project.ts, organization.ts, file.ts

 Files to modify:

- src/middleware.ts - Add rate limiting before Clerk auth
- All src/app/api/* routes - Add Zod validation, role checks

 Implementation:

 1. Configure Upstash Redis rate limiter:

- General: 100 requests/minute per IP
- AI endpoints: 10 requests/minute per user
- Upload: 20 requests/hour per user

 1. Create RBAC utilities checking OrgMembership.role
 2. Add Zod schemas for all API inputs
 3. Validate and sanitize all POST/PUT/DELETE requests

 ---
 Feature 3: Fix Loading Times

 Dependencies: npm install @next/bundle-analyzer

 Files to create:

- src/components/skeletons/DashboardSkeleton.tsx
- src/components/skeletons/TableSkeleton.tsx

 Files to modify:

- next.config.ts - Add bundle analyzer
- Various components - Add dynamic imports
- API routes - Add select to Prisma queries, pagination

 Implementation:

 1. Analyze bundle with ANALYZE=true npm run build
 2. Add dynamic imports for heavy libs (react-grid-layout, Three.js)
 3. Create loading skeletons for dashboard, tables
 4. Optimize Prisma queries with select (fetch only needed fields)
 5. Add pagination to list endpoints
 6. Ensure all images use Next.js <Image> with proper sizes

 ---
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
 Feature 13: SEO Improvements

 Files to create:

- src/app/sitemap.ts - Dynamic sitemap
- src/app/robots.ts - Robots.txt config
- public/og-image.png - OpenGraph image (1200x630)

 Files to modify:

- src/app/layout.tsx - Enhanced metadata
- src/app/(public)/page.tsx - Add JSON-LD structured data

 Implementation:

 1. Update root layout metadata with:

- Title template, description, keywords
- OpenGraph images and Twitter cards
- Canonical URLs

 1. Create dynamic sitemap.xml
 2. Create robots.txt allowing crawlers, blocking /api/
 3. Add JSON-LD SoftwareApplication schema to landing page
 4. Design and add OpenGraph image

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
