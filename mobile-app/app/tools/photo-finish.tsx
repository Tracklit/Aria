import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
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
            <Ionicons name="videocam-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>Select a Video</Text>
            <Text style={styles.emptySubtitle}>Pick a finish-line video to analyze frame by frame</Text>
            <TouchableOpacity style={styles.pickButton} onPress={pickVideo}>
              <Ionicons name="folder-open-outline" size={20} color={colors.text.primary} />
              <Text style={styles.pickText}>Choose Video</Text>
            </TouchableOpacity>
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
  emptyTitle: { ...typography.h2, color: colors.text.primary, marginTop: spacing.lg },
  emptySubtitle: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  pickButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.lg },
  pickText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
});
