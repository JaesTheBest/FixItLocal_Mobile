import { ReportSeverity, ReportStatus } from '../types';

export const REPORT_CATEGORIES = [
  'Pothole',
  'Fallen Tree',
  'Water Leak',
  'Graffiti',
  'Broken Street Light',
  'Damaged Road Sign',
  'Flooding',
  'Abandoned Vehicle',
  'Illegal Dumping',
  'Animal Issue',
  'Other',
];

export const SEVERITY_COLORS: Record<ReportSeverity, string> = {
  High: '#D32F2F',
  Medium: '#F57C00',
  Low: '#388E3C',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  Open: '#1565C0',
  'In Progress': '#F57C00',
  Resolved: '#388E3C',
  Rejected: '#757575',
};

export const APP_THEME = {
  primary: '#1565C0',
  primaryDark: '#003c8f',
  accent: '#FF6F00',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
};
