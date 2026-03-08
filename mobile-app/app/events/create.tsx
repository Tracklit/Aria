import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useEvents, Event, SubEvent } from '../../src/context/EventsContext';
import { impactLight, impactMedium, notificationSuccess, notificationWarning } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { useTheme } from '../../src/context/ThemeContext';
import { ToastManager } from '../../src/components/Toast';

const EVENT_TYPES = [
  { value: 'race', label: 'Race', icon: 'trophy-outline' },
  { value: 'competition', label: 'Competition', icon: 'medal-outline' },
  { value: 'meet', label: 'Meet', icon: 'people-outline' },
  { value: 'time_trial', label: 'Time Trial', icon: 'timer-outline' },
  { value: 'tryout', label: 'Tryout', icon: 'clipboard-outline' },
  { value: 'camp', label: 'Camp', icon: 'bonfire-outline' },
  { value: 'clinic', label: 'Clinic', icon: 'school-outline' },
  { value: 'charity_run', label: 'Charity Run', icon: 'heart-outline' },
] as const;

const PRIORITIES = [
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low', label: 'Low', color: '#22C55E' },
] as const;

const DISTANCE_PRESETS = ['60m', '100m', '200m', '400m', '800m', '1500m', '110mH', '400mH', 'Mile', '5K', '10K'];

const SUPPORTS_SUB_EVENTS = ['competition', 'meet'];

function emptySubEvent(): SubEvent {
  return { name: '', distanceLabel: '', goalTime: undefined, notes: '' };
}

