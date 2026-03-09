import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import {
  Avatar as GSAvatar,
  AvatarFallbackText,
} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { getLocalProfileImageUri } from '../../lib/profileImageCache';
import { useColors } from '../../theme';

interface AvatarProps {
  uri?: string;
  localUri?: string;
  size?: 'small' | 'medium' | 'large' | number;
  showGradientRing?: boolean;
  fallbackText?: string;
  style?: ViewStyle;
}

const SIZES = {
  small: 40,
  medium: 60,
  large: 120,
};

const RING_WIDTH = 2;

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  localUri,
  size = 'medium',
  showGradientRing = false,
  fallbackText,
  style,
}) => {
  const colors = useColors();
  const [hasError, setHasError] = useState(false);
  const attemptedLocalFallback = useRef(false);
  const [effectiveUri, setEffectiveUri] = useState(uri || localUri);

  useEffect(() => {
    setHasError(false);
    attemptedLocalFallback.current = false;
    setEffectiveUri(uri || localUri);
  }, [uri, localUri]);

  const handleError = useCallback(() => {
    if (attemptedLocalFallback.current) {
      setHasError(true);
      return;
    }

    attemptedLocalFallback.current = true;

    const swapToLocalImage = async () => {
      const fallbackUri = localUri ?? await getLocalProfileImageUri();
      if (fallbackUri && fallbackUri !== effectiveUri) {
        setEffectiveUri(fallbackUri);
        return;
      }

      setHasError(true);
    };

    void swapToLocalImage();
  }, [effectiveUri, localUri]);

  const avatarSize = typeof size === 'number' ? size : SIZES[size];
  const containerSize = showGradientRing ? avatarSize + RING_WIDTH * 4 : avatarSize;

  const showPlaceholder = !effectiveUri || hasError;

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
                backgroundColor: colors.background.primary,
              },
            ]}
          >
            {showPlaceholder ? (
              <GSAvatar style={[styles.avatar, { backgroundColor: colors.background.cardSolid }, { width: avatarSize, height: avatarSize }]}>
                <AvatarFallbackText>{fallbackText || 'AR'}</AvatarFallbackText>
              </GSAvatar>
            ) : (
              <Image
                source={{ uri: effectiveUri }}
                style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
                onError={handleError}
              />
            )}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showPlaceholder ? (
        <GSAvatar style={[styles.avatar, { backgroundColor: colors.background.cardSolid }, { width: avatarSize, height: avatarSize }]}>
          <AvatarFallbackText>{fallbackText || 'AR'}</AvatarFallbackText>
        </GSAvatar>
      ) : (
        <Image
          source={{ uri: effectiveUri }}
          style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
          onError={handleError}
        />
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
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderRadius: 9999,
  },
});
