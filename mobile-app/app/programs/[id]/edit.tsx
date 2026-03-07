import React, { useReducer, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Switch, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../../src/context';
import { usePrograms } from '../../../src/context/ProgramsContext';
import { getProgram } from '../../../src/lib/api';
import { impactLight, selectionChanged, notificationSuccess } from '../../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../../src/theme';
import { ThemeColors } from '../../../src/theme/colors';
import { getDayLabel } from '../../../src/utils/formatting';
import { buildProgramEditorState, normalizeProgramSessions } from '../../../src/utils/programSessions';
import type {
  HydratedProgramExercise,
  HydratedProgramSession,
} from '../../../src/utils/programSessions';

type RestUnit = 'seconds' | 'minutes';
type WeekMode = 'repeat' | 'custom';

interface ExerciseDraft extends HydratedProgramExercise {
  restUnit: RestUnit;
}

interface SessionDraft extends Omit<HydratedProgramSession, 'exercises'> {
  exercises: ExerciseDraft[];
}

interface EditorState {
  sessions: SessionDraft[];
  weeks: number;
  isDirty: boolean;
}

type EditorAction =
  | { type: 'INIT'; sessions: SessionDraft[]; weeks: number }
  | { type: 'ADD_WEEKS'; count: number }
  | { type: 'REMOVE_WEEKS'; count: number }
  | { type: 'UPDATE_SESSION'; dayNumber: number; data: Partial<SessionDraft> }
  | { type: 'TOGGLE_REST_DAY'; dayNumber: number }
  | { type: 'ADD_EXERCISE'; dayNumber: number }
  | { type: 'UPDATE_EXERCISE'; dayNumber: number; exerciseIdx: number; data: Partial<ExerciseDraft> }
  | { type: 'UPDATE_EXERCISE_REST_UNIT'; dayNumber: number; exerciseIdx: number; restUnit: RestUnit }
  | { type: 'REMOVE_EXERCISE'; dayNumber: number; exerciseIdx: number };

function inferRestUnit(rest?: number): RestUnit {
  if (!rest) return 'seconds';
  return rest >= 60 && rest % 60 === 0 ? 'minutes' : 'seconds';
}

function toRestInputValue(rest: number | undefined, restUnit: RestUnit): string {
  if (rest === undefined) return '';
  return restUnit === 'minutes' ? String(rest / 60) : String(rest);
}

function toStoredRestValue(value: string, restUnit: RestUnit): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  const seconds = restUnit === 'minutes' ? parsed * 60 : parsed;
  return Math.round(seconds);
}

function toExerciseDraft(exercise: HydratedProgramExercise): ExerciseDraft {
  return {
    ...exercise,
    restUnit: inferRestUnit(exercise.rest),
  };
}

function toSessionDraft(session: HydratedProgramSession): SessionDraft {
  return {
    ...session,
    exercises: session.exercises.map(toExerciseDraft),
  };
}

function cloneExerciseDraft(exercise: ExerciseDraft): ExerciseDraft {
  return { ...exercise };
}

