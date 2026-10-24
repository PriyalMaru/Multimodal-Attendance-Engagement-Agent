import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  Camera,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { Student } from '../types';

interface StudentEnrollmentProps {
  setActiveTab: (tab: string) => void;
  selectedStudent?: Student | null;
}

export const StudentEnrollment: React.FC<StudentEnrollmentProps> = ({
  setActiveTab,
  selectedStudent
}) => {
  const [studentId, setStudentId] = useState(selectedStudent?.student_id || '');
  const [fullName, setFullName] = useState(selectedStudent?.full_name || '');
  const [courseName, setCourseName] = useState(selectedStudent?.course_name || '');
  const [email, setEmail] = useState(selectedStudent?.email || '');
  const [hasConsented, setHasConsented] = useState(selectedStudent?.has_consented ?? false);

  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);

  useEffect(() => {
    if (selectedStudent) {
      setStudentId(selectedStudent.student_id);
      setFullName(selectedStudent.full_name);
      setCourseName(selectedStudent.course_name);
      setEmail(selectedStudent.email || '');
      setHasConsented(selectedStudent.has_consented);
    }
  }, [selectedStudent]);

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      alert('Unable to access webcam. Please verify camera permissions or use image upload.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${studentId || 'student'}_capture.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
        setMode('upload');
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!hasConsented) {
      setStatusMessage({
        type: 'error',
        text: 'Informed consent is required before processing and storing facial biometric features.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      let targetStudentId: number;

      if (selectedStudent) {
        targetStudentId = selectedStudent.id;
        if (!selectedStudent.has_consented && hasConsented) {
          await api.updateConsent(selectedStudent.id, true, 'Consent recorded during face enrollment');
        }
      } else {
        const created = await api.createStudent({
          student_id: studentId,
          full_name: fullName,
          course_name: courseName,
          email: email || undefined,
          has_consented: hasConsented,
        });
        targetStudentId = created.id;
      }

      // If photo is provided, extract and store embedding
      if (selectedFile) {
        await api.enrollFace(targetStudentId, selectedFile);
        setStatusMessage({
          type: 'success',
          text: `Student ${fullName} enrolled successfully with verified local FaceNet embeddings.`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Student ${fullName} registered successfully. Biometric face sample pending.`
        });
      }

      setTimeout(() => {
        setActiveTab('students');
      }, 1800);

    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Enrollment failed. Please ensure student ID is unique and face is clearly visible.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          {selectedStudent ? 'Enroll Biometric Face Sample' : 'Student Enrollment & Consent'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Record student registration and extract offline facial embeddings with explicit privacy consent.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Details Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            Student Identity Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student ID Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS-2024-042"
                disabled={Boolean(selectedStudent)}
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maya Chen"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class / Course Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Science 101"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="e.g. maya.chen@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Biometric Face Sample Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-teal-600" />
              Facial Biometric Sample
            </h3>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode('upload');
                }}
                className={`px-3 py-1 rounded-md transition-all ${
                  mode === 'upload' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500'
                }`}
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('camera');
                  startCamera();
                }}
                className={`px-3 py-1 rounded-md transition-all ${
                  mode === 'camera' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500'
                }`}
              >
                Use Webcam
              </button>
            </div>
          </div>

          {mode === 'upload' ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
              <div className="w-36 h-36 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-300" />
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <h4 className="text-xs font-semibold text-slate-700">Select Frontal Portrait Image</h4>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Provide a clear, well-lit photo showing the student looking directly at the camera. Formats: JPG, PNG.
                </p>
                <label className="inline-block px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm">
                  <span>Browse File</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative w-full max-w-md mx-auto aspect-video rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                {!streamActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
                    Initializing camera stream...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={captureFrame}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setMode('upload');
                  }}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Informed Consent Agreement Card */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Explicit Informed Biometric Consent
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                By ticking below, the instructor confirms that the student (or legal guardian) has consented to local facial feature extraction for automated classroom presence verification. Embeddings are stored on-device and never transferred outside this machine.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-200 cursor-pointer hover:bg-emerald-50/40 transition-colors">
            <input
              type="checkbox"
              checked={hasConsented}
              onChange={e => setHasConsented(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-800">
              I certify that valid biometric consent is documented on record for this student.
            </span>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {selectedStudent ? 'Save Biometric Profile' : 'Enroll Student'}
          </button>
        </div>
      </form>
    </div>
  );
};
