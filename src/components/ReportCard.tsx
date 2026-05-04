import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Report } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { APP_THEME } from '../constants';

interface Props {
  report: Report;
  onPress: () => void;
}

export function ReportCard({ report, onPress }: Props) {
  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <Text style={styles.category}>{report.category}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{report.title}</Text>
      {report.description ? (
        <Text style={styles.description} numberOfLines={2}>{report.description}</Text>
      ) : null}
      <View style={styles.footer}>
        <SeverityBadge severity={report.severity} />
        <View style={styles.spacer} />
        <StatusBadge status={report.status} />
      </View>
      {report.location ? (
        <Text style={styles.location} numberOfLines={1}>📍 {report.location}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: APP_THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  category: {
    fontSize: 12,
    color: APP_THEME.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: APP_THEME.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_THEME.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: APP_THEME.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  spacer: { flex: 1 },
  location: {
    fontSize: 12,
    color: APP_THEME.textSecondary,
    marginTop: 4,
  },
});
