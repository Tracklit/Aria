import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../src/context';
import { useTheme } from '../src/context/ThemeContext';
import { impactLight, notificationSuccess } from '../src/utils/haptics';
import { useThemedStyles, useColors, spacing, borderRadius } from '../src/theme';
import { ThemeColors } from '../src/theme/colors';

export default function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { effectiveTheme } = useTheme();
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.displayName || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    profile?.dateOfBirth ? new Date(profile.dateOfBirth) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initial = useMemo(() => (name?.trim()?.charAt(0) || 'A').toUpperCase(), [name]);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        displayName: name || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
      });
      notificationSuccess();
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
          <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
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
              placeholderTextColor={colors.text.tertiary}
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
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              testID="profile.dob"
              onPress={() => { impactLight(); setShowDatePicker(true); }}
              style={styles.dobButton}
            >
              <Text style={[styles.dobText, !dateOfBirth && styles.dobPlaceholder]}>
                {dateOfBirth ? formatDate(dateOfBirth) : 'MM/DD/YYYY'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Date of Birth</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.modalDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dateOfBirth || new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1930, 0, 1)}
                  themeVariant={effectiveTheme === 'dark' ? 'dark' : 'light'}
                />
              </View>
            </View>
          </Modal>
        ) : (
          showDatePicker && (
            <DateTimePicker
              value={dateOfBirth || new Date(2000, 0, 1)}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1930, 0, 1)}
            />
          )
        )}

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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    color: colors.text.primary,
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
    color: colors.text.secondary,
  },
  form: {
    gap: 8,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
    paddingBottom: 10,
    marginBottom: 14,
  },
  label: {
    color: colors.text.primary,
    fontSize: 18,
    marginBottom: 6,
  },
  input: {
    color: colors.text.primary,
    fontSize: 16,
    paddingVertical: 4,
  },
  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dobText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  dobPlaceholder: {
    color: colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.background.cardSolid,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  modalCancel: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalDone: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  saveText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
});
