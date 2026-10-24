import React, { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  Percent,
  Activity,
  PlayCircle,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onSelectSession?: (sessionId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, onSelectSession }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Aggregating live classroom metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Error Loading Metrics</h4>
            <p className="text-xs">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="ml-auto px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasData = (metrics?.total_students || 0) > 0 || (metrics?.total_sessions || 0) > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-600 to-teal-600 rounded-2xl p-6 text-white shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Offline Classroom Intelligence
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Classroom Analytics & Attendance</h2>
          <p className="text-xs md:text-sm text-blue-100 mt-1 max-w-xl">
            Real-time multi-person tracking, observable engagement signals, and automated verification operating 100% locally on your machine.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('new-session')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all"
          >
            <PlayCircle className="w-4 h-4" />
            Start Session
          </button>
          <button
            onClick={() => setActiveTab('enrollment')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs md:text-sm rounded-xl backdrop-blur-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Enroll Student
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Students</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{metrics?.total_students || 0}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Consented for biometric verification</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions Conducted</span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{metrics?.total_sessions || 0}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Recorded and live sessions</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Attendance</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              {metrics?.overall_attendance_pct || 0}%
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Sustained presence confirmed</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Engagement</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              {metrics?.avg_engagement_score || 0}
              <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Observable behavioral score</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {!hasData ? (
        /* Empty State */
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No classroom records yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Get started by enrolling students with consent or launch a live classroom session to begin tracking attendance and engagement signals.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('enrollment')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Enroll First Student
            </button>
            <button
              onClick={() => setActiveTab('new-session')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Start New Session
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart: Attendance & Engagement Trends */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Classroom Signal Trends</h3>
                <p className="text-xs text-slate-400">Attendance rate (%) vs Behavioral Engagement (0-100)</p>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Recent Sessions
              </span>
            </div>

            <div className="h-64 w-full">
              {metrics?.trends && metrics.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="session_name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="attendance_rate" name="Attendance %" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorAtt)" />
                    <Area type="monotone" dataKey="engagement_score" name="Engagement (0-100)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEng)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Perform multiple sessions to generate trend comparisons.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Recent Sessions List */}
          <div className="space-y-6">
            {/* Recent Sessions */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">Recent Sessions</h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {metrics?.recent_sessions && metrics.recent_sessions.length > 0 ? (
                  metrics.recent_sessions.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => {
                        if (onSelectSession) onSelectSession(sess.id);
                        setActiveTab('analytics');
                      }}
                      className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">{sess.course_title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{sess.target_class}</span>
                          <span>•</span>
                          <span>{sess.instructor_name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          sess.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                          sess.status === 'LIVE' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {sess.status}
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{sess.attendance_rate}% att.</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent sessions conducted.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
