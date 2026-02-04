import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

interface AvatarProps {
  uri?: string;
  size?: 'small' | 'medium' | 'large';
  showGradientRing?: boolean;
  style?: ViewStyle;
}

const SIZES = {
  small: 48,
  medium: 80,
  large: 120,
};

const RING_WIDTH = 2;

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  size = 'medium',
  showGradientRing = false,
  style,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const avatarSize = SIZES[size];
  const containerSize = showGradientRing ? avatarSize + RING_WIDTH * 4 : avatarSize;

  const showPlaceholder = !uri || hasError;
  const showSpinner = uri && isLoading && !hasError;

  if (showGradientRing) {
    return (
      <View style={[styles.container, { width: containerSize, height: containerSize }, style]}>
        <LinearGradient
          colors={colors.gradient.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientRing, { width: containerSize, height: containerSize }]}
        >
          <View
            style={[
              styles.innerRing,
              {
                width: avatarSize + RING_WIDTH * 2,
                height: avatarSize + RING_WIDTH * 2,
              },
            ]}
          >
            {showPlaceholder ? (
              <View
                style={[
                  styles.avatar,
                  styles.placeholder,
                  { width: avatarSize, height: avatarSize },
                ]}
              />
            ) : (
              <>
                <Image
                  source={{ uri }}
                  style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                />
                {showSpinner && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
              </>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showPlaceholder ? (
        <View
          style={[
            styles.avatar,
            styles.placeholder,
            { width: avatarSize, height: avatarSize },
          ]}
        />
      ) : (
        <>
          <Image
            source={{ uri }}
            style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
          {showSpinner && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientRing: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    backgroundColor: colors.background.primary,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderRadius: 9999,
  },
  placeholder: {
    backgroundColor: colors.background.cardSolid,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 9999,
  },
});
