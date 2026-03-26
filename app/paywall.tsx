import { router } from 'expo-router';
import { Check, Crown, X, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Purchases from 'react-native-purchases';
import { useToast } from '../src/context/ToastContext';
import { useSubscription } from '../src/context/SubscriptionContext';

const MONTHLY_ID = 'sitevoice_pro_monthly';
const ANNUAL_ID  = 'sitevoice_pro_annual';

const FREE_FEATURES = [
  '3 progetti',
  '10 trascrizioni AI / mese',
  '5 export PDF / mese',
  'Storage solo locale',
  'Statistiche base',
];

const PRO_FEATURES = [
  'Progetti illimitati',
  'Trascrizioni AI illimitate',
  'Export PDF illimitati',
  'Sincronizzazione cloud',
  'Statistiche avanzate + grafici',
  'Badge Pro nel profilo',
];

export default function PaywallScreen() {
  const { restorePurchases, refreshSubscription } = useSubscription();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState<'monthly' | 'annual' | 'restore' | null>(null);

  const handlePurchase = async (productId: string, type: 'monthly' | 'annual') => {
    setLoading(type);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find(
        p => p.product.identifier === productId,
      );
      if (!pkg) {
        showError('Prodotto non disponibile. Riprova più tardi.');
        return;
      }
      await Purchases.purchasePackage(pkg);
      await refreshSubscription();
      showSuccess('Benvenuto in SiteVoice Pro!');
      router.back();
    } catch (err: any) {
      if (!err.userCancelled) {
        showError('Acquisto non completato. Riprova.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    setLoading('restore');
    try {
      await restorePurchases();
      showSuccess('Acquisti ripristinati con successo.');
      router.back();
    } catch {
      showError('Impossibile ripristinare gli acquisti.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Header */}
      <View className="items-center pt-12 pb-8 px-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-4 right-4 p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={22} color="#64748b" />
        </TouchableOpacity>

        <View className="w-16 h-16 rounded-2xl bg-orange-500 items-center justify-center mb-4">
          <Crown size={32} color="white" />
        </View>
        <Text className="text-white text-2xl font-bold text-center">
          Passa a <Text className="text-orange-500">SiteVoice Pro</Text>
        </Text>
        <Text className="text-slate-400 text-center mt-2 text-sm">
          Trascrizioni illimitate, cloud sync e molto altro
        </Text>
      </View>

      {/* Plans comparison */}
      <View className="px-5 gap-3">
        {/* Free card */}
        <View className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <Text className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-3">
            Piano Gratuito
          </Text>
          {FREE_FEATURES.map(f => (
            <View key={f} className="flex-row items-center gap-2 mb-2">
              <Check size={15} color="#64748b" />
              <Text className="text-slate-400 text-sm">{f}</Text>
            </View>
          ))}
        </View>

        {/* Pro card */}
        <View className="bg-orange-500/10 rounded-2xl p-5 border-2 border-orange-500">
          <View className="flex-row items-center gap-2 mb-3">
            <Crown size={15} color="#f97316" />
            <Text className="text-orange-400 font-semibold text-xs uppercase tracking-widest">
              Piano Pro
            </Text>
          </View>
          {PRO_FEATURES.map(f => (
            <View key={f} className="flex-row items-center gap-2 mb-2">
              <Check size={15} color="#f97316" />
              <Text className="text-white text-sm font-medium">{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Purchase buttons */}
      <View className="px-5 mt-6 gap-3">
        {/* Monthly */}
        <TouchableOpacity
          onPress={() => handlePurchase(MONTHLY_ID, 'monthly')}
          disabled={loading !== null}
          className="bg-orange-500 rounded-2xl py-4 items-center justify-center"
          activeOpacity={0.85}
        >
          {loading === 'monthly' ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-bold text-base">Abbonati — €4,99/mese</Text>
              <Text className="text-orange-200 text-xs mt-0.5">Annulla in qualsiasi momento</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Annual */}
        <TouchableOpacity
          onPress={() => handlePurchase(ANNUAL_ID, 'annual')}
          disabled={loading !== null}
          className="bg-slate-700 rounded-2xl py-4 items-center justify-center border border-orange-500/40"
          activeOpacity={0.85}
        >
          {loading === 'annual' ? (
            <ActivityIndicator color="#f97316" />
          ) : (
            <>
              <View className="flex-row items-center gap-2">
                <Zap size={15} color="#f97316" />
                <Text className="text-white font-bold text-base">Piano annuale — €39,99/anno</Text>
              </View>
              <Text className="text-orange-400 text-xs mt-0.5 font-semibold">Risparmia il 33%</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Restore + legal */}
      <View className="px-5 mt-6 items-center gap-3">
        <TouchableOpacity
          onPress={handleRestore}
          disabled={loading !== null}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {loading === 'restore' ? (
            <ActivityIndicator color="#64748b" size="small" />
          ) : (
            <Text className="text-slate-500 text-sm">Ripristina acquisti</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row gap-4">
          <TouchableOpacity onPress={() => router.push('/privacy-policy' as any)}>
            <Text className="text-slate-600 text-xs">Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/terms-of-service' as any)}>
            <Text className="text-slate-600 text-xs">Termini di Servizio</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-slate-700 text-xs text-center px-4 mt-1">
          Il pagamento verrà addebitato sul tuo account App Store / Google Play.
          L'abbonamento si rinnova automaticamente salvo cancellazione entro 24 ore dalla scadenza.
        </Text>
      </View>
    </ScrollView>
  );
}
