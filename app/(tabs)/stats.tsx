import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { projectStore } from '@/src/store';
import { SiteReport, TEMPLATE_LABELS, TemplateType } from '@/src/types';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Stats {
  totalReports: number;
  reportsByTemplate: Record<string, number>;
  reportsByMonth: Record<string, number>;
  issueCount: number;
  highSeverityCount: number;
  withPhotos: number;
  withSignature: number;
  withAudio: number;
  recentActivity: SiteReport[];
}

function computeStats(reports: SiteReport[]): Stats {
  const byTemplate: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  let issueCount = 0;
  let highSeverity = 0;
  let withPhotos = 0;
  let withSignature = 0;
  let withAudio = 0;

  for (const r of reports) {
    const t = r.template ?? 'cantiere';
    byTemplate[t] = (byTemplate[t] ?? 0) + 1;

    const month = new Date(r.date).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    byMonth[month] = (byMonth[month] ?? 0) + 1;

    if (r.data.issues && r.data.issues !== 'Nessuna criticità rilevata' && r.data.issues !== '-') {
      issueCount++;
      if (r.data.issues.includes('[HIGH]')) highSeverity++;
    }
    if (r.photos && r.photos.length > 0) withPhotos++;
    if (r.signature) withSignature++;
    if (r.rawTranscription) withAudio++;
  }

  return {
    totalReports: reports.length,
    reportsByTemplate: byTemplate,
    reportsByMonth: byMonth,
    issueCount,
    highSeverityCount: highSeverity,
    withPhotos,
    withSignature,
    withAudio,
    recentActivity: reports.slice(0, 5),
  };
}

export default function StatsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectName, setProjectName] = useState('');

  const load = useCallback(async () => {
    await projectStore.load();
    const all = projectStore.getProjects();
    const allReports = all.flatMap(p => p.reports);
    setStats(computeStats(allReports));
    setProjectName(all.length > 0 ? `${all.length} cantieri` : 'Nessun cantiere');
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!stats) return null;

  const months = Object.entries(stats.reportsByMonth).slice(-6);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        <Text style={styles.title}>Statistiche</Text>
        <Text style={styles.sub}>{projectName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KpiCard label="Report Totali" value={stats.totalReports} color="#3b82f6" />
          <KpiCard label="Con Audio AI" value={stats.withAudio} color="#8b5cf6" />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard label="Con Foto" value={stats.withPhotos} color="#84cc16" />
          <KpiCard label="Con Firma" value={stats.withSignature} color="#f97316" />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard label="Criticità" value={stats.issueCount} color="#ef4444" />
          <KpiCard label="Alta Severità" value={stats.highSeverityCount} color="#dc2626" />
        </View>

        {/* Per Template */}
        {Object.keys(stats.reportsByTemplate).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PER TIPO DOCUMENTO</Text>
            {Object.entries(stats.reportsByTemplate).map(([t, n]) => (
              <View key={t} style={styles.barRow}>
                <Text style={styles.barLabel}>
                  {TEMPLATE_LABELS[t as TemplateType] ?? t}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(n / stats.totalReports) * 100}%`, backgroundColor: '#3b82f6' }]} />
                </View>
                <Text style={styles.barCount}>{n}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Ultimi 6 mesi */}
        {months.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ULTIMI 6 MESI</Text>
            <View style={styles.monthChart}>
              {months.map(([m, n]) => {
                const maxN = Math.max(...months.map(([, v]) => v));
                const h = maxN > 0 ? Math.max(8, (n / maxN) * 80) : 8;
                return (
                  <View key={m} style={styles.monthCol}>
                    <Text style={styles.monthCount}>{n}</Text>
                    <View style={[styles.monthBar, { height: h }]} />
                    <Text style={styles.monthLabel}>{m}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.accountCard}>
            {user ? (
              <>
                <Text style={styles.accountText}>✓ Connesso come</Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
                <Text style={styles.syncHint}>I tuoi dati sono sincronizzati nel cloud</Text>
              </>
            ) : (
              <>
                <Text style={styles.accountText}>Nessun account</Text>
                <Text style={styles.syncHint}>Accedi per sincronizzare i dati nel cloud e non perderli mai</Text>
              </>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  title: { color: 'white', fontSize: 24, fontWeight: '800' },
  sub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  scroll: { padding: 16 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderWidth: 1, borderColor: '#334155',
  },
  kpiValue: { fontSize: 32, fontWeight: '800' },
  kpiLabel: { color: '#64748b', fontSize: 13, marginTop: 4 },
  section: { marginTop: 24 },
  sectionTitle: { color: '#64748b', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { color: '#94a3b8', fontSize: 13, width: 130 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#1e293b', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barCount: { color: '#f1f5f9', fontWeight: 'bold', width: 24, textAlign: 'right' },
  monthChart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16, height: 140,
  },
  monthCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  monthCount: { color: '#94a3b8', fontSize: 11 },
  monthBar: { width: 28, backgroundColor: '#3b82f6', borderRadius: 4 },
  monthLabel: { color: '#64748b', fontSize: 10, marginTop: 4 },
  accountCard: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#334155', gap: 4,
  },
  accountText: { color: '#94a3b8', fontSize: 13 },
  accountEmail: { color: '#22c55e', fontWeight: 'bold', fontSize: 15 },
  syncHint: { color: '#475569', fontSize: 12, lineHeight: 18 },
});
