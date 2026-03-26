import * as ScreenOrientation from 'expo-screen-orientation';
import { X } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

interface Props {
  visible: boolean;
  onConfirm: (signature: string) => void;
  onClose: () => void;
}

export function SignatureModal({ visible, onConfirm, onClose }: Props) {
  const ref = useRef<any>(null);

  const handleClose = () => {
    ScreenOrientation.unlockAsync();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X color="black" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Firma</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => ref.current?.clearSignature()}
              style={[styles.btn, styles.btnRed]}
            >
              <Text style={styles.btnText}>Pulisci</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => ref.current?.readSignature()}
              style={[styles.btn, styles.btnGreen]}
            >
              <Text style={styles.btnText}>Conferma</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.canvas}>
          <SignatureCanvas
            ref={ref}
            onOK={(sig) => {
              ScreenOrientation.unlockAsync();
              onConfirm(sig);
            }}
            descriptionText="Firma qui"
            clearText="Pulisci"
            confirmText="Salva"
            webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f1f5f9',
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { padding: 8, borderRadius: 4 },
  btnRed: { backgroundColor: '#ef4444' },
  btnGreen: { backgroundColor: '#22c55e' },
  btnText: { color: 'white', fontWeight: '600' },
  canvas: { flex: 1, borderWidth: 1, borderColor: '#ddd', margin: 10 },
});
