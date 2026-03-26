import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

// Days of grace period granted after cancellation / billing issue
const GRACE_DAYS_CANCEL = 7;
const GRACE_DAYS_BILLING = 3;

const addDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

Deno.serve(async (req: Request) => {
  // ── Validate webhook secret ───────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const event = body?.event;
  if (!event) {
    return new Response(JSON.stringify({ error: 'Missing event' }), { status: 400 });
  }

  const {
    type,
    app_user_id,        // Supabase user UUID (set as RevenueCat App User ID)
    expiration_at_ms,
  } = event;

  if (!app_user_id) {
    // Respond 200 to avoid RevenueCat retries for events without user id
    return new Response(JSON.stringify({ ok: true, skipped: 'no app_user_id' }), { status: 200 });
  }

  const expiresAt = expiration_at_ms
    ? new Date(expiration_at_ms).toISOString()
    : null;

  let update: Record<string, unknown> = {};

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'NON_RENEWING_PURCHASE':
      update = {
        subscription_status: 'pro',
        subscription_expires_at: expiresAt,
        grace_period_until: null,
      };
      break;

    case 'CANCELLATION':
      // Keep pro access until period ends + grace
      update = {
        subscription_status: 'grace',
        grace_period_until: addDays(GRACE_DAYS_CANCEL),
      };
      break;

    case 'BILLING_ISSUE':
      update = {
        subscription_status: 'grace',
        grace_period_until: addDays(GRACE_DAYS_BILLING),
      };
      break;

    case 'EXPIRATION':
      update = {
        subscription_status: 'free',
        subscription_expires_at: null,
        grace_period_until: null,
      };
      break;

    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      // No status change needed
      return new Response(JSON.stringify({ ok: true, skipped: type }), { status: 200 });

    default:
      // Unknown event — respond 200 to avoid retries
      return new Response(JSON.stringify({ ok: true, skipped: `unknown type: ${type}` }), { status: 200 });
  }

  // Upsert profile (create row if first event for this user)
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: app_user_id, ...update }, { onConflict: 'id' });

  if (error) {
    console.error('Supabase upsert error:', error.message);
    // Return 500 so RevenueCat retries
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`RevenueCat ${type} → user ${app_user_id} updated`);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
