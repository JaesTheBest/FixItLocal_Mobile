import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReportSeverity } from '../types';
import { SEVERITY_COLORS } from '../constants';

interface Props {
  severity: ReportSeverity;
}

export function SeverityBadge({ severity }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[severity] }]}>
      <Text style={styles.text}>{severity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
