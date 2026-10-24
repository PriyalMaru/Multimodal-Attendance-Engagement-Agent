import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Clock,
  BarChart3,
  Search,
  CheckCircle,
  AlertCircle,
  Video,
  UploadCloud,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { Session } from '../types';

interface SessionHistoryProps {
  setActiveTab: (tab: string) => void;
  onSelectSession: (sessionId: number) => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  setActiveTab,
  onSelectSession
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.getSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const filtered = sessions.filter(
    s =>
      s.course_title.toLowerCase().includes(search.toLowerCase()) ||
      s.target_class.toLowerCase().includes(search.toLowerCase()) ||
      s.instructor_name.toLowerCase().includes(search.toLowerCase()) ||
      s.session_uid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Classroom Session History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit historical attendance archives, engagement metrics, and session summaries.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('new-session')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm self-start sm:self-auto"
        >
          Start New Session
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Search by session code, course title, instructor, or cohort..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600 mr-1">
            Clear
          </button>
        )}
      </div>

      {/* Sessions Grid / Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading session history...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No sessions found</h4>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              {search ? 'Try adjusting your search criteria' : 'Conduct your first classroom session to populate the audit log'}
            </p>
            <button
              onClick={() => setActiveTab('new-session')}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
            >
              Start Session
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Session Code</th>
                  <th className="py-3 px-4">Course & Cohort</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Modality</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Avg Engagement</th>
                  <th className="py-3 px-4 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(session => (
                  <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                      {session.session_uid}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{session.course_title}</div>
                      <div className="text-[11px] text-slate-400">Class: {session.target_class}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {session.instructor_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        {session.source_type === 'LIVE' ? (
                          <Video className="w-3.5 h-3.5 text-blue-500" />
                        ) : session.source_type === 'VIDEO_UPLOAD' ? (
                          <UploadCloud className="w-3.5 h-3.5 text-teal-500" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span>{session.source_type}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        session.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        session.status === 'LIVE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        session.status === 'PAUSED' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {session.present_count || 0} / {session.attendance_count || 0}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {session.avg_engagement ? `${session.avg_engagement} / 100` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectSession(session.id);
                          setActiveTab('analytics');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
