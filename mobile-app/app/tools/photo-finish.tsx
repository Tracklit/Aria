import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { impactLight, selectionChanged } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { useToolSettings } from '../../src/hooks/useToolSettings';
import { PhotoFinishSettings, DEFAULT_PHOTO_FINISH } from '../../src/types/toolSettings';
import { ToolSettingsModal } from '../../src/components/tools/ToolSettingsModal';
import { SettingsToggleRow } from '../../src/components/tools/SettingsToggleRow';
import { SettingsChipRow } from '../../src/components/tools/SettingsChipRow';

const SPEED_OPTIONS = [0.25, 0.5, 1] as const;

function formatTimestamp(seconds: number, showMs: boolean): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (!showMs) {
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export default function PhotoFinishScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { settings, loaded, update, reset } = useToolSettings<PhotoFinishSettings>(
    'aria_photofinish_settings',
    DEFAULT_PHOTO_FINISH,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    if (loaded) {
      setSpeed(settings.defaultSpeed);
    }
  }, [loaded]);

  const player = useVideoPlayer(videoUri || '', (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.05;
  });

  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsLoading(status === 'loading');
      if (status === 'readyToPlay') {
        setDuration(player.duration);
      }
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying: playing }) => {
      setIsPlaying(playing);
    });

    const timeSub = player.addListener('timeUpdate', ({ currentTime: time }) => {
      if (!isSeeking) {
        setCurrentTime(time);
      }
    });

    const sourceSub = player.addListener('sourceLoad', ({ duration: dur }) => {
      setDuration(dur);
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
      timeSub.remove();
      sourceSub.remove();
    };
  }, [player, isSeeking]);

  const applySelectedVideo = useCallback((uri: string) => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSpeed(1);
    setVideoUri(uri);
  }, []);

  const pickVideoFromFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
      if (!result.canceled && result.assets?.[0]?.uri) {
        applySelectedVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick video:', error);
    }
  }, [applySelectedVideo]);

  const pickVideoFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to choose a video.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        applySelectedVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick video from gallery:', error);
    }
  }, [applySelectedVideo]);

  const pickVideo = useCallback(() => {
    impactLight();
    Alert.alert(
      'Select Video Source',
      'Choose where to pick your race video from.',
      [
        { text: 'Photo Gallery', onPress: () => { void pickVideoFromGallery(); } },
        { text: 'Files', onPress: () => { void pickVideoFromFiles(); } },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [pickVideoFromFiles, pickVideoFromGallery]);

  const togglePlayPause = useCallback(() => {
    if (!player) return;
    impactLight();
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const stepFrame = useCallback((direction: -1 | 1) => {
    if (!player) return;
    selectionChanged();
    player.pause();
    player.seekBy(direction * settings.frameStep);
  }, [player, settings.frameStep]);

  const changeSpeed = useCallback((newSpeed: number) => {
    if (!player) return;
    selectionChanged();
    setSpeed(newSpeed);
    player.playbackRate = newSpeed;
  }, [player]);

  const onSliderValueChange = useCallback((value: number) => {
    setCurrentTime(value);
  }, []);

  const onSlidingStart = useCallback(() => {
    setIsSeeking(true);
    if (settings.autoPauseOnScrub && player) {
      player.pause();
    }
  }, [settings.autoPauseOnScrub, player]);

  const onSlidingComplete = useCallback((value: number) => {
    if (!player) return;
    player.currentTime = value;
    setCurrentTime(value);
    setIsSeeking(false);
  }, [player]);

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
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {videoUri ? (
          <View style={styles.videoContainer}>
            <View style={styles.videoWrapper}>
              <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading video...</Text>
                </View>
              )}
            </View>

            {/* Timestamp */}
            <View style={styles.timestampContainer}>
              <Text style={styles.timestamp}>{formatTimestamp(currentTime, settings.showMilliseconds)}</Text>
              <Text style={styles.timestampSeparator}>/</Text>
              <Text style={styles.timestampTotal}>{formatTimestamp(duration, settings.showMilliseconds)}</Text>
            </View>

            {/* Timeline Scrubber */}
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration || 1}
                value={currentTime}
                onValueChange={onSliderValueChange}
                onSlidingStart={onSlidingStart}
                onSlidingComplete={onSlidingComplete}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.text.tertiary}
                thumbTintColor={colors.primary}
              />
            </View>

            {/* Playback Controls */}
            <View style={styles.controlsBar}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => stepFrame(-1)}
                activeOpacity={0.7}
              >
                <Ionicons name="play-back" size={24} color={colors.text.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={colors.background.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => stepFrame(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="play-forward" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Speed Selector */}
            <View style={styles.speedRow}>
              {SPEED_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.speedButton,
                    speed === s && styles.speedButtonActive,
                  ]}
                  onPress={() => changeSpeed(s)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.speedText,
                      speed === s && styles.speedTextActive,
                    ]}
                  >
                    {s}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Change Video */}
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
      <ToolSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        title="Photo Finish Settings"
        onReset={reset}
      >
        <SettingsChipRow
          label="Default Playback Speed"
          options={[
            { label: '0.25x', value: 0.25 },
            { label: '0.5x', value: 0.5 },
            { label: '1x', value: 1 },
          ]}
          selected={settings.defaultSpeed}
          onSelect={(val) => update({ defaultSpeed: val as PhotoFinishSettings['defaultSpeed'] })}
        />
        <SettingsChipRow
          label="Frame Step Precision"
          options={[
            { label: '1/30', value: 1 / 30 },
            { label: '1/60', value: 1 / 60 },
            { label: '1/120', value: 1 / 120 },
          ]}
          selected={settings.frameStep}
          onSelect={(val) => update({ frameStep: val })}
        />
        <SettingsToggleRow
          label="Auto-pause on Scrub"
          description="Pause playback when you start scrubbing"
          value={settings.autoPauseOnScrub}
          onValueChange={(val) => update({ autoPauseOnScrub: val })}
        />
        <SettingsToggleRow
          label="Show Milliseconds"
          description="Display milliseconds in the timestamp"
          value={settings.showMilliseconds}
          onValueChange={(val) => update({ showMilliseconds: val })}
        />
      </ToolSettingsModal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  content: { flex: 1 },
  videoContainer: { flex: 1 },
  videoWrapper: { flex: 1, position: 'relative' },
  video: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { ...typography.caption, color: colors.text.secondary },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  timestamp: {
    ...typography.data,
    fontSize: 20,
    color: colors.primary,
  },
  timestampSeparator: {
    ...typography.data,
    fontSize: 16,
    color: colors.text.tertiary,
  },
  timestampTotal: {
    ...typography.data,
    fontSize: 16,
    color: colors.text.secondary,
  },
  sliderContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.cardSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  speedButton: {
    minWidth: 56,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.cardSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonActive: {
    backgroundColor: colors.primary,
  },
  speedText: {
    ...typography.bodyBold,
    color: colors.text.secondary,
  },
  speedTextActive: {
    color: colors.background.primary,
  },
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
