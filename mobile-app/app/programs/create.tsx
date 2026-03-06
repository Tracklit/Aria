import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '../../src/context/ProgramsContext';
import { useAuth } from '../../src/context';
import { ChipGroup } from '../../src/components/features/ChipGroup';
import { impactMedium, notificationSuccess } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const CATEGORIES = ['sprint', 'endurance', 'strength', 'flexibility'];
const LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'];

export default function CreateProgramScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { createProgram, generateProgram } = usePrograms();
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string[]>(['sprint']);
  const [level, setLevel] = useState<string[]>(['intermediate']);
  const [duration, setDuration] = useState('4');
  const [isGenerating, setIsGenerating] = useState(false);
  const isAI = params.mode === 'ai';

  const handleCreate = async () => {
    if (!title.trim() && !isAI) return;
    impactMedium();
    setIsGenerating(true);
    try {
      if (isAI) {
        await generateProgram({
          title: title || undefined,
          category: category[0],
          level: level[0],
          durationWeeks: parseInt(duration) || 4,
          description: description || undefined,
          preferredUnits: profile?.units === 'metric' ? 'metric' : 'imperial',
        });
      } else {
        await createProgram({
          title,
          description,
          category: category[0],
          level: level[0],
          duration: parseInt(duration) || 4,
        });
      }
      notificationSuccess();
      router.back();
    } catch (error) {
      console.error('Failed to create program:', error);
      Alert.alert('Error', 'Failed to create program. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAI ? 'AI Program' : 'New Program'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{isAI ? 'Title (optional)' : 'Title'}</Text>
          <TextInput style={styles.textInput} value={title} onChangeText={setTitle} placeholder="Program name" placeholderTextColor={colors.text.tertiary} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{isAI ? 'What should the program focus on?' : 'Description'}</Text>
          <TextInput style={[styles.textInput, styles.textArea]} value={description} onChangeText={setDescription} placeholder={isAI ? 'e.g. 100m sprint preparation with block starts' : 'Optional description'} placeholderTextColor={colors.text.tertiary} multiline />
        </View>

        <View style={styles.card}>
          <ChipGroup label="Category" options={CATEGORIES} selected={category} onToggle={(val) => setCategory([val])} />
        </View>

        <View style={styles.card}>
          <ChipGroup label="Level" options={LEVELS} selected={level} onToggle={(val) => setLevel([val])} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Duration (weeks)</Text>
          <TextInput style={styles.textInput} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={isGenerating}>
          {isGenerating ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              {isAI && <Ionicons name="sparkles" size={20} color={colors.text.primary} />}
              <Text style={styles.createText}>{isAI ? 'Generate Program' : 'Create Program'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.text.secondary, fontWeight: '600', marginBottom: spacing.xs },
  textInput: { ...typography.body, color: colors.text.primary, backgroundColor: colors.background.secondary, borderRadius: borderRadius.md, padding: spacing.md },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  createButton: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  createText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
});
