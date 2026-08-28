import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { IconBtn, Btn, Card, Pill, RouteStrip, Skeleton, useToast } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';
import { useTripAssignment, useCurrentTrip, useStartTrip, useEndTrip, useRoster, useBoarding } from '@/features/trip/hooks';
import { startBroadcast, stopBroadcast } from '@/features/trip/broadcaster';
import { simulateBusPosition } from '@/features/trip/simulateBus';
import type { TripDirection, TripSummary, BoardingState } from '@/data/domain';

const NEXT: Record<BoardingState, BoardingState> = { boarded: 'dropped', dropped: 'absent', absent: 'boarded' };

const RosterPanel: React.FC<{ tripId: string; accent: string }> = ({ tripId, accent }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const roster = useRoster(tripId);
  const boarding = useBoarding(tripId);
  const stateFor = (studentId: string): BoardingState =>
    boarding.data?.find((b) => b.studentId === studentId)?.state ?? 'absent';
  const onBoard = roster.data?.filter((s) => stateFor(s.id) === 'boarded').length ?? 0;
  const total = roster.data?.length ?? 0;

  return (
    <Card>
      <View style={styles.rosterHead}>
        <Text style={[TextScale.cardTitle, { color: accent }]}>{t('trip.roster')}</Text>
        <Text testID="headcount" style={[TextScale.bodyStrong, { color: colors.ink }]}>{`${onBoard} / ${total}`}</Text>
      </View>
      {roster.data?.map((s) => {
        const st = stateFor(s.id);
        const color = st === 'boarded' ? colors.success : st === 'dropped' ? colors.inkSoft : colors.danger;
        return (
          <Pressable
            key={s.id}
            testID={`roster-${s.id}`}
            onPress={() => boarding.setBoarding.mutate({ tripId, studentId: s.id, stopId: s.stopId, state: NEXT[st], at: new Date().toISOString() })}
            style={[styles.rosterRow, { borderColor: colors.sunken }]}
          >
            <Text style={[TextScale.body, { color: colors.ink, flex: 1 }]}>{s.name}</Text>
            <Text style={[TextScale.caption, { color }]}>{t(`trip.boarding.${st}`)}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
};

export const TripScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();
  const repos = useRepositories();
  const toast = useToast();
  const assignment = useTripAssignment();
  const current = useCurrentTrip();
  const startTrip = useStartTrip();
  const endTrip = useEndTrip();
  const [direction, setDirection] = useState<TripDirection>('pickup');
  const [summary, setSummary] = useState<TripSummary | null>(null);
  // Tick state so the RouteStrip advances every 5 s without a full refetch.
  const [now, setNow] = useState(() => Date.now());

  const accent = role.accent;
  const trip = current.data;

  // Update 'now' every 5 s while a live trip is active so progress animates.
  useEffect(() => {
    if (!trip) return;
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [trip]);

  const onStart = async () => {
    if (!assignment.data) return;
    const started = await startTrip.mutateAsync({
      routeId: assignment.data.route.id, direction, busNo: assignment.data.busNo,
    });
    const ok = await startBroadcast({ tripId: started.id, onPing: (p) => repos.trip.publishPing(p) });
    if (!ok) {
      toast.show(t('trip.permissionDenied'), 'error');
      await endTrip.mutateAsync(started.id);
    }
  };

  const onEnd = async () => {
    if (!trip) return;
    await stopBroadcast().catch(() => {});
    const s = await endTrip.mutateAsync(trip.id);
    setSummary(s);
  };

  // Derive live bus position from simulated route progress.
  const routeProgress = useCallback(() => {
    if (!trip || !assignment.data) return { progress: 0, currentStopName: undefined, nextStopName: undefined };
    const stops = assignment.data.route.stops;
    const lastStop = stops[stops.length - 1];
    const totalMs = (lastStop?.etaMin ?? 30) * 60 * 1000;
    const elapsed = trip.startedAt ? now - Date.parse(trip.startedAt) : 0;
    const progress = Math.max(0, Math.min(1, totalMs > 0 ? elapsed / totalMs : 0));
    const sim = simulateBusPosition(assignment.data.route, elapsed, totalMs);
    return {
      progress,
      currentStopName: stops[sim.segmentIndex]?.name,
      nextStopName: stops[sim.segmentIndex + 1]?.name,
    };
  }, [trip, assignment.data, now]);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <IconBtn icon="back" label={t('common.back')} onPress={() => navigation.goBack()} />
        <Text style={[TextScale.screenTitle, { color: colors.ink }]}>{t('trip.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {assignment.isLoading || current.isLoading ? (
          <Skeleton width="100%" height={160} radius={16} />
        ) : assignment.isError ? (
          <ErrorState onRetry={assignment.refetch} />
        ) : summary ? (
          <Card>
            <Text style={[TextScale.cardTitle, { color: accent }]}>{t('trip.summaryTitle')}</Text>
            <Text style={[TextScale.body, { color: colors.ink, marginTop: 8 }]}>
              {t('trip.summaryLine', { min: summary.durationMin, km: summary.distanceKm, stops: summary.stopsCovered })}
            </Text>
            <Btn label={t('common.done')} onPress={() => navigation.goBack()} accent={accent} style={styles.cta} />
          </Card>
        ) : trip ? (
          <>
            <View style={[styles.banner, { backgroundColor: accent }]}>
              <Text style={[TextScale.bodyStrong, { color: '#FFFFFF' }]}>{t('trip.broadcasting')}</Text>
            </View>
            {assignment.data && (() => {
              const { progress, currentStopName, nextStopName } = routeProgress();
              return (
                <RouteStrip
                  route={assignment.data.route}
                  progress={progress}
                  accent={accent}
                  currentStopName={currentStopName}
                  nextStopName={nextStopName}
                />
              );
            })()}
            <Card>
              <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('trip.bus')}</Text>
              <Text style={[TextScale.body, { color: colors.ink }]}>{trip.busNo}</Text>
            </Card>
            {role.key === 'conductor' && <RosterPanel tripId={trip.id} accent={accent} />}
            <Btn testID="trip-end" label={t('trip.end')} onPress={onEnd} accent={colors.danger} loading={endTrip.isPending} style={styles.cta} />
          </>
        ) : (
          <>
            {assignment.data && (
              <Card>
                <Text style={[TextScale.cardTitle, { color: accent }]}>{assignment.data.route.name}</Text>
                <Text style={[TextScale.caption, { color: colors.inkSoft, marginTop: 4 }]}>{assignment.data.busNo}</Text>
                <View style={styles.pillRow}>
                  <Pill label={`${t('trip.stops')} · ${assignment.data.route.stops.length}`} color={accent} bg={colors.surface2} icon="route" />
                  {assignment.data.conductorName ? (
                    <Pill label={`${t('role.conductor')} · ${assignment.data.conductorName}`} color={colors.primary} bg={colors.primaryDim} icon="visitor" />
                  ) : null}
                </View>
              </Card>
            )}
            <View style={styles.segment}>
              {(['pickup', 'drop'] as TripDirection[]).map((d) => (
                <Pressable
                  key={d}
                  testID={`trip-dir-${d}`}
                  onPress={() => setDirection(d)}
                  style={[styles.segBtn, { backgroundColor: direction === d ? accent : colors.surface, borderColor: accent }]}
                >
                  <Text style={[TextScale.bodyStrong, { color: direction === d ? '#FFFFFF' : accent }]}>{t(`trip.dir.${d}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Btn testID="trip-start" label={t('trip.start')} onPress={onStart} accent={accent} loading={startTrip.isPending} style={styles.cta} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerSpacer: { flex: 1 },
  body: { padding: 16, gap: 12 },
  banner: { borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  segment: { flexDirection: 'row', gap: 10 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  cta: { marginTop: 4 },
  rosterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1 },
});