function buildRepeatedWeekSessions(sessions: SessionDraft[], weeks: number): SessionDraft[] {
  const firstWeekSessions = new Map<number, SessionDraft>();
  const existingByDay = new Map<number, SessionDraft>();

  for (const session of sessions) {
    existingByDay.set(session.dayNumber, session);
    if (session.dayNumber <= 7 && !firstWeekSessions.has(session.dayNumber)) {
      firstWeekSessions.set(session.dayNumber, session);
    }
  }

  const repeatedSessions: SessionDraft[] = [];
  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    const dayOffset = weekIndex * 7;
    for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek += 1) {
      const template = firstWeekSessions.get(dayInWeek);
      const targetDay = dayInWeek + dayOffset;
      const existing = existingByDay.get(targetDay);

      if (template) {
        repeatedSessions.push({
          ...(existing?.id !== undefined ? { id: existing.id } : {}),
          dayNumber: targetDay,
          title: template.title,
          description: template.description,
          exercises: template.exercises.map(cloneExerciseDraft),
          isRestDay: template.isRestDay,
          ...(existing?.isCompleted !== undefined ? { isCompleted: existing.isCompleted } : {}),
        });
        continue;
      }

      repeatedSessions.push({
        ...(existing?.id !== undefined ? { id: existing.id } : {}),
        dayNumber: targetDay,
        title: '',
        description: '',
        exercises: [],
        isRestDay: false,
        ...(existing?.isCompleted !== undefined ? { isCompleted: existing.isCompleted } : {}),
      });
    }
  }

  return repeatedSessions;
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'INIT':
      return { sessions: action.sessions, weeks: action.weeks, isDirty: false };
    case 'ADD_WEEKS': {
      const newWeeks = state.weeks + action.count;
      const currentDays = state.sessions.length;
      const targetDays = newWeeks * 7;
      const newSessions = [...state.sessions];
      for (let d = currentDays + 1; d <= targetDays; d++) {
        newSessions.push({ dayNumber: d, title: '', description: '', exercises: [], isRestDay: false });
      }
      return { ...state, sessions: newSessions, weeks: newWeeks, isDirty: true };
    }
    case 'REMOVE_WEEKS': {
      const newWeeks = Math.max(1, state.weeks - action.count);
      const targetDays = newWeeks * 7;
      return { ...state, sessions: state.sessions.filter(s => s.dayNumber <= targetDays), weeks: newWeeks, isDirty: true };
    }
    case 'UPDATE_SESSION':
      return { ...state, sessions: state.sessions.map(s => s.dayNumber === action.dayNumber ? { ...s, ...action.data } : s), isDirty: true };
    case 'TOGGLE_REST_DAY':
      return { ...state, sessions: state.sessions.map(s => s.dayNumber === action.dayNumber ? { ...s, isRestDay: !s.isRestDay, exercises: !s.isRestDay ? [] : s.exercises } : s), isDirty: true };
    case 'ADD_EXERCISE':
      return { ...state, sessions: state.sessions.map(s => s.dayNumber === action.dayNumber ? { ...s, exercises: [...s.exercises, { name: '', sets: undefined, reps: '', rest: undefined, restUnit: 'seconds' }] } : s), isDirty: true };
    case 'UPDATE_EXERCISE':
      return { ...state, sessions: state.sessions.map(s => s.dayNumber === action.dayNumber ? { ...s, exercises: s.exercises.map((ex, i) => i === action.exerciseIdx ? { ...ex, ...action.data } : ex) } : s), isDirty: true };
    case 'UPDATE_EXERCISE_REST_UNIT':
      return { ...state, sessions: state.sessions.map(s => s.dayNumber === action.dayNumber ? { ...s, exercises: s.exercises.map((ex, i) => i === action.exerciseIdx ? { ...ex, restUnit: action.restUnit } : ex) } : s), isDirty: true };
    case 'REMOVE_EXERCISE':
      return { ...state, sessions: state.sessions.map(s => s.dayNumber === action.dayNumber ? { ...s, exercises: s.exercises.filter((_, i) => i !== action.exerciseIdx) } : s), isDirty: true };
    default:
      return state;
  }
}

