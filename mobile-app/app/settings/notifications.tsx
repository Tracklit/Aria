import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { selectionChanged } from '../../src/utils/haptics';

const defaultPrefs = {
  workoutReminders: true,
  missedWorkout: true,
  restDay: true,
  dailyDigest: true,
  weeklyReport: true,
  coachingTips: true,
  fatigue: true,
  prPredictions: true,
  competitionAlerts: true,
  mealReminders: false,
  hydration: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

type NotificationPrefs = typeof defaultPrefs;

export default function NotificationsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { preferences, updatePreferences } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    ...defaultPrefs,
    ...preferences?.notificationPrefs,
  });

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    selectionChanged();
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await updatePreferences({ notificationPrefs: updated });
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const renderToggle = (key: keyof NotificationPrefs, label: string, description: string) => (
    <View style={styles.settingRow} key={key}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={prefs[key] as boolean}
        onValueChange={(val) => handleToggle(key, val)}
        trackColor={{ false: colors.background.secondary, true: colors.teal }}
        thumbColor="#fff"
      />
    </View>
  );

  const renderSectionHeader = (icon: string, title: string) => (
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon as any} size={14} color={colors.text.secondary} />
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Training */}
        {renderSectionHeader('barbell-outline', 'TRAINING')}
        <View style={styles.card}>
          {renderToggle('workoutReminders', 'Workout Reminders', 'Get reminded before scheduled workouts')}
          <View style={styles.divider} />
          {renderToggle('missedWorkout', 'Missed Workout Alerts', 'Nudge when you skip a planned session')}
          <View style={styles.divider} />
          {renderToggle('restDay', 'Rest Day Reminders', 'Know when it\'s time to recover')}
        </View>

        {/* Summaries */}
        {renderSectionHeader('newspaper-outline', 'SUMMARIES')}
        <View style={styles.card}>
          {renderToggle('dailyDigest', 'Daily Digest', 'Morning overview of your day')}
          <View style={styles.divider} />
          {renderToggle('weeklyReport', 'Weekly Report', 'End-of-week training summary')}
        </View>

        {/* AI Coaching */}
        {renderSectionHeader('sparkles-outline', 'AI COACHING')}
        <View style={styles.card}>
          {renderToggle('coachingTips', 'Coaching Tips', 'Personalized training insights from Aria')}
          <View style={styles.divider} />
          {renderToggle('fatigue', 'Fatigue & Recovery', 'Overtraining warnings and recovery advice')}
          <View style={styles.divider} />
          {renderToggle('prPredictions', 'PR Predictions', 'When Aria thinks you\'re ready for a breakthrough')}
        </View>

        {/* Competition */}
        {renderSectionHeader('trophy-outline', 'COMPETITION')}
        <View style={styles.card}>
          {renderToggle('competitionAlerts', 'Race Reminders', 'Countdown to upcoming competitions')}
        </View>

        {/* Nutrition */}
        {renderSectionHeader('restaurant-outline', 'NUTRITION')}
        <View style={styles.card}>
          {renderToggle('mealReminders', 'Meal Reminders', 'Reminders for meals in your active plan')}
          <View style={styles.divider} />
          {renderToggle('hydration', 'Hydration', 'Stay on top of fluid intake')}
        </View>

        {/* Quiet Hours */}
        {renderSectionHeader('moon-outline', 'QUIET HOURS')}
        <View style={styles.card}>
          {renderToggle('quietHoursEnabled', 'Do Not Disturb', 'Silence notifications during set hours')}
          {prefs.quietHoursEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.quietHoursRow}>
                <Text style={styles.settingLabel}>Schedule</Text>
                <Text style={styles.quietHoursValue}>10:00 PM - 7:00 AM</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.background.secondary,
    marginLeft: spacing.sm,
  },
  card: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  settingInfo: { flex: 1, marginRight: spacing.md },
  settingLabel: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  settingDescription: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.background.secondary,
    marginVertical: spacing.xs,
  },
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  quietHoursValue: {
    ...typography.body,
    color: colors.teal,
    fontWeight: '600',
  },
});
