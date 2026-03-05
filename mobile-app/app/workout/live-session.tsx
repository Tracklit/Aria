import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../src/context/SessionContext';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function LiveSessionScreen() {
  const {
    activeSession,
    elapsedTime,
    restTimeRemaining,
    pauseSession,
    resumeSession,
    completeSet,
    nextExercise,
    previousExercise,
    skipRest,
    updateExerciseValues,
    finishSession,
  } = useSession();
  const insets = useSafeAreaInsets();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSets, setEditSets] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRest, setEditRest] = useState('');

  const openEditModal = () => {
    if (!activeSession) return;
    const ex = activeSession.exercises[activeSession.currentExerciseIndex];
    setEditSets(String(ex.actualSets ?? ex.sets ?? ''));
    setEditReps(String(ex.actualReps ?? ex.reps ?? ''));
    setEditRest(String(ex.actualRest ?? ex.rest ?? ''));
    setEditModalVisible(true);
  };

  const saveEditValues = () => {
    if (!activeSession) return;
    const values: { sets?: number; reps?: number | string; rest?: number } = {};
    const setsNum = parseInt(editSets, 10);
    if (!isNaN(setsNum) && setsNum > 0) values.sets = setsNum;
    if (editReps.trim()) {
      const repsNum = parseInt(editReps, 10);
      values.reps = isNaN(repsNum) ? editReps.trim() : repsNum;
    }
    const restNum = parseInt(editRest, 10);
    if (!isNaN(restNum) && restNum >= 0) values.rest = restNum;
    updateExerciseValues(activeSession.currentExerciseIndex, values);
    setEditModalVisible(false);
  };

  const handleFinish = () => {
    Alert.alert('Finish Workout', 'Are you sure you want to finish this workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Finish', style: 'destructive', onPress: finishSession },
    ]);
  };

  const summary = useMemo(() => {
    if (!activeSession) return null;
    const totalExercises = activeSession.exercises.length;
    const completedExercises = activeSession.exercises.filter(ex =>
      ex.completedSets.every(Boolean)
    ).length;
    const totalSets = activeSession.exercises.reduce((sum, ex) => sum + ex.completedSets.length, 0);
    const completedSets = activeSession.exercises.reduce(
      (sum, ex) => sum + ex.completedSets.filter(Boolean).length,
      0
    );
    return { totalExercises, completedExercises, totalSets, completedSets };
  }, [activeSession]);

  if (!activeSession) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active session</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentExercise = activeSession.exercises[activeSession.currentExerciseIndex];
  const progressPercent =
    ((activeSession.currentExerciseIndex + 1) / activeSession.exercises.length) * 100;
  const isLastExercise =
    activeSession.currentExerciseIndex === activeSession.exercises.length - 1;
  const allCurrentSetsDone = currentExercise.completedSets.every(Boolean);

  // Finish summary modal
  if (activeSession.isComplete) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-circle" size={64} color={colors.green} />
              <Text style={styles.summaryTitle}>Workout Complete!</Text>
              <Text style={styles.summarySession}>{activeSession.sessionTitle}</Text>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatValue}>{formatTime(elapsedTime)}</Text>
                  <Text style={styles.summaryStatLabel}>Total Time</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatValue}>
                    {summary?.completedExercises}/{summary?.totalExercises}
                  </Text>
                  <Text style={styles.summaryStatLabel}>Exercises</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatValue}>
                    {summary?.completedSets}/{summary?.totalSets}
                  </Text>
                  <Text style={styles.summaryStatLabel}>Sets</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.programName} numberOfLines={1}>
          {activeSession.programTitle}
        </Text>
        <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
        <TouchableOpacity
          onPress={activeSession.isPaused ? resumeSession : pauseSession}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={activeSession.isPaused ? 'play-circle' : 'pause-circle'}
            size={32}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          Exercise {activeSession.currentExerciseIndex + 1} of{' '}
          {activeSession.exercises.length}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Main content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current exercise card */}
        <View style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>

          <TouchableOpacity style={styles.targetRow} onPress={openEditModal} activeOpacity={0.7}>
            {(currentExercise.actualSets ?? currentExercise.sets) && (currentExercise.actualReps ?? currentExercise.reps) ? (
              <View style={styles.targetBadge}>
                <Ionicons name="fitness-outline" size={16} color={colors.teal} />
                <Text style={styles.targetText}>
                  {currentExercise.actualSets ?? currentExercise.sets} x {currentExercise.actualReps ?? currentExercise.reps}
                </Text>
              </View>
            ) : null}
            {(currentExercise.actualRest ?? currentExercise.rest) ? (
              <View style={styles.targetBadge}>
                <Ionicons name="timer-outline" size={16} color={colors.orange} />
                <Text style={styles.targetText}>{currentExercise.actualRest ?? currentExercise.rest}s rest</Text>
              </View>
            ) : null}
            <Ionicons name="pencil-outline" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Set circles */}
          <View style={styles.setsSection}>
            <Text style={styles.setsLabel}>Sets</Text>
            <View style={styles.setsRow}>
              {currentExercise.completedSets.map((done, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.setCircle, done && styles.setCircleDone]}
                  onPress={() =>
                    completeSet(activeSession.currentExerciseIndex, idx)
                  }
                >
                  {done ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : (
                    <Text style={styles.setCircleText}>{idx + 1}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {allCurrentSetsDone && (
            <View style={styles.allDoneBanner}>
              <Ionicons name="checkmark-done" size={20} color={colors.green} />
              <Text style={styles.allDoneText}>All sets complete!</Text>
            </View>
          )}
        </View>

        {/* Exercise list preview */}
        <View style={styles.exerciseList}>
          <Text style={styles.exerciseListTitle}>All Exercises</Text>
          {activeSession.exercises.map((ex, idx) => {
            const isCurrent = idx === activeSession.currentExerciseIndex;
            const isDone = ex.completedSets.every(Boolean);
            return (
              <View
                key={idx}
                style={[
                  styles.exerciseListItem,
                  isCurrent && styles.exerciseListItemCurrent,
                ]}
              >
                <View style={styles.exerciseListLeft}>
                  {isDone ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                  ) : isCurrent ? (
                    <Ionicons name="radio-button-on" size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={colors.text.tertiary} />
                  )}
                  <Text
                    style={[
                      styles.exerciseListName,
                      isDone && styles.exerciseListNameDone,
                    ]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                </View>
                {(ex.actualSets ?? ex.sets) && (ex.actualReps ?? ex.reps) ? (
                  <Text style={styles.exerciseListDetail}>
                    {ex.actualSets ?? ex.sets}x{ex.actualReps ?? ex.reps}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit exercise values modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Edit Exercise</Text>

            <View style={styles.editFieldRow}>
              <Text style={styles.editFieldLabel}>Sets</Text>
              <TextInput
                style={styles.editFieldInput}
                value={editSets}
                onChangeText={setEditSets}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.editFieldRow}>
              <Text style={styles.editFieldLabel}>Reps</Text>
              <TextInput
                style={styles.editFieldInput}
                value={editReps}
                onChangeText={setEditReps}
                keyboardType="default"
                placeholder="—"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.editFieldRow}>
              <Text style={styles.editFieldLabel}>Rest (sec)</Text>
              <TextInput
                style={styles.editFieldInput}
                value={editRest}
                onChangeText={setEditRest}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.editCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={saveEditValues}>
                <Text style={styles.editSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rest timer overlay */}
      {restTimeRemaining !== null && (
        <View style={styles.restOverlay}>
          <TouchableOpacity style={styles.restCloseBtn} onPress={skipRest} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.restContent}>
            <Text style={styles.restLabel}>Rest</Text>
            <Text style={styles.restCountdown}>{restTimeRemaining}s</Text>
            <View style={styles.restProgressBg}>
              <View
                style={[
                  styles.restProgressFill,
                  {
                    width: `${
                      (currentExercise.actualRest ?? currentExercise.rest)
                        ? (restTimeRemaining / (currentExercise.actualRest ?? currentExercise.rest!)) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={skipRest}>
              <Text style={styles.skipBtnText}>Skip Rest</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom navigation */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={[styles.navBtn, activeSession.currentExerciseIndex === 0 && styles.navBtnDisabled]}
          onPress={previousExercise}
          disabled={activeSession.currentExerciseIndex === 0}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          <Text style={styles.navBtnText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishBtn}
          onPress={handleFinish}
        >
          <Ionicons name="flag" size={18} color="#fff" />
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>

        {!isLastExercise ? (
          <TouchableOpacity style={styles.navBtn} onPress={nextExercise}>
            <Text style={styles.navBtnText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.navBtn, styles.navBtnDisabled]}>
            <Text style={styles.navBtnText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { ...typography.body, color: colors.text.secondary },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  backBtnText: { ...typography.bodyBold, color: '#fff' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  programName: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  timer: {
    ...typography.h3,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    marginHorizontal: spacing.md,
  },

  // Progress
  progressSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  progressText: { ...typography.caption, color: colors.text.tertiary, marginBottom: spacing.xs },
  progressBarBg: {
    height: 3,
    backgroundColor: colors.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.teal,
    borderRadius: 2,
  },

  // Content
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.lg },

  // Exercise card
  exerciseCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseName: {
    ...typography.h2,
    color: colors.text.primary,
  },
  targetRow: { flexDirection: 'row', gap: spacing.sm },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  targetText: { ...typography.caption, color: colors.text.secondary },

  // Sets
  setsSection: { gap: spacing.sm },
  setsLabel: { ...typography.captionBold, color: colors.text.tertiary, textTransform: 'uppercase' },
  setsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  setCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setCircleDone: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  setCircleText: { ...typography.bodyBold, color: colors.text.tertiary },

  // All done banner
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(50, 215, 75, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  allDoneText: { ...typography.bodyBold, color: colors.green },

  // Exercise list
  exerciseList: { gap: spacing.xs },
  exerciseListTitle: { ...typography.captionBold, color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: spacing.xs },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  exerciseListItemCurrent: {
    backgroundColor: colors.background.cardSolid,
  },
  exerciseListLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  exerciseListName: { ...typography.body, color: colors.text.primary, flex: 1 },
  exerciseListNameDone: { color: colors.text.tertiary },
  exerciseListDetail: { ...typography.caption, color: colors.text.tertiary },

  // Rest overlay
  restOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  restContent: { alignItems: 'center', gap: spacing.lg },
  restLabel: { ...typography.body, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 2 },
  restCountdown: { fontSize: 72, fontWeight: '700', color: colors.teal, fontVariant: ['tabular-nums'] },
  restProgressBg: {
    width: SCREEN_WIDTH * 0.6,
    height: 4,
    backgroundColor: colors.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  restProgressFill: {
    height: '100%',
    backgroundColor: colors.teal,
    borderRadius: 2,
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: colors.text.tertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  skipBtnText: { ...typography.bodyBold, color: colors.text.primary },
  restCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { ...typography.body, color: colors.text.primary },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  finishBtnText: { ...typography.bodyBold, color: '#fff' },

  // Edit modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  editModalCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    gap: spacing.md,
  },
  editModalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  editFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editFieldLabel: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  editFieldInput: {
    ...typography.bodyBold,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: 100,
    textAlign: 'center',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.text.tertiary,
    alignItems: 'center',
  },
  editCancelBtnText: { ...typography.body, color: colors.text.secondary },
  editSaveBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
  },
  editSaveBtnText: { ...typography.bodyBold, color: '#fff' },

  // Summary modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  summaryTitle: { ...typography.h2, color: colors.text.primary },
  summarySession: { ...typography.body, color: colors.text.secondary },
  summaryStats: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  summaryStatItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  summaryStatValue: { ...typography.h3, color: colors.teal },
  summaryStatLabel: { ...typography.caption, color: colors.text.tertiary },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.background.secondary },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: { ...typography.bodyBold, color: '#fff' },
});
