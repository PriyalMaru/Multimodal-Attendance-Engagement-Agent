import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  PlayCircle,
  Video,
  UploadCloud,
  BarChart3,
  Lightbulb,
  History,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'enrollment', label: 'Enroll Face', icon: UserPlus },
    { id: 'new-session', label: 'Start Session', icon: PlayCircle },
    { id: 'live', label: 'Live Attendance', icon: Video },
    { id: 'video', label: 'Video Upload', icon: UploadCloud },
    { id: 'analytics', label: 'Session Analytics', icon: BarChart3 },
    { id: 'suggestions', label: 'Teaching Suggestions', icon: Lightbulb },
    { id: 'history', label: 'Session History', icon: History },
    { id: 'settings', label: 'Settings & Privacy', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-sm tracking-tight leading-snug">
              Multimodal Agent
            </h1>
            <p className="text-xs text-slate-500">Classroom Intelligence</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Local System Status Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-700">100% Offline Local Mode</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Zero cloud data leakage. All biometric embeddings & inferences processed on-device.
        </p>
      </div>
    </aside>
  );
};
