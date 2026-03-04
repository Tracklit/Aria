import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context';
import { colors } from '../../src/theme';

type Sport = 'sprinting' | 'running' | 'track' | 'cycling' | 'swimming' | 'triathlon';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

const SPORT_OPTIONS: { label: string; value: Sport }[] = [
  { label: 'Sprint / Short Distance', value: 'sprinting' },
  { label: 'Track & Field', value: 'track' },
  { label: 'Cycling', value: 'cycling' },
  { label: 'Swimming', value: 'swimming' },
];

const LEVEL_OPTIONS: { label: string; value: ExperienceLevel }[] = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Elite', value: 'elite' },
];

const GOALS = ['Speed', 'Endurance', 'Weight Loss', 'First Race', 'PR', 'Recovery', 'General Fitness'];

export default function OnboardingStep1() {
  const { profile, user, updateProfile, completeOnboarding } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [sport, setSport] = useState<Sport>((profile?.sport as Sport) || 'sprinting');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    (profile?.experienceLevel as ExperienceLevel) || 'beginner'
  );
  const [goals, setGoals] = useState<string[]>(profile?.goalTags || ['Speed']);
  const [isSaving, setIsSaving] = useState(false);

  const toggleGoal = (goal: string) => {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  };

  const handleContinue = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        sport,
        experienceLevel,
        goalTags: goals,
      });
      await completeOnboarding();
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save onboarding');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Training</Text>
        </View>

        <View style={styles.avatarPlaceholder}>
          <Ionicons name="add" size={40} color={colors.primary} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            testID="onboarding.name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Alex Johnson"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="onboarding.email"
            value={user?.email || ''}
            editable={false}
            style={styles.input}
            placeholder="alex@email.com"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Sport</Text>
          <View style={styles.pillGroup}>
            {SPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                testID={`onboarding.sport.${option.value}`}
                key={option.value}
                style={[styles.pill, sport === option.value ? styles.pillSelected : null]}
                onPress={() => setSport(option.value)}
              >
                <Text style={[styles.pillText, sport === option.value ? styles.pillTextSelected : null]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Experience Level</Text>
          <View style={styles.pillGroup}>
            {LEVEL_OPTIONS.map((option) => (
              <TouchableOpacity
                testID={`onboarding.level.${option.value}`}
                key={option.value}
                style={[styles.pill, experienceLevel === option.value ? styles.pillSelected : null]}
                onPress={() => setExperienceLevel(option.value)}
              >
                <Text
                  style={[
                    styles.pillText,
                    experienceLevel === option.value ? styles.pillTextSelected : null,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Goals</Text>
          <View style={styles.pillGroup}>
            {GOALS.map((goal) => (
              <TouchableOpacity
                testID={`onboarding.goal.${goal.replace(/\s+/g, '_')}`}
                key={goal}
                style={[styles.pill, goals.includes(goal) ? styles.pillSelected : null]}
                onPress={() => toggleGoal(goal)}
              >
                <Text style={[styles.pillText, goals.includes(goal) ? styles.pillTextSelected : null]}>
                  {goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            testID="onboarding.continue"
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.connectText}>Connect Garmin, Apple Watch</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  title: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
  },
  avatarPlaceholder: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  formGroup: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  label: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    color: colors.text.primary,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillSelected: {
    backgroundColor: colors.chip.selected,
  },
  pillText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  pillTextSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: 6,
    paddingHorizontal: 24,
  },
  continueButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  continueButtonText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  connectText: {
    textAlign: 'center',
    color: colors.primary,
    marginTop: 16,
    fontSize: 14,
  },
});
