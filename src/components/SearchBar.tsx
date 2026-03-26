import { Search, X } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Cerca nei report...' }: Props) {
  return (
    <View style={styles.container}>
      <Search color="#64748b" size={18} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} style={styles.clear}>
          <X color="#64748b" size={16} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    height: 44,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, color: 'white', fontSize: 15 },
  clear: { padding: 4 },
});
