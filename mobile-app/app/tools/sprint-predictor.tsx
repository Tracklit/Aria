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

// Brianmac / Dick (1987) quadratic polynomial coefficients
// time = a + b*x + c*x^2, where x = 100m time
const COEFFICIENTS: Record<number, { a: number; b: number; c: number; min: number; max: number }> = {
  30:  { a: -2.232894, b: 0.6284907, c: -0.005192, min: 3.5, max: 6.1 },
  40:  { a: -3.096923, b: 0.9058205, c: -0.015513, min: 4.4, max: 7.1 },
  50:  { a: -4.062308, b: 1.1970513, c: -0.026282, min: 5.2, max: 8.0 },
  60:  { a: -5.036141, b: 1.4909718, c: -0.037205, min: 6.1, max: 9.0 },
  70:  { a: -3.93,     b: 1.392,     c: -0.0288,   min: 7.1, max: 10.5 },
  80:  { a: -2.518071, b: 1.2454859, c: -0.018602, min: 8.0, max: 12.0 },
  90:  { a: -1.18,     b: 1.11,      c: -0.0088,   min: 9.0, max: 13.5 },
  100: { a: 0,         b: 1,         c: 0,          min: 9.9, max: 15.1 },
  120: { a: 2.5180705, b: 0.7545141, c: 0.0186025,  min: 11.9, max: 18.1 },
  150: { a: -2.089313, b: 1.7710869, c: -0.008948,  min: 14.7, max: 22.5 },
  200: { a: -6.038257, b: 2.991126,  c: -0.039017,  min: 19.9, max: 30.1 },
  250: { a: -14.85469, b: 4.9675416, c: -0.096238,  min: 25.1, max: 38.1 },
};

const DISTANCES = Object.keys(COEFFICIENTS).map(Number);

function polynomial(coeff: { a: number; b: number; c: number }, x: number): number {
  return coeff.a + coeff.b * x + coeff.c * x * x;
}

/**
 * Given an input time at a specific distance, reverse-solve to find the 100m equivalent (x).
 * Matches brianmac algorithm: iterates from 9.9 in 0.001 increments until the polynomial
 * output meets or exceeds the input time. Uses the same precision as the original.
 */
function solve100mEquivalent(distance: number, time: number): number | null {
  if (distance === 100) return time;

  const coeff = COEFFICIENTS[distance];
  if (!coeff) return null;

  // Match brianmac: iterate x from 9.9 upward in 0.001 steps
  for (let x = 9.9; x <= 15.2; x += 0.001) {
    const predicted = polynomial(coeff, x);
    if (predicted >= time) {
      return Math.round(x * 1000) / 1000;
    }
  }

  // Fallback: brute-force closest match (for edge cases where polynomial decreases)
  let bestX = 9.9;
  let bestDiff = Math.abs(polynomial(coeff, bestX) - time);
  for (let x = 9.9; x <= 15.2; x += 0.001) {
    const diff = Math.abs(polynomial(coeff, x) - time);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestX = x;
    }
  }
  return Math.round(bestX * 1000) / 1000;
}

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
    if (distance <= 100) return colors.primary;
    return colors.orange;
  }

  const validationError = (() => {
    if (!inputTimeNum || inputTimeNum <= 0) return null;
    const coeff = COEFFICIENTS[selectedDistance];
    if (!coeff) return null;
    if (inputTimeNum < coeff.min || inputTimeNum > coeff.max) {
      return `Valid range for ${selectedDistance}m: ${coeff.min}s - ${coeff.max}s`;
    }
    return null;
  })();

  const predictions = (() => {
    if (!inputTimeNum || inputTimeNum <= 0 || validationError) return [];

    const x = solve100mEquivalent(selectedDistance, inputTimeNum);
    if (x === null) return [];

    return DISTANCES.map(d => {
      const coeff = COEFFICIENTS[d];
      const predicted = d === selectedDistance ? inputTimeNum : polynomial(coeff, x);
      const time = Math.round(predicted * 100) / 100;
      const delta = +(time - inputTimeNum).toFixed(2);
      return { distance: d, time, delta, isInput: d === selectedDistance };
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
        <Text style={styles.description}>
          Enter your time for a distance and predict your performance at other sprint distances using the brianmac / Dick (1987) quadratic polynomial model.
        </Text>

        <View style={styles.inputSection}>
          <TouchableOpacity style={styles.distancePicker} onPress={() => { impactLight(); setShowPicker(true); }} testID="tools.sprint_predictor.predict">
            <Text style={styles.distanceText}>{formatDistanceLabel(selectedDistance, settings.distanceUnit)}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.timeInput}
            value={inputTime}
            onChangeText={(text) => setInputTime(text.replace(',', '.'))}
            placeholder="Time (seconds)"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
            testID="tools.sprint_predictor.input"
          />
        </View>

        {validationError && (
          <View style={styles.validationError}>
            <Ionicons name="warning-outline" size={16} color={colors.red} />
            <Text style={styles.validationErrorText}>{validationError}</Text>
          </View>
        )}

        {predictions.length > 0 ? (
          <View style={styles.resultsSection} testID="tools.sprint_predictor.result">
            <Text style={styles.resultsTitle}>Predicted Times</Text>
            {predictions.map((p) => (
              <View
                key={p.distance}
                style={[
                  styles.resultCard,
                  { borderLeftColor: getDistanceColor(p.distance) },
                  p.isInput && styles.resultCardHighlighted,
                ]}
              >
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.resultDistance}>
                      {formatDistanceLabel(p.distance, settings.distanceUnit)}
                    </Text>
                    {p.isInput && (
                      <View style={styles.inputBadge}>
                        <Text style={styles.inputBadgeText}>INPUT</Text>
                      </View>
                    )}
                  </View>
                  {settings.showDelta && !p.isInput && (
                    <Text style={styles.resultDelta}>
                      {p.delta >= 0 ? '+' : ''}{p.delta.toFixed(2)}s
                    </Text>
                  )}
                </View>
                <Text style={[styles.resultTime, p.isInput && styles.resultTimeHighlighted]}>
                  {p.time.toFixed(2)}s
                </Text>
              </View>
            ))}
            <Text style={styles.timingNote}>
              100m/200m are electronic timings; shorter distances are hand timings (+0.24s)
            </Text>
          </View>
        ) : !validationError ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={56} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Enter your time above to see predictions</Text>
          </View>
        ) : null}
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
  inputSection: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  distancePicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary },
  distanceText: { ...typography.h3, color: colors.primary },
  timeInput: { flex: 1, ...typography.body, color: colors.text.primary, backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  validationError: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
  validationErrorText: { ...typography.caption, color: colors.red },
  resultsSection: { gap: spacing.sm, marginTop: spacing.md },
  resultsTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.sm },
  resultCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.md, padding: spacing.md, borderLeftWidth: 3 },
  resultCardHighlighted: { borderWidth: 1, borderColor: colors.primary, borderLeftWidth: 3 },
  resultDistance: { ...typography.body, color: colors.text.secondary, fontWeight: '600' },
  resultDelta: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  resultTime: { ...typography.h3, color: colors.primary },
  resultTimeHighlighted: { color: colors.text.primary },
  inputBadge: { backgroundColor: colors.primary, borderRadius: borderRadius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  inputBadgeText: { ...typography.caption, color: '#FFFFFF', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  timingNote: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm, fontStyle: 'italic', textAlign: 'center' },
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
