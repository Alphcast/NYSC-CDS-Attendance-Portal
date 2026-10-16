import React, { useState } from 'react';
import { User } from '../types';
import { NotificationDropdown } from './NotificationDropdown';
import { ChevronDown, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: 'checkin' | 'officer' | 'register' | 'history' | 'admin';
  setActiveTab: (tab: 'checkin' | 'officer' | 'register' | 'history' | 'admin') => void;
  currentUser: User | null;
  personas: User[];
  onSwitchPersona: (userId: string) => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  personas,
  onSwitchPersona,
  onResetDemo
}) => {
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center text-xs tracking-wider shadow-xs">
            NYSC
          </div>
          <button
            onClick={() => setActiveTab('checkin')}
            className="text-left font-bold tracking-tight text-stone-900 text-base sm:text-lg whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors"
          >
            NYSC CDS Attendance Portal
          </button>
        </div>

        {/* Zone 2: Navigation Links (single-line, 4-5 concise links) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative ${
              activeTab === 'checkin'
                ? 'text-emerald-800 font-semibold'
                : 'hover:text-stone-900'
            }`}
          >
            CDS Registration
            {activeTab === 'checkin' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('officer')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative ${
              activeTab === 'officer'
                ? 'text-emerald-800 font-semibold'
                : 'hover:text-stone-900'
            }`}
          >
            Officer Desk
            {activeTab === 'officer' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative ${
              activeTab === 'register'
                ? 'text-emerald-800 font-semibold'
                : 'hover:text-stone-900'
            }`}
          >
            Attendance Record
            {activeTab === 'register' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative ${
              activeTab === 'history'
                ? 'text-emerald-800 font-semibold'
                : 'hover:text-stone-900'
            }`}
          >
            My History
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative ${
              activeTab === 'admin'
                ? 'text-emerald-800 font-semibold'
                : 'hover:text-stone-900'
            }`}
          >
            Admin & Audit
            {activeTab === 'admin' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Persona Switcher & Notifications) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currentUser?.stateCode && (
            <NotificationDropdown stateCode={currentUser.stateCode} />
          )}

          <div className="relative">
            <button
              onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200/80 rounded-lg border border-stone-200/70 transition-colors whitespace-nowrap shrink-0"
              aria-label="Switch active persona"
            >
              {currentUser?.role === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              ) : currentUser?.role === 'officer' ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
              <span className="max-w-[130px] sm:max-w-[170px] truncate">
                {currentUser?.fullName || 'Select User'}
              </span>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                ({currentUser?.role || 'Guest'})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Persona Switcher Dropdown */}
            {isPersonaMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50">
                <div className="px-3 py-2 border-b border-stone-100 mb-1">
                  <p className="text-xs font-semibold text-stone-900">Switch Role / Test Persona</p>
                  <p className="text-[11px] text-stone-500">Test different user perspectives with real authorization tokens.</p>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {personas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSwitchPersona(p.id);
                        setIsPersonaMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col ${
                        currentUser?.id === p.id
                          ? 'bg-emerald-50 text-emerald-900 font-medium'
                          : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">{p.fullName}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          {p.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 tabular-nums">
                        {p.stateCode} · {p.cdsGroup}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between px-2">
                  <button
                    onClick={() => {
                      onResetDemo();
                      setIsPersonaMenuOpen(false);
                    }}
                    className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset Demo State
                  </button>
                  <span className="text-[10px] text-stone-400">NYSC v2026</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-stone-100 bg-stone-50/80 px-2 py-1.5 text-xs font-medium text-stone-600">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`px-2 py-1 rounded ${activeTab === 'checkin' ? 'text-emerald-800 font-bold bg-emerald-50' : ''}`}
        >
          CDS Reg
        </button>
        <button
          onClick={() => setActiveTab('officer')}
          className={`px-2 py-1 rounded ${activeTab === 'officer' ? 'text-emerald-800 font-bold bg-emerald-50' : ''}`}
        >
          Officer
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`px-2 py-1 rounded ${activeTab === 'register' ? 'text-emerald-800 font-bold bg-emerald-50' : ''}`}
        >
          Record
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-2 py-1 rounded ${activeTab === 'history' ? 'text-emerald-800 font-bold bg-emerald-50' : ''}`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-2 py-1 rounded ${activeTab === 'admin' ? 'text-emerald-800 font-bold bg-emerald-50' : ''}`}
        >
          Admin
        </button>
      </div>
    </header>
  );
};
