import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useTheme } from '@/theme';
import { IconBtn, Skeleton, useToast } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';
import { Text } from 'react-native';
import { useTripAssignment, useCurrentTrip } from '@/features/trip/hooks';
import { LiveMapView } from '@/features/map/LiveMapView';

export const LiveMapScreen = ({ navigation, route }: { navigation: any; route: { params: { tripId: string } } }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const assignment = useTripAssignment();
  const current = useCurrentTrip();
  const [liveMarker, setLiveMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        toast.show(t('trip.locationDenied'), 'error');
        return;
      }
      try {
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            if (!cancelled) {
              setLiveMarker({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            }
          }
        );
        if (cancelled) {
          sub.remove();
        } else {
          subscription = sub;
        }
      } catch {
        // GPS unavailable — leave liveMarker null, route/stops still render.
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <IconBtn icon="back" label={t('common.back')} onPress={() => navigation.goBack()} />
        <Text style={[TextScale.screenTitle, { color: colors.ink }]}>{t('trip.viewMap')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        {assignment.isLoading || current.isLoading ? (
          <Skeleton width="100%" radius={16} style={styles.body} />
        ) : assignment.isError ? (
          <ErrorState onRetry={assignment.refetch} />
        ) : (
          <LiveMapView stops={assignment.data?.route.stops ?? []} liveMarker={liveMarker} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerSpacer: { flex: 1 },
  body: { flex: 1 },
});
