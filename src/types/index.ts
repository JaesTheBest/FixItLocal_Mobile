// Enums matching database schema
export type UserRole =
  | 'admin'
  | 'triage'
  | 'dispatcher'
  | 'road_maintenance'
  | 'sanitation'
  | 'safety'
  | 'electrical'
  | 'animal_control'
  | 'drainage'
  | 'water_services';

export type ReportSeverity = 'High' | 'Medium' | 'Low';
export type ReportStatus = 'Open' | 'In Progress' | 'Resolved' | 'Rejected';
export type ReportSource = 'web' | 'mobile' | 'ai';
export type AssignmentStatus = 'pending' | 'in-progress' | 'completed';
export type AssignmentPriority = 'High' | 'Medium' | 'Low';

// Database row types
export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  cluster_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  category: string;
  severity: ReportSeverity;
  status: ReportStatus;
  source: ReportSource;
  views: number;
  image_url: string | null;
  coordinates: [number, number] | null; // [latitude, longitude]
  weight: number | null;
  ai_analysis: Record<string, unknown> | null;
  reporter_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportResponse {
  id: string;
  report_id: string;
  user_id: string | null;
  message: string;
  created_at: string;
  profiles?: Pick<Profile, 'name' | 'avatar_url'> | null;
}

export interface UserSettings {
  user_id: string;
  email_notif: boolean;
  push_notif: boolean;
  sms_alert: boolean;
  dark_mode: boolean;
  two_factor: boolean;
  public_profile: boolean;
  sound_enabled: boolean;
  language: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}

// Form types
export interface NewReportForm {
  title: string;
  description: string;
  category: string;
  severity: ReportSeverity;
  location: string;
  coordinates: [number, number] | null;
  imageUri: string | null;
}

// Navigation param lists
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  MapTab: undefined;
  ListTab: undefined;
  ProfileTab: undefined;
};

export type ReportsStackParamList = {
  MapView: undefined;
  ReportsList: undefined;
  ReportDetails: { reportId: string };
  NewReport: undefined;
  PinOnMap: { onCoordinateSelected: (coords: [number, number], address: string) => void };
};
