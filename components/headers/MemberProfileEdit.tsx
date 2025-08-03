import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from 'expo-router';

type Props = {
  onSave: () => void;
  disabled?: boolean;
};

export default function MemberProfileEditHeader({ onSave, disabled }: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Edit Profile</Text>

      <TouchableOpacity onPress={onSave} disabled={disabled}>
        <Text style={[styles.saveText, disabled && styles.disabledSave]}>
          Save
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveText: {
    color: '#8427d9',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledSave: {
    color: '#ccc',
  },
});
