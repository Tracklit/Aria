import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  Avatar as GSAvatar,
  AvatarFallbackText,
  AvatarImage,
  Spinner,
} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../theme';

interface AvatarProps {
  uri?: string;
  size?: 'small' | 'medium' | 'large';
  showGradientRing?: boolean;
  fallbackText?: string;
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
  fallbackText,
  style,
}) => {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const retryCount = useRef(0);
  const [effectiveUri, setEffectiveUri] = useState(uri);

  useEffect(() => {
    setHasError(false);
    retryCount.current = 0;
    setEffectiveUri(uri);
  }, [uri]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    if (retryCount.current < 2 && uri) {
      retryCount.current += 1;
      const separator = uri.includes('?') ? '&' : '?';
      setEffectiveUri(`${uri}${separator}t=${Date.now()}`);
    } else {
      setHasError(true);
    }
  }, [uri]);

  const avatarSize = SIZES[size];
  const containerSize = showGradientRing ? avatarSize + RING_WIDTH * 4 : avatarSize;

  const showPlaceholder = !effectiveUri || hasError;
  const showSpinner = effectiveUri && isLoading && !hasError;

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
              <>
                <GSAvatar style={[styles.avatar, { width: avatarSize, height: avatarSize }]}>
                  <AvatarImage
                    source={{ uri: effectiveUri }}
                    alt="Profile avatar"
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                    onError={handleError}
                  />
                </GSAvatar>
                {showSpinner ? (
                  <View style={styles.loadingOverlay}>
                    <Spinner size="small" color={colors.primary} />
                  </View>
                ) : null}
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
        <GSAvatar style={[styles.avatar, { backgroundColor: colors.background.cardSolid }, { width: avatarSize, height: avatarSize }]}>
          <AvatarFallbackText>{fallbackText || 'AR'}</AvatarFallbackText>
        </GSAvatar>
      ) : (
        <>
          <GSAvatar style={[styles.avatar, { width: avatarSize, height: avatarSize }]}>
            <AvatarImage
              source={{ uri: effectiveUri }}
              alt="Profile avatar"
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={handleError}
            />
          </GSAvatar>
          {showSpinner ? (
            <View style={styles.loadingOverlay}>
              <Spinner size="small" color={colors.primary} />
            </View>
          ) : null}
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
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderRadius: 9999,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 9999,
  },
});
