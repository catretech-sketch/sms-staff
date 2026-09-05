import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from '@/components/icons';

export interface BusMarkerProps {
  headingDeg?: number;
}

export const BusMarker: React.FC<BusMarkerProps> = ({ headingDeg }) => (
  <View
    testID="bus-marker"
    style={[styles.wrap, headingDeg != null && { transform: [{ rotate: `${headingDeg}deg` }] }]}
  >
    <Icon name="bus" size={18} color="#FFFFFF" strokeWidth={2} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E5C4A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
