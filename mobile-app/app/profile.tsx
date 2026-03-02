import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context';
import { colors } from '../src/theme';

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.displayName || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [dob, setDob] = useState(
    profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-US') : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const initial = useMemo(() => (name?.trim()?.charAt(0) || 'A').toUpperCase(), [name]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        displayName: name || null,
        gender: gender || null,
      });
      Alert.alert('Saved', 'Profile updated.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="profile.back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text testID="profile.header" style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.content}>
        <Text testID="profile.title" style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          Tell us about yourself to personalize the experience.
        </Text>

        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              testID="profile.name"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#666"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gender</Text>
            <TextInput
              testID="profile.gender"
              style={styles.input}
              value={gender}
              onChangeText={setGender}
              placeholder="Gender"
              placeholderTextColor="#666"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              testID="profile.dob"
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <TouchableOpacity
          testID="profile.save"
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 12,
  },
  subtitle: {
    marginTop: 8,
    color: colors.teal,
    fontSize: 16,
    lineHeight: 22,
  },
  avatarWrap: {
    alignItems: 'center',
    marginVertical: 36,
  },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 56,
    fontWeight: '700',
    color: '#777',
  },
  form: {
    gap: 8,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
    marginBottom: 14,
  },
  label: {
    color: '#FFF',
    fontSize: 18,
    marginBottom: 6,
  },
  input: {
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 4,
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  saveText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
