import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function PhotoFinishScreen() {
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const player = useVideoPlayer(videoUri || '', (p) => {
    p.loop = false;
  });

  const pickVideo = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
      if (!result.canceled && result.assets?.[0]) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick video:', error);
    }
  }, []);

  const STEPS = [
    { num: '1', text: 'Record a sprint finish' },
    { num: '2', text: 'Scrub frame-by-frame' },
    { num: '3', text: 'Determine the winner' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Finish</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {videoUri ? (
          <View style={styles.videoContainer}>
            <VideoView player={player} style={styles.video} contentFit="contain" />
            <TouchableOpacity style={styles.changeButton} onPress={pickVideo}>
              <Ionicons name="refresh-outline" size={20} color={colors.text.primary} />
              <Text style={styles.changeText}>Change Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Ionicons name="videocam-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Select a Video</Text>
            <Text style={styles.emptySubtitle}>Pick a finish-line video to analyze frame by frame</Text>

            <TouchableOpacity onPress={pickVideo} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.primary, '#0066CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pickButton}
              >
                <Ionicons name="folder-open-outline" size={20} color={colors.text.primary} />
                <Text style={styles.pickText}>Choose Video</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.stepsContainer}>
              {STEPS.map((step) => (
                <View key={step.num} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>{step.num}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  content: { flex: 1 },
  videoContainer: { flex: 1 },
  video: { flex: 1 },
  changeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.background.cardSolid },
  changeText: { ...typography.body, color: colors.text.primary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(10, 132, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, color: colors.text.primary },
  emptySubtitle: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  pickButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.xl },
  pickText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  stepsContainer: { marginTop: spacing.xl * 2, width: '100%', gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background.cardSolid, alignItems: 'center', justifyContent: 'center' },
  stepNum: { ...typography.captionBold, color: colors.text.secondary },
  stepText: { ...typography.body, color: colors.text.secondary },
});
