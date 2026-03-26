import { RecordingOverlay } from '@/src/components/RecordingOverlay';
import { ReportCard } from '@/src/components/ReportCard';
import { ReportModal } from '@/src/components/ReportModal';
import { SearchBar } from '@/src/components/SearchBar';
import { useAuth } from '@/src/context/AuthContext';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { useToast } from '@/src/context/ToastContext';
import { offlineQueue } from '@/src/services/OfflineQueue';
import { syncService } from '@/src/services/SyncService';
import { projectStore } from '@/src/store';
import { Project, SiteReport, TemplateType } from '@/src/types';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { Camera, CloudOff, Crown, Mic, RefreshCw, Settings } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { showError, showSuccess, showToast } = useToast();

  const { isPro, isGrace, transcriptionsLeft, openPaywall, openSubscriptionManager } = useSubscription();
  const [project, setProject] = useState<Project | null>(null);
  const [showRecording, setShowRecording] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SiteReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [pendingQueue, setPendingQueue] = useState(0);

  const loadProject = useCallback(async () => {
    await projectStore.load();
    const p = projectStore.getOrCreateDefaultProject();
    setProject({ ...p });
    await offlineQueue.load();
    setPendingQueue(offlineQueue.getPending());
  }, []);

  useEffect(() => { loadProject(); }, [loadProject]);
  useFocusEffect(useCallback(() => { loadProject(); }, [loadProject]));

  const syncWithCloud = async () => {
    if (!user) { showToast('Accedi per sincronizzare nel cloud', 'info'); return; }
    if (!isPro && !isGrace) {
      showToast('Sincronizzazione cloud disponibile nel piano Pro', 'info');
      openPaywall();
      return;
    }
    setSyncing(true);
    try {
      const projects = projectStore.getProjects();
      const merged = await syncService.syncAll(projects, user.id);
      projectStore.replaceAll(merged);
      await loadProject();
      showSuccess('Sincronizzato con il cloud!');
    } catch (e) {
      showError(`Sync fallito: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRecordingSave = (report: SiteReport) => {
    if (!project) return;
    projectStore.addReport(project.id, report);
    loadProject();
    setShowRecording(false);
  };

  const handlePhotoReport = async () => {
    if (!project) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });
    if (result.canceled) return;
    const newReport: SiteReport = {
      id: Date.now().toString(),
      projectId: project.id,
      date: new Date().toISOString(),
      template: 'cantiere' as TemplateType,
      rawTranscription: 'Documentazione fotografica',
      data: { weather: 'Non rilevato', personnel: '', activities: 'Documentazione fotografica', issues: '', directives: '', title: 'FOTO CANTIERE' },
      photos: [{ uri: result.assets[0].uri }],
    };
    projectStore.addReport(project.id, newReport);
    loadProject();
    showSuccess('Foto salvata come report.');
  };

  const handleTextReport = () => {
    if (!project) return;
    const newReport: SiteReport = {
      id: Date.now().toString(),
      projectId: project.id,
      date: new Date().toISOString(),
      template: 'cantiere' as TemplateType,
      data: { weather: '', personnel: '', activities: '', issues: '', directives: '', title: 'Nuova Nota' },
      photos: [],
    };
    setSelectedReport(newReport);
  };

  const handleSaveReport = (report: SiteReport) => {
    if (!project) return;
    const exists = project.reports.some(r => r.id === report.id);
    if (exists) {
      projectStore.updateReport(project.id, report);
    } else {
      projectStore.addReport(project.id, report);
    }
    loadProject();
    const updated = projectStore.getProject(project.id);
    const fresh = updated?.reports.find(r => r.id === report.id) ?? report;
    setSelectedReport(fresh);
  };

  const handleDeleteReport = (reportId: string) => {
    if (!project) return;
    projectStore.deleteReport(project.id, reportId);
    setSelectedReport(null);
    loadProject();
    showSuccess('Report eliminato.');
  };

  // Filtra report per ricerca
  const filteredReports = (project?.reports ?? []).filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.data.title?.toLowerCase().includes(q) ||
      r.data.activities?.toLowerCase().includes(q) ||
      r.rawTranscription?.toLowerCase().includes(q) ||
      r.data.issues?.toLowerCase().includes(q)
    );
  });

  if (!project) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

        {/* Header */}
        <SafeAreaView style={{ backgroundColor: '#0f172a' }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                Site<Text style={styles.accent}>Voice</Text>
              </Text>
              <Text style={styles.headerSub}>
                {project.name}
                {user && <Text style={{ color: '#22c55e' }}> ✓</Text>}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {pendingQueue > 0 && (
                <TouchableOpacity style={styles.queueBadge} onPress={() => showToast(`${pendingQueue} registrazioni in coda offline`, 'warning')}>
                  <CloudOff color="#f97316" size={16} />
                  <Text style={styles.queueText}>{pendingQueue}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={syncWithCloud} style={styles.syncBtn} disabled={syncing}>
                {syncing
                  ? <ActivityIndicator color="#3b82f6" size="small" />
                  : <RefreshCw color="#64748b" size={20} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={openSubscriptionManager} style={styles.syncBtn}>
                {isPro || isGrace
                  ? <Crown color="#f97316" size={20} />
                  : <Crown color="#475569" size={20} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/auth')} style={styles.syncBtn}>
                <Settings color="#64748b" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Usage banner — only for free users near limit */}
          {!isPro && !isGrace && transcriptionsLeft !== null && transcriptionsLeft <= 3 && (
            <TouchableOpacity
              onPress={openPaywall}
              style={styles.usageBanner}
              activeOpacity={0.85}
            >
              <Crown size={14} color="#f97316" />
              <Text style={styles.usageBannerText}>
                {transcriptionsLeft === 0
                  ? 'Hai esaurito le trascrizioni questo mese'
                  : `Rimangono ${transcriptionsLeft} trascrizioni AI questo mese`}
              </Text>
              <Text style={styles.usageBannerCta}>Pro →</Text>
            </TouchableOpacity>
          )}

          {/* Today Card */}
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>Report Lavoro</Text>
            <Text style={styles.todayDate}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.todayCount}>{project.reports.length} report totali</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => setShowRecording(true)}>
              <Mic color="white" size={26} style={{ marginRight: 12 }} />
              <Text style={styles.actionText}>Registra Audio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#84cc16' }]} onPress={handlePhotoReport}>
              <Camera color="white" size={26} style={{ marginRight: 12 }} />
              <Text style={styles.actionText}>Scatta Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f97316' }]} onPress={handleTextReport}>
              <View style={styles.textIcon}>
                {[20, 20, 14].map((w, i) => <View key={i} style={[styles.textLine, { width: w, marginBottom: i < 2 ? 4 : 0 }]} />)}
              </View>
              <Text style={styles.actionText}>Inserisci Testo</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          {/* List */}
          <Text style={styles.sectionTitle}>
            {searchQuery ? `RISULTATI (${filteredReports.length})` : 'RIEPILOGO ATTIVITÀ'}
          </Text>

          {filteredReports.length === 0 ? (
            <Text style={styles.empty}>
              {searchQuery ? 'Nessun risultato per questa ricerca.' : 'Nessuna attività registrata.'}
            </Text>
          ) : (
            filteredReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onPress={() => setSelectedReport(report)}
                onDelete={() => {
                  Alert.alert('Elimina', 'Eliminare questo report?', [
                    { text: 'Annulla', style: 'cancel' },
                    { text: 'Elimina', style: 'destructive', onPress: () => handleDeleteReport(report.id) },
                  ]);
                }}
              />
            ))
          )}
          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Recording Overlay */}
        {showRecording && (
          <RecordingOverlay
            project={project}
            onSave={handleRecordingSave}
            onClose={() => setShowRecording(false)}
          />
        )}

        {/* Report Modal */}
        <ReportModal
          report={selectedReport}
          project={project}
          onClose={() => setSelectedReport(null)}
          onSave={handleSaveReport}
          onDelete={handleDeleteReport}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    padding: 20, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  accent: { color: '#f97316' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  queueBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#f97316',
  },
  queueText: { color: '#f97316', fontWeight: 'bold', fontSize: 13 },
  syncBtn: { padding: 8 },
  scroll: { padding: 20, paddingBottom: 100 },
  todayCard: {
    backgroundColor: '#3b82f6', borderRadius: 20, padding: 24, marginBottom: 24,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  todayLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  todayDate: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  todayCount: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  actions: { gap: 12, marginBottom: 20 },
  actionBtn: {
    height: 64, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  actionText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  textIcon: { marginRight: 12 },
  textLine: { height: 2, backgroundColor: 'white' },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  empty: { color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  usageBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1e293b', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#f97316',
  },
  usageBannerText: { flex: 1, color: '#f97316', fontSize: 13 },
  usageBannerCta: { color: '#f97316', fontWeight: 'bold', fontSize: 13 },
});
