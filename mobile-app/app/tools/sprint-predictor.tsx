import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

// Dick (1987) conversion factors relative to 100m
const CONVERSION_FACTORS: Record<number, number> = {
  30: 0.371, 40: 0.441, 50: 0.510, 55: 0.543,
  60: 0.577, 80: 0.710, 100: 1.000, 110: 1.064,
  150: 1.350, 200: 1.730, 250: 2.120,
};

const DISTANCES = Object.keys(CONVERSION_FACTORS).map(Number);

export default function SprintPredictorScreen() {
  const [selectedDistance, setSelectedDistance] = useState(100);
  const [inputTime, setInputTime] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const predictions = (() => {
    const time = parseFloat(inputTime);
    if (!time || time <= 0) return [];

    const baseFactor = CONVERSION_FACTORS[selectedDistance];
    const equivalent100m = time / baseFactor;

    return DISTANCES.filter(d => d !== selectedDistance).map(d => ({
      distance: d,
      time: +(equivalent100m * CONVERSION_FACTORS[d]).toFixed(2),
    }));
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sprint Predictor</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>Enter your time for a distance and predict your performance at other sprint distances using the Dick (1987) conversion model.</Text>

        <View style={styles.inputSection}>
          <TouchableOpacity style={styles.distancePicker} onPress={() => setShowPicker(true)}>
            <Text style={styles.distanceText}>{selectedDistance}m</Text>
            <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
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

        {predictions.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Predicted Times</Text>
            {predictions.map((p) => (
              <View key={p.distance} style={styles.resultCard}>
                <Text style={styles.resultDistance}>{p.distance}m</Text>
                <Text style={styles.resultTime}>{p.time}s</Text>
              </View>
            ))}
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
                  onPress={() => { setSelectedDistance(item); setShowPicker(false); }}
                >
                  <Text style={[styles.modalOptionText, item === selectedDistance && styles.modalOptionTextSelected]}>{item}m</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  description: { ...typography.caption, color: colors.text.secondary, marginBottom: spacing.lg },
  inputSection: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  distancePicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  distanceText: { ...typography.h3, color: colors.text.primary },
  timeInput: { flex: 1, ...typography.body, color: colors.text.primary, backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  resultsSection: { gap: spacing.sm },
  resultsTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.sm },
  resultCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.md, padding: spacing.md },
  resultDistance: { ...typography.body, color: colors.text.secondary, fontWeight: '600' },
  resultTime: { ...typography.h3, color: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background.cardSolid, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.background.secondary },
  modalTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  modalOption: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.background.secondary },
  modalOptionSelected: { backgroundColor: 'rgba(10, 132, 255, 0.1)' },
  modalOptionText: { ...typography.body, color: colors.text.primary, textAlign: 'center' },
  modalOptionTextSelected: { color: colors.primary, fontWeight: '600' },
});
