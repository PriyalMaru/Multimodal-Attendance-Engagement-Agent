export interface Student {
  id: number;
  student_id: string;
  full_name: string;
  course_name: string;
  email?: string;
  has_consented: boolean;
  consent_date?: string;
  has_embedding: boolean;
  profile_image_path?: string;
  is_archived: boolean;
  created_at: string;
}

export interface Session {
  id: number;
  session_uid: string;
  course_title: string;
  instructor_name: string;
  room_number?: string;
  target_class: string;
  expected_duration_minutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  start_time?: string;
  end_time?: string;
  actual_duration_seconds: number;
  source_type: 'LIVE' | 'VIDEO_UPLOAD' | 'DEMO';
  video_filename?: string;
  video_duration_seconds: number;
  created_at: string;
  attendance_count?: number;
  present_count?: number;
  avg_engagement?: number;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id?: number;
  student_name: string;
  student_code?: string;
  tracking_track_id?: number;
  detected_name?: string;
  status: 'PRESENT' | 'LATE' | 'LEFT_EARLY' | 'UNVERIFIED' | 'PENDING' | 'ABSENT';
  first_seen_seconds?: number;
  last_seen_seconds?: number;
  sustained_duration_seconds: number;
  observation_count: number;
  avg_confidence: number;
  is_manual_override: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EngagementWindow {
  id: number;
  session_id: number;
  window_index: number;
  start_seconds: number;
  end_seconds: number;
  person_count_avg: number;
  forward_facing_ratio: number;
  movement_intensity: number;
  prolonged_inactivity_ratio: number;
  speech_active_ratio: number;
  interaction_activity_score: number;
  is_audio_available: boolean;
  is_video_available: boolean;
  notes?: string;
  created_at: string;
}

export interface SessionAnalytics {
  session_id: number;
  total_enrolled: number;
  present_count: number;
  late_count: number;
  unverified_count: number;
  attendance_rate: number;
  avg_interaction_score: number;
  avg_forward_facing_ratio: number;
  avg_movement_intensity: number;
  avg_speech_active_ratio: number;
  windows_count: number;
  timeline: EngagementWindow[];
  notable_changes: string[];
}

export interface TeachingSuggestion {
  id: number;
  session_id: number;
  suggestion_type: string;
  title: string;
  description: string;
  evidence: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  generated_by: 'RULE_BASED' | 'OLLAMA';
  acknowledged: boolean;
  created_at: string;
}

export interface DashboardMetrics {
  total_students: number;
  total_sessions: number;
  overall_attendance_pct: number;
  avg_engagement_score: number;
  recent_sessions: {
    id: number;
    session_uid: string;
    course_title: string;
    instructor_name: string;
    target_class: string;
    status: string;
    source_type: string;
    created_at: string;
    attendance_rate: number;
    avg_engagement: number;
  }[];
  trends: {
    session_name: string;
    attendance_rate: number;
    engagement_score: number;
  }[];
}
