import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileVideo,
  Play,
  XCircle,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { Session } from '../types';

interface VideoProcessingProps {
  sessionId?: number | null;
  setActiveTab: (tab: string) => void;
  onSelectSessionForAnalytics: (sessionId: number) => void;
}

export const VideoProcessing: React.FC<VideoProcessingProps> = ({
  sessionId,
  setActiveTab,
  onSelectSessionForAnalytics
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(sessionId || null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Background Job status
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'IDLE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [progress, setProgress] = useState(0.0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    api.getSessions()
      .then(res => {
        setSessions(res);
        if (!selectedSessionId && res.length > 0) {
          setSelectedSessionId(res[0].id);
        }
      })
      .catch(console.error);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setVideoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const startProcessing = async () => {
    if (!selectedSessionId || !videoFile) {
      alert('Please select both a classroom session and a video file.');
      return;
    }

    try {
      setError(null);
      setJobStatus('QUEUED');
      setProgress(0.05);
      setProgressMessage('Uploading video to local pipeline engine...');

      const res = await api.uploadVideo(selectedSessionId, videoFile);
      setJobId(res.job_id);

      // Start polling status
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const statusRes = await api.getJobStatus(res.job_id);
          setJobStatus(statusRes.status);
          setProgress(statusRes.progress);
          setProgressMessage(statusRes.message);

          if (statusRes.status === 'COMPLETED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (statusRes.status === 'FAILED' || statusRes.status === 'CANCELLED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        } catch (e) {
          console.error(e);
        }
      }, 1200);

    } catch (err: any) {
      setError(err.message || 'Video processing initiation failed');
      setJobStatus('FAILED');
    }
  };

  const cancelProcessing = async () => {
    if (!jobId) return;
    try {
      await api.cancelJob(jobId);
      setJobStatus('CANCELLED');
      setProgressMessage('Processing cancelled by instructor.');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Recorded Video Processing</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest classroom lecture video files for offline multi-person tracking, biometric presence, and engagement metrics.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Configuration Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            1. Select Target Session
          </label>
          {sessions.length > 0 ? (
            <select
              value={selectedSessionId || ''}
              disabled={jobStatus === 'PROCESSING'}
              onChange={e => setSelectedSessionId(parseInt(e.target.value))}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.session_uid} — {s.course_title} ({s.target_class}) [{s.status}]
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs text-slate-500 flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span>No existing sessions found.</span>
              <button
                onClick={() => setActiveTab('new-session')}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                Create New Session
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Upload Lecture Video File
          </label>

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              videoFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
            }`}
          >
            {videoFile ? (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <FileVideo className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{videoFile.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB • Ready for local analysis
                  </p>
                </div>
                <button
                  type="button"
                  disabled={jobStatus === 'PROCESSING'}
                  onClick={() => setVideoFile(null)}
                  className="text-xs text-slate-500 hover:text-red-600 font-medium"
                >
                  Choose Different File
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Drag and drop video here, or browse</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supported formats: MP4, AVI, MOV, MKV, WEBM (Processed 100% locally)
                  </p>
                </div>
                <label className="inline-block px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer shadow-sm transition-colors">
                  <span>Browse Video File</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {jobStatus === 'IDLE' && (
          <div className="flex justify-end pt-2">
            <button
              onClick={startProcessing}
              disabled={!videoFile || !selectedSessionId}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Begin Multimodal Analysis
            </button>
          </div>
        )}
      </div>

      {/* Progress & Status Card */}
      {jobStatus !== 'IDLE' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {jobStatus === 'PROCESSING' && (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              {jobStatus === 'COMPLETED' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {jobStatus === 'FAILED' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {jobStatus === 'CANCELLED' && <XCircle className="w-5 h-5 text-amber-600" />}

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Processing Status: {jobStatus}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">{progressMessage || 'Processing video...'}</p>
              </div>
            </div>

            {jobStatus === 'PROCESSING' && (
              <button
                onClick={cancelProcessing}
                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel Analysis
              </button>
            )}

            {jobStatus === 'COMPLETED' && selectedSessionId && (
              <button
                onClick={() => {
                  onSelectSessionForAnalytics(selectedSessionId);
                  setActiveTab('analytics');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                View Session Analytics
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                jobStatus === 'COMPLETED' ? 'bg-emerald-500' :
                jobStatus === 'FAILED' ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Stage: YOLO Person Detection • Multi-Person Tracking • FaceNet Matching</span>
            <span className="font-mono font-semibold text-slate-600">{Math.round(progress * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
