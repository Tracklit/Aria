import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ToolCard } from '../../src/components/features/ToolCard';
import { colors, typography, spacing } from '../../src/theme';

const tools = [
  { id: 'photo-finish', title: 'Photo Finish', subtitle: 'Video analysis', icon: 'camera-outline' },
  { id: 'start-gun', title: 'Start Gun', subtitle: 'Audio sequence', icon: 'volume-high-outline' },
  { id: 'stopwatch', title: 'Stopwatch', subtitle: 'Lap timing', icon: 'timer-outline' },
  { id: 'sprint-predictor', title: 'Sprint Predictor', subtitle: 'Time conversion', icon: 'calculator-outline' },
];

export default function ToolsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sprint Tools</Text>
        <View style={{ width: 28 }} />
      </View>
      <FlatList
        data={tools}
        numColumns={2}
        renderItem={({ item }) => (
          <ToolCard
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            onPress={() => router.push(`/tools/${item.id}` as any)}
            testID={`tool.${item.id}`}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  grid: { padding: spacing.md },
});
