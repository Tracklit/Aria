import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ToolCard } from '../../src/components/features/ToolCard';
import { useThemedStyles, useColors, typography, spacing } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

export default function ToolsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  const tools = [
    {
      id: 'photo-finish',
      title: 'Photo Finish',
      description: 'Analyze race finishes frame by frame',
      icon: 'camera-outline',
      accentColor: colors.teal,
    },
    {
      id: 'start-gun',
      title: 'Start Gun',
      description: 'Realistic race start audio sequence',
      icon: 'volume-high-outline',
      accentColor: colors.green,
    },
    {
      id: 'stopwatch',
      title: 'Stopwatch',
      description: 'Precision timing with lap splits',
      icon: 'timer-outline',
      accentColor: colors.orange,
    },
    {
      id: 'sprint-predictor',
      title: 'Sprint Predictor',
      description: 'Predict times across distances',
      icon: 'calculator-outline',
      accentColor: colors.primary,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Sprint Tools</Text>
          <Text style={styles.heroSubtitle}>Professional timing & analysis tools</Text>
        </View>
        <View style={styles.cardList}>
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              accentColor={tool.accentColor}
              variant="list"
              onPress={() => router.push(`/tools/${tool.id}` as any)}
              testID={`tool.${tool.id}`}
            />
          ))}
        </View>
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
    paddingVertical: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text.primary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  cardList: {
    gap: spacing.md,
  },
});