export default function CreateEventScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { effectiveTheme } = useTheme();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const isEditing = !!params.eventId;
  const { events, createEvent, updateEvent, deleteEvent } = useEvents();

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('race');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceLabel, setDistanceLabel] = useState('m');
  const [goalTime, setGoalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);

  useEffect(() => {
    if (isEditing && params.eventId) {
      const existing = events.find(e => e.id === parseInt(params.eventId!, 10));
      if (existing) {
        setName(existing.name);
        setEventType(existing.eventType);
        setDate(new Date(existing.date));
        setLocation(existing.location || '');
        setDistance(existing.distance ? existing.distance.toString() : '');
        setDistanceLabel(existing.distanceLabel || 'm');
        setGoalTime(existing.goalTime ? existing.goalTime.toString() : '');
        setNotes(existing.notes || '');
        setPriority(existing.priority);
        if (existing.subEvents && existing.subEvents.length > 0) {
          setSubEvents(existing.subEvents);
        }
      }
    }
  }, [isEditing, params.eventId, events]);

  const addSubEvent = useCallback(() => {
    impactLight();
    setSubEvents(prev => [...prev, emptySubEvent()]);
  }, []);

  const removeSubEvent = useCallback((index: number) => {
    impactLight();
    setSubEvents(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSubEvent = useCallback((index: number, field: keyof SubEvent, value: any) => {
    setSubEvents(prev => prev.map((se, i) => i === index ? { ...se, [field]: value } : se));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an event name.');
      return;
    }

    setIsSaving(true);
    try {
      // Filter out empty sub-events
      const validSubEvents = subEvents.filter(se => se.name.trim());

      const data: Partial<Event> = {
        name: name.trim(),
        eventType,
        date: date.toISOString(),
        location: location.trim() || undefined,
        distance: distance ? parseFloat(distance) : undefined,
        distanceLabel: distanceLabel || undefined,
        goalTime: goalTime ? parseFloat(goalTime) : undefined,
        notes: notes.trim() || undefined,
        priority,
        subEvents: validSubEvents.length > 0 ? validSubEvents : undefined,
      };

      if (isEditing && params.eventId) {
        await updateEvent(parseInt(params.eventId, 10), data);
        notificationSuccess();
        ToastManager.success('Event updated');
      } else {
        await createEvent(data);
        notificationSuccess();
        ToastManager.success('Event created');
      }
      router.back();
    } catch (error: any) {
      ToastManager.error(error.message || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  }, [name, eventType, date, location, distance, distanceLabel, goalTime, notes, priority, subEvents, isEditing, params.eventId, createEvent, updateEvent]);

  const handleDelete = useCallback(() => {
    if (!params.eventId) return;
    notificationWarning();
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(parseInt(params.eventId!, 10));
            notificationSuccess();
            ToastManager.success('Event deleted');
            router.back();
          } catch (error: any) {
            ToastManager.error(error.message || 'Failed to delete event');
          }
        },
      },
    ]);
  }, [params.eventId, deleteEvent]);

  const showSubEventsSection = SUPPORTS_SUB_EVENTS.includes(eventType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { impactLight(); router.back(); }}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Event' : 'New Event'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <Animated.View entering={FadeInUp.delay(50).duration(400)}>
          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. State Championship 100m"
            placeholderTextColor={colors.text.tertiary}
          />
        </Animated.View>

        {/* Event Type */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <Text style={styles.label}>Event Type</Text>
          <View style={styles.chipGrid}>
            {EVENT_TYPES.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.chip,
                  eventType === type.value && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                ]}
                onPress={() => { impactLight(); setEventType(type.value); }}
              >
                <Ionicons
                  name={type.icon as any}
                  size={16}
                  color={eventType === type.value ? colors.primary : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    eventType === type.value && { color: colors.primary },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Date */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => { impactLight(); setShowDatePicker(true); }}
          >
            <Text style={styles.inputText}>
              {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selectedDate) => {
                setShowDatePicker(Platform.OS !== 'ios');
                if (selectedDate) setDate(selectedDate);
              }}
              themeVariant={effectiveTheme === 'dark' ? 'dark' : 'light'}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity style={styles.doneButton} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Location */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Hayward Field, Eugene, OR"
            placeholderTextColor={colors.text.tertiary}
          />
        </Animated.View>

        {/* Distance */}
        <Animated.View entering={FadeInUp.delay(250).duration(400)}>
          <Text style={styles.label}>Distance</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
              value={distance}
              onChangeText={setDistance}
              placeholder="e.g. 100"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { width: 80 }]}
              value={distanceLabel}
              onChangeText={setDistanceLabel}
              placeholder="m"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </Animated.View>

        {/* Goal Time */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Text style={styles.label}>Goal Time (seconds)</Text>
          <TextInput
            style={styles.input}
            value={goalTime}
            onChangeText={setGoalTime}
            placeholder="e.g. 10.85"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />
        </Animated.View>

        {/* Priority */}
        <Animated.View entering={FadeInUp.delay(350).duration(400)}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.priorityChip,
                  priority === p.value && { backgroundColor: p.color + '20', borderColor: p.color },
                ]}
                onPress={() => { impactLight(); setPriority(p.value); }}
              >
                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                <Text style={[styles.priorityChipText, priority === p.value && { color: p.color }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Notes */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Animated.View>

        {/* Sub-Events Section */}
        {showSubEventsSection && (
          <Animated.View entering={FadeInUp.delay(420).duration(400)}>
            <View style={styles.subEventsHeader}>
              <Text style={styles.label}>Sub-Events</Text>
              <Text style={styles.subEventsHint}>Add individual races or events within this {eventType}</Text>
            </View>

            {subEvents.map((se, idx) => (
              <View key={idx} style={styles.subEventCard}>
                <View style={styles.subEventTopRow}>
                  <Text style={styles.subEventIndex}>#{idx + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeSubEvent(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.red || '#EF4444'} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.subEventFieldLabel}>Event Name</Text>
                <TextInput
                  style={styles.subEventInput}
                  value={se.name}
                  onChangeText={(v) => updateSubEvent(idx, 'name', v)}
                  placeholder="e.g. 100m Final"
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text style={styles.subEventFieldLabel}>Distance</Text>
                <View style={styles.distancePresetsRow}>
                  {DISTANCE_PRESETS.map(preset => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.distancePresetChip,
                        se.distanceLabel === preset && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                      ]}
                      onPress={() => {
                        impactLight();
                        updateSubEvent(idx, 'distanceLabel', se.distanceLabel === preset ? '' : preset);
                      }}
                    >
                      <Text style={[
                        styles.distancePresetText,
                        se.distanceLabel === preset && { color: colors.primary },
                      ]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.subEventFieldLabel}>Goal Time (seconds)</Text>
                <TextInput
                  style={styles.subEventInput}
                  value={se.goalTime ? se.goalTime.toString() : ''}
                  onChangeText={(v) => updateSubEvent(idx, 'goalTime', v ? parseFloat(v) : undefined)}
                  placeholder="e.g. 10.85"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.subEventFieldLabel}>Notes</Text>
                <TextInput
                  style={styles.subEventInput}
                  value={se.notes || ''}
                  onChangeText={(v) => updateSubEvent(idx, 'notes', v)}
                  placeholder="Optional notes..."
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.addSubEventButton} onPress={addSubEvent}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addSubEventText}>Add Sub-Event</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Save Button */}
        <Animated.View entering={FadeInUp.delay(450).duration(400)}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
            onPress={() => { impactMedium(); handleSave(); }}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{isEditing ? 'Update Event' : 'Create Event'}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Delete Button (edit mode) */}
        {isEditing && (
          <Animated.View entering={FadeInUp.delay(500).duration(400)}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Delete Event</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  inputText: {
    ...typography.body,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.cardSolid,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  chipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.cardSolid,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityChipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  doneButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    ...typography.body,
    color: '#EF4444',
    fontWeight: '600',
  },
  // Sub-events
  subEventsHeader: {
    marginTop: spacing.sm,
  },
  subEventsHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  subEventCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  subEventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subEventIndex: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  subEventFieldLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  subEventInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    color: colors.text.primary,
    ...typography.body,
  },
  distancePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  distancePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  distancePresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  addSubEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  addSubEventText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
