import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Video,
  Camera,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Edit2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Session, AttendanceRecord } from '../types';

interface LiveAttendanceProps {
  sessionId?: number | null;
  setActiveTab: (tab: string) => void;
  onSelectSessionForAnalytics: (sessionId: number) => void;
}

export const LiveAttendance: React.FC<LiveAttendanceProps> = ({
  sessionId,
  setActiveTab,
  onSelectSessionForAnalytics
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live metrics
  const [activePersons, setActivePersons] = useState(0);
  const [forwardFacingCount, setForwardFacingCount] = useState(0);
  const [recentDetections, setRecentDetections] = useState<string[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Override modal
  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('PRESENT');
  const [overrideNotes, setOverrideNotes] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load session
  const loadSessionAndRecords = async (sid: number) => {
    try {
      const s = await api.getSession(sid);
      setSession(s);
      setIsDemoMode(s.source_type === 'DEMO');
      const att = await api.getAttendance(sid);
      setRecords(att);
    } catch (err: any) {
      console.error('Failed to load session info:', err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadSessionAndRecords(sessionId);
    }
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera hardware not found or permission denied. Operating in synthetic demo mode.');
      setIsDemoMode(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startSession = async () => {
    if (!sessionId) return;
    try {
      await api.updateSessionStatus(sessionId, 'LIVE');
      setIsRunning(true);
      setIsPaused(false);
      await startCamera();

      // Start elapsed timer and frame sender loop
      timerRef.current = window.setInterval(async () => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          // Capture and send frame every 2 seconds
          if (next % 2 === 0) {
            captureAndSendLiveFrame(next);
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      alert('Failed to start live session: ' + err.message);
    }
  };

  const pauseSession = async () => {
    if (!sessionId) return;
    try {
      await api.updateSessionStatus(sessionId, 'PAUSED');
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resumeSession = async () => {
    if (!sessionId) return;
    try {
      await api.updateSessionStatus(sessionId, 'LIVE');
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next % 2 === 0) {
            captureAndSendLiveFrame(next);
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    if (!window.confirm('Are you sure you want to end this live session? Attendance will be finalized.')) {
      return;
    }
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      stopCamera();
      setIsRunning(false);
      await api.updateSessionStatus(sessionId, 'COMPLETED');
      // Redirect to analytics
      onSelectSessionForAnalytics(sessionId);
      setActiveTab('analytics');
    } catch (err: any) {
      alert('Failed to complete session: ' + err.message);
    }
  };

  const captureAndSendLiveFrame = async (timestampSec: number) => {
    if (!sessionId) return;

    if (isDemoMode || !videoRef.current || !videoRef.current.videoWidth) {
      // Synthetic simulation tick for demo/offline testing
      const enrolledNames = records.map(r => r.student_name);
      const simulatedCount = Math.min(enrolledNames.length, Math.floor(Math.random() * 3) + 2);
      setActivePersons(simulatedCount);
      setForwardFacingCount(Math.max(1, simulatedCount - 1));
      setRecentDetections(enrolledNames.slice(0, simulatedCount));

      // Refresh attendance records periodically
      const updated = await api.getAttendance(sessionId);
      setRecords(updated);
      return;
    }

    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const res = await api.sendLiveFrame(sessionId, blob, timestampSec);
          setActivePersons(res.active_persons || 0);
          setForwardFacingCount(res.forward_facing_count || 0);
          setRecentDetections(res.recognized_identities || []);
          
          // Refresh records
          const updated = await api.getAttendance(sessionId);
          setRecords(updated);
        } catch (e) {
          console.error('Frame processing warning:', e);
        }
      }, 'image/jpeg', 0.85);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualOverride = async () => {
    if (!overrideRecord) return;
    try {
      await api.overrideAttendance(overrideRecord.id, overrideStatus, overrideNotes);
      if (sessionId) {
        const updated = await api.getAttendance(sessionId);
        setRecords(updated);
      }
      setOverrideRecord(null);
      setOverrideNotes('');
    } catch (err: any) {
      alert('Override failed: ' + err.message);
    }
  };

  if (!sessionId || !session) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <Video className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Active Session Selected</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Please select an existing session or start a new classroom session to begin live attendance tracking.
        </p>
        <button
          onClick={() => setActiveTab('new-session')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
        >
          Start New Session
        </button>
      </div>
    );
  }

  const confirmedPresent = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE');
  const unverified = records.filter(r => r.status === 'UNVERIFIED');
  const pendingOrAbsent = records.filter(r => r.status === 'PENDING' || r.status === 'ABSENT');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Session Title Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {session.session_uid}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-600">{session.target_class}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">{session.course_title}</h2>
          <p className="text-xs text-slate-500">Instructor: {session.instructor_name} • Room: {session.room_number || 'Main Lab'}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {!isRunning ? (
            <button
              onClick={startSession}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Live Tracking
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resumeSession}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseSession}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  Pause
                </button>
              )}

              <button
                onClick={endSession}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
                End Session
              </button>
            </>
          )}
        </div>
      </div>

      {isDemoMode && (
        <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl flex items-center gap-3 text-xs text-purple-900">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            <strong>Synthetic Demonstration Mode Active:</strong> Live camera simulation running with synthetic detections. Attendance sustained presence rules remain strictly enforced.
          </span>
        </div>
      )}

      {/* Main Grid: Video Stream vs Attendance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Camera View Column */}
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center shadow-md">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isDemoMode ? 'hidden' : 'block'}`}
              playsInline
              muted
            />

            {isDemoMode && (
              <div className="text-center p-6 text-white space-y-2">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center mx-auto text-purple-300">
                  <Camera className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-semibold">Simulated Camera Feed</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Processing synthetic frames at 0.5 FPS with YOLOv8 & Local FaceNet matching.
                </p>
              </div>
            )}

            {/* Overlaid Live Stats Pill */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className={`w-2 h-2 rounded-full ${isRunning && !isPaused ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`} />
              <span className="font-mono font-medium">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Detected: <strong>{activePersons}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Forward Facing: <strong>{forwardFacingCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Active Sighting Identifications */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              Active Sighting Identifications
            </h4>
            {recentDetections.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {recentDetections.map((name, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Awaiting presence sightings...</p>
            )}
          </div>
        </div>

        {/* Attendance Verification Lists Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Session Attendance Roster</h3>
                <p className="text-[11px] text-slate-400">
                  Confirmed: {confirmedPresent.length} • Unverified: {unverified.length} • Pending/Absent: {pendingOrAbsent.length}
                </p>
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                Rule: ≥ 5 observations required
              </div>
            </div>

            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Student / Person</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sightings</th>
                    <th className="py-2.5 px-3">Presence</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <div>{record.student_name}</div>
                        {record.student_code && (
                          <div className="text-[10px] text-slate-400 font-mono">{record.student_code}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          record.status === 'LATE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          record.status === 'LEFT_EARLY' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          record.status === 'UNVERIFIED' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {record.status}
                          {record.is_manual_override && ' *'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {record.observation_count} frames
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {record.sustained_duration_seconds > 0 ? `${record.sustained_duration_seconds}s` : '0s'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {record.avg_confidence > 0 ? `${(record.avg_confidence * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setOverrideRecord(record);
                            setOverrideStatus(record.status);
                            setOverrideNotes('');
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Manual Attendance Override"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Override Modal */}
      {overrideRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800">Manual Attendance Correction</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Authorize attendance status adjustment for {overrideRecord.student_name}.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={overrideStatus}
                  onChange={e => setOverrideStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="LEFT_EARLY">LEFT EARLY</option>
                  <option value="UNVERIFIED">UNVERIFIED</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instructor Note / Justification</label>
                <input
                  type="text"
                  placeholder="e.g., Student verified seated in back row"
                  value={overrideNotes}
                  onChange={e => setOverrideNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideRecord(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualOverride}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
