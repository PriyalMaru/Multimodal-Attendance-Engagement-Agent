import {
  Student,
  Session,
  AttendanceRecord,
  SessionAnalytics,
  TeachingSuggestion,
  DashboardMetrics
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData.detail || errMsg;
    } catch {
      // fallback
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<{
      status: string;
      device: string;
      cuda_enabled: boolean;
      offline_mode: boolean;
      models: Record<string, string>;
    }>(res);
  },

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/dashboard/metrics`);
    return handleResponse<DashboardMetrics>(res);
  },

  // Students
  async getStudents(includeArchived = false): Promise<Student[]> {
    const res = await fetch(`${API_BASE}/students?include_archived=${includeArchived}`);
    return handleResponse<Student[]>(res);
  },

  async getStudent(id: number): Promise<Student> {
    const res = await fetch(`${API_BASE}/students/${id}`);
    return handleResponse<Student>(res);
  },

  async createStudent(data: {
    student_id: string;
    full_name: string;
    course_name: string;
    email?: string;
    has_consented: boolean;
  }): Promise<Student> {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Student>(res);
  },

  async updateStudent(id: number, data: Partial<Student>): Promise<Student> {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Student>(res);
  },

  async updateConsent(id: number, hasConsented: boolean, notes?: string): Promise<Student> {
    const res = await fetch(`${API_BASE}/students/${id}/consent`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ has_consented: hasConsented, notes }),
    });
    return handleResponse<Student>(res);
  },

  async enrollFace(studentId: number, file: File): Promise<Student> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/students/${studentId}/enroll-face`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Student>(res);
  },

  async deleteStudent(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
    return handleResponse<{ status: string; message: string }>(res);
  },

  // Sessions
  async getSessions(): Promise<Session[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    return handleResponse<Session[]>(res);
  },

  async getSession(id: number): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    return handleResponse<Session>(res);
  },

  async createSession(data: {
    course_title: string;
    instructor_name: string;
    room_number?: string;
    target_class: string;
    expected_duration_minutes: number;
    source_type: string;
  }): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Session>(res);
  },

  async updateSessionStatus(id: number, status: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Session>(res);
  },

  // Attendance
  async getAttendance(sessionId: number): Promise<AttendanceRecord[]> {
    const res = await fetch(`${API_BASE}/attendance/session/${sessionId}`);
    return handleResponse<AttendanceRecord[]>(res);
  },

  async overrideAttendance(recordId: number, status: string, notes?: string) {
    const res = await fetch(`${API_BASE}/attendance/${recordId}/override`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, is_manual_override: true }),
    });
    return handleResponse<any>(res);
  },

  // Analytics
  async getAnalytics(sessionId: number): Promise<SessionAnalytics> {
    const res = await fetch(`${API_BASE}/analytics/session/${sessionId}`);
    return handleResponse<SessionAnalytics>(res);
  },

  getExportCsvUrl(sessionId: number): string {
    return `${API_BASE}/analytics/session/${sessionId}/export-csv`;
  },

  // Suggestions
  async getSuggestions(sessionId: number): Promise<TeachingSuggestion[]> {
    const res = await fetch(`${API_BASE}/suggestions/session/${sessionId}`);
    return handleResponse<TeachingSuggestion[]>(res);
  },

  async generateSuggestions(sessionId: number): Promise<TeachingSuggestion[]> {
    const res = await fetch(`${API_BASE}/suggestions/session/${sessionId}/generate`, {
      method: 'POST',
    });
    return handleResponse<TeachingSuggestion[]>(res);
  },

  async acknowledgeSuggestion(id: number): Promise<TeachingSuggestion> {
    const res = await fetch(`${API_BASE}/suggestions/${id}/acknowledge`, {
      method: 'PUT',
    });
    return handleResponse<TeachingSuggestion>(res);
  },

  // Video Upload & Background Job
  async uploadVideo(sessionId: number, file: File): Promise<{ job_id: string; message: string }> {
    const formData = new FormData();
    formData.append('session_id', sessionId.toString());
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/video/upload-and-process`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<{ job_id: string; message: string }>(res);
  },

  async getJobStatus(jobId: string) {
    const res = await fetch(`${API_BASE}/video/status/${jobId}`);
    return handleResponse<{
      job_id: string;
      status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
      progress: number;
      message: string;
      result?: any;
    }>(res);
  },

  async cancelJob(jobId: string) {
    const res = await fetch(`${API_BASE}/video/cancel/${jobId}`, { method: 'POST' });
    return handleResponse<any>(res);
  },

  // Live frame processing
  async sendLiveFrame(sessionId: number, frameBlob: Blob, timestampSec: number) {
    const formData = new FormData();
    formData.append('file', frameBlob, 'frame.jpg');
    formData.append('timestamp_sec', timestampSec.toString());
    const res = await fetch(`${API_BASE}/video/live-frame/${sessionId}`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<any>(res);
  }
};
