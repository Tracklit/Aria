import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface ToolSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onReset: () => void;
  children: React.ReactNode;
}

export function ToolSettingsModal({ visible, onClose, title, onReset, children }: ToolSettingsModalProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {children}
            <TouchableOpacity style={styles.resetButton} onPress={onReset}>
              <Ionicons name="refresh-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.resetText}>Reset to Defaults</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.background.cardSolid,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  title: { ...typography.body, color: colors.text.primary, fontWeight: '600', fontSize: 18 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  resetText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
});
