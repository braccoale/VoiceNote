import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_COLORS: Record<ToastType, string> = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
  warning: '#f97316',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onDismiss);
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity, borderLeftColor: TOAST_COLORS[toast.type] }]}>
      <Text style={styles.toastText} numberOfLines={3}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const showError = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const showSuccess = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    paddingRight: 36,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    color: '#f1f5f9',
    fontSize: 14,
    lineHeight: 20,
  },
  dismiss: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  dismissText: {
    color: '#64748b',
    fontSize: 12,
  },
});
