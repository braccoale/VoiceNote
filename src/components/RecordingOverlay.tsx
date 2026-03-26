import { useSubscription } from '@/src/context/SubscriptionContext';
import { useToast } from '@/src/context/ToastContext';
import { usageService } from '@/src/services/UsageService';
import { offlineQueue } from '@/src/services/OfflineQueue';
import { Project, SiteReport, SiteReportData, TemplateType } from '@/src/types';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Mic } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { audioRecordingService, TranscriptionError } from '../services/AudioRecordingService';
import { TemplatePicker } from './TemplatePicker';

type RecordingStatus = 'idle' | 'recording' | 'processing' | 'review';

interface Props {
  project: Project;
  onSave: (report: SiteReport) => void;
  onClose: () => void;
}

export function RecordingOverlay({ project, onSave, onClose }: Props) {
  const { showError, showSuccess, showToast } = useToast();
  const { isPro, isGrace, transcriptionsLeft, openPaywall } = useSubscription();
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [template, setTemplate] = useState<TemplateType>('cantiere');
  const [transcription, setTranscription] = useState('');
  const [aiData, setAiData] = useState<SiteReportData | null>(null);
  const [photos, setPhotos] = useState<{ uri: string }[]>([]);
  const [duration, setDuration] = useState('00:00');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const secondsRef = useRef(0);
  const ripple = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ripple, { toValue: 1.25, duration: 900, useNativeDriver: true }),
          Animated.timing(ripple, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      ripple.setValue(1);
    }
  }, [status]);

  const startRec = async () => {
    // Check transcription quota before starting
    if (!isPro && !isGrace) {
      if (transcriptionsLeft === 0) {
        openPaywall();
        return;
      }
      if (transcriptionsLeft !== null && transcriptionsLeft <= 2) {
        showToast(`Rimangono solo ${transcriptionsLeft} trascrizioni AI questo mese`, 'warning');
      }
    }
    try {
      await audioRecordingService.startRecording();
      setStatus('recording');
      secondsRef.current = 0;
      setDuration('00:00');
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        const m = Math.floor(secondsRef.current / 60).toString().padStart(2, '0');
        const s = (secondsRef.current % 60).toString().padStart(2, '0');
        setDuration(`${m}:${s}`);
      }, 1000);
    } catch (err) {
      if (err instanceof TranscriptionError && err.code === 'PERMISSION') {
        showError('Permesso microfono necessario. Abilitalo nelle impostazioni.');
      } else {
        showError((err as Error).message);
      }
    }
  };

  const stopRec = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (status !== 'recording') return;
    setStatus('processing');

    try {
      const uri = await audioRecordingService.stopRecording();
      if (!uri) { setStatus('idle'); return; }

      const result = await audioRecordingService.transcribeAudio(uri);
      setTranscription(result.text ?? '');
      setAiData(result.data ?? null);
      setStatus('review');
      // Track usage for free users
      if (!isPro && !isGrace) {
        await usageService.incrementTranscription();
      }
    } catch (err) {
      const te = err as TranscriptionError;
      if (te.code === 'NETWORK') {
        // Metti in coda offline
        const queued = await offlineQueue.enqueue(project.id, '');
        showToast(`Nessuna connessione. Aggiunto alla coda (${offlineQueue.getPending()} in attesa).`, 'warning');
        setStatus('idle');
      } else {
        showError(te.message ?? 'Errore durante la trascrizione');
        setStatus('idle');
      }
    }
  };

  const handleSave = () => {
    const report: SiteReport = {
      id: Date.now().toString(),
      projectId: project.id,
      date: new Date().toISOString(),
      template,
      rawTranscription: transcription,
      data: aiData ?? {
        weather: 'Non rilevato',
        personnel: '',
        activities: transcription,
        issues: '',
        directives: '',
        title: 'Nota Vocale',
      },
      photos,
    };
    onSave(report);
    showSuccess('Report salvato con successo!');
  };

  const addPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      setPhotos(prev => [...prev, {
        uri: result.assets[0].uri,
        base64: result.assets[0].base64 ?? undefined,
      }]);
    }
  };

  const reset = () => {
    setStatus('idle');
    setTranscription('');
    setAiData(null);
    setPhotos([]);
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { audioRecordingService.stopRecording(); onClose(); }} style={styles.backBtn}>
            <ArrowLeft color="white" size={22} />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuova Entry</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Template picker — visibile solo in idle */}
        {status === 'idle' && (
          <TemplatePicker selected={template} onSelect={setTemplate} />
        )}

        <View style={styles.body}>
          {status === 'review' ? (
            /* ── REVIEW ── */
            <View style={{ flex: 1, width: '100%', paddingHorizontal: 20 }}>
              <Text style={styles.reviewTitle}>Riepilogo AI</Text>
              {aiData?.title && (
                <Text style={styles.aiTitle}>{aiData.title}</Text>
              )}
              <TextInput
                style={styles.reviewInput}
                multiline
                value={transcription}
                onChangeText={setTranscription}
                placeholder="Trascrizione..."
                placeholderTextColor="#64748b"
              />
              {photos.length > 0 && (
                <ScrollView horizontal style={{ maxHeight: 90, marginBottom: 12 }}>
                  {photos.map((p, i) => (
                    <Image key={i} source={{ uri: p.uri }} style={styles.thumb} />
                  ))}
                </ScrollView>
              )}
              <View style={styles.reviewActions}>
                <TouchableOpacity style={styles.btnDiscard} onPress={reset}>
                  <Text style={styles.btnDiscardText}>Scarta</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                  <Text style={styles.btnSaveText}>SALVA</Text>
                </TouchableOpacity>
              </View>
            </View>

          ) : status === 'processing' ? (
            /* ── PROCESSING ── */
            <View style={styles.processingBox}>
              <ActivityIndicator color="#3b82f6" size="large" />
              <Text style={styles.processingText}>Analizzo l'audio con AI...</Text>
              <Text style={styles.processingHint}>Whisper + GPT-4o</Text>
            </View>

          ) : (
            /* ── IDLE / RECORDING ── */
            <View style={styles.recBox}>
              <Text style={styles.recTitle}>
                {status === 'recording' ? 'In registrazione...' : 'Tieni premuto il microfono'}
              </Text>
              <Text style={styles.timer}>{status === 'recording' ? duration : '00:00'}</Text>

              <View style={styles.micWrapper}>
                <Animated.View style={[styles.ripple, { transform: [{ scale: ripple }] }]} />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPressIn={startRec}
                  onPressOut={stopRec}
                  style={[styles.mic, status === 'recording' && styles.micActive]}
                >
                  <Mic size={50} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.photoRow}>
                <TouchableOpacity onPress={addPhoto} style={styles.photoBtn}>
                  <Camera color="#3b82f6" size={18} />
                  <Text style={styles.photoBtnText}>Aggiungi Foto</Text>
                </TouchableOpacity>
              </View>

              {photos.length > 0 && (
                <ScrollView horizontal style={{ maxHeight: 64 }}>
                  {photos.map((p, i) => (
                    <Image key={i} source={{ uri: p.uri }} style={styles.thumbSmall} />
                  ))}
                </ScrollView>
              )}

              <View style={{ width: '100%', paddingHorizontal: 20, marginTop: 16 }}>
                <Text style={styles.inputLabel}>Trascrizione manuale (opzionale)</Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="Scrivi direttamente..."
                  placeholderTextColor="#475569"
                  multiline
                  value={transcription}
                  onChangeText={setTranscription}
                />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: '#0f172a', zIndex: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: 'white', fontSize: 16 },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Review
  reviewTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  aiTitle: { color: '#94a3b8', fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
  reviewInput: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    fontSize: 15, color: 'white', textAlignVertical: 'top', marginBottom: 16,
  },
  thumb: { width: 80, height: 80, borderRadius: 10, marginRight: 8, backgroundColor: '#334155' },
  reviewActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  btnDiscard: {
    flex: 1, height: 52, borderRadius: 26, backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDiscardText: { color: 'white', fontWeight: 'bold' },
  btnSave: {
    flex: 3, height: 52, borderRadius: 26, backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  btnSaveText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  // Processing
  processingBox: { alignItems: 'center', gap: 12 },
  processingText: { color: '#3b82f6', fontSize: 18, fontWeight: '600' },
  processingHint: { color: '#475569', fontSize: 13 },

  // Recorder
  recBox: { alignItems: 'center', width: '100%', paddingBottom: 30 },
  recTitle: { color: '#94a3b8', fontSize: 16, marginBottom: 8 },
  timer: { color: 'white', fontSize: 52, fontWeight: '700', fontVariant: ['tabular-nums'], marginBottom: 20 },
  micWrapper: { alignItems: 'center', justifyContent: 'center', width: 160, height: 160 },
  ripple: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(239,68,68,0.25)' },
  mic: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
  },
  micActive: { backgroundColor: '#dc2626' },
  photoRow: { marginTop: 20 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e293b', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
  },
  photoBtnText: { color: '#3b82f6', fontWeight: '600' },
  thumbSmall: { width: 56, height: 56, borderRadius: 8, marginHorizontal: 4 },
  inputLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  manualInput: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    height: 80, color: 'white', textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#334155', fontSize: 14,
  },
});
