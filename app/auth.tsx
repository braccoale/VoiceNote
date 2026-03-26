import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { useRouter } from 'expo-router';
import { HardHat } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AuthScreen() {
  const { signInWithEmail } = useAuth();
  const { showError, showSuccess } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) {
      showError('Inserisci un indirizzo email valido');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim().toLowerCase());
    setLoading(false);
    if (error) {
      showError(`Errore: ${error}`);
    } else {
      setSent(true);
      showSuccess('Link di accesso inviato! Controlla la tua email.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <HardHat color="#f97316" size={48} />
          </View>
          <Text style={styles.appName}>
            Site<Text style={{ color: '#f97316' }}>Voice</Text>
          </Text>
          <Text style={styles.tagline}>Diario di Cantiere Vocale</Text>
        </View>

        {!sent ? (
          <View style={styles.form}>
            <Text style={styles.label}>Email di accesso</Text>
            <TextInput
              style={styles.input}
              placeholder="nome@esempio.it"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Invia Link di Accesso</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.hint}>
              Riceverai un link magico via email — nessuna password necessaria.
            </Text>
          </View>
        ) : (
          <View style={styles.sentBox}>
            <Text style={styles.sentTitle}>Email inviata!</Text>
            <Text style={styles.sentText}>
              Controlla la tua casella email e clicca il link per accedere.{'\n\n'}
              Puoi chiudere questa schermata.
            </Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setSent(false)}>
              <Text style={styles.btnSecondaryText}>Cambia email</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Continua senza account →</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#334155',
  },
  appName: { fontSize: 36, fontWeight: '800', color: 'white', letterSpacing: -1 },
  tagline: { color: '#64748b', fontSize: 14, marginTop: 4 },
  form: { gap: 12 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    fontSize: 16, color: 'white', borderWidth: 1, borderColor: '#334155',
  },
  btn: {
    backgroundColor: '#f97316', borderRadius: 14, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  hint: { color: '#475569', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  sentBox: { alignItems: 'center', gap: 12 },
  sentTitle: { color: '#22c55e', fontSize: 24, fontWeight: 'bold' },
  sentText: { color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
  btnSecondary: {
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 24, marginTop: 8,
  },
  btnSecondaryText: { color: '#94a3b8' },
  skipBtn: { alignItems: 'center', marginTop: 32 },
  skipText: { color: '#475569', fontSize: 14 },
});
