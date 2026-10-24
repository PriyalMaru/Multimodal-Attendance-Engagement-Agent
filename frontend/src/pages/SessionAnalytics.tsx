import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Users,
  Eye,
  Activity,
  Mic,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area
} from 'recharts';
import { api } from '../services/api';
import { Session, SessionAnalytics as AnalyticsType } from '../types';

interface SessionAnalyticsProps {
  sessionId?: number | null;
  setActiveTab: (tab: string) => void;
  onSelectSession?: (id: number) => void;
}

export const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({
  sessionId,
  setActiveTab,
  onSelectSession
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(sessionId || null);
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available sessions
  useEffect(() => {
    api.getSessions()
      .then(list => {
        setSessions(list);
        if (!currentSessionId && list.length > 0) {
          setCurrentSessionId(list[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Load analytics when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionAnalytics(currentSessionId);
    }
  }, [currentSessionId]);

  const loadSessionAnalytics = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, sessionData] = await Promise.all([
        api.getAnalytics(id),
        api.getSession(id)
      ]);
      setAnalytics(analyticsData);
      setSessionInfo(sessionData);
      if (onSelectSession) onSelectSession(id);
    } catch (err: any) {
      setError(err.message || 'Failed to load session analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!currentSessionId) return;
    const url = api.getExportCsvUrl(currentSessionId);
    window.open(url, '_blank');
  };

  const chartData = analytics?.timeline.map(w => ({
    time: `${Math.round(w.start_seconds)}s`,
    interaction: w.interaction_activity_score,
    forwardOrientation: Math.round(w.forward_facing_ratio * 100),
    movement: Math.round(w.movement_intensity * 100),
    speech: w.is_audio_available ? Math.round(w.speech_active_ratio * 100) : null,
    persons: w.person_count_avg
  })) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Session Header & Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {sessionInfo?.session_uid || 'SESSION'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-600">{sessionInfo?.target_class}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            {sessionInfo?.course_title || 'Session Analytics Report'}
          </h2>
          <p className="text-xs text-slate-500">
            Instructor: {sessionInfo?.instructor_name} • Duration: {sessionInfo?.actual_duration_seconds ? `${Math.round(sessionInfo.actual_duration_seconds / 60)} mins` : 'In progress'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {sessions.length > 1 && (
            <select
              value={currentSessionId || ''}
              onChange={e => setCurrentSessionId(parseInt(e.target.value))}
              className="text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.course_title} ({s.target_class})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleDownloadCsv}
            disabled={!currentSessionId}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading session telemetry and metrics...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{analytics?.attendance_rate || 0}%</span>
                <span className="text-xs text-slate-400">
                  ({(analytics?.present_count || 0) + (analytics?.late_count || 0)} / {analytics?.total_enrolled || 0})
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observable Interaction</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-700">{analytics?.avg_interaction_score || 0}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Forward Head Orientation</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-teal-700">
                  {Math.round((analytics?.avg_forward_facing_ratio || 0) * 100)}%
                </span>
                <span className="text-xs text-slate-400">of faces</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Speech Activity</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">
                  {Math.round((analytics?.avg_speech_active_ratio || 0) * 100)}%
                </span>
                <span className="text-xs text-slate-400">audio time</span>
              </div>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Classroom Signal Timeline</h3>
                <p className="text-xs text-slate-400">
                  Aggregated across 30-second observation intervals. Behavioral indicators only.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-blue-600 rounded-full" />
                  <span>Interaction Index</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-teal-500 rounded-full" />
                  <span>Forward Pose %</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span>Speech Active %</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="interaction"
                      name="Interaction Score"
                      fill="#e0effe"
                      stroke="#0284c7"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="forwardOrientation"
                      name="Forward Pose %"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="speech"
                      name="Speech Active %"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No observation windows recorded for this session yet.
                </div>
              )}
            </div>
          </div>

          {/* Notable Changes & Interpretations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Notable Observable Shifts
              </h3>

              <div className="space-y-2">
                {analytics?.notable_changes && analytics.notable_changes.length > 0 ? (
                  analytics.notable_changes.map((change, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
                      {change}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No significant anomalies or volatility identified.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Pedagogical Suggestions
                </h3>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                >
                  View AI Advisor <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Offline AI suggestion engine translates these observable metrics into actionable teaching adjustments without judging individual student capability.
              </p>

              <button
                onClick={() => setActiveTab('suggestions')}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Review Recommendations for this Session
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
