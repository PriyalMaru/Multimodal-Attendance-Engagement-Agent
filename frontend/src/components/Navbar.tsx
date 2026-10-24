import React, { useEffect, useState } from 'react';
import { Cpu, Video, Mic, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  pageTitle: string;
  onRefresh?: () => void;
  activeSessionId?: number | null;
}

export const Navbar: React.FC<NavbarProps> = ({ pageTitle, onRefresh, activeSessionId }) => {
  const [health, setHealth] = useState<{
    device: string;
    cuda_enabled: boolean;
    status: string;
  } | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{pageTitle}</h2>
        {activeSessionId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Active Session #{activeSessionId}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Hardware & Inference Indicator */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          <span>Device: {health?.device || 'CPU'}</span>
          {health?.cuda_enabled && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-semibold">
              CUDA Active
            </span>
          )}
        </div>

        {/* Local Security Badge */}
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local Engine</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
