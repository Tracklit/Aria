import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { impactLight, selectionChanged } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { useToolSettings } from '../../src/hooks/useToolSettings';
import { SprintPredictorSettings, DEFAULT_SPRINT_PREDICTOR } from '../../src/types/toolSettings';
import { ToolSettingsModal } from '../../src/components/tools/ToolSettingsModal';
import { SettingsToggleRow } from '../../src/components/tools/SettingsToggleRow';
import { SettingsChipRow } from '../../src/components/tools/SettingsChipRow';

const METERS_TO_YARDS = 1.09361;

// Dick (1987) conversion factors relative to 100m
const CONVERSION_FACTORS: Record<number, number> = {
  30: 0.371, 40: 0.441, 50: 0.510, 55: 0.543,
  60: 0.577, 80: 0.710, 100: 1.000, 110: 1.064,
  150: 1.350, 200: 1.730, 250: 2.120,
};

const DISTANCES = Object.keys(CONVERSION_FACTORS).map(Number);

function formatDistanceLabel(meters: number, unit: 'meters' | 'yards'): string {
  if (unit === 'yards') {
    return `${Math.round(meters * METERS_TO_YARDS)}yd`;
  }
  return `${meters}m`;
}

export default function SprintPredictorScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { settings, loaded, update, reset } = useToolSettings<SprintPredictorSettings>(
    'aria_sprintpredictor_settings',
    DEFAULT_SPRINT_PREDICTOR,
  );
  const [selectedDistance, setSelectedDistance] = useState(100);
  const [inputTime, setInputTime] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (loaded) {
      setSelectedDistance(settings.defaultDistance);
    }
  }, [loaded]);

  const inputTimeNum = parseFloat(inputTime);

  function getDistanceColor(distance: number): string {
    if (distance <= 60) return colors.green;
    if (distance <= 110) return colors.primary;
    return colors.orange;
  }

  const predictions = (() => {
    if (!inputTimeNum || inputTimeNum <= 0) return [];

    const baseFactor = CONVERSION_FACTORS[selectedDistance];
    const equivalent100m = inputTimeNum / baseFactor;

    return DISTANCES.filter(d => d !== selectedDistance).map(d => {
      const predicted = +(equivalent100m * CONVERSION_FACTORS[d]).toFixed(2);
      const delta = +(predicted - inputTimeNum).toFixed(2);
      return { distance: d, time: predicted, delta };
    });
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sprint Predictor</Text>
        <TouchableOpacity onPress={() => { impactLight(); setShowSettings(true); }}>
          <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>Enter your time for a distance and predict your performance at other sprint distances using the Dick (1987) conversion model.</Text>

        <View style={styles.inputSection}>
          <TouchableOpacity style={styles.distancePicker} onPress={() => { impactLight(); setShowPicker(true); }}>
            <Text style={styles.distanceText}>{formatDistanceLabel(selectedDistance, settings.distanceUnit)}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.timeInput}
            value={inputTime}
            onChangeText={setInputTime}
            placeholder="Time (seconds)"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />
        </View>

        {predictions.length > 0 ? (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Predicted Times</Text>
            {predictions.map((p) => (
              <View key={p.distance} style={[styles.resultCard, { borderLeftColor: getDistanceColor(p.distance) }]}>
                <View>
                  <Text style={styles.resultDistance}>{formatDistanceLabel(p.distance, settings.distanceUnit)}</Text>
                  {settings.showDelta && (
                    <Text style={styles.resultDelta}>
                      {p.delta >= 0 ? '+' : ''}{p.delta.toFixed(2)}s
                    </Text>
                  )}
                </View>
                <Text style={styles.resultTime}>{p.time}s</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={56} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Enter your time above to see predictions</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Distance</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DISTANCES}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, item === selectedDistance && styles.modalOptionSelected]}
                  onPress={() => { selectionChanged(); setSelectedDistance(item); setShowPicker(false); }}
                >
                  <Text style={[styles.modalOptionText, item === selectedDistance && styles.modalOptionTextSelected]}>
                    {formatDistanceLabel(item, settings.distanceUnit)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <ToolSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        title="Sprint Predictor Settings"
        onReset={reset}
      >
        <SettingsChipRow
          label="Default Distance"
          options={[
            { label: '60m', value: 60 },
            { label: '100m', value: 100 },
            { label: '200m', value: 200 },
          ]}
          selected={settings.defaultDistance}
          onSelect={(val) => update({ defaultDistance: val })}
        />
        <SettingsToggleRow
          label="Show Delta"
          description="Show time difference from input"
          value={settings.showDelta}
          onValueChange={(val) => update({ showDelta: val })}
        />
        <SettingsChipRow
          label="Distance Unit"
          options={[
            { label: 'Meters', value: 'meters' as const },
            { label: 'Yards', value: 'yards' as const },
          ]}
          selected={settings.distanceUnit}
          onSelect={(val) => update({ distanceUnit: val })}
        />
      </ToolSettingsModal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  description: { ...typography.caption, color: colors.text.secondary, marginBottom: spacing.lg },
  inputSection: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  distancePicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary },
  distanceText: { ...typography.h3, color: colors.primary },
  timeInput: { flex: 1, ...typography.body, color: colors.text.primary, backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  resultsSection: { gap: spacing.sm },
  resultsTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.sm },
  resultCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.md, padding: spacing.md, borderLeftWidth: 3 },
  resultDistance: { ...typography.body, color: colors.text.secondary, fontWeight: '600' },
  resultDelta: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  resultTime: { ...typography.h3, color: colors.primary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 3 },
  emptyText: { ...typography.body, color: colors.text.tertiary, marginTop: spacing.lg, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background.cardSolid, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.background.secondary },
  modalTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  modalOption: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.background.secondary },
  modalOptionSelected: { backgroundColor: 'rgba(10, 132, 255, 0.1)' },
  modalOptionText: { ...typography.body, color: colors.text.primary, textAlign: 'center' },
  modalOptionTextSelected: { color: colors.primary, fontWeight: '600' },
});
