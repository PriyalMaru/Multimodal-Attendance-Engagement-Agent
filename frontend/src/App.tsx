import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { StudentManagement } from './pages/StudentManagement';
import { StudentEnrollment } from './pages/StudentEnrollment';
import { StartNewSession } from './pages/StartNewSession';
import { LiveAttendance } from './pages/LiveAttendance';
import { VideoProcessing } from './pages/VideoProcessing';
import { SessionAnalytics } from './pages/SessionAnalytics';
import { TeachingSuggestions } from './pages/TeachingSuggestions';
import { SessionHistory } from './pages/SessionHistory';
import { SettingsPrivacy } from './pages/SettingsPrivacy';
import { Student } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [selectedStudentForEnrollment, setSelectedStudentForEnrollment] = useState<Student | null>(null);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'students': return 'Student Directory';
      case 'enrollment': return 'Student & Face Enrollment';
      case 'new-session': return 'Start New Session';
      case 'live': return 'Live Attendance Tracking';
      case 'video': return 'Recorded Video Ingestion';
      case 'analytics': return 'Session Engagement Analytics';
      case 'suggestions': return 'AI Teaching Suggestions';
      case 'history': return 'Classroom Session History';
      case 'settings': return 'System Settings & Privacy';
      default: return 'Multimodal Agent';
    }
  };

  const handleSessionCreated = (sessionId: number, mode: string) => {
    setActiveSessionId(sessionId);
    if (mode === 'LIVE' || mode === 'DEMO') {
      setActiveTab('live');
    } else {
      setActiveTab('video');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          pageTitle={getPageTitle()}
          activeSessionId={activeSessionId}
        />

        <main className="flex-1 pb-16">
          {activeTab === 'dashboard' && (
            <Dashboard
              setActiveTab={setActiveTab}
              onSelectSession={(id) => setActiveSessionId(id)}
            />
          )}

          {activeTab === 'students' && (
            <StudentManagement
              setActiveTab={setActiveTab}
              onSelectStudentForEnrollment={(stu) => {
                setSelectedStudentForEnrollment(stu);
                setActiveTab('enrollment');
              }}
            />
          )}

          {activeTab === 'enrollment' && (
            <StudentEnrollment
              setActiveTab={setActiveTab}
              selectedStudent={selectedStudentForEnrollment}
            />
          )}

          {activeTab === 'new-session' && (
            <StartNewSession
              setActiveTab={setActiveTab}
              onSessionCreated={handleSessionCreated}
            />
          )}

          {activeTab === 'live' && (
            <LiveAttendance
              sessionId={activeSessionId}
              setActiveTab={setActiveTab}
              onSelectSessionForAnalytics={(id) => {
                setActiveSessionId(id);
                setActiveTab('analytics');
              }}
            />
          )}

          {activeTab === 'video' && (
            <VideoProcessing
              sessionId={activeSessionId}
              setActiveTab={setActiveTab}
              onSelectSessionForAnalytics={(id) => {
                setActiveSessionId(id);
                setActiveTab('analytics');
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <SessionAnalytics
              sessionId={activeSessionId}
              setActiveTab={setActiveTab}
              onSelectSession={(id) => setActiveSessionId(id)}
            />
          )}

          {activeTab === 'suggestions' && (
            <TeachingSuggestions
              sessionId={activeSessionId}
              setActiveTab={setActiveTab}
              onSelectSession={(id) => setActiveSessionId(id)}
            />
          )}

          {activeTab === 'history' && (
            <SessionHistory
              setActiveTab={setActiveTab}
              onSelectSession={(id) => {
                setActiveSessionId(id);
                setActiveTab('analytics');
              }}
            />
          )}

          {activeTab === 'settings' && <SettingsPrivacy />}
        </main>
      </div>
    </div>
  );
}

export default App;
