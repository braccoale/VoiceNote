import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { syncService } from '@/src/services/SyncService';
import { projectStore } from '@/src/store';
import { Project } from '@/src/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { FolderOpen, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const load = useCallback(async () => {
    await projectStore.load();
    setProjects(projectStore.getProjects());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createProject = () => {
    if (!newName.trim()) { showError('Inserisci un nome per il cantiere'); return; }
    const p: Project = {
      id: Date.now().toString(),
      name: newName.trim(),
      address: newAddress.trim() || 'Indirizzo non specificato',
      createdAt: new Date().toISOString(),
      reports: [],
    };
    projectStore.addProject(p);
    if (user) syncService.upsertProject(p, user.id).catch(console.warn);
    setNewModal(false);
    setNewName('');
    setNewAddress('');
    load();
    showSuccess(`Cantiere "${p.name}" creato!`);
  };

  const deleteProject = (p: Project) => {
    if (p.id === 'default-main') { showError('Il Diario di Lavoro non può essere eliminato'); return; }
    Alert.alert('Elimina cantiere', `Eliminare "${p.name}" con tutti i suoi report?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: () => {
          projectStore.deleteProject(p.id);
          if (user) syncService.deleteProject(p.id).catch(console.warn);
          load();
          showSuccess('Cantiere eliminato.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cantieri</Text>
          <Text style={styles.sub}>{projects.length} cantieri attivi</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setNewModal(true)}>
          <Plus color="white" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {projects.map(p => (
          <TouchableOpacity
            key={p.id}
            style={styles.card}
            onPress={() => router.push(`/project/${p.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardIcon}>
              <FolderOpen color="#3b82f6" size={24} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{p.name}</Text>
              <Text style={styles.cardAddress} numberOfLines={1}>{p.address}</Text>
              <Text style={styles.cardMeta}>
                {p.reports.length} report · {new Date(p.createdAt).toLocaleDateString('it-IT')}
              </Text>
            </View>
            {p.id !== 'default-main' && (
              <TouchableOpacity onPress={() => deleteProject(p)} style={styles.deleteBtn}>
                <Trash2 color="#ef4444" size={18} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* New Project Modal */}
      <Modal visible={newModal} animationType="slide" presentationStyle="pageSheet" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuovo Cantiere</Text>
            <TouchableOpacity onPress={() => setNewModal(false)}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nome cantiere *</Text>
            <TextInput
              style={styles.input}
              placeholder="Es. Villa Rossi — Ristrutturazione"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <Text style={styles.inputLabel}>Indirizzo</Text>
            <TextInput
              style={styles.input}
              placeholder="Via Roma 1, Milano"
              placeholderTextColor="#64748b"
              value={newAddress}
              onChangeText={setNewAddress}
            />
            <TouchableOpacity style={styles.createBtn} onPress={createProject}>
              <Text style={styles.createBtnText}>Crea Cantiere</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  title: { color: 'white', fontSize: 24, fontWeight: '800' },
  sub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#1e3a5f',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardName: { color: '#f1f5f9', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  cardAddress: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  cardMeta: { color: '#475569', fontSize: 12 },
  deleteBtn: { padding: 8 },
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cancelText: { color: '#64748b', fontSize: 16 },
  modalBody: { padding: 20, gap: 12 },
  inputLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    padding: 14, fontSize: 16, color: 'white',
  },
  createBtn: {
    backgroundColor: '#3b82f6', borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
