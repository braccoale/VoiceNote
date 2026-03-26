import { useSubscription } from '@/src/context/SubscriptionContext';
import { useToast } from '@/src/context/ToastContext';
import { usageService } from '@/src/services/UsageService';
import { generateSiteReportPDF } from '@/src/services/PDFService';
import { Project, SiteReport, SiteReportData, TEMPLATE_ICONS, TEMPLATE_LABELS } from '@/src/types';
import * as ImagePicker from 'expo-image-picker';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Sharing from 'expo-sharing';
import { Camera, Plus, Save, Share2, Trash2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SignatureModal } from './SignatureModal';

interface Props {
  report: SiteReport | null;
  project: Project;
  onClose: () => void;
  onSave: (report: SiteReport) => void;
  onDelete: (reportId: string) => void;
}

export function ReportModal({ report, project, onClose, onSave, onDelete }: Props) {
  const { showError, showSuccess, showToast } = useToast();
  const { isPro, isGrace, pdfsLeft, openPaywall } = useSubscription();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<SiteReportData & { signature?: string }>({
    weather: '', personnel: '', activities: '', issues: '', directives: '',
  });
  const [signatureVisible, setSignatureVisible] = useState(false);

  // Sincronizza editData quando cambia il report
  React.useEffect(() => {
    if (report) setEditData({ ...report.data, signature: report.signature });
    setIsEditing(false);
  }, [report?.id]);

  if (!report) return null;

  const handleEdit = () => {
    setEditData({ ...report.data, signature: report.signature });
    setIsEditing(true);
  };

  const handleSave = () => {
    const updated: SiteReport = {
      ...report,
      data: { ...editData },
      signature: editData.signature,
    };
    onSave(updated);
    setIsEditing(false);
    showSuccess('Modifiche salvate.');
  };

  const handleDelete = () => {
    Alert.alert('Elimina', 'Vuoi davvero eliminare questo report?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => { onClose(); onDelete(report.id); } },
    ]);
  };

  const handleExportPDF = async () => {
    if (!isPro && !isGrace) {
      if (pdfsLeft === 0) {
        openPaywall();
        return;
      }
      if (pdfsLeft !== null && pdfsLeft <= 1) {
        showToast(`Rimane solo ${pdfsLeft} export PDF questo mese`, 'warning');
      }
    }
    try {
      const pdfUri = await generateSiteReportPDF(project, report);
      if (!isPro && !isGrace) await usageService.incrementPDF();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF Creato', `Salvato in: ${pdfUri}`);
      }
    } catch (e) {
      showError('Impossibile generare il PDF');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!isPro && !isGrace && pdfsLeft === 0) {
      openPaywall();
      return;
    }
    try {
      const pdfUri = await generateSiteReportPDF(project, report);
      if (!isPro && !isGrace) await usageService.incrementPDF();
      await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf' });
    } catch {
      showError('Condivisione non disponibile');
    }
  };

  const addPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const updated: SiteReport = {
        ...report,
        photos: [...(report.photos ?? []), {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 ?? undefined,
        }],
      };
      onSave(updated);
    }
  };

  return (
    <Modal
      visible={!!report}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#0f172a" size={24} />
            </TouchableOpacity>
            <View style={styles.actions}>
              {!isEditing && (
                <>
                  <TouchableOpacity onPress={handleExportPDF} style={styles.actionBtn}>
                    <Share2 color="#3b82f6" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
                    <Trash2 color="#ef4444" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleEdit} style={[styles.actionBtn, styles.actionBtnBlue]}>
                    <Text style={styles.actionBtnText}>Modifica</Text>
                  </TouchableOpacity>
                </>
              )}
              {isEditing && (
                <TouchableOpacity onPress={handleSave} style={[styles.actionBtn, styles.actionBtnGreen]}>
                  <Save color="white" size={16} />
                  <Text style={styles.actionBtnText}>Salva</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={styles.card}>
              {/* Meta */}
              <View style={styles.metaRow}>
                <Text style={styles.templateBadge}>
                  {TEMPLATE_ICONS[report.template ?? 'cantiere']} {TEMPLATE_LABELS[report.template ?? 'cantiere']}
                </Text>
                <Text style={styles.dateText}>
                  {new Date(report.date).toLocaleString('it-IT')}
                </Text>
              </View>

              {!isEditing ? (
                /* ── VIEW MODE ── */
                <>
                  {report.data.title && <Text style={styles.reportTitle}>{report.data.title}</Text>}

                  {report.rawTranscription && (
                    <View style={styles.transcriptionBox}>
                      <Text style={styles.fieldLabel}>AUDIO ORIGINALE</Text>
                      <Text style={styles.transcriptionText}>"{report.rawTranscription}"</Text>
                    </View>
                  )}

                  <FieldRow label="METEO" value={report.data.weather} />
                  <FieldRow label="PERSONALE" value={report.data.personnel} />
                  <FieldRow label="ATTIVITÀ" value={report.data.activities} />
                  {report.data.issues && report.data.issues !== 'Nessuna criticità rilevata' && (
                    <FieldRow label="CRITICITÀ" value={report.data.issues} accent="#ef4444" />
                  )}
                  {report.data.directives && report.data.directives !== '-' && (
                    <FieldRow label="DIRETTIVE" value={report.data.directives} accent="#f97316" />
                  )}

                  {report.signature && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.fieldLabel}>FIRMA</Text>
                      <Image
                        source={{ uri: report.signature }}
                        style={styles.signatureImg}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </>
              ) : (
                /* ── EDIT MODE ── */
                <View style={{ gap: 14 }}>
                  <EditField label="Titolo" value={editData.title ?? ''} onChangeText={t => setEditData(d => ({ ...d, title: t }))} />
                  <EditField label="Meteo" value={editData.weather} onChangeText={t => setEditData(d => ({ ...d, weather: t }))} />
                  <EditField label="Personale" value={editData.personnel} onChangeText={t => setEditData(d => ({ ...d, personnel: t }))} multiline />
                  <EditField label="Attività Svolte" value={editData.activities} onChangeText={t => setEditData(d => ({ ...d, activities: t }))} multiline tall />
                  <EditField label="Criticità" value={editData.issues} onChangeText={t => setEditData(d => ({ ...d, issues: t }))} multiline />
                  <EditField label="Direttive" value={editData.directives} onChangeText={t => setEditData(d => ({ ...d, directives: t }))} multiline />

                  <TouchableOpacity
                    style={styles.signatureBtn}
                    onPress={() => {
                      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                      setSignatureVisible(true);
                    }}
                  >
                    <Text style={styles.signatureBtnText}>
                      {editData.signature ? '✏️ Modifica Firma' : '✍️ Aggiungi Firma'}
                    </Text>
                  </TouchableOpacity>

                  {editData.signature && (
                    <Image source={{ uri: editData.signature }} style={styles.signatureImg} resizeMode="contain" />
                  )}
                </View>
              )}

              {/* Foto */}
              <View style={styles.photoSection}>
                <View style={styles.photoHeader}>
                  <Text style={styles.fieldLabel}>FOTO ALLEGATE</Text>
                  {isEditing && (
                    <TouchableOpacity onPress={addPhoto} style={styles.addPhotoBtn}>
                      <Plus color="#3b82f6" size={14} />
                      <Text style={styles.addPhotoText}>Aggiungi</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(!report.photos || report.photos.length === 0) ? (
                  <Text style={styles.noPhoto}>Nessuna foto</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {report.photos.map((photo, i) => (
                      <Image key={i} source={{ uri: photo.uri }} style={styles.photo} />
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            {/* Condivisione rapida */}
            {!isEditing && (
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareWhatsApp}>
                <Text style={styles.shareBtnText}>📤 Condividi PDF (WhatsApp / Email)</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>

        <SignatureModal
          visible={signatureVisible}
          onConfirm={(sig) => { setEditData(d => ({ ...d, signature: sig })); setSignatureVisible(false); }}
          onClose={() => setSignatureVisible(false)}
        />
      </View>
    </Modal>
  );
}

function FieldRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  if (!value) return null;
  return (
    <View style={[styles.fieldRow, accent && { borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 10 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function EditField({
  label, value, onChangeText, multiline, tall,
}: {
  label: string; value: string; onChangeText: (t: string) => void; multiline?: boolean; tall?: boolean;
}) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti, tall && styles.inputTall]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'auto'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: 'white',
  },
  closeBtn: { padding: 8 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: {
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#e2e8f0',
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  actionBtnBlue: { backgroundColor: '#3b82f6' },
  actionBtnGreen: { backgroundColor: '#22c55e' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  templateBadge: { fontSize: 13, color: '#475569', fontWeight: '600' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  transcriptionBox: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, marginBottom: 16 },
  transcriptionText: { color: '#64748b', fontStyle: 'italic', fontSize: 13, lineHeight: 18 },
  fieldRow: { marginBottom: 14 },
  fieldLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  fieldValue: { color: '#1e293b', fontSize: 15, lineHeight: 22 },
  signatureImg: { width: '100%', height: 100, backgroundColor: '#f8fafc', borderRadius: 8, marginTop: 8 },
  signatureBtn: {
    backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed',
  },
  signatureBtnText: { color: '#475569', fontWeight: '600' },
  photoSection: { marginTop: 20 },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPhotoText: { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
  noPhoto: { color: '#94a3b8', fontStyle: 'italic' },
  photo: { width: 100, height: 100, borderRadius: 8, marginRight: 10, backgroundColor: '#e2e8f0' },
  shareBtn: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 16,
  },
  shareBtnText: { color: '#60a5fa', fontWeight: '600' },
  inputLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 12, fontSize: 15, color: '#0f172a',
  },
  inputMulti: { minHeight: 60 },
  inputTall: { minHeight: 100 },
});
