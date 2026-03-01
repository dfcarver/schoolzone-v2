// In-process fallback when Supabase admin is unavailable.
// Resets on cold start — use Supabase push_subscriptions table for persistence.
export const subscriptionCache = new Set<string>();
