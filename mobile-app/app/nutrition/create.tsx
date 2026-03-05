import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNutrition } from '../../src/context/NutritionContext';
import { useAuth } from '../../src/context';
import { ChipGroup } from '../../src/components/features/ChipGroup';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const SEASONS = ['off_season', 'pre_season', 'in_season', 'post_season'];
const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'keto', 'paleo', 'halal', 'kosher'];

export default function CreateNutritionPlan() {
  const { generatePlan, createPlan } = useNutrition();
  const { profile } = useAuth();
  const [activityLevel, setActivityLevel] = useState<string[]>(['moderate']);
  const [season, setSeason] = useState<string[]>(['in_season']);
  const [dietary, setDietary] = useState<string[]>([]);
  const [locality, setLocality] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generatePlan({
        activityLevel: activityLevel[0],
        season: season[0],
        dietaryRestrictions: dietary,
        locality: locality || undefined,
        calorieTarget: calorieTarget ? parseInt(calorieTarget) : undefined,
        preferredUnits: profile?.units === 'metric' ? 'metric' : 'imperial',
      });
      router.back();
    } catch (error) {
      console.error('Failed to generate plan:', error);
      Alert.alert('Error', 'Failed to generate plan. Please try again.');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Nutrition Plan</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <ChipGroup label="Activity Level" options={ACTIVITY_LEVELS} selected={activityLevel} onToggle={(val) => setActivityLevel([val])} />
        </View>

        <View style={styles.card}>
          <ChipGroup label="Training Season" options={SEASONS} selected={season} onToggle={(val) => setSeason([val])} />
        </View>

        <View style={styles.card}>
          <ChipGroup label="Dietary Restrictions" options={DIETARY_OPTIONS} selected={dietary} onToggle={toggleDietary} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Food Locality</Text>
          <TextInput style={styles.textInput} value={locality} onChangeText={setLocality} placeholder="e.g. East African, Mediterranean" placeholderTextColor={colors.text.tertiary} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Calorie Target (optional)</Text>
          <TextInput style={styles.textInput} value={calorieTarget} onChangeText={setCalorieTarget} placeholder="e.g. 2500" placeholderTextColor={colors.text.tertiary} keyboardType="number-pad" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.text.secondary, fontWeight: '600', marginBottom: spacing.xs },
  textInput: { ...typography.body, color: colors.text.primary, backgroundColor: colors.background.secondary, borderRadius: borderRadius.md, padding: spacing.md },
  generateButton: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  generateText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  manualButton: { alignItems: 'center', padding: spacing.md },
  manualText: { ...typography.body, color: colors.text.secondary },
});
