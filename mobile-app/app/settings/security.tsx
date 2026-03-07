import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context';
import { changePassword } from '../../src/lib/api';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { ToastManager } from '../../src/components/Toast';
import { notificationSuccess, notificationError } from '../../src/utils/haptics';

export default function SecurityScreen() {
  const { user } = useAuth();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEmailUser = (user as any)?.authProvider === 'email' || !(user as any)?.authProvider;

  if (!isEmailUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.socialNotice}>
          <Ionicons name="information-circle-outline" size={24} color={colors.text.secondary} />
          <Text style={styles.socialNoticeText}>
            Password management is not available for accounts signed in with Apple or Google.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSave = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSave = async () => {
    if (!canSave) return;

    if (newPassword !== confirmPassword) {
      ToastManager.error('Passwords do not match');
      notificationError();
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      notificationSuccess();
      ToastManager.success('Password changed successfully');
      router.back();
    } catch (error: any) {
      notificationError();
      const message = error?.message || 'Failed to change password';
      ToastManager.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving || !canSave}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, (!canSave) && { opacity: 0.4 }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>CHANGE PASSWORD</Text>

          <View style={styles.group}>
            {/* Current Password */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeButton}>
                  <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* New Password */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeButton}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Confirm Password */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.requirementsText}>Password must be at least 8 characters</Text>

          {newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <Text style={styles.errorText}>Passwords do not match</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  saveText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionHeader: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  group: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  inputRow: {
    padding: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    padding: 0,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background.secondary,
    marginLeft: spacing.md,
  },
  requirementsText: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: '#FF3B30',
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  socialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  socialNoticeText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
});
