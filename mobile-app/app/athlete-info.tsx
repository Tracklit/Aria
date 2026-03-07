import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context';
import { ChipGroup } from '../src/components/features/ChipGroup';
import { selectionChanged } from '../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../src/theme';
import { ThemeColors } from '../src/theme/colors';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'keto', 'paleo', 'halal', 'kosher', 'none'];
const SLEEP_QUALITY_OPTIONS = ['poor', 'fair', 'good', 'excellent'];
const MOOD_OPTIONS = ['great', 'good', 'okay', 'tired', 'stressed'];
const TRAINING_DAYS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];
const INJURY_STATUS_OPTIONS = ['healthy', 'minor', 'recovering', 'injured'];
const TRAINING_FOCUS_OPTIONS = ['speed', 'endurance', 'strength', 'power', 'flexibility', 'recovery'];
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

function formatForInput(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toString();
}

export default function AthleteInfoScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { profile, updateProfile } = useAuth();
  const units: 'imperial' | 'metric' = profile?.units === 'metric' ? 'metric' : 'imperial';
  const isImperial = units === 'imperial';

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [activityLevel, setActivityLevel] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [injuryHistory, setInjuryHistory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Wellness fields
  const [averageSleepHours, setAverageSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<string[]>([]);
  const [currentMood, setCurrentMood] = useState<string[]>([]);

  // Training fields
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<string[]>([]);
  const [injuryStatus, setInjuryStatus] = useState<string[]>([]);
  const [trainingFocus, setTrainingFocus] = useState<string[]>([]);

  useEffect(() => {
    const heightValue = typeof profile?.height === 'number'
      ? (isImperial ? profile.height / CM_PER_INCH : profile.height)
      : null;
    const weightValue = typeof profile?.weight === 'number'
      ? (isImperial ? profile.weight / KG_PER_LB : profile.weight)
      : null;

    setHeight(heightValue !== null ? formatForInput(heightValue) : '');
    setWeight(weightValue !== null ? formatForInput(weightValue) : '');
    setBodyFat(typeof profile?.bodyFatPercentage === 'number' ? formatForInput(profile.bodyFatPercentage) : '');
    setActivityLevel(profile?.activityLevel ? [profile.activityLevel] : []);
    setDietaryRestrictions(profile?.dietaryRestrictions || []);
    setInjuryHistory(profile?.injuryHistory || '');

    // Wellness
    setAverageSleepHours(
      typeof (profile as any)?.averageSleepHours === 'number'
        ? String((profile as any).averageSleepHours)
        : ''
    );
    setSleepQuality((profile as any)?.sleepQuality ? [(profile as any).sleepQuality] : []);
    setCurrentMood((profile as any)?.currentMood ? [(profile as any).currentMood] : []);

    // Training
    setTrainingDaysPerWeek(
      typeof (profile as any)?.trainingDaysPerWeek === 'number'
        ? [String((profile as any).trainingDaysPerWeek)]
        : []
    );
    setInjuryStatus((profile as any)?.injuryStatus ? [(profile as any).injuryStatus] : []);
    setTrainingFocus((profile as any)?.trainingFocus || []);
  }, [profile, isImperial]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedHeight = height ? parseFloat(height) : null;
      const parsedWeight = weight ? parseFloat(weight) : null;
      const parsedBodyFat = bodyFat ? parseFloat(bodyFat) : null;
      const parsedSleepHours = averageSleepHours ? parseFloat(averageSleepHours) : null;

      await updateProfile({
        height: parsedHeight !== null && Number.isFinite(parsedHeight)
          ? (isImperial ? parsedHeight * CM_PER_INCH : parsedHeight)
          : null,
        weight: parsedWeight !== null && Number.isFinite(parsedWeight)
          ? (isImperial ? parsedWeight * KG_PER_LB : parsedWeight)
          : null,
        bodyFatPercentage: parsedBodyFat !== null && Number.isFinite(parsedBodyFat) ? parsedBodyFat : null,
        activityLevel: activityLevel[0] || null,
        dietaryRestrictions,
        injuryHistory: injuryHistory || null,
        // Wellness fields
        averageSleepHours: parsedSleepHours !== null && Number.isFinite(parsedSleepHours) ? parsedSleepHours : null,
        sleepQuality: sleepQuality[0] || null,
        currentMood: currentMood[0] || null,
        // Training fields
        trainingDaysPerWeek: trainingDaysPerWeek[0] ? parseInt(trainingDaysPerWeek[0], 10) : null,
        injuryStatus: injuryStatus[0] || null,
        trainingFocus: trainingFocus.length > 0 ? trainingFocus : null,
      } as any);
      router.back();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDietary = (value: string) => {
    selectionChanged();
    if (value === 'none') {
      setDietaryRestrictions(['none']);
    } else {
      setDietaryRestrictions(prev => {
        const filtered = prev.filter(v => v !== 'none');
        return filtered.includes(value) ? filtered.filter(v => v !== value) : [...filtered, value];
      });
    }
  };

  const toggleTrainingFocus = (value: string) => {
    selectionChanged();
    setTrainingFocus(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const heightUnitLabel = isImperial ? 'in' : 'cm';
  const weightUnitLabel = isImperial ? 'lb' : 'kg';
  const heightPlaceholder = isImperial ? 'e.g. 70' : 'e.g. 180';
  const weightPlaceholder = isImperial ? 'e.g. 165' : 'e.g. 75';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Athlete Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text style={[styles.saveText, isSaving && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Physical Section */}
        <Text style={styles.sectionTitle}>PHYSICAL</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Height</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder={heightPlaceholder}
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>{heightUnitLabel}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Weight</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder={weightPlaceholder}
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>{weightUnitLabel}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Body Fat %</Text>
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="e.g. 15"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Wellness Section */}
        <Text style={styles.sectionTitle}>WELLNESS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Avg Sleep Hours</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={averageSleepHours}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  if (text === '' || (num >= 0 && num <= 12)) {
                    setAverageSleepHours(text);
                  }
                }}
                placeholder="e.g. 7.5"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.unitLabel}>hrs</Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ChipGroup
              label="Sleep Quality"
              options={SLEEP_QUALITY_OPTIONS}
              selected={sleepQuality}
              onToggle={(val) => { selectionChanged(); setSleepQuality([val]); }}
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ChipGroup
              label="Current Mood"
              options={MOOD_OPTIONS}
              selected={currentMood}
              onToggle={(val) => { selectionChanged(); setCurrentMood([val]); }}
            />
          </View>
        </View>

        {/* Training Section */}
        <Text style={styles.sectionTitle}>TRAINING</Text>
        <View style={styles.card}>
          <ChipGroup
            label="Training Days Per Week"
            options={TRAINING_DAYS_OPTIONS}
            selected={trainingDaysPerWeek}
            onToggle={(val) => { selectionChanged(); setTrainingDaysPerWeek([val]); }}
          />
          <View style={{ marginTop: spacing.md }}>
            <ChipGroup
              label="Injury Status"
              options={INJURY_STATUS_OPTIONS}
              selected={injuryStatus}
              onToggle={(val) => { selectionChanged(); setInjuryStatus([val]); }}
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ChipGroup
              label="Training Focus"
              options={TRAINING_FOCUS_OPTIONS}
              selected={trainingFocus}
              onToggle={toggleTrainingFocus}
            />
          </View>
        </View>

        {/* Athletic Section */}
        <Text style={styles.sectionTitle}>ATHLETIC</Text>
        <View style={styles.card}>
          <ChipGroup
            label="Activity Level"
            options={ACTIVITY_LEVELS}
            selected={activityLevel}
            onToggle={(val) => setActivityLevel([val])}
          />
        </View>

        {/* Nutrition Section */}
        <Text style={styles.sectionTitle}>NUTRITION</Text>
        <View style={styles.card}>
          <ChipGroup
            label="Dietary Restrictions"
            options={DIETARY_OPTIONS}
            selected={dietaryRestrictions}
            onToggle={toggleDietary}
          />
        </View>

        {/* Medical Section */}
        <Text style={styles.sectionTitle}>MEDICAL</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Injury History</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={injuryHistory}
            onChangeText={setInjuryHistory}
            placeholder="List any current or past injuries..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
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
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  sectionTitle: { ...typography.caption, color: colors.text.secondary, fontWeight: '600', letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: colors.background.secondary },
  label: { ...typography.body, color: colors.text.primary },
  value: { ...typography.body, color: colors.text.secondary },
  input: { ...typography.body, color: colors.text.primary, textAlign: 'right', minWidth: 60 },
  inputRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  unitLabel: { ...typography.caption, color: colors.text.secondary, marginLeft: spacing.xs },
  fieldLabel: { ...typography.caption, color: colors.text.secondary, fontWeight: '600', marginBottom: spacing.xs },
  textInput: { ...typography.body, color: colors.text.primary, backgroundColor: colors.background.secondary, borderRadius: borderRadius.md, padding: spacing.md },
  textArea: { minHeight: 100 },
});
