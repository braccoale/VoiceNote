-- ──────────────────────────────────────────────────────────────
-- Subscription system: limits table + user profiles
-- ──────────────────────────────────────────────────────────────

-- 1. Configurable limits per tier (edit directly in DB to change limits without app update)
CREATE TABLE public.subscription_limits (
  tier                       text PRIMARY KEY,
  max_projects               int,         -- NULL = unlimited
  max_transcriptions_month   int,         -- NULL = unlimited
  max_pdf_exports_month      int,         -- NULL = unlimited
  cloud_sync_enabled         boolean NOT NULL DEFAULT false,
  advanced_stats_enabled     boolean NOT NULL DEFAULT false
);

INSERT INTO public.subscription_limits (tier, max_projects, max_transcriptions_month, max_pdf_exports_month, cloud_sync_enabled, advanced_stats_enabled) VALUES
  ('free', 3,    10,   5,    false, false),
  ('pro',  NULL, NULL, NULL, true,  true);

-- Public read (app fetches limits without auth)
ALTER TABLE public.subscription_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_limits" ON public.subscription_limits
  FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────

-- 2. User profiles: subscription status per user
CREATE TABLE public.user_profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status     text NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'pro', 'grace', 'cancelled', 'expired')),
  subscription_expires_at timestamptz,
  grace_period_until      timestamptz,   -- 7 days after cancellation
  revenuecat_customer_id  text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Owner can read their own profile
CREATE POLICY "owner_select" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Owner can update their own profile (for local optimistic updates)
CREATE POLICY "owner_update" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role (Edge Functions) can insert/update any profile
CREATE POLICY "service_insert" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_update_all" ON public.user_profiles
  FOR UPDATE USING (true);

-- Auto-update updated_at
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────

-- 3. Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
