import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { usePrograms } from '../../src/context/ProgramsContext';
import { impactLight, impactMedium, selectionChanged } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const buildCards = [
  {
    title: 'Program Builder',
    subtitle: 'Build day-by-day with the visual editor',
    icon: 'construct-outline' as const,
    gradient: ['#0A84FF', '#30D5C8'] as [string, string],
    route: '/programs/create',
    badge: 'POPULAR',
  },
  {
    title: 'Build with Aria AI',
    subtitle: 'AI generates a complete program for you',
    icon: 'sparkles-outline' as const,
    gradient: ['#BF5AF2', '#5E5CE6'] as [string, string],
    route: '/programs/create?mode=ai',
  },
  {
    title: 'Text Based',
    subtitle: 'Paste or type your program as text',
    icon: 'document-text-outline' as const,
    gradient: ['#FF9F0A', '#FF453A'] as [string, string],
    route: '/programs/create?mode=text',
  },
];

const existingItems = [
  {
    title: 'From Template',
    icon: 'copy-outline' as const,
    action: 'template',
  },
  {
    title: 'Upload or Import',
    icon: 'cloud-upload-outline' as const,
    action: 'upload',
  },
  {
    title: 'Download CSV Template',
    icon: 'download-outline' as const,
    action: 'download',
  },
];

export default function AddProgramScreen() {
  const reducedMotion = useReducedMotion();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { uploadProgram, importSheet } = usePrograms();

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const formData = new FormData();
        // @ts-ignore - RN FormData
        formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
        formData.append('title', asset.name.replace(/\.[^.]+$/, ''));
        await uploadProgram(formData);
        router.back();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const downloadTemplate = async () => {
    const csv = `Aria Training Program Template,,,,,,
Instructions: Fill in each row with one day's training.,,,,,,
Delete these instruction rows and example data before uploading.,,,,,,
,,,,,,
Date,Session Type,Event Group,Exercise / Workout,Sets x Reps / Distance,Intensity (%),Rest / Notes
3/3/2025,Sprint,100m,Sprintprep 1 (warmup + accelerations),See notes,,Jump rope / med ball tosses
3/4/2025,Tempo,100m,Tempo Runs,5 x 200m,65-70%,4 min rest between reps
3/5/2025,Gym,100m,Deep Squats,5 x 8,,Progressive loading
3/9/2025,Rest,100m,Rest Day,,,`;
    const file = new FileSystem.File(FileSystem.Paths.cache, 'Aria_Program_Template.csv');
    file.write(csv);
    await Sharing.shareAsync(file.uri);
  };

  const handleAction = (action: string) => {
    selectionChanged();
    switch (action) {
      case 'template':
        Alert.alert('Coming Soon', 'Templates will be available in a future update.');
        break;
      case 'upload':
        Alert.alert('Upload or Import', 'Choose an option', [
          { text: 'Upload File', onPress: () => handleUpload() },
          { text: 'Import Google Sheet', onPress: () => Alert.alert('Coming Soon', 'Google Sheet import will be available in a future update.') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        break;
      case 'download':
        downloadTemplate();
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Program</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Build from Scratch */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="hammer-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.sectionHeader}>BUILD FROM SCRATCH</Text>
          <View style={styles.sectionLine} />
        </View>
        <View style={styles.grid}>
          {buildCards.map((card, index) => (
            <Animated.View key={card.title} entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(index * 60)} style={styles.gridItem}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { impactLight(); router.push(card.route as any); }}
              >
                <LinearGradient
                  colors={card.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.card}
                >
                  <View style={styles.cardTop}>
                    <Ionicons name={card.icon} size={28} color={colors.text.primary} />
                    {card.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{card.badge}</Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Start from Existing */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="folder-open-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.sectionHeader}>START FROM EXISTING</Text>
          <View style={styles.sectionLine} />
        </View>
        {existingItems.map((item, index) => (
          <Animated.View key={item.title} entering={reducedMotion ? undefined : FadeInRight.duration(350).delay(300 + index * 80)}>
            <TouchableOpacity
              style={styles.listCard}
              activeOpacity={0.7}
              onPress={() => handleAction(item.action)}
            >
              <Ionicons name={item.icon} size={24} color={colors.primary} />
              <Text style={styles.listTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
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
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: '47%',
    flexGrow: 1,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    height: 140,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  cardTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  cardSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listTitle: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.md,
  },
});