export default function ProgramEditorScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasValidToken, isLoading: isAuthLoading } = useAuth();
  const { saveProgramSessions, updateProgram } = usePrograms();
  const [programTitle, setProgramTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [weekMode, setWeekMode] = useState<WeekMode>('custom');

  const [state, dispatch] = useReducer(editorReducer, { sessions: [], weeks: 1, isDirty: false });

  useEffect(() => {
    if (isAuthLoading) return;
    if (!hasValidToken || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadProgram();
  }, [hasValidToken, id, isAuthLoading]);

  useEffect(() => {
    if (weekMode === 'repeat' && selectedWeek !== 1) {
      setSelectedWeek(1);
    }
  }, [selectedWeek, weekMode]);

  const loadProgram = async () => {
    try {
      const data = await getProgram(parseInt(id));
      setProgramTitle((data as any).title);
      const editorState = buildProgramEditorState(data as any);
      const persistedSessions = normalizeProgramSessions((data as any).sessions);
      const maxPersistedDay = persistedSessions.reduce((maxDay, session) => Math.max(maxDay, session.dayNumber), 0);
      setWeekMode(editorState.weeks > 1 && (persistedSessions.length === 0 || maxPersistedDay <= 7) ? 'repeat' : 'custom');
      setSelectedWeek(1);
      dispatch({ type: 'INIT', sessions: editorState.sessions.map(toSessionDraft), weeks: editorState.weeks });
    } catch (error) {
      console.error('Failed to load program:', error);
      Alert.alert('Error', 'Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasValidToken) {
      Alert.alert('Sign In Required', 'Please sign in again to edit this program.');
      return;
    }

    setSaving(true);
    try {
      const sourceSessions = weekMode === 'repeat' && state.weeks > 1
        ? buildRepeatedWeekSessions(state.sessions, state.weeks)
        : state.sessions;
      const sessionsToSave = sourceSessions
        .filter(s => s.isRestDay || s.exercises.length > 0 || s.title)
        .map(s => ({
          ...(s.id ? { id: s.id } : {}),
          dayNumber: s.dayNumber,
          title: s.title || (s.isRestDay ? 'Rest Day' : getDayLabel(s.dayNumber)),
          description: s.description,
          exercises: s.isRestDay ? [] : s.exercises
            .filter(ex => ex.name.trim())
            .map(({ restUnit, ...exercise }) => exercise),
          isRestDay: s.isRestDay,
        }));
      const [savedSessions] = await Promise.all([
        saveProgramSessions(parseInt(id), sessionsToSave),
        updateProgram(parseInt(id), { duration: state.weeks }),
      ]);
      const editorState = buildProgramEditorState(
        { duration: state.weeks, sessions: savedSessions },
        { minimumWeeks: state.weeks },
      );
      notificationSuccess();
      dispatch({ type: 'INIT', sessions: editorState.sessions.map(toSessionDraft), weeks: editorState.weeks });
      Alert.alert('Saved', 'Program sessions saved successfully.');
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Error', 'Failed to save program sessions.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    selectionChanged();
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  const weekSessions = state.sessions.filter(s => {
    if (weekMode === 'repeat') {
      return s.dayNumber <= 7;
    }
    const weekNum = Math.ceil(s.dayNumber / 7);
    return weekNum === selectedWeek;
  });

  const weekNumbers = Array.from({ length: state.weeks }, (_, i) => i + 1);

  const renderExercise = (session: SessionDraft, ex: ExerciseDraft, exIdx: number) => (
    <Animated.View key={exIdx} entering={FadeIn.duration(200)} style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <TextInput
          style={styles.exerciseNameInput}
          value={ex.name}
          onChangeText={text => dispatch({ type: 'UPDATE_EXERCISE', dayNumber: session.dayNumber, exerciseIdx: exIdx, data: { name: text } })}
          placeholder="Exercise name"
          placeholderTextColor={colors.text.tertiary}
        />
        <TouchableOpacity onPress={() => { impactLight(); dispatch({ type: 'REMOVE_EXERCISE', dayNumber: session.dayNumber, exerciseIdx: exIdx }); }}>
          <Ionicons name="close-circle" size={20} color={colors.red} />
        </TouchableOpacity>
      </View>
      <View style={styles.exerciseFields}>
        <View style={styles.exerciseFieldWrap}>
          <Text style={styles.exerciseFieldLabel}>Sets</Text>
          <TextInput
            style={styles.exerciseFieldInput}
            value={ex.sets?.toString() || ''}
            onChangeText={text => dispatch({ type: 'UPDATE_EXERCISE', dayNumber: session.dayNumber, exerciseIdx: exIdx, data: { sets: text ? parseInt(text) || undefined : undefined } })}
            keyboardType="number-pad"
            placeholder="-"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={styles.exerciseFieldWrap}>
          <Text style={styles.exerciseFieldLabel}>Reps</Text>
          <TextInput
            style={styles.exerciseFieldInput}
            value={ex.reps || ''}
            onChangeText={text => dispatch({ type: 'UPDATE_EXERCISE', dayNumber: session.dayNumber, exerciseIdx: exIdx, data: { reps: text } })}
            placeholder="-"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={styles.exerciseFieldWrap}>
          <View style={styles.restFieldHeader}>
            <Text style={styles.exerciseFieldLabel}>Rest</Text>
            <View style={styles.restUnitToggle}>
              <TouchableOpacity
                style={[styles.restUnitBtn, ex.restUnit === 'seconds' && styles.restUnitBtnActive]}
                onPress={() => dispatch({ type: 'UPDATE_EXERCISE_REST_UNIT', dayNumber: session.dayNumber, exerciseIdx: exIdx, restUnit: 'seconds' })}
              >
                <Text style={[styles.restUnitText, ex.restUnit === 'seconds' && styles.restUnitTextActive]}>sec</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.restUnitBtn, ex.restUnit === 'minutes' && styles.restUnitBtnActive]}
                onPress={() => dispatch({ type: 'UPDATE_EXERCISE_REST_UNIT', dayNumber: session.dayNumber, exerciseIdx: exIdx, restUnit: 'minutes' })}
              >
                <Text style={[styles.restUnitText, ex.restUnit === 'minutes' && styles.restUnitTextActive]}>min</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={styles.exerciseFieldInput}
            value={toRestInputValue(ex.rest, ex.restUnit)}
            onChangeText={text => dispatch({
              type: 'UPDATE_EXERCISE',
              dayNumber: session.dayNumber,
              exerciseIdx: exIdx,
              data: { rest: toStoredRestValue(text, ex.restUnit) },
            })}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            placeholder="-"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={styles.exerciseFieldWrap}>
          <Text style={styles.exerciseFieldLabel}>Notes</Text>
          <TextInput
            style={styles.exerciseFieldInput}
            value={ex.notes || ''}
            onChangeText={text => dispatch({ type: 'UPDATE_EXERCISE', dayNumber: session.dayNumber, exerciseIdx: exIdx, data: { notes: text } })}
            placeholder="-"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>
    </Animated.View>
  );

  const renderDayCard = ({ item: session }: { item: SessionDraft }) => {
    const isExpanded = expandedDays.has(session.dayNumber);
    const exerciseCount = session.exercises.length;
    const summary = session.isRestDay ? 'Rest Day' : exerciseCount > 0 ? `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}` : 'Empty';

    return (
      <Animated.View entering={FadeInUp.duration(300).delay((session.dayNumber % 7) * 40)} style={styles.dayCard}>
        <TouchableOpacity style={styles.dayHeader} onPress={() => toggleDay(session.dayNumber)}>
          <View style={styles.dayLeft}>
            <View style={[styles.dayBadge, session.isRestDay ? styles.dayBadgeRest : styles.dayBadgeTraining]}>
              <Text style={[styles.dayBadgeText, session.isRestDay ? styles.dayBadgeTextRest : styles.dayBadgeTextTraining]}>
                {getDayLabel(session.dayNumber)}
              </Text>
            </View>
            <Text style={styles.summary}>{session.title || summary}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={styles.summary}>{summary}</Text>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.dayBody}>
            <TextInput
              style={styles.sessionTitleInput}
              value={session.title}
              onChangeText={text => dispatch({ type: 'UPDATE_SESSION', dayNumber: session.dayNumber, data: { title: text } })}
              placeholder="Session title (optional)"
              placeholderTextColor={colors.text.tertiary}
            />

            <View style={styles.restDayRow}>
              <Text style={styles.restDayLabel}>Rest Day</Text>
              <Switch
                value={session.isRestDay}
                onValueChange={() => dispatch({ type: 'TOGGLE_REST_DAY', dayNumber: session.dayNumber })}
                trackColor={{ false: colors.background.secondary, true: colors.teal }}
                thumbColor="#fff"
              />
            </View>

            {!session.isRestDay && (
              <>
                {session.exercises.map((ex, exIdx) => renderExercise(session, ex, exIdx))}
                <TouchableOpacity
                  style={styles.addExerciseBtn}
                  onPress={() => { impactLight(); dispatch({ type: 'ADD_EXERCISE', dayNumber: session.dayNumber }); }}
                >
                  <Ionicons name="add" size={16} color={colors.teal} />
                  <Text style={styles.addExerciseText}>Add Exercise</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.loadingText}>Loading program...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{programTitle || 'Edit Program'}</Text>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        {/* Week Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
          {weekNumbers.map(w => (
            <TouchableOpacity
              key={w}
              style={[styles.weekPill, selectedWeek === w && styles.weekPillActive]}
              onPress={() => {
                if (weekMode === 'repeat') return;
                selectionChanged();
                setSelectedWeek(w);
              }}
              disabled={weekMode === 'repeat'}
            >
              <Text style={[styles.weekPillText, selectedWeek === w && styles.weekPillTextActive]}>Week {w}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.modeCard}>
          <Text style={styles.modeLabel}>Week Setup</Text>
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeBtn, weekMode === 'repeat' && styles.modeBtnActive]}
              onPress={() => setWeekMode('repeat')}
            >
              <Text style={[styles.modeBtnText, weekMode === 'repeat' && styles.modeBtnTextActive]}>Repeat Week 1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, weekMode === 'custom' && styles.modeBtnActive]}
              onPress={() => setWeekMode('custom')}
            >
              <Text style={[styles.modeBtnText, weekMode === 'custom' && styles.modeBtnTextActive]}>Custom Weeks</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeHint}>
            {weekMode === 'repeat'
              ? `Edit week 1 once. It will be copied to weeks 2-${state.weeks} when you save.`
              : 'Each week can have its own sessions and exercises.'}
          </Text>
        </View>

        {/* Week Controls */}
        <View style={styles.weekControls}>
          <TouchableOpacity style={styles.weekControlBtn} onPress={() => dispatch({ type: 'ADD_WEEKS', count: 1 })}>
            <Text style={styles.weekControlText}>+1 Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.weekControlBtn} onPress={() => dispatch({ type: 'REMOVE_WEEKS', count: 1 })}>
            <Text style={styles.weekControlText}>-1 Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.weekControlBtn} onPress={() => dispatch({ type: 'ADD_WEEKS', count: 5 })}>
            <Text style={styles.weekControlText}>+5 Weeks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.weekControlBtn} onPress={() => dispatch({ type: 'REMOVE_WEEKS', count: 5 })}>
            <Text style={styles.weekControlText}>-5 Weeks</Text>
          </TouchableOpacity>
        </View>

        {/* Day Cards */}
        <FlatList
          data={weekSessions}
          keyExtractor={item => `day-${item.dayNumber}`}
          renderItem={renderDayCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Bottom Save Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomSaveBtn, (!state.isDirty || saving) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!state.isDirty || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bottomSaveText}>{state.isDirty ? 'Save Changes' : 'No Changes'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: spacing.md },
  saveBtn: { backgroundColor: colors.teal, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  saveBtnText: { ...typography.caption, color: '#fff', fontWeight: '600' },
  weekScroll: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  weekPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, backgroundColor: colors.background.cardSolid, marginRight: spacing.xs },
  weekPillActive: { backgroundColor: colors.teal },
  weekPillText: { ...typography.caption, color: colors.text.secondary },
  weekPillTextActive: { color: '#fff', fontWeight: '600' },
  modeCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.xs },
  modeLabel: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  modeToggleRow: { flexDirection: 'row', gap: spacing.xs },
  modeBtn: { flex: 1, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.text.tertiary + '25', paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.background.secondary },
  modeBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  modeBtnText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  modeBtnTextActive: { color: '#fff' },
  modeHint: { ...typography.caption, color: colors.text.tertiary },
  weekControls: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  weekControlBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.background.cardSolid, borderWidth: 1, borderColor: colors.text.tertiary + '20' },
  weekControlText: { ...typography.caption, color: colors.text.secondary },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.sm },
  dayCard: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.text.tertiary + '20' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  dayLeft: { flex: 1 },
  dayBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginBottom: 2, alignSelf: 'flex-start' },
  dayBadgeTraining: { backgroundColor: 'rgba(48, 213, 200, 0.15)' },
  dayBadgeRest: { backgroundColor: 'rgba(142, 142, 147, 0.15)' },
  dayBadgeText: { ...typography.caption, fontWeight: '600' },
  dayBadgeTextTraining: { color: colors.teal },
  dayBadgeTextRest: { color: colors.text.secondary },
  sessionTitleInput: { ...typography.body, color: colors.text.primary, backgroundColor: colors.background.secondary, borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.text.tertiary + '25' },
  dayBody: { padding: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.background.secondary },
  restDayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  restDayLabel: { ...typography.body, color: colors.text.secondary },
  exerciseCard: { backgroundColor: colors.background.secondary, borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.text.tertiary + '15' },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseNameInput: { ...typography.body, color: colors.text.primary, flex: 1 },
  exerciseFields: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  exerciseFieldWrap: { flex: 1 },
  restFieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, gap: spacing.xs },
  restUnitToggle: { flexDirection: 'row', backgroundColor: colors.background.primary, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.text.tertiary + '20', overflow: 'hidden' },
  restUnitBtn: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  restUnitBtnActive: { backgroundColor: colors.teal },
  restUnitText: { ...typography.caption, color: colors.text.tertiary, fontSize: 10, fontWeight: '600' },
  restUnitTextActive: { color: '#fff' },
  exerciseFieldLabel: { ...typography.caption, color: colors.text.tertiary, fontSize: 10, marginBottom: 2 },
  exerciseFieldInput: { ...typography.caption, color: colors.text.primary, backgroundColor: colors.background.primary, borderRadius: borderRadius.sm, padding: spacing.xs, textAlign: 'center', borderWidth: 1, borderColor: colors.text.tertiary + '25' },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.teal, borderStyle: 'dashed', gap: spacing.xs },
  addExerciseText: { ...typography.caption, color: colors.teal },
  summary: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.background.primary },
  bottomSaveBtn: { backgroundColor: colors.teal, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  bottomSaveText: { ...typography.body, color: '#fff', fontWeight: '600' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.body, color: colors.text.secondary },
});
