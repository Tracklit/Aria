import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNutrition } from '../../src/context/NutritionContext';
import { useAuth } from '../../src/context';
import { useTheme } from '../../src/context/ThemeContext';
import { ChipGroup } from '../../src/components/features/ChipGroup';
import { impactLight, impactMedium, notificationSuccess } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const SEASONS = ['off_season', 'pre_season', 'in_season', 'post_season'];
const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'keto', 'paleo', 'halal', 'kosher'];
const MEALS_PER_DAY_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

function formatTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatTimeForAPI(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function createTimeDate(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export default function CreateNutritionPlan() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { effectiveTheme } = useTheme();
  const { generatePlan, createPlan } = useNutrition();
  const { profile } = useAuth();
  const [activityLevel, setActivityLevel] = useState<string[]>(['moderate']);
  const [season, setSeason] = useState<string[]>(['in_season']);
  const [dietary, setDietary] = useState<string[]>([]);
  const [locality, setLocality] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');

  // Schedule fields
  const [mealsPerDay, setMealsPerDay] = useState(5);
  const [wakeTime, setWakeTime] = useState(() => createTimeDate(6, 30));
  const [sleepTime, setSleepTime] = useState(() => createTimeDate(22, 0));
  const [lunchTime, setLunchTime] = useState(() => createTimeDate(12, 30));
  const [trainingTime, setTrainingTime] = useState(() => createTimeDate(16, 0));
  const [showSchedule, setShowSchedule] = useState(false);

  // Time picker visibility state
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);

  const handleTimeChange = useCallback((field: string, _event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setActiveTimePicker(null);
    if (!selectedDate) return;
    switch (field) {
      case 'wake': setWakeTime(selectedDate); break;
      case 'sleep': setSleepTime(selectedDate); break;
      case 'lunch': setLunchTime(selectedDate); break;
      case 'training': setTrainingTime(selectedDate); break;
    }
  }, []);

  const handleGenerate = async () => {
    impactMedium();
    setIsGenerating(true);
    try {
      await generatePlan({
        activityLevel: activityLevel[0],
        season: season[0],
        dietaryRestrictions: dietary,
        locality: locality || undefined,
        calorieTarget: calorieTarget ? parseInt(calorieTarget) : undefined,
        notes: notes || undefined,
        preferredUnits: profile?.units === 'metric' ? 'metric' : 'imperial',
        mealsPerDay,
        ...(showSchedule ? {
          wakeTime: formatTimeForAPI(wakeTime),
          sleepTime: formatTimeForAPI(sleepTime),
          lunchTime: formatTimeForAPI(lunchTime),
          trainingTime: formatTimeForAPI(trainingTime),
        } : {}),
      });
      notificationSuccess();
      router.back();
    } catch (error: any) {
      console.error('Failed to generate plan:', error);
      Alert.alert('Generation Failed', error?.message || 'Failed to generate plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualTitle.trim()) return;
    try {
      await createPlan({
        title: manualTitle,
        activityLevel: activityLevel[0],
        season: season[0],
        calorieTarget: calorieTarget ? parseInt(calorieTarget) : undefined,
        mealsPerDay,
        ...(showSchedule ? {
          wakeTime: formatTimeForAPI(wakeTime),
          sleepTime: formatTimeForAPI(sleepTime),
          lunchTime: formatTimeForAPI(lunchTime),
          trainingTime: formatTimeForAPI(trainingTime),
        } : {}),
      });
      router.back();
    } catch (error) {
      console.error('Failed to create plan:', error);
      Alert.alert('Error', 'Failed to create plan. Please try again.');
    }
  };

  const toggleDietary = (value: string) => {
    setDietary(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const renderTimePicker = (label: string, field: string, value: Date) => (
    <View style={styles.timePickerRow}>
      <Text style={styles.timeLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.timeButton}
        onPress={() => { impactLight(); setActiveTimePicker(activeTimePicker === field ? null : field); }}
      >
        <Ionicons name="time-outline" size={16} color={colors.primary} />
        <Text style={styles.timeButtonText}>{formatTimeForDisplay(value)}</Text>
      </TouchableOpacity>
      {activeTimePicker === field && (
        <>
          <DateTimePicker
            value={value}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => handleTimeChange(field, e, d)}
            themeVariant={effectiveTheme === 'dark' ? 'dark' : 'light'}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneButton} onPress={() => setActiveTimePicker(null)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Nutrition Plan</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <ChipGroup label="Activity Level" options={ACTIVITY_LEVELS} selected={activityLevel} onToggle={(val) => setActivityLevel([val])} />
        </View>

        <View style={styles.card}>
          <ChipGroup label="Training Season" options={SEASONS} selected={season} onToggle={(val) => setSeason([val])} />
        </View>

        <View style={styles.card}>
          <ChipGroup label="Dietary Restrictions" options={DIETARY_OPTIONS} selected={dietary} onToggle={toggleDietary} />
        </View>

        {/* Meals Per Day */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Meals Per Day</Text>
          <View style={styles.mealsRow}>
            {MEALS_PER_DAY_OPTIONS.map(n => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.mealsPill,
                  mealsPerDay === n && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                ]}
                onPress={() => { impactLight(); setMealsPerDay(n); }}
              >
                <Text style={[
                  styles.mealsPillText,
                  mealsPerDay === n && { color: colors.primary },
                ]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Schedule Toggle */}
        <TouchableOpacity
          style={styles.scheduleToggle}
          onPress={() => { impactLight(); setShowSchedule(!showSchedule); }}
        >
          <Ionicons name={showSchedule ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
          <Text style={styles.scheduleToggleText}>
            {showSchedule ? 'Hide Schedule' : 'Add Daily Schedule (optional)'}
          </Text>
        </TouchableOpacity>

        {/* Schedule Fields */}
        {showSchedule && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Daily Schedule</Text>
            <Text style={styles.scheduleHint}>
              Set your daily routine so AI can align meals with your schedule
            </Text>
            {renderTimePicker('Wake Time', 'wake', wakeTime)}
            {renderTimePicker('Lunch Time', 'lunch', lunchTime)}
            {renderTimePicker('Training Time', 'training', trainingTime)}
            {renderTimePicker('Sleep Time', 'sleep', sleepTime)}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Food Locality</Text>
          <TextInput style={styles.textInput} value={locality} onChangeText={setLocality} placeholder="e.g. East African, Mediterranean" placeholderTextColor={colors.text.tertiary} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Calorie Target (optional)</Text>
          <TextInput style={styles.textInput} value={calorieTarget} onChangeText={setCalorieTarget} placeholder="e.g. 2500" placeholderTextColor={colors.text.tertiary} keyboardType="number-pad" />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Additional Instructions (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. High protein breakfast, no dairy after lunch, include pre-workout snacks..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.generateButton} onPress={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color={colors.text.primary} />
              <Text style={styles.generateText}>Generate with AI</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.manualButton} onPress={() => setShowManual(!showManual)}>
          <Text style={styles.manualText}>Create Manually</Text>
        </TouchableOpacity>

        {showManual && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Plan Title</Text>
            <TextInput style={styles.textInput} value={manualTitle} onChangeText={setManualTitle} placeholder="My Nutrition Plan" placeholderTextColor={colors.text.tertiary} />
            <TouchableOpacity style={[styles.generateButton, { marginTop: spacing.md }]} onPress={handleManualCreate}>
              <Text style={styles.generateText}>Create Plan</Text>
            </TouchableOpacity>
          </View>
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
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.text.secondary, fontWeight: '600', marginBottom: spacing.xs },
  textInput: { ...typography.body, color: colors.text.primary, backgroundColor: colors.background.secondary, borderRadius: borderRadius.md, padding: spacing.md },
  textArea: { minHeight: 80, textAlignVertical: 'top' as const },
  generateButton: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  generateText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  manualButton: { alignItems: 'center', padding: spacing.md },
  manualText: { ...typography.body, color: colors.text.secondary },
  // Meals per day
  mealsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealsPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.background.secondary,
    minWidth: 44,
    alignItems: 'center',
  },
  mealsPillText: { ...typography.body, color: colors.text.secondary, fontWeight: '600' },
  // Schedule
  scheduleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  scheduleToggleText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  scheduleHint: { ...typography.caption, color: colors.text.tertiary, marginBottom: spacing.md },
  timePickerRow: { marginBottom: spacing.sm },
  timeLabel: { ...typography.caption, color: colors.text.secondary, fontWeight: '500', marginBottom: 4 },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  timeButtonText: { ...typography.body, color: colors.text.primary },
  doneButton: { alignSelf: 'flex-end', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  doneButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
