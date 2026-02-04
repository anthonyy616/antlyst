import { createClient } from '@supabase/supabase-js';
import type {
  SubscriptionPlan,
  PaidUser,
  PaidUserInsert,
  PaidUserUpdate,
  PaymentHistory,
  PaymentHistoryInsert,
  SubscriptionEvent,
  SubscriptionEventInsert,
  AIUsage,
  ActiveSubscriber,
  PlanId,
  SubscriptionStatus,
  PaymentProvider,
} from './payment-types';

// Create Supabase client with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================
// SUBSCRIPTION PLANS
// ============================================

export async function getAllPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

export async function getPlanById(planId: PlanId): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================
// PAID USERS
// ============================================

export async function getPaidUserByClerkId(clerkUserId: string): Promise<PaidUser | null> {
  const { data, error } = await supabaseAdmin
    .from('paid_users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createPaidUser(user: PaidUserInsert): Promise<PaidUser> {
  const { data, error } = await supabaseAdmin
    .from('paid_users')
    .insert(user)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePaidUser(
  clerkUserId: string,
  updates: PaidUserUpdate
): Promise<PaidUser> {
  const { data, error } = await supabaseAdmin
    .from('paid_users')
    .update(updates)
    .eq('clerk_user_id', clerkUserId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertPaidUser(user: PaidUserInsert): Promise<PaidUser> {
  const { data, error } = await supabaseAdmin
    .from('paid_users')
    .upsert(user, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// PAYMENT HISTORY
// ============================================

export async function createPayment(payment: PaymentHistoryInsert): Promise<PaymentHistory> {
  const { data, error } = await supabaseAdmin
    .from('payment_history')
    .insert(payment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPaymentByTicketId(ticketId: string): Promise<PaymentHistory | null> {
  const { data, error } = await supabaseAdmin
    .from('payment_history')
    .select('*')
    .eq('ticket_id', ticketId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserPaymentHistory(
  clerkUserId: string,
  limit = 50
): Promise<PaymentHistory[]> {
  const { data, error } = await supabaseAdmin
    .from('payment_history')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('payment_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function updatePaymentStatus(
  ticketId: string,
  status: PaymentHistory['status'],
  completedAt?: string
): Promise<PaymentHistory> {
  const updates: Partial<PaymentHistory> = { status };
  if (completedAt) updates.completed_at = completedAt;

  const { data, error } = await supabaseAdmin
    .from('payment_history')
    .update(updates)
    .eq('ticket_id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SUBSCRIPTION EVENTS
// ============================================

export async function logSubscriptionEvent(event: SubscriptionEventInsert): Promise<SubscriptionEvent> {
  const { data, error } = await supabaseAdmin
    .from('subscription_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserSubscriptionEvents(
  clerkUserId: string,
  limit = 20
): Promise<SubscriptionEvent[]> {
  const { data, error } = await supabaseAdmin
    .from('subscription_events')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================
// AI USAGE
// ============================================

export async function getOrCreateTodayAIUsage(
  clerkUserId: string,
  dailyLimit: number
): Promise<AIUsage> {
  const today = new Date().toISOString().split('T')[0];

  // Try to get existing record
  const { data: existing } = await supabaseAdmin
    .from('ai_usage')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('usage_date', today)
    .single();

  if (existing) return existing;

  // Create new record for today
  const { data, error } = await supabaseAdmin
    .from('ai_usage')
    .insert({
      clerk_user_id: clerkUserId,
      usage_date: today,
      tokens_used: 0,
      requests_count: 0,
      daily_token_limit: dailyLimit,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementAIUsage(
  clerkUserId: string,
  tokensUsed: number,
  dailyLimit: number
): Promise<AIUsage> {
  const today = new Date().toISOString().split('T')[0];

  // Upsert with increment
  const { data, error } = await supabaseAdmin.rpc('increment_ai_usage', {
    p_clerk_user_id: clerkUserId,
    p_usage_date: today,
    p_tokens_to_add: tokensUsed,
    p_daily_limit: dailyLimit,
  });

  if (error) {
    // Fallback if RPC doesn't exist - manual upsert
    const existing = await getOrCreateTodayAIUsage(clerkUserId, dailyLimit);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('ai_usage')
      .update({
        tokens_used: existing.tokens_used + tokensUsed,
        requests_count: existing.requests_count + 1,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updated;
  }

  return data;
}

export async function checkAIUsageLimit(
  clerkUserId: string,
  dailyLimit: number
): Promise<{ allowed: boolean; tokensUsed: number; tokensRemaining: number }> {
  const usage = await getOrCreateTodayAIUsage(clerkUserId, dailyLimit);

  const tokensRemaining = Math.max(0, dailyLimit - usage.tokens_used);
  const allowed = dailyLimit === -1 || usage.tokens_used < dailyLimit;

  return {
    allowed,
    tokensUsed: usage.tokens_used,
    tokensRemaining: dailyLimit === -1 ? Infinity : tokensRemaining,
  };
}

// ============================================
// ACTIVE SUBSCRIBERS (View)
// ============================================

export async function getActiveSubscriber(clerkUserId: string): Promise<ActiveSubscriber | null> {
  const { data, error } = await supabaseAdmin
    .from('active_subscribers')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================
// COMPOSITE OPERATIONS
// ============================================

/**
 * Process a successful payment and update user subscription
 */
export async function processSuccessfulPayment(params: {
  clerkUserId: string;
  email: string;
  fullName?: string;
  planId: PlanId;
  billingCycle: 'monthly' | 'yearly';
  amountCents: number;
  currency: string;
  provider: PaymentProvider;
  providerTransactionId?: string;
}): Promise<{ paidUser: PaidUser; payment: PaymentHistory }> {
  const now = new Date();
  const periodEnd = new Date(now);

  if (params.billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  // 1. Upsert paid user
  const paidUser = await upsertPaidUser({
    clerk_user_id: params.clerkUserId,
    email: params.email,
    full_name: params.fullName || null,
    avatar_url: null,
    current_plan_id: params.planId,
    subscription_status: 'active',
    first_paid_at: now.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancelled_at: null,
    stripe_customer_id: null,
    paystack_customer_id: null,
    revenuecat_app_user_id: null,
    metadata: {},
  });

  // 2. Record payment
  const payment = await createPayment({
    clerk_user_id: params.clerkUserId,
    paid_user_id: paidUser.id,
    plan_id: params.planId,
    billing_cycle: params.billingCycle,
    amount_cents: params.amountCents,
    currency: params.currency,
    provider: params.provider,
    provider_transaction_id: params.providerTransactionId || null,
    provider_invoice_id: null,
    status: 'completed',
    payment_date: now.toISOString(),
    period_start: now.toISOString(),
    period_end: periodEnd.toISOString(),
    completed_at: now.toISOString(),
    receipt_url: null,
    invoice_pdf_url: null,
    provider_metadata: {},
  });

  // 3. Log event
  await logSubscriptionEvent({
    clerk_user_id: params.clerkUserId,
    paid_user_id: paidUser.id,
    event_type: 'payment_succeeded',
    from_plan_id: null,
    to_plan_id: params.planId,
    payment_ticket_id: payment.ticket_id,
    reason: `Subscribed to ${params.planId} (${params.billingCycle})`,
    metadata: { provider: params.provider },
    provider: params.provider,
    provider_event_id: params.providerTransactionId || null,
  });

  return { paidUser, payment };
}

/**
 * Get user's current subscription with plan limits
 */
export async function getUserSubscriptionWithLimits(clerkUserId: string): Promise<{
  isSubscribed: boolean;
  plan: SubscriptionPlan;
  subscription: PaidUser | null;
  limits: {
    aiChatsPerMonth: number;
    aiTokensPerDay: number;
    storageMb: number;
    maxFileSizeMb: number;
    uploadsPerMonth: number;
    maxOrganizations: number;
    maxMembersPerOrg: number;
  };
}> {
  const [paidUser, freePlan] = await Promise.all([
    getPaidUserByClerkId(clerkUserId),
    getPlanById('free'),
  ]);

  const isSubscribed = paidUser?.subscription_status === 'active' && paidUser.current_plan_id !== 'free';
  const planId = isSubscribed ? paidUser!.current_plan_id : 'free';
  const plan = isSubscribed ? await getPlanById(planId) : freePlan;

  if (!plan) throw new Error('Plan not found');

  return {
    isSubscribed,
    plan,
    subscription: paidUser,
    limits: {
      aiChatsPerMonth: plan.ai_chats_per_month,
      aiTokensPerDay: plan.ai_tokens_per_day,
      storageMb: plan.storage_mb,
      maxFileSizeMb: plan.max_file_size_mb,
      uploadsPerMonth: plan.uploads_per_month,
      maxOrganizations: plan.max_organizations,
      maxMembersPerOrg: plan.max_members_per_org,
    },
  };
}
