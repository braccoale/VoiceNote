import { SiteReport, TEMPLATE_ICONS } from '@/src/types';
import { Calendar, Mic } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface Props {
  report: SiteReport;
  onPress: () => void;
  onDelete: () => void;
}

export function ReportCard({ report, onPress, onDelete }: Props) {
  const icon = TEMPLATE_ICONS[report.template ?? 'cantiere'] ?? '📄';
  const hasAudio = !!report.rawAudioUri || !!report.rawTranscription;

  return (
    <Swipeable
      renderRightActions={() => (
        <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
          <Text style={styles.deleteText}>Elimina</Text>
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {report.data.title || report.data.activities || 'Report'}
          </Text>
          <View style={styles.meta}>
            <Calendar color="#64748b" size={12} />
            <Text style={styles.date}>
              {new Date(report.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {hasAudio && <Mic color="#3b82f6" size={12} style={{ marginLeft: 8 }} />}
            {report.photos && report.photos.length > 0 && (
              <Text style={styles.photoBadge}>{report.photos.length} foto</Text>
            )}
            {report.syncedAt && <Text style={styles.syncBadge}>✓ sync</Text>}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconBox: {
    width: 44, height: 44,
    borderRadius: 10, backgroundColor: '#334155',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  iconEmoji: { fontSize: 22 },
  info: { flex: 1 },
  title: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { color: '#94a3b8', fontSize: 12, marginLeft: 4 },
  photoBadge: { color: '#64748b', fontSize: 11, marginLeft: 8 },
  syncBadge: { color: '#22c55e', fontSize: 11, marginLeft: 8 },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: 12,
    marginBottom: 10,
  },
  deleteText: { color: 'white', fontWeight: 'bold' },
});
