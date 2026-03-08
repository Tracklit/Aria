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
import { PhotoFinishSettings, DEFAULT_PHOTO_FINISH, OverlayLineType, OverlayLineStyle, OverlayLineColor } from '../../src/types/toolSettings';
import { ToolSettingsModal } from '../../src/components/tools/ToolSettingsModal';
import { SettingsToggleRow } from '../../src/components/tools/SettingsToggleRow';
import { SettingsChipRow } from '../../src/components/tools/SettingsChipRow';

const SPEED_OPTIONS = [0.25, 0.5, 1] as const;

const LINE_COLORS: Record<OverlayLineColor, string> = {
  red: 'rgba(255, 59, 48, 0.8)',
  white: 'rgba(255, 255, 255, 0.8)',
  yellow: 'rgba(255, 214, 10, 0.8)',
  cyan: 'rgba(0, 229, 255, 0.8)',
};

/** Returns array of line positions (0-100%) for a given overlay type */
function getLinePositions(type: OverlayLineType, customPos: number): number[] {
  switch (type) {
    case 'center': return [50];
    case 'thirds': return [33.33, 66.67];
    case 'quarter': return [25, 50, 75];
    case 'custom': return [customPos];
    default: return [];
  }
}

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
  const [startKeyframe, setStartKeyframe] = useState<number | null>(null);
  const [endKeyframe, setEndKeyframe] = useState<number | null>(null);

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

  const setStartMark = useCallback(() => {
    impactLight();
    setStartKeyframe(currentTime);
  }, [currentTime]);

  const setEndMark = useCallback(() => {
    impactLight();
    setEndKeyframe(currentTime);
  }, [currentTime]);

  const clearKeyframes = useCallback(() => {
    selectionChanged();
    setStartKeyframe(null);
    setEndKeyframe(null);
  }, []);

  // Loop between keyframes
  useEffect(() => {
    if (!player || startKeyframe === null || endKeyframe === null) return;
    if (startKeyframe >= endKeyframe) return;
    if (currentTime >= endKeyframe && isPlaying) {
      player.currentTime = startKeyframe;
    }
  }, [currentTime, startKeyframe, endKeyframe, isPlaying, player]);

  const keyframeDelta = (startKeyframe !== null && endKeyframe !== null && endKeyframe > startKeyframe)
    ? endKeyframe - startKeyframe
    : null;

  const frameCount = keyframeDelta !== null
    ? Math.round(keyframeDelta / settings.frameStep)
    : null;

  const applySelectedVideo = useCallback((uri: string) => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSpeed(1);
    setStartKeyframe(null);
    setEndKeyframe(null);
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
    const step = direction * settings.frameStep;
    const minTime = (settings.constrainToKeyframes && startKeyframe !== null && endKeyframe !== null && endKeyframe > startKeyframe)
      ? startKeyframe : 0;
    const maxTime = (settings.constrainToKeyframes && startKeyframe !== null && endKeyframe !== null && endKeyframe > startKeyframe)
      ? endKeyframe : (player.duration || duration);
    const newTime = Math.max(minTime, Math.min(maxTime, player.currentTime + step));
    player.currentTime = newTime;
    setCurrentTime(newTime);
  }, [player, settings.frameStep, settings.constrainToKeyframes, startKeyframe, endKeyframe, duration]);

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
              {settings.overlayLine !== 'none' && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {getLinePositions(settings.overlayLine, settings.customLinePosition).map((pos, i) =>
                    settings.overlayLineStyle === 'dashed' ? (
                      <View
                        key={i}
                        style={[styles.overlayLineContainer, { left: `${pos}%` }]}
                      >
                        {Array.from({ length: 60 }).map((_, j) => (
                          <View
                            key={j}
                            style={{
                              width: 2,
                              height: j % 2 === 0 ? 8 : 6,
                              backgroundColor: j % 2 === 0 ? LINE_COLORS[settings.overlayLineColor] : 'transparent',
                            }}
                          />
                        ))}
                      </View>
                    ) : (
                      <View
                        key={i}
                        style={[
                          styles.overlayLineSolid,
                          {
                            left: `${pos}%`,
                            backgroundColor: LINE_COLORS[settings.overlayLineColor],
                          },
                        ]}
                      />
                    )
                  )}
                </View>
              )}
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

            {/* Keyframe Controls */}
            <View style={styles.keyframeRow}>
              <TouchableOpacity style={[styles.keyframeButton, startKeyframe !== null && styles.keyframeButtonActive]} onPress={setStartMark}>
                <Ionicons name="flag-outline" size={16} color={startKeyframe !== null ? '#FFFFFF' : colors.text.secondary} />
                <Text style={[styles.keyframeLabel, startKeyframe !== null && styles.keyframeLabelActive]}>
                  {startKeyframe !== null ? formatTimestamp(startKeyframe, true) : 'START'}
                </Text>
              </TouchableOpacity>

              {keyframeDelta !== null && (
                <View style={styles.keyframeDelta}>
                  <Text style={styles.keyframeDeltaText}>{formatTimestamp(keyframeDelta, true)}</Text>
                  {frameCount !== null && <Text style={styles.keyframeFrameCount}>{frameCount} frames</Text>}
                </View>
              )}

              <TouchableOpacity style={[styles.keyframeButton, endKeyframe !== null && styles.keyframeButtonActive]} onPress={setEndMark}>
                <Ionicons name="flag" size={16} color={endKeyframe !== null ? '#FFFFFF' : colors.text.secondary} />
                <Text style={[styles.keyframeLabel, endKeyframe !== null && styles.keyframeLabelActive]}>
                  {endKeyframe !== null ? formatTimestamp(endKeyframe, true) : 'END'}
                </Text>
              </TouchableOpacity>

              {(startKeyframe !== null || endKeyframe !== null) && (
                <TouchableOpacity style={styles.clearKeyframes} onPress={clearKeyframes}>
                  <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Timeline Scrubber */}
            <View style={styles.sliderContainer}>
              {settings.constrainToKeyframes && startKeyframe !== null && endKeyframe !== null && endKeyframe > startKeyframe ? (
                <View>
                  <Slider
                    style={styles.slider}
                    minimumValue={startKeyframe}
                    maximumValue={endKeyframe}
                    value={Math.max(startKeyframe, Math.min(endKeyframe, currentTime))}
                    onValueChange={onSliderValueChange}
                    onSlidingStart={onSlidingStart}
                    onSlidingComplete={onSlidingComplete}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.text.tertiary}
                    thumbTintColor={colors.primary}
                  />
                  <View style={styles.constrainedLabel}>
                    <Ionicons name="lock-closed" size={10} color={colors.text.tertiary} />
                    <Text style={[styles.constrainedText, { color: colors.text.tertiary }]}>Constrained to keyframes</Text>
                  </View>
                </View>
              ) : (
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
              )}
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
        <SettingsChipRow
          label="Overlay Lines"
          options={[
            { label: 'None', value: 'none' as OverlayLineType },
            { label: 'Center', value: 'center' as OverlayLineType },
            { label: 'Thirds', value: 'thirds' as OverlayLineType },
            { label: 'Quarters', value: 'quarter' as OverlayLineType },
            { label: 'Custom', value: 'custom' as OverlayLineType },
          ]}
          selected={settings.overlayLine}
          onSelect={(val) => update({ overlayLine: val as OverlayLineType })}
        />
        {settings.overlayLine !== 'none' && (
          <>
            <SettingsChipRow
              label="Line Style"
              options={[
                { label: 'Dashed', value: 'dashed' as OverlayLineStyle },
                { label: 'Solid', value: 'solid' as OverlayLineStyle },
              ]}
              selected={settings.overlayLineStyle}
              onSelect={(val) => update({ overlayLineStyle: val as OverlayLineStyle })}
            />
            <SettingsChipRow
              label="Line Color"
              options={[
                { label: 'Red', value: 'red' as OverlayLineColor },
                { label: 'White', value: 'white' as OverlayLineColor },
                { label: 'Yellow', value: 'yellow' as OverlayLineColor },
                { label: 'Cyan', value: 'cyan' as OverlayLineColor },
              ]}
              selected={settings.overlayLineColor}
              onSelect={(val) => update({ overlayLineColor: val as OverlayLineColor })}
            />
          </>
        )}
        {settings.overlayLine === 'custom' && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={{ color: colors.text.primary, fontWeight: '600', marginBottom: 8 }}>
              Line Position: {settings.customLinePosition}%
            </Text>
            <Slider
              minimumValue={5}
              maximumValue={95}
              step={1}
              value={settings.customLinePosition}
              onSlidingComplete={(val) => update({ customLinePosition: val })}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.text.tertiary}
              thumbTintColor={colors.primary}
            />
          </View>
        )}
        <SettingsToggleRow
          label="Constrain to Keyframes"
          description="Lock slider and playback to keyframe range"
          value={settings.constrainToKeyframes}
          onValueChange={(val) => update({ constrainToKeyframes: val })}
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
  overlayLineContainer: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  overlayLineSolid: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: 2,
  },
  constrainedLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    marginTop: -4,
  },
  constrainedText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  keyframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  keyframeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.cardSolid,
  },
  keyframeButtonActive: {
    backgroundColor: colors.primary,
  },
  keyframeLabel: {
    ...typography.captionBold,
    color: colors.text.secondary,
  },
  keyframeLabelActive: {
    color: '#FFFFFF',
  },
  keyframeDelta: {
    alignItems: 'center',
  },
  keyframeDeltaText: {
    ...typography.data,
    fontSize: 14,
    color: colors.teal,
  },
  keyframeFrameCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  clearKeyframes: {
    padding: 4,
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
