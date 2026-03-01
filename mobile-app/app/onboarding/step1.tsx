import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Chip } from '../../src/components/ui';
import { useAuth } from '../../src/context';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

type Sport = 'running' | 'track' | 'cycling' | 'swimming' | 'triathlon';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export default function OnboardingStep1() {
  const router = useRouter();
  const { profile, updateProfile, completeOnboarding, isLoading } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [selectedSport, setSelectedSport] = useState<Sport>(
    (profile?.sport as Sport) || 'running'
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    (profile?.experienceLevel as ExperienceLevel) || 'beginner'
  );
  const [selectedGoals, setSelectedGoals] = useState<string[]>(profile?.goalTags || []);
  const [isSaving, setIsSaving] = useState(false);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
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
        sport: selectedSport,
        experienceLevel,
        goalTags: selectedGoals,
      });
      await completeOnboarding();
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const sports: { value: Sport; label: string }[] = [
    { value: 'running', label: 'Running' },
    { value: 'track', label: 'Track & Field' },
    { value: 'cycling', label: 'Cycling' },
    { value: 'swimming', label: 'Swimming' },
    { value: 'triathlon', label: 'Triathlon' },
  ];

  const levels: { value: ExperienceLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'elite', label: 'Elite' },
  ];

  const goals = [
    'Speed',
    'Endurance',
    'Weight Loss',
    'First Race',
    'PR',
    'Recovery',
    'General Fitness',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.step}>Complete Your Profile</Text>
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>
          This helps Aria personalize your training experience
        </Text>

        {/* Avatar Upload Button */}
        <TouchableOpacity style={styles.avatarButton}>
          <View style={styles.avatarRing}>
            {profile?.photoUrl ? (
              <View style={styles.avatarImage}>
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
            ) : (
              <Ionicons name="camera" size={32} color={colors.primary} />
            )}
          </View>
          <Text style={styles.avatarLabel}>Add Photo</Text>
        </TouchableOpacity>

        {/* Name Input */}
        <Input
          label="Your Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your name"
        />

        {/* Sport Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Primary Sport</Text>
          <View style={styles.chipRow}>
            {sports.map((sport) => (
              <Chip
                key={sport.value}
                label={sport.label}
                selected={selectedSport === sport.value}
                onPress={() => setSelectedSport(sport.value)}
              />
            ))}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text style={styles.label}>Experience Level</Text>
          <View style={styles.chipRow}>
            {levels.map((level) => (
              <Chip
                key={level.value}
                label={level.label}
                selected={experienceLevel === level.value}
                onPress={() => setExperienceLevel(level.value)}
              />
            ))}
          </View>
        </View>

        {/* Goals Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Training Goals (select all that apply)</Text>
          <View style={styles.chipRow}>
            {goals.map((goal) => (
              <Chip
                key={goal}
                label={goal}
                selected={selectedGoals.includes(goal)}
                onPress={() => toggleGoal(goal)}
              />
            ))}
          </View>
        </View>

        {/* Continue Button */}
        {isSaving ? (
          <View style={[styles.button, styles.loadingButton]}>
            <ActivityIndicator color={colors.text.primary} />
          </View>
        ) : (
          <Button
            title="Get Started"
            onPress={handleContinue}
            style={styles.button}
          />
        )}

        {/* Secondary Link */}
        <Button
          title="Connect Devices (Garmin, Apple Watch)"
          variant="text"
          onPress={() => Alert.alert('Coming Soon', 'Device integration will be available soon')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  step: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  avatarButton: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.h1,
    color: colors.text.primary,
    fontSize: 36,
  },
  avatarLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  button: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  loadingButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
