import { router } from 'expo-router';
import { ChevronLeft, Crown, ExternalLink, Zap } from 'lucide-react-native';
import React from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSubscription } from '../src/context/SubscriptionContext';

// ─── Progress bar ─────────────────────────────────────────────────────────────

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  if (max === null) {
    return (
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <Text className="text-slate-300 text-sm">{label}</Text>
          <Text className="text-green-400 text-sm font-semibold">Illimitati</Text>
        </View>
        <View className="h-2 bg-slate-700 rounded-full">
          <View className="h-2 bg-green-500 rounded-full w-full" />
        </View>
      </View>
    );
  }

  const pct = Math.min(1, used / max);
  const barColor = pct >= 1 ? 'bg-red-500' : pct >= 0.8 ? 'bg-yellow-500' : 'bg-orange-500';
  const textColor = pct >= 1 ? 'text-red-400' : pct >= 0.8 ? 'text-yellow-400' : 'text-slate-300';

  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1">
        <Text className="text-slate-300 text-sm">{label}</Text>
        <Text className={`${textColor} text-sm font-semibold`}>{used}/{max}</Text>
      </View>
      <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <View className={`h-2 ${barColor} rounded-full`} style={{ width: `${Math.round(pct * 100)}%` }} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SubscriptionScreen() {
  const { isPro, isGrace, limits, usage, openPaywall, restorePurchases } = useSubscription();

  const openManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const statusLabel = isPro
    ? isGrace
      ? 'Pro (in scadenza)'
      : 'Pro'
    : 'Gratuito';

  const statusColor = isPro
    ? isGrace ? 'text-yellow-400' : 'text-orange-400'
    : 'text-slate-400';

  const statusBg = isPro
    ? isGrace ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-orange-500/10 border-orange-500/30'
    : 'bg-slate-700 border-slate-600';

  return (
    <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Nav */}
      <View className="flex-row items-center px-4 pt-12 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#f97316" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-1">Abbonamento</Text>
      </View>

      <View className="px-5 gap-4">
        {/* Current plan badge */}
        <View className={`rounded-2xl p-5 border ${statusBg}`}>
          <View className="flex-row items-center gap-2 mb-1">
            {isPro ? <Crown size={18} color={isGrace ? '#eab308' : '#f97316'} /> : <Zap size={18} color="#64748b" />}
            <Text className={`${statusColor} font-bold text-base`}>Piano {statusLabel}</Text>
          </View>
          {isPro && isGrace && (
            <Text className="text-yellow-300 text-sm mt-1">
              Il tuo abbonamento è stato cancellato. Continui ad avere accesso Pro durante il grace period.
            </Text>
          )}
          {!isPro && (
            <Text className="text-slate-400 text-sm mt-1">
              Passa a Pro per sbloccare trascrizioni illimitate, cloud sync e grafici avanzati.
            </Text>
          )}
        </View>

        {/* Usage this month */}
        <View className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <Text className="text-white font-semibold mb-4">Utilizzo questo mese</Text>
          <UsageBar
            label="Trascrizioni AI"
            used={usage.transcriptionsThisMonth}
            max={limits.max_transcriptions_month}
          />
          <UsageBar
            label="Export PDF"
            used={usage.pdfsThisMonth}
            max={limits.max_pdf_exports_month}
          />
          <UsageBar
            label="Progetti"
            used={usage.projectsCount}
            max={limits.max_projects}
          />
        </View>

        {/* Actions */}
        <View className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {!isPro || isGrace ? (
            <TouchableOpacity
              onPress={openPaywall}
              className="flex-row items-center justify-between px-5 py-4 border-b border-slate-700"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <Crown size={18} color="#f97316" />
                <Text className="text-white font-semibold">Passa a Pro</Text>
              </View>
              <Text className="text-orange-400 text-sm">€4,99/mese →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={openManageSubscription}
              className="flex-row items-center justify-between px-5 py-4 border-b border-slate-700"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <ExternalLink size={18} color="#94a3b8" />
                <Text className="text-white font-semibold">Gestisci abbonamento</Text>
              </View>
              <Text className="text-slate-500 text-sm">→</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={restorePurchases}
            className="flex-row items-center px-5 py-4"
            activeOpacity={0.7}
          >
            <Text className="text-slate-400 text-sm">Ripristina acquisti</Text>
          </TouchableOpacity>
        </View>

        {/* Legal links */}
        <View className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <TouchableOpacity
            onPress={() => Linking.openURL('https://braccoale.github.io/VoiceNote/privacy-policy.html')}
            className="flex-row items-center justify-between px-5 py-4 border-b border-slate-700"
            activeOpacity={0.7}
          >
            <Text className="text-slate-400 text-sm">Informativa sulla Privacy</Text>
            <ExternalLink size={14} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://braccoale.github.io/VoiceNote/terms-of-service.html')}
            className="flex-row items-center justify-between px-5 py-4"
            activeOpacity={0.7}
          >
            <Text className="text-slate-400 text-sm">Termini di Servizio</Text>
            <ExternalLink size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        <Text className="text-slate-700 text-xs text-center px-2">
          I pagamenti sono gestiti da Apple App Store o Google Play.
          Per rimborsi contatta direttamente lo store.
        </Text>
      </View>
    </ScrollView>
  );
}
