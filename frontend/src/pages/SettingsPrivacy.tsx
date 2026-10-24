import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  HardDrive,
  Cpu,
  EyeOff,
  FileText,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPrivacy: React.FC = () => {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">System Settings & Privacy Architecture</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review on-device privacy protections, biometric consent guarantees, and hardware acceleration telemetry.
        </p>
      </div>

      {/* Offline Guarantee Card */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950">100% Offline-First Local Data Processing Guarantee</h3>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              This application is architected to operate entirely without internet connectivity. All computer vision models (YOLOv8, FaceNet), tracking algorithms, voice activity detection, and language model inference run locally on this machine.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 text-xs">
            <span className="font-bold text-slate-800 block mb-0.5">No Cloud Leakage</span>
            <span className="text-slate-600 text-[11px]">Zero student images or video buffers are sent to external third-party cloud APIs.</span>
          </div>
          <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 text-xs">
            <span className="font-bold text-slate-800 block mb-0.5">Ephemeral Video Media</span>
            <span className="text-slate-600 text-[11px]">Raw video and audio recordings are discarded immediately following frame telemetry extraction.</span>
          </div>
          <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 text-xs">
            <span className="font-bold text-slate-800 block mb-0.5">Biometric Embedding Vault</span>
            <span className="text-slate-600 text-[11px]">Facial vectors are stored locally in isolated numpy matrices, inaccessible via public APIs.</span>
          </div>
        </div>
      </div>

      {/* Model & Device Telemetry Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          Hardware & Model Telemetry
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Compute Device</span>
            <span className="font-semibold text-slate-800">{health?.device || 'CPU'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">CUDA Acceleration</span>
            <span className={`font-semibold ${health?.cuda_enabled ? 'text-emerald-700' : 'text-slate-600'}`}>
              {health?.cuda_enabled ? 'Active (NVIDIA GPU)' : 'Inactive (CPU Fallback)'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Person Detection</span>
            <span className="font-semibold text-slate-800">YOLOv8 Nano (Local Ultralytics)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Biometric Embedder</span>
            <span className="font-semibold text-slate-800">FaceNet 512-dim (Local Weights)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Head Pose Estimation</span>
            <span className="font-semibold text-slate-800">Perspective-n-Point (solvePnP)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Teaching Suggestion Agent</span>
            <span className="font-semibold text-slate-800">Local Ollama / Deterministic Rules</span>
          </div>
        </div>
      </div>

      {/* Configurable Threshold Parameters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-teal-600" />
          Configured Verification Thresholds
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 block">Biometric Match Cosine Threshold</span>
              <span className="text-[11px] text-slate-500">Minimum cosine similarity required to verify identity (unverified otherwise).</span>
            </div>
            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">0.65</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 block">Sustained Observation Count</span>
              <span className="text-[11px] text-slate-500">Never marks present on a single frame; requires repeated valid sightings.</span>
            </div>
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded">≥ 5 observations</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <span className="font-semibold text-slate-800 block">Late Arrival Threshold</span>
              <span className="text-[11px] text-slate-500">First sighting after this window classifies attendee as Late.</span>
            </div>
            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">10 minutes</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="font-semibold text-slate-800 block">Engagement Aggregation Window</span>
              <span className="text-[11px] text-slate-500">Short time window used to summarize observable physical and audio activity.</span>
            </div>
            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">30 seconds</span>
          </div>
        </div>
      </div>

      {/* Responsible Educational AI Disclaimer */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-5 space-y-2 text-xs text-slate-600 leading-relaxed">
        <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-600" />
          Responsible Educational Intelligence Notice
        </h4>
        <p>
          Observable signals (head orientation, physical movement, and voice activity) are behavioral indicators of classroom dynamic patterns. They must never be interpreted as individual student comprehension, emotion, intelligence, or academic capability. Attendance decisions are always subject to manual review and override by authorized instructors.
        </p>
      </div>
    </div>
  );
};
