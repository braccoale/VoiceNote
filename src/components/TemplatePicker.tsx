import { TemplateType, TEMPLATE_ICONS, TEMPLATE_LABELS } from '@/src/types';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  selected: TemplateType;
  onSelect: (t: TemplateType) => void;
}

const TEMPLATES: TemplateType[] = ['cantiere', 'sopralluogo', 'verbale', 'manutenzione'];

export function TemplatePicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>TIPO DOCUMENTO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TEMPLATES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, selected === t && styles.chipActive]}
            onPress={() => onSelect(t)}
          >
            <Text style={styles.chipIcon}>{TEMPLATE_ICONS[t]}</Text>
            <Text style={[styles.chipText, selected === t && styles.chipTextActive]}>
              {TEMPLATE_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    color: '#64748b', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1, marginBottom: 8, paddingHorizontal: 20,
  },
  row: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1e293b', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  chipActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  chipIcon: { fontSize: 16 },
  chipText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#60a5fa', fontWeight: '700' },
});
