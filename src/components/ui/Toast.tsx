// src/components/ui/Toast.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export interface ToastApi {
  show: (msg: string, kind?: 'info' | 'error' | 'success') => void;
}

interface ToastItem {
  id: number;
  msg: string;
  kind: 'info' | 'error' | 'success';
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  // Animation value shared per-toast — store by id
  const animsRef = useRef<Record<number, Animated.Value>>({});
  // Composite animations — store so we can stop them on unmount
  const compositeAnimsRef = useRef<Record<number, Animated.CompositeAnimation>>({});

  // Cancel all in-flight animations/timers on unmount
  useEffect(() => {
    const anims = compositeAnimsRef.current;
    return () => {
      Object.values(anims).forEach(a => a.stop());
    };
  }, []);

  const show = useCallback((msg: string, kind: 'info' | 'error' | 'success' = 'info') => {
    const id = ++idRef.current;
    const anim = new Animated.Value(0);
    animsRef.current[id] = anim;

    setToasts(prev => [...prev, { id, msg, kind }]);

    // Slide down + fade in, hold, then fade out
    const composite = Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.delay(1700),
      Animated.timing(anim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]);
    compositeAnimsRef.current[id] = composite;
    composite.start(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete animsRef.current[id];
      delete compositeAnimsRef.current[id];
    });
  }, []);

  const api: ToastApi = { show };

  function kindColor(kind: 'info' | 'error' | 'success'): string {
    if (kind === 'success') return colors.success;
    if (kind === 'error') return colors.danger;
    return colors.ink;
  }

  // Text must contrast with the banner background in both light and dark mode.
  // success/error use colors.success / colors.danger (mid-tone greens/reds) →
  //   white (onPrimary in light, or surface in dark) is readable.
  // info uses colors.ink (near-black in light, near-white in dark) →
  //   use colors.bg so the text always contrasts with the ink background.
  function kindTextColor(kind: 'info' | 'error' | 'success'): string {
    if (kind === 'info') return colors.bg;
    return colors.onPrimary;
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(toast => {
          const anim = animsRef.current[toast.id];
          if (!anim) return null;
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-60, 0],
          });
          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.banner,
                { backgroundColor: kindColor(toast.kind), opacity: anim, transform: [{ translateY }] },
              ]}
            >
              <Text style={[TextScale.body, styles.bannerText, { color: kindTextColor(toast.kind) }]}>{toast.msg}</Text>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: 52,
    gap: 8,
  },
  banner: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 220,
    maxWidth: 340,
    alignItems: 'center',
  },
  bannerText: {
    textAlign: 'center',
  },
});
