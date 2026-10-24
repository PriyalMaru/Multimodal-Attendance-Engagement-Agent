import React, { useState } from 'react';
import {
  PlayCircle,
  Video,
  UploadCloud,
  Layers,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface StartNewSessionProps {
  setActiveTab: (tab: string) => void;
  onSessionCreated: (sessionId: number, mode: string) => void;
}

export const StartNewSession: React.FC<StartNewSessionProps> = ({
  setActiveTab,
  onSessionCreated
}) => {
  const [courseTitle, setCourseTitle] = useState('Machine Learning & AI');
  const [instructorName, setInstructorName] = useState('Prof. Alan Turing');
  const [roomNumber, setRoomNumber] = useState('Auditorium B');
  const [targetClass, setTargetClass] = useState('CS-302');
  const [expectedDuration, setExpectedDuration] = useState(60);
  const [sourceType, setSourceType] = useState<'LIVE' | 'VIDEO_UPLOAD' | 'DEMO'>('LIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const created = await api.createSession({
        course_title: courseTitle,
        instructor_name: instructorName,
        room_number: roomNumber || undefined,
        target_class: targetClass,
        expected_duration_minutes: expectedDuration,
        source_type: sourceType,
      });

      onSessionCreated(created.id, sourceType);

      if (sourceType === 'LIVE') {
        setActiveTab('live');
      } else if (sourceType === 'VIDEO_UPLOAD') {
        setActiveTab('video');
      } else {
        // Demo synthetic session
        setActiveTab('live');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Start New Classroom Session</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure session parameters and choose between live camera input or recorded video analysis.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Mode Selection */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Select Capture Modality
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Live Camera */}
            <div
              onClick={() => setSourceType('LIVE')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sourceType === 'LIVE'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2.5">
                <Video className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Live Webcam</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Stream directly from connected camera with real-time face tracking and presence evaluation.
              </p>
            </div>

            {/* Video File Upload */}
            <div
              onClick={() => setSourceType('VIDEO_UPLOAD')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sourceType === 'VIDEO_UPLOAD'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-2.5">
                <UploadCloud className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Recorded Video</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Upload lecture video file (MP4, AVI, MOV) for offline frame-by-frame multimodal intelligence.
              </p>
            </div>

            {/* Synthetic Demo Mode */}
            <div
              onClick={() => setSourceType('DEMO')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sourceType === 'DEMO'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Synthetic Demo</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Test pipeline logic and analytics visualizations with clearly labelled synthetic classroom signals.
              </p>
            </div>
          </div>
        </div>

        {/* Session Metadata */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Classroom & Course Metadata
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={e => setCourseTitle(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instructor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={instructorName}
                onChange={e => setInstructorName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Enrolled Class / Cohort <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS-101 or Computer Science"
                value={targetClass}
                onChange={e => setTargetClass(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Students enrolled under this class code will be isolated and tracked for this session.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Venue</label>
              <input
                type="text"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={expectedDuration}
                onChange={e => setExpectedDuration(parseInt(e.target.value) || 60)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            {isSubmitting ? 'Initializing...' : 'Launch Session'}
          </button>
        </div>
      </form>
    </div>
  );
};
