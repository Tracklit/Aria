import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

const sprintTools = [
  {
    title: 'Photo Finish',
    icon: 'camera-outline' as const,
    gradient: ['#0A84FF', '#30D5C8'] as [string, string],
    route: '/tools/photo-finish',
  },
  {
    title: 'Start Gun',
    icon: 'megaphone-outline' as const,
    gradient: ['#FF453A', '#FF9F0A'] as [string, string],
    route: '/tools/start-gun',
  },
  {
    title: 'Stopwatch',
    icon: 'stopwatch-outline' as const,
    gradient: ['#32D74B', '#30D5C8'] as [string, string],
    route: '/tools/stopwatch',
  },
  {
    title: 'Sprint Predictor',
    icon: 'calculator-outline' as const,
    gradient: ['#BF5AF2', '#5E5CE6'] as [string, string],
    route: '/tools/sprint-predictor',
  },
];

const trainingItems = [
  {
    title: 'Training Log',
    icon: 'journal-outline' as const,
    route: '/training-log',
  },
  {
    title: 'Progress & Analytics',
    icon: 'pulse-outline' as const,
    route: '/(tabs)/progress',
  },
];

export default function ToolsScreen() {
  const reducedMotion = useReducedMotion();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(300)}>
          <Text style={styles.title}>Tools</Text>
        </Animated.View>

        {/* Sprint Tools */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="flash-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.sectionHeader}>SPRINT TOOLS</Text>
          <View style={styles.sectionLine} />
        </View>
        <View style={styles.grid}>
          {sprintTools.map((tool, index) => (
            <Animated.View key={tool.title} entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(index * 60)} style={styles.gridItem}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(tool.route as any)}
              >
                <LinearGradient
                  colors={tool.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.card}
                >
                  <Ionicons name={tool.icon} size={28} color={colors.text.primary} />
                  <Text style={styles.cardTitle}>{tool.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Training */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="barbell-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.sectionHeader}>TRAINING</Text>
          <View style={styles.sectionLine} />
        </View>
        {trainingItems.map((item, index) => (
          <Animated.View key={item.title} entering={reducedMotion ? undefined : FadeInRight.duration(350).delay(300 + index * 80)}>
            <TouchableOpacity
              style={styles.trainingCard}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon} size={24} color={colors.primary} />
              <Text style={styles.trainingTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </Animated.View>
        ))}
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
    paddingBottom: 120,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
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
    height: 120,
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  trainingTitle: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.md,
  },
});
