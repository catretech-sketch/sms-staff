// src/screens/AttendanceScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import {
  GeoRadar,
  CheckInButton,
  Confetti,
  type ConfettiHandle,
  IconBtn,
} from '@/components/ui';
import {
  useAttendanceStatus,
  useCheckIn,
  useCheckOut,
} from '@/features/attendance/hooks';

export interface AttendanceScreenProps {
  navigation: any;
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();

  const att = useAttendanceStatus();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const confettiRef = useRef<ConfettiHandle>(null);

  // Geo state: 'locating' while waiting for location, then resolved
  const [locating, setLocating] = useState(true);
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

  // Demo toggle: overrides derived in/out range
  // null = not yet chosen by user (derive from real geo, which is out-of-scope)
  // true = forced in-range; false = forced out-of-range
  const [demoInRange, setDemoInRange] = useState<boolean | null>(null);

  const [busy, setBusy] = useState(false);

  // Unmount guard — prevents setState after navigation away
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Request location on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status === 'granted') {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            if (!cancelled) {
              setPosition({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: loc.coords.accuracy ?? 0,
              });
            }
          } catch {
            // GPS unavailable — just stop locating
          }
        }
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Effective in-range: demo toggle takes precedence; otherwise default false (real geo out of scope)
  const inRange = demoInRange !== null ? demoInRange : false;

  // Derive GeoRadar state
  const radarState: 'locating' | 'in' | 'out' = locating
    ? 'locating'
    : inRange
      ? 'in'
      : 'out';

  // Derive CheckInButton state
  type CIState = 'locating' | 'out' | 'ready' | 'checkedIn';
  const checkInState: CIState = att.data?.checkedIn
    ? 'checkedIn'
    : locating
      ? 'locating'
      : !inRange
        ? 'out'
        : 'ready';

  const handlePress = useCallback(async () => {
    if (checkInState === 'ready') {
      setBusy(true);
      await new Promise<void>(resolve => setTimeout(resolve, 650));
      if (!mountedRef.current) return;
      try {
        await checkIn.mutateAsync({ at: new Date().toISOString(), inZone: true });
        if (!mountedRef.current) return;
        confettiRef.current?.fire();
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    } else if (checkInState === 'checkedIn') {
      checkOut.mutate({ at: new Date().toISOString() });
    }
  }, [checkInState, checkIn, checkOut]);

  // Helper text
  // TODO: real distance needs geofence-center coords added to the Attendance domain in a future spec
  const helperText = locating
    ? t('attendance.locating')
    : inRange
      ? t('attendance.inZone')
      : t('attendance.outZone', { m: '?' });

  // Today log row: show if checked in or there's a lastLog entry
  const logTime = att.data?.checkInAt
    ? new Date(att.data.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : att.data?.lastLog?.[0]?.at
      ? new Date(att.data.lastLog[0].at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

  const showLog = att.data?.checkedIn || (att.data?.lastLog?.length ?? 0) > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Back header */}
      <View style={styles.header}>
        <IconBtn
          icon="back"
          onPress={() => navigation.goBack()}
          label={t('attendance.title')}
          color={colors.ink}
        />
        <Text style={[TextScale.screenTitle, styles.headerTitle, { color: colors.ink }]}>
          {t('attendance.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* GeoRadar */}
        <View style={styles.radarRow}>
          {/* TODO: real distance needs geofence-center coords added to the Attendance domain in a future spec */}
          <GeoRadar
            state={radarState}
            distanceM={undefined}
            accuracyM={position?.accuracy}
            accent={role.accent}
          />
        </View>

        {/* Demo range segmented toggle */}
        <View style={styles.segmented}>
          <Pressable
            testID="demo-in-range"
            onPress={() => { setDemoInRange(true); setLocating(false); }}
            style={[
              styles.segBtn,
              styles.segBtnLeft,
              {
                backgroundColor: demoInRange === true ? role.accent : colors.surface,
                borderColor: colors.line,
              },
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                TextScale.caption,
                { color: demoInRange === true ? colors.onPrimary : colors.ink },
              ]}
            >
              {t('attendance.inRange')}
            </Text>
          </Pressable>
          <Pressable
            testID="demo-out-range"
            onPress={() => { setDemoInRange(false); setLocating(false); }}
            style={[
              styles.segBtn,
              styles.segBtnRight,
              {
                backgroundColor: demoInRange === false ? colors.danger : colors.surface,
                borderColor: colors.line,
              },
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                TextScale.caption,
                { color: demoInRange === false ? colors.onPrimary : colors.ink },
              ]}
            >
              {t('attendance.outRange')}
            </Text>
          </Pressable>
        </View>

        {/* CheckInButton */}
        <View style={styles.btnRow}>
          <CheckInButton
            state={checkInState}
            busy={busy}
            onPress={handlePress}
            accent={role.accent}
          />
        </View>

        {/* Helper text */}
        <Text style={[TextScale.body, styles.helperText, { color: colors.inkSoft }]}>
          {helperText}
        </Text>

        {/* Today's log */}
        {showLog && logTime && (
          <View style={[styles.logRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
              {t('attendance.checkedInLog', { time: logTime })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confetti overlay */}
      <Confetti ref={confettiRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
  },
  radarRow: {
    marginTop: 16,
    alignItems: 'center',
    flexShrink: 0,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
  },
  segBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
  },
  segBtnRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  btnRow: {
    alignItems: 'center',
    flexShrink: 0,
  },
  helperText: {
    textAlign: 'center',
  },
  logRow: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
