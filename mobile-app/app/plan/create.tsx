import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Input } from '../../src/components/ui';
import { useWorkout } from '../../src/context';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function CreatePlanScreen() {
  const router = useRouter();
  const { createLocalPlan } = useWorkout();

  const [planName, setPlanName] = useState('');
  const [targetEventName, setTargetEventName] = useState('');
  const [targetEventDate, setTargetEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTargetEventDate(selectedDate);
    }
  };

  const handleCreate = async () => {
    if (!planName.trim()) return;

    setIsLoading(true);
    try {
      await createLocalPlan({
        planName: planName.trim(),
        targetEventName: targetEventName.trim() || null,
        targetEventDate: targetEventDate?.toISOString() || null,
      });
      router.back();
    } catch (error) {
      console.error('Failed to create plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDate = targetEventDate
    ? targetEventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Plan</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Plan Details</Text>

          <Input
            label="Plan Name"
            placeholder="e.g., Spring Marathon Training"
            value={planName}
            onChangeText={setPlanName}
            autoCapitalize="words"
          />

          <Input
            label="Goal Event (optional)"
            placeholder="e.g., Half Marathon, 10K Race"
            value={targetEventName}
            onChangeText={setTargetEventName}
            autoCapitalize="words"
          />

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Target Date (optional)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.dateText, !targetEventDate && styles.datePlaceholder]}>
                {formattedDate || 'Select a date'}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={targetEventDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <Button
              title="Done"
              onPress={() => setShowDatePicker(false)}
              variant="text"
              style={styles.doneButton}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Create Plan"
            onPress={handleCreate}
            loading={isLoading}
            disabled={!planName.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  dateContainer: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    height: 50,
    gap: spacing.sm,
  },
  dateText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  datePlaceholder: {
    color: colors.text.tertiary,
  },
  doneButton: {
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
