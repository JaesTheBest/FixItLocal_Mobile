import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReportStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface Props {
  status: ReportStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] + '22', borderColor: STATUS_COLORS[status] }]}>
      <Text style={[styles.text, { color: STATUS_COLORS[status] }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
