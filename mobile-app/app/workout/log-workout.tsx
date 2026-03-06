import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { impactLight, selectionChanged, notificationWarning, notificationSuccess } from '../../src/utils/haptics';
import { useThemedStyles, useColors, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { logSprintWorkout, completeWorkout } from '../../src/lib/api';

interface Exercise {
  name: string;
  repTimes: string[];
  notes: string;
}

const SESSION_START = new Date().toISOString();

export default function LogWorkoutScreen() {
  const { plannedWorkoutId, workoutTitle } = useLocalSearchParams<{
    plannedWorkoutId?: string;
    workoutTitle?: string;
  }>();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', repTimes: [''], notes: '' },
  ]);
  const [rpe, setRpe] = useState<number | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [savedSplits, setSavedSplits] = useState<
    Array<{ exerciseName: string; repTimes: number[]; best: number }>
  >([]);
  const scrollRef = useRef<ScrollView>(null);

  const updateExerciseName = useCallback((idx: number, name: string) => {
    setExercises((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      return next;
    });
  }, []);

  const updateRepTime = useCallback((exIdx: number, repIdx: number, value: string) => {
    // Allow only numbers and a single decimal point; convert commas to periods
    const cleaned = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const final = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setExercises((prev) => {
      const next = [...prev];
      const reps = [...next[exIdx].repTimes];
      reps[repIdx] = final;
      next[exIdx] = { ...next[exIdx], repTimes: reps };
      return next;
    });
  }, []);

  const addRep = useCallback((exIdx: number) => {
    impactLight();
    setExercises((prev) => {
      const next = [...prev];
      next[exIdx] = { ...next[exIdx], repTimes: [...next[exIdx].repTimes, ''] };
      return next;
    });
  }, []);

  const removeRep = useCallback((exIdx: number, repIdx: number) => {
    selectionChanged();
    setExercises((prev) => {
      const next = [...prev];
      const reps = next[exIdx].repTimes.filter((_, i) => i !== repIdx);
      next[exIdx] = { ...next[exIdx], repTimes: reps.length > 0 ? reps : [''] };
      return next;
    });
  }, []);

  const updateExerciseNotes = useCallback((idx: number, notes: string) => {
    setExercises((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], notes };
      return next;
    });
  }, []);

  const addExercise = useCallback(() => {
    impactLight();
    setExercises((prev) => [...prev, { name: '', repTimes: [''], notes: '' }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, []);

  const removeExercise = useCallback((idx: number) => {
    notificationWarning();
    setExercises((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }, []);

  const handleSave = async () => {
    // Validate: at least one exercise with a name and one valid time
    const validExercises = exercises.filter(
      (ex) => ex.name.trim() && ex.repTimes.some((t) => t.trim() && !isNaN(parseFloat(t)))
    );

    if (validExercises.length === 0) {
      Alert.alert('Missing Data', 'Add at least one exercise with a name and rep time.');
      return;
    }

    setSaving(true);
    const endTime = new Date();
    const durationSeconds = Math.round(
      (endTime.getTime() - new Date(SESSION_START).getTime()) / 1000
    );

    const splits = validExercises.map((ex) => {
      const repTimes = ex.repTimes
        .map((t) => parseFloat(t))
        .filter((n) => !isNaN(n) && n > 0);
      return {
        exerciseName: ex.name.trim(),
        repTimes,
        ...(ex.notes.trim() ? { notes: ex.notes.trim() } : {}),
      };
    });

    const noteParts: string[] = [];
    if (rpe !== null) noteParts.push(`RPE: ${rpe}/10`);
    if (sessionNotes.trim()) noteParts.push(sessionNotes.trim());
    const combinedNotes = noteParts.join(' | ') || undefined;

    try {
      await logSprintWorkout({
        title: workoutTitle || 'Sprint Session',
        startTime: SESSION_START,
        endTime: endTime.toISOString(),
        durationSeconds,
        notes: combinedNotes,
        splits,
      });

      // Complete the planned workout if linked
      if (plannedWorkoutId) {
        try {
          await completeWorkout(parseInt(plannedWorkoutId, 10), {});
        } catch {
          // Non-critical — the sprint log is already saved
        }
      }

      notificationSuccess();
      // Build summary data
      setSavedSplits(
        splits.map((s) => ({
          exerciseName: s.exerciseName,
          repTimes: s.repTimes,
          best: Math.min(...s.repTimes),
        }))
      );
      setShowSummary(true);
    } catch (error: any) {
      Alert.alert('Save Failed', error.message || 'Could not save workout. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const askAria = () => {
    const summary = savedSplits
      .map((s) => `${s.exerciseName}: ${s.repTimes.map((t) => `${t}s`).join(', ')}`)
      .join('; ');
    const prefill = `I just logged a sprint session. ${summary}. How did it go?`;
    router.replace({ pathname: '/(tabs)/chat', params: { prefill } });
  };

  // ───── Summary Modal ─────
  if (showSummary) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.summaryWrap}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.background.primary} />
          </View>
          <Text style={styles.summaryTitle}>Session Logged!</Text>

          {savedSplits.map((s, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryExName}>{s.exerciseName}</Text>
              <Text style={styles.summaryBest}>Best: {s.best.toFixed(2)}s</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={askAria}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text style={styles.secondaryBtnText}>Ask Aria</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ───── Main Form ─────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Workout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title + date */}
          <Text style={styles.screenTitle}>{workoutTitle || 'Sprint Session'}</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>

          {/* Exercise cards */}
          {exercises.map((ex, exIdx) => (
            <View key={exIdx} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <TextInput
                  style={styles.exerciseNameInput}
                  placeholder="Exercise name (e.g. 60m Sprints)"
                  placeholderTextColor={colors.text.tertiary}
                  value={ex.name}
                  onChangeText={(v) => updateExerciseName(exIdx, v)}
                  returnKeyType="next"
                />
                {exercises.length > 1 && (
                  <TouchableOpacity onPress={() => removeExercise(exIdx)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Rep times */}
              <View style={styles.repsRow}>
                {ex.repTimes.map((rep, repIdx) => (
                  <View key={repIdx} style={styles.repWrap}>
                    <TextInput
                      style={styles.repInput}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.text.tertiary}
                      value={rep}
                      onChangeText={(v) => updateRepTime(exIdx, repIdx, v)}
                      selectTextOnFocus
                    />
                    {ex.repTimes.length > 1 && (
                      <TouchableOpacity
                        style={styles.repRemove}
                        onPress={() => removeRep(exIdx, repIdx)}
                        hitSlop={4}
                      >
                        <Ionicons name="close" size={12} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addRepBtn} onPress={() => addRep(exIdx)}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addRepText}>Rep</Text>
                </TouchableOpacity>
              </View>

              {/* Exercise notes */}
              <TextInput
                style={styles.exerciseNotes}
                placeholder="Notes (e.g. Wind +1.2)"
                placeholderTextColor={colors.text.tertiary}
                value={ex.notes}
                onChangeText={(v) => updateExerciseNotes(exIdx, v)}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addExerciseBtn} onPress={addExercise}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>

          {/* RPE Selector */}
          <Text style={styles.sectionLabel}>How did it feel?</Text>
          <View style={styles.rpeRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.rpeCircle, rpe === n && styles.rpeSelected]}
                onPress={() => { selectionChanged(); setRpe(n === rpe ? null : n); }}
              >
                <Text style={[styles.rpeText, rpe === n && styles.rpeTextSelected]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.rpeLabels}>
            <Text style={styles.rpeLabelText}>Easy</Text>
            <Text style={styles.rpeLabelText}>Max Effort</Text>
          </View>

          {/* Session notes */}
          <Text style={styles.sectionLabel}>Session Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="How did the session go?"
            placeholderTextColor={colors.text.tertiary}
            value={sessionNotes}
            onChangeText={setSessionNotes}
            multiline
            textAlignVertical="top"
          />

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <Text style={styles.saveBtnText}>Save Workout</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },

  // ── Exercise Card ──
  exerciseCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    padding: 0,
    marginRight: spacing.sm,
  },
  repsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  repWrap: {
    position: 'relative',
  },
  repInput: {
    width: 65,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  repRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.background.cardSolid,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addRepText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseNotes: {
    fontSize: 14,
    color: colors.text.secondary,
    padding: 0,
  },

  // ── Add Exercise ──
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  addExerciseText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // ── RPE ──
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  rpeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rpeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeSelected: {
    backgroundColor: colors.primary,
  },
  rpeText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  rpeTextSelected: {
    color: colors.background.primary,
  },
  rpeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  rpeLabelText: {
    fontSize: 11,
    color: colors.text.tertiary,
  },

  // ── Notes ──
  notesInput: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: 15,
    minHeight: 80,
    marginBottom: spacing.lg,
  },

  // ── Save ──
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.background.primary,
    fontSize: 17,
    fontWeight: '700',
  },

  // ── Summary Modal ──
  summaryWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryExName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  summaryBest: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryBtnText: {
    color: colors.background.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
