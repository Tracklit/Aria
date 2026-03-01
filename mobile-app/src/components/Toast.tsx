import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
  visible: boolean;
}

const { width } = Dimensions.get('window');

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onHide,
  visible,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 60,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color={colors.green} />;
      case 'error':
        return <Ionicons name="close-circle" size={24} color={colors.red} />;
      case 'warning':
        return <Ionicons name="warning" size={24} color={colors.yellow} />;
      case 'info':
        return <Ionicons name="information-circle" size={24} color={colors.primary} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.green + '20';
      case 'error':
        return colors.red + '20';
      case 'warning':
        return colors.yellow + '20';
      case 'info':
        return colors.primary + '20';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={hideToast}
        activeOpacity={0.9}
      >
        {getIcon()}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background.cardSolid,
    borderWidth: 1,
    borderColor: colors.background.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
});

// Toast Manager for showing toasts from anywhere
class ToastManager {
  private static listeners: ((message: string, type: ToastType) => void)[] = [];

  static show(message: string, type: ToastType = 'success') {
    this.listeners.forEach(listener => listener(message, type));
  }

  static success(message: string) {
    this.show(message, 'success');
  }

  static error(message: string) {
    this.show(message, 'error');
  }

  static info(message: string) {
    this.show(message, 'info');
  }

  static warning(message: string) {
    this.show(message, 'warning');
  }

  static addListener(listener: (message: string, type: ToastType) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export { ToastManager };

// Toast Container to be added at root level
export const ToastContainer: React.FC = () => {
  const [toast, setToast] = React.useState<{
    message: string;
    type: ToastType;
    visible: boolean;
  }>({ message: '', type: 'success', visible: false });

  useEffect(() => {
    const unsubscribe = ToastManager.addListener((message, type) => {
      setToast({ message, type, visible: true });
    });

    return unsubscribe;
  }, []);

  return (
    <Toast
      message={toast.message}
      type={toast.type}
      visible={toast.visible}
      onHide={() => setToast(prev => ({ ...prev, visible: false }))}
    />
  );
};
