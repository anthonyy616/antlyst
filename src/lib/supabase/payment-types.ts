/**
 * Supabase Payment Schema Types
 * Matches the SQL schema in supabase/migrations/001_payments_schema.sql
 */

// ============================================
// SUBSCRIPTION PLANS
// ============================================
export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'business' | 'enterprise';
  name: string;
  description: string | null;

  // Pricing (in cents)
  price_monthly_cents: number;
  price_yearly_cents: number;
  currency: string;

  // AI Limits (-1 = unlimited)
  ai_chats_per_month: number;
  ai_tokens_per_day: number;
  ai_model: string;

  // Storage & Upload Limits (-1 = unlimited)
  storage_mb: number;
  max_file_size_mb: number;
  uploads_per_month: number;

  // Organization Limits (-1 = unlimited)
  max_organizations: number;
  max_members_per_org: number;

  // Features list
  features: string[];

  // Metadata
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type PlanId = SubscriptionPlan['id'];

// ============================================
// PAID USERS
// ============================================
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'paused'
  | 'inactive';

export interface PaidUser {
  id: string; // UUID
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;

  // Subscription
  current_plan_id: PlanId;
  subscription_status: SubscriptionStatus;

  // Timestamps
  first_paid_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;

  // Payment provider IDs
  stripe_customer_id: string | null;
  paystack_customer_id: string | null;
  revenuecat_app_user_id: string | null;

  // Metadata
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================
// PAYMENT HISTORY
// ============================================
export type PaymentProvider =
  | 'stripe'
  | 'paystack'
  | 'revenuecat'
  | 'coinbase'
  | 'manual';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'disputed';

export type BillingCycle = 'monthly' | 'yearly' | 'one_time';

export interface PaymentHistory {
  ticket_id: string; // Primary Key (e.g., "TKT-A1B2C3D4-20260204")
  clerk_user_id: string;
  paid_user_id: string | null; // UUID

  // Payment details
  plan_id: PlanId;
  billing_cycle: BillingCycle;
  amount_cents: number;
  currency: string;

  // Provider info
  provider: PaymentProvider;
  provider_transaction_id: string | null;
  provider_invoice_id: string | null;

  // Status
  status: PaymentStatus;

  // Subscription period
  period_start: string;
  period_end: string;

  // Timestamps
  payment_date: string;
  completed_at: string | null;

  // URLs
  receipt_url: string | null;
  invoice_pdf_url: string | null;

  // Metadata
  provider_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================
// SUBSCRIPTION EVENTS
// ============================================
export type SubscriptionEventType =
  | 'created'
  | 'upgraded'
  | 'downgraded'
  | 'cancelled'
  | 'renewed'
  | 'paused'
  | 'resumed'
  | 'payment_failed'
  | 'payment_succeeded';

export interface SubscriptionEvent {
  id: string; // UUID
  clerk_user_id: string;
  paid_user_id: string | null;

  event_type: SubscriptionEventType;
  from_plan_id: PlanId | null;
  to_plan_id: PlanId | null;

  payment_ticket_id: string | null;

  reason: string | null;
  metadata: Record<string, any>;

  provider: string | null;
  provider_event_id: string | null;

  created_at: string;
}

// ============================================
// AI USAGE
// ============================================
export interface AIUsage {
  id: string; // UUID
  clerk_user_id: string;
  usage_date: string; // DATE format
  tokens_used: number;
  requests_count: number;
  daily_token_limit: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// VIEWS (Read-only)
// ============================================
export interface ActiveSubscriber {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  current_plan_id: PlanId;
  plan_name: string;
  price_monthly_cents: number;
  subscription_status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  ai_chats_per_month: number;
  ai_tokens_per_day: number;
  storage_mb: number;
  max_organizations: number;
  max_members_per_org: number;
}

// ============================================
// INSERT/UPDATE TYPES
// ============================================
export type PaidUserInsert = Omit<PaidUser, 'id' | 'created_at' | 'updated_at'>;
export type PaidUserUpdate = Partial<Omit<PaidUser, 'id' | 'clerk_user_id' | 'created_at'>>;

export type PaymentHistoryInsert = Omit<PaymentHistory, 'ticket_id' | 'created_at' | 'updated_at'> & {
  ticket_id?: string; // Optional - will be auto-generated if not provided
};

export type SubscriptionEventInsert = Omit<SubscriptionEvent, 'id' | 'created_at'>;

export type AIUsageInsert = Omit<AIUsage, 'id' | 'created_at' | 'updated_at'>;
export type AIUsageUpdate = Pick<AIUsage, 'tokens_used' | 'requests_count'>;
