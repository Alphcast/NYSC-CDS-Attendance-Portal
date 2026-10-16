/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, MemberAttendanceSheet } from './types';
import { api, getStoredUser, setStoredSession } from './api';
import { Header } from './components/Header';
import { CDSRegistration } from './components/CDSRegistration';
import { OfficerDashboard } from './components/OfficerDashboard';
import { AttendanceRecord } from './components/AttendanceRecord';
import { MemberHistory } from './components/MemberHistory';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'checkin' | 'officer' | 'register' | 'history' | 'admin'>('checkin');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [personas, setPersonas] = useState<User[]>([]);
  const [selectedGroupOverride, setSelectedGroupOverride] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Load initial personas and session
  useEffect(() => {
    async function initSession() {
      try {
        const personasRes = await api.getPersonas();
        setPersonas(personasRes.personas);

        const stored = getStoredUser();
        if (stored) {
          setCurrentUser(stored);
        } else if (personasRes.personas.length > 0) {
          const defaultMember = personasRes.personas.find(p => p.role === 'member') || personasRes.personas[0];
          const switchRes = await api.switchPersona(defaultMember.id);
          setCurrentUser(switchRes.user);
        }
      } catch (err) {
        console.warn('Initial session load error:', err);
      } finally {
        setLoading(false);
      }
    }
    initSession();
  }, []);

  const handleSwitchPersona = async (userId: string) => {
    try {
      const res = await api.switchPersona(userId);
      setCurrentUser(res.user);
    } catch (err) {
      console.error('Failed to switch persona:', err);
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset demo:', err);
    }
  };

  const handleRegistrationComplete = (sheet: MemberAttendanceSheet, chosenGroup: string) => {
    setSelectedGroupOverride(chosenGroup);
  };

  const handleNavigateToRecord = (chosenGroup?: string) => {
    if (chosenGroup) {
      setSelectedGroupOverride(chosenGroup);
    }
    setActiveTab('register');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-800/20 border-t-emerald-800 rounded-full animate-spin" />
          <p className="text-xs font-medium text-stone-600">Initializing NYSC CDS Attendance System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* Top Header Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        personas={personas}
        onSwitchPersona={handleSwitchPersona}
        onResetDemo={handleResetDemo}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'checkin' && (
          <CDSRegistration
            currentUser={currentUser}
            onRegistrationComplete={handleRegistrationComplete}
            onNavigateToRecord={handleNavigateToRecord}
          />
        )}

        {activeTab === 'officer' && (
          <OfficerDashboard
            currentUser={currentUser}
            onRefreshData={() => {}}
          />
        )}

        {activeTab === 'register' && (
          <AttendanceRecord
            currentUser={currentUser}
            selectedGroupOverride={selectedGroupOverride}
          />
        )}

        {activeTab === 'history' && (
          <MemberHistory
            currentUser={currentUser}
            onNavigateToCheckIn={() => setActiveTab('checkin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            currentUser={currentUser}
            onRefreshData={() => {}}
          />
        )}
      </main>

      {/* Official NYSC Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">National Youth Service Corps (NYSC)</span>
            <span>·</span>
            <span>Community Development Service (CDS) Directorate</span>
          </div>

          <p className="text-center sm:text-right text-[11px] text-stone-400">
            Attendance is recognized as officially present only upon verified roll-call certification by an authorized CDS inspector.
          </p>
        </div>
      </footer>
    </div>
  );
}
