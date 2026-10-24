import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Session, TeachingSuggestion } from '../types';

interface TeachingSuggestionsProps {
  sessionId?: number | null;
  setActiveTab: (tab: string) => void;
  onSelectSession?: (id: number) => void;
}

export const TeachingSuggestions: React.FC<TeachingSuggestionsProps> = ({
  sessionId,
  setActiveTab,
  onSelectSession
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(sessionId || null);
  const [suggestions, setSuggestions] = useState<TeachingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSessions()
      .then(res => {
        setSessions(res);
        if (!currentSessionId && res.length > 0) {
          setCurrentSessionId(res[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadSuggestions(currentSessionId);
    }
  }, [currentSessionId]);

  const loadSuggestions = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSuggestions(id);
      setSuggestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!currentSessionId) return;
    try {
      setGenerating(true);
      const created = await api.generateSuggestions(currentSessionId);
      setSuggestions(created);
    } catch (err: any) {
      alert('Generation error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      const updated = await api.acknowledgeSuggestion(id);
      setSuggestions(suggestions.map(s => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
              AI Pedagogical Advisor
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-600">Local Offline Inference</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Teaching Adjustments & Observations</h2>
          <p className="text-xs text-slate-500">
            Actionable classroom interventions driven by actual observed behavioral data.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {sessions.length > 1 && (
            <select
              value={currentSessionId || ''}
              onChange={e => {
                const sid = parseInt(e.target.value);
                setCurrentSessionId(sid);
                if (onSelectSession) onSelectSession(sid);
              }}
              className="text-xs px-3 py-2 border border-slate-300 rounded-xl outline-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.course_title} ({s.target_class})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleGenerate}
            disabled={!currentSessionId || generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Analyzing...' : 'Generate Suggestions'}
          </button>
        </div>
      </div>

      {/* Ethical Guidance Notice */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed space-y-1">
          <p className="font-semibold">Responsible Educational AI Guidelines:</p>
          <p>
            Suggestions are synthesized from aggregated behavioral signals (head pose orientation, physical movement, and voice activity). They do not measure student intelligence or internal mental state. All instructional choices remain with the educator.
          </p>
        </div>
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading teaching suggestions...</div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No suggestions recorded yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Click "Generate Suggestions" above to evaluate recent session signals and produce tailored recommendations.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
          >
            Generate Suggestions
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map(s => (
            <div
              key={s.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                s.acknowledged ? 'border-slate-200 opacity-75' : 'border-blue-200/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    s.urgency === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' :
                    s.urgency === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {s.urgency} PRIORITY
                  </span>

                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Engine: {s.generated_by}
                  </span>
                </div>

                {s.acknowledged ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Actioned / Acknowledged
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcknowledge(s.id)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg self-start sm:self-auto transition-colors"
                  >
                    Mark Acknowledged
                  </button>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-800">{s.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.description}</p>

              {/* Observable Evidence Block */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Observed Evidence: </span>
                <span>{s.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
