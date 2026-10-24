import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Camera,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { Student } from '../types';

interface StudentManagementProps {
  setActiveTab: (tab: string) => void;
  onSelectStudentForEnrollment?: (student: Student) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  setActiveTab,
  onSelectStudentForEnrollment
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showConsentModal, setShowConsentModal] = useState<Student | null>(null);
  const [consentNotes, setConsentNotes] = useState('');

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStudents();
      setStudents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this student record and facial embeddings?')) {
      return;
    }
    try {
      await api.deleteStudent(id);
      setStudents(students.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete student');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const updated = await api.updateStudent(editingStudent.id, {
        full_name: editingStudent.full_name,
        course_name: editingStudent.course_name,
        email: editingStudent.email,
      });
      setStudents(students.map(s => (s.id === updated.id ? updated : s)));
      setEditingStudent(null);
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const handleToggleConsent = async (student: Student, newConsent: boolean) => {
    try {
      const updated = await api.updateConsent(student.id, newConsent, consentNotes || undefined);
      setStudents(students.map(s => (s.id === updated.id ? updated : s)));
      setShowConsentModal(null);
      setConsentNotes('');
    } catch (err: any) {
      alert(err.message || 'Consent update failed');
    }
  };

  const filtered = students.filter(
    s =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase()) ||
      s.course_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Student Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage enrolled students, biometric consent status, and facial feature profiles.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('enrollment')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Enroll New Student
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Search students by name, ID number, or course..."
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

      {/* Students Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student directory...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No students found</h4>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              {search ? 'Try adjusting your search criteria' : 'Begin by enrolling your first classroom cohort'}
            </p>
            <button
              onClick={() => setActiveTab('enrollment')}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
            >
              Enroll Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Class / Course</th>
                  <th className="py-3 px-4">Consent Status</th>
                  <th className="py-3 px-4">Biometric Profile</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                        {student.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{student.full_name}</div>
                        <div className="text-[11px] text-slate-400">{student.email || 'No email registered'}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {student.student_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {student.course_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {student.has_consented ? (
                        <span
                          onClick={() => setShowConsentModal(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
                          title="Click to view/revoke consent"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Consented
                        </span>
                      ) : (
                        <span
                          onClick={() => setShowConsentModal(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                          title="Click to grant consent"
                        >
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          No Consent
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {student.has_embedding ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Embedded
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (onSelectStudentForEnrollment) onSelectStudentForEnrollment(student);
                            setActiveTab('enrollment');
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[11px] font-medium"
                        >
                          <Camera className="w-3 h-3" />
                          Enroll Face
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800">Edit Student Record</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">Update enrolled student identification details.</p>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.full_name}
                  onChange={e => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course / Class</label>
                <input
                  type="text"
                  required
                  value={editingStudent.course_name}
                  onChange={e => setEditingStudent({ ...editingStudent, course_name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingStudent.email || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-blue-700 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-800">Biometric Consent Status</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Local facial recognition is strictly conditional on recorded informed consent under offline privacy regulations.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-4 text-xs space-y-1.5 text-slate-700">
              <div><span className="font-semibold">Student:</span> {showConsentModal.full_name}</div>
              <div><span className="font-semibold">Student ID:</span> {showConsentModal.student_id}</div>
              <div>
                <span className="font-semibold">Current Status:</span>{' '}
                <span className={showConsentModal.has_consented ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                  {showConsentModal.has_consented ? 'Consent Granted' : 'Consent Not Granted'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Notes</label>
              <input
                type="text"
                placeholder="e.g., Signed written consent form on file"
                value={consentNotes}
                onChange={e => setConsentNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg mb-4 outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConsentModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>

              {showConsentModal.has_consented ? (
                <button
                  onClick={() => handleToggleConsent(showConsentModal, false)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Revoke Consent & Delete Embeddings
                </button>
              ) : (
                <button
                  onClick={() => handleToggleConsent(showConsentModal, true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Record Valid Consent
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
