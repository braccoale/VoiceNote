import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { usageService } from '../services/UsageService';
import { useAuth } from './AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubscriptionLimits {
  max_projects: number | null;
  max_transcriptions_month: number | null;
  max_pdf_exports_month: number | null;
  cloud_sync_enabled: boolean;
  advanced_stats_enabled: boolean;
}

const FREE_LIMITS_FALLBACK: SubscriptionLimits = {
  max_projects: 3,
  max_transcriptions_month: 10,
  max_pdf_exports_month: 5,
  cloud_sync_enabled: false,
  advanced_stats_enabled: false,
};

const PRO_LIMITS_FALLBACK: SubscriptionLimits = {
  max_projects: null,
  max_transcriptions_month: null,
  max_pdf_exports_month: null,
  cloud_sync_enabled: true,
  advanced_stats_enabled: true,
};

interface UsageSummary {
  transcriptionsThisMonth: number;
  pdfsThisMonth: number;
  projectsCount: number;
}

interface SubscriptionContextValue {
  isPro: boolean;
  isGrace: boolean;
  loading: boolean;
  limits: SubscriptionLimits;
  usage: UsageSummary;
  transcriptionsLeft: number | null;
  pdfsLeft: number | null;
  canCreateProject: (currentCount: number) => boolean;
  openPaywall: () => void;
  openSubscriptionManager: () => void;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  setProjectsCount: (n: number) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// RevenueCat public API key — replace with your real key from revenuecat.com
const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
const ENTITLEMENT_PRO = 'pro';

// ─── Provider ────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children, onOpenPaywall, onOpenSubscriptionManager }: {
  children: React.ReactNode;
  onOpenPaywall: () => void;
  onOpenSubscriptionManager: () => void;
}) {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [isGrace, setIsGrace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<SubscriptionLimits>(FREE_LIMITS_FALLBACK);
  const [usage, setUsage] = useState<UsageSummary>({
    transcriptionsThisMonth: 0,
    pdfsThisMonth: 0,
    projectsCount: 0,
  });

  // ─── Load limits from Supabase subscription_limits table ───────────────────

  const loadLimits = async (tier: 'free' | 'pro') => {
    const { data } = await supabase
      .from('subscription_limits')
      .select('*')
      .eq('tier', tier)
      .single();
    if (data) {
      setLimits({
        max_projects: data.max_projects ?? null,
        max_transcriptions_month: data.max_transcriptions_month ?? null,
        max_pdf_exports_month: data.max_pdf_exports_month ?? null,
        cloud_sync_enabled: data.cloud_sync_enabled,
        advanced_stats_enabled: data.advanced_stats_enabled,
      });
    } else {
      setLimits(tier === 'pro' ? PRO_LIMITS_FALLBACK : FREE_LIMITS_FALLBACK);
    }
  };

  // ─── Load usage counters ────────────────────────────────────────────────────

  const refreshUsage = async () => {
    const { transcriptions, pdfs } = await usageService.getUsageSummary();
    setUsage(prev => ({ ...prev, transcriptionsThisMonth: transcriptions, pdfsThisMonth: pdfs }));
  };

  // ─── Check RevenueCat entitlement ───────────────────────────────────────────

  const applyCustomerInfo = async (info: CustomerInfo) => {
    const active = info.entitlements.active[ENTITLEMENT_PRO];
    const proActive = !!active;
    setIsPro(proActive);
    await loadLimits(proActive ? 'pro' : 'free');
  };

  // ─── Check Supabase grace status ────────────────────────────────────────────

  const checkGrace = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('subscription_status, grace_period_until')
      .eq('id', userId)
      .single();
    if (data) {
      const graceActive =
        (data.subscription_status === 'grace' || data.subscription_status === 'cancelled') &&
        data.grace_period_until != null &&
        new Date(data.grace_period_until) > new Date();
      setIsGrace(graceActive);
    }
  };

  // ─── Full refresh ───────────────────────────────────────────────────────────

  const refreshSubscription = async () => {
    try {
      if (RC_API_KEY) {
        const info = await Purchases.getCustomerInfo();
        await applyCustomerInfo(info);
      } else {
        // RC not configured yet — use Supabase status only
        if (user) {
          const { data } = await supabase
            .from('user_profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single();
          const proActive = data?.subscription_status === 'pro' || data?.subscription_status === 'grace';
          setIsPro(proActive);
          await loadLimits(proActive ? 'pro' : 'free');
        } else {
          setIsPro(false);
          await loadLimits('free');
        }
      }
      if (user) await checkGrace(user.id);
    } catch {
      // Keep current state on error
    } finally {
      await refreshUsage();
      setLoading(false);
    }
  };

  // ─── Init RevenueCat ────────────────────────────────────────────────────────

  useEffect(() => {
    if (RC_API_KEY) {
      Purchases.setLogLevel(LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey: RC_API_KEY });

      if (user?.email) {
        Purchases.logIn(user.id).catch(() => {});
      }

      const remove = Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
      return () => { remove(); };
    }
  }, [user?.id]);

  // ─── Refresh on mount + app foreground ─────────────────────────────────────

  useEffect(() => {
    refreshSubscription();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshSubscription();
    });
    return () => sub.remove();
  }, [user?.id]);

  // ─── Derived values ─────────────────────────────────────────────────────────

  const transcriptionsLeft = usageService.remaining(
    usage.transcriptionsThisMonth,
    limits.max_transcriptions_month,
  );
  const pdfsLeft = usageService.remaining(
    usage.pdfsThisMonth,
    limits.max_pdf_exports_month,
  );

  const canCreateProject = (currentCount: number): boolean => {
    if (limits.max_projects === null) return true;
    return currentCount < limits.max_projects;
  };

  const setProjectsCount = (n: number) => {
    setUsage(prev => ({ ...prev, projectsCount: n }));
  };

  const restorePurchases = async () => {
    if (!RC_API_KEY) return;
    const info = await Purchases.restorePurchases();
    await applyCustomerInfo(info);
  };

  return (
    <SubscriptionContext.Provider value={{
      isPro,
      isGrace,
      loading,
      limits,
      usage,
      transcriptionsLeft,
      pdfsLeft,
      canCreateProject,
      openPaywall: onOpenPaywall,
      openSubscriptionManager: onOpenSubscriptionManager,
      restorePurchases,
      refreshSubscription,
      setProjectsCount,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be inside SubscriptionProvider');
  return ctx;
}
