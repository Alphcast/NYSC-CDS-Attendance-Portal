import React, { useState, useEffect } from 'react';
import { User, Meeting, AuditLog, TestSummaryResponse } from '../types';
import { api } from '../api';
import {
  Users,
  Calendar,
  FileCheck2,
  FileUp,
  Download,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Activity,
  AlertCircle,
  Database,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onRefreshData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'meetings' | 'audit' | 'tests' | 'supabase'>('members');
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);

  // Members list & register
  const [members, setMembers] = useState<User[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberStateCode, setNewMemberStateCode] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberGroup, setNewMemberGroup] = useState('Editorial & Publicity');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPPA, setNewMemberPPA] = useState('');

  // CSV Bulk Import
  const [csvContent, setCsvContent] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Meetings
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingGroup, setMeetingGroup] = useState('Editorial & Publicity');
  const [meetingVenue, setMeetingVenue] = useState('Local Government Secretariat Hall');
  const [meetingAgenda, setMeetingAgenda] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Tests
  const [testResponse, setTestResponse] = useState<TestSummaryResponse | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // General feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdminOrOfficer = currentUser?.role === 'admin' || currentUser?.role === 'officer';

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, meetingsRes] = await Promise.all([
        api.getMembers(),
        api.getMeetings()
      ]);
      setMembers(membersRes.members);
      setMeetings(meetingsRes.meetings);

      if (isAdminOrOfficer) {
        const auditRes = await api.getAuditLogs().catch(() => ({ logs: [] }));
        setAuditLogs(auditRes.logs);
      }

      // Check Supabase connection
      api.getSupabaseStatus()
        .then(res => setSupabaseStatus(res))
        .catch(() => {});
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  const handleTestSupabase = async () => {
    try {
      setCheckingSupabase(true);
      const res = await api.getSupabaseStatus();
      setSupabaseStatus(res);
      setFeedback({
        type: 'success',
        text: `Supabase connection verified for project ${res.projectRef} (${res.url})`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `Supabase connection check failed: ${err.message}`
      });
    } finally {
      setCheckingSupabase(false);
    }
  };

  const [copiedSql, setCopiedSql] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);

  const handleCopySql = () => {
    fetch('/api/supabase/schema')
      .then(res => res.text())
      .then(sql => {
        navigator.clipboard.writeText(sql);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2500);
      })
      .catch(() => {
        setFeedback({ type: 'error', text: 'Failed to copy schema to clipboard.' });
      });
  };

  const handleSyncSupabase = async () => {
    try {
      setSyncingSupabase(true);
      const res = await api.syncAllToSupabase();
      if (res.result?.error) {
        setFeedback({
          type: 'error',
          text: `Supabase Sync notice: ${res.result.error}. Run the SQL schema in your Supabase dashboard first.`
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Supabase Sync Complete: Synced ${res.result.membersSynced} corps members and ${res.result.boxesSynced} meeting attendance boxes!`
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Sync failed: ${err.message}` });
    } finally {
      setSyncingSupabase(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle Register Member
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.register({
        fullName: newMemberName.trim(),
        stateCode: newMemberStateCode.trim().toUpperCase(),
        email: newMemberEmail.trim(),
        cdsGroup: newMemberGroup,
        phoneNumber: newMemberPhone.trim(),
        ppa: newMemberPPA.trim()
      });

      setFeedback({
        type: 'success',
        text: `Corps Member ${newMemberName} (${newMemberStateCode.toUpperCase()}) registered successfully.`
      });

      setNewMemberName('');
      setNewMemberStateCode('');
      setNewMemberEmail('');
      setNewMemberPhone('');
      setNewMemberPPA('');
      loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to register member.' });
    }
  };

  // Handle CSV Bulk Import
  const handleBulkImport = async () => {
    if (!csvContent.trim()) {
      setFeedback({ type: 'error', text: 'Please paste or upload valid CSV text first.' });
      return;
    }

    try {
      setLoading(true);
      const res = await api.importMembersCsv(csvContent);
      setImportStatus(res.message);
      setFeedback({ type: 'success', text: res.message });
      setCsvContent('');
      loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to import CSV.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) setCsvContent(text);
    };
    reader.readAsText(file);
  };

  // Handle Create Meeting
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.createMeeting({
        title: meetingTitle.trim(),
        date: meetingDate.trim(),
        cdsGroup: meetingGroup,
        venue: meetingVenue.trim(),
        agenda: meetingAgenda.trim(),
        startTime: '08:00',
        endTime: '12:00'
      });

      setFeedback({ type: 'success', text: res.message });
      setMeetingTitle('');
      setMeetingAgenda('');
      loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create meeting.' });
    }
  };

  // Handle Run Automated Tests
  const handleRunTests = async () => {
    try {
      setIsRunningTests(true);
      const res = await api.runSystemTests();
      setTestResponse(res);
      setFeedback({
        type: res.summary.allPassed ? 'success' : 'error',
        text: res.summary.allPassed
          ? 'All 5 automated integrity tests passed successfully!'
          : `Automated test run finished with ${res.summary.failed} failed test(s).`
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Test suite execution failed.' });
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Administration, Audit Trail & Integrity Tests
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Roster management, CSV import, CDS meeting scheduling, immutable audit log, and automated verification tests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunningTests ? 'Running Tests...' : 'Run System Tests'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Sub Navigation Bar */}
      <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200/80 w-fit text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'members'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-800" />
          <span>Members Roster ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('meetings')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'meetings'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-800" />
          <span>CDS Meetings ({meetings.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'audit'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-800" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tests')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'tests'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-800" />
          <span>System Tests</span>
        </button>

        <button
          onClick={() => setActiveSubTab('supabase')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'supabase'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-800" />
          <span>Supabase DB</span>
        </button>
      </div>

      {/* SubTab 1: Members Roster & CSV Import */}
      {activeSubTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Registered Members Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-stone-900">Registered Corps Members</h3>
                  <p className="text-[11px] text-stone-500">Official deployed corps members authorized to submit attendance.</p>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {members.length} Enrolled
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-stone-100 border-b border-stone-200 text-stone-600">
                    <tr>
                      <th className="py-2.5 px-3">State Code</th>
                      <th className="py-2.5 px-4">Full Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">CDS Group</th>
                      <th className="py-2.5 px-3">PPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans">
                    {members.map(m => (
                      <tr key={m.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-800">
                          {m.stateCode}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-stone-900">
                          {m.fullName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              m.role === 'admin'
                                ? 'bg-purple-50 text-purple-700'
                                : m.role === 'officer'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">{m.cdsGroup}</td>
                        <td className="py-2.5 px-3 text-stone-500 max-w-[160px] truncate">
                          {m.ppa || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CSV Bulk Import Section */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-emerald-800" />
                    <span>Bulk Member Import via CSV</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Upload or paste corps member records to enroll batch rosters in one click.
                  </p>
                </div>

                <a
                  href="/api/members/csv-template"
                  download
                  className="px-2.5 py-1 text-xs text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded border border-stone-200 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Sample CSV</span>
                </a>
              </div>

              <div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100"
                />
              </div>

              <div>
                <textarea
                  rows={3}
                  value={csvContent}
                  onChange={e => setCsvContent(e.target.value)}
                  placeholder="Or paste CSV text with headers: FullName,StateCode,Email,CDSGroup,PhoneNumber..."
                  className="w-full p-2.5 text-xs font-mono border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <button
                type="button"
                onClick={handleBulkImport}
                disabled={loading || !csvContent.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Processing Import...' : 'Import Corps Members'}
              </button>
            </div>
          </div>

          {/* Right Column: Register Individual Member Form */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-800" />
                <span>Register Single Corps Member</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Add an individual member to the verified database.
              </p>
            </div>

            <form onSubmit={handleRegisterMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="e.g. Chukwuemeka Okafor"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">NYSC State Code *</label>
                <input
                  type="text"
                  required
                  value={newMemberStateCode}
                  onChange={e => setNewMemberStateCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LA/24B/3110"
                  className="w-full px-3 py-2 font-mono uppercase border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  placeholder="e.g. member@nysc.gov.ng"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">CDS Group *</label>
                <select
                  value={newMemberGroup}
                  onChange={e => setNewMemberGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="Editorial & Publicity">Editorial & Publicity</option>
                  <option value="ICT & Digital Skills">ICT & Digital Skills</option>
                  <option value="FRSC Road Safety">FRSC Road Safety</option>
                  <option value="NDLEA & Anti-Drug">NDLEA & Anti-Drug</option>
                  <option value="Medical & Health">Medical & Health</option>
                  <option value="Environment & Sanitation">Environment & Sanitation</option>
                  <option value="Disaster Management / NEMA">Disaster Management / NEMA</option>
                  <option value="Gender & Vulnerable Groups">Gender & Vulnerable Groups</option>
                  <option value="Agro-Allied">Agro-Allied</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newMemberPhone}
                  onChange={e => setNewMemberPhone(e.target.value)}
                  placeholder="+234..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">PPA</label>
                <input
                  type="text"
                  value={newMemberPPA}
                  onChange={e => setNewMemberPPA(e.target.value)}
                  placeholder="Primary Place of Assignment..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Save & Verify Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SubTab 2: CDS Meetings Schedule */}
      {activeSubTab === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-stone-900">Scheduled CDS Meetings</h3>
                <span className="text-xs text-stone-500 tabular-nums">({meetings.length} meetings)</span>
              </div>

              <div className="divide-y divide-stone-100">
                {meetings.map(m => (
                  <div key={m.id} className="p-4 hover:bg-stone-50 text-xs space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-bold text-stone-900 text-sm">{m.title}</h4>
                      <span className="font-mono text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {m.date}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-stone-600">
                      <span>Group: <strong>{m.cdsGroup}</strong></span>
                      <span>·</span>
                      <span>Venue: <strong>{m.venue}</strong></span>
                      <span>·</span>
                      <span className="font-mono">{m.startTime} - {m.endTime}</span>
                    </div>

                    {m.agenda && (
                      <p className="text-stone-500 italic bg-stone-50 p-2 rounded border border-stone-100">
                        Agenda: {m.agenda}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-800" />
                <span>Schedule New CDS Meeting</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Create an official meeting date for corps member check-in.
              </p>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Monthly Community Environmental Clean-Up"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Meeting Date *</label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">CDS Group *</label>
                <select
                  value={meetingGroup}
                  onChange={e => setMeetingGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="All">All Groups (Joint Assembly)</option>
                  <option value="Editorial & Publicity">Editorial & Publicity</option>
                  <option value="ICT & Digital Skills">ICT & Digital Skills</option>
                  <option value="FRSC Road Safety">FRSC Road Safety</option>
                  <option value="NDLEA & Anti-Drug">NDLEA & Anti-Drug</option>
                  <option value="Medical & Health">Medical & Health</option>
                  <option value="Environment & Sanitation">Environment & Sanitation</option>
                  <option value="Disaster Management / NEMA">Disaster Management / NEMA</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Venue / Assembly Point *</label>
                <input
                  type="text"
                  required
                  value={meetingVenue}
                  onChange={e => setMeetingVenue(e.target.value)}
                  placeholder="e.g. Surulere LG Hall, Lagos"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Agenda / Instructions</label>
                <textarea
                  rows={2}
                  value={meetingAgenda}
                  onChange={e => setMeetingAgenda(e.target.value)}
                  placeholder="Topics to discuss or field activities..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Create CDS Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SubTab 3: Immutable Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-stone-900">Immutable Audit Trail</h3>
              <p className="text-[11px] text-stone-500">
                Permanent log of all check-in submissions, officer approvals, rejections, and administrative updates.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-stone-100 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Performed By</th>
                  <th className="py-2.5 px-3">Target Member</th>
                  <th className="py-2.5 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-stone-400">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => {
                    const timeStr = new Date(log.timestamp).toLocaleString();
                    return (
                      <tr key={log.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {timeStr}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              log.action === 'ATTENDANCE_APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : log.action === 'ATTENDANCE_REJECTED'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : log.action === 'CHECK_IN_SUBMITTED'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-stone-800">
                          {log.performedBy.fullName}{' '}
                          <span className="text-[10px] text-stone-400 uppercase">({log.performedBy.role})</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-emerald-800">
                          {log.targetMember?.stateCode || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-stone-600 max-w-md">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 4: Automated System Verification Tests */}
      {activeSubTab === 'tests' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Automated Security, Duplicate & Workflow Verification Suite
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Runs integration tests against live endpoints: duplicate check-in prevention, non-counting of pending records, self-approval constraints, and officer physical presence recording.
                </p>
              </div>

              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunningTests ? 'Executing Test Suite...' : 'Run Live Tests'}</span>
              </button>
            </div>

            {testResponse && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  testResponse.summary.allPassed
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {testResponse.summary.allPassed ? (
                    <CheckCircle className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {testResponse.summary.allPassed
                        ? 'All Verification Invariants Satisfied'
                        : `${testResponse.summary.failed} Invariants Failed`}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Passed: {testResponse.summary.passed} / {testResponse.summary.total} tests
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Case Cards */}
          {testResponse?.results && (
            <div className="space-y-3">
              {testResponse.results.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {t.passed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm">{t.name}</span>
                          <span className="text-[10px] uppercase font-semibold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1">{t.message}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-stone-400 tabular-nums">
                      {t.durationMs}ms
                    </span>
                  </div>

                  {t.details && (
                    <pre className="p-2.5 bg-stone-50 rounded-lg text-[11px] font-mono text-stone-600 overflow-x-auto border border-stone-200/60">
                      {JSON.stringify(t.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {!testResponse && !isRunningTests && (
            <div className="bg-white p-8 rounded-xl border border-stone-200 text-center space-y-3">
              <FileCheck2 className="w-10 h-10 text-emerald-800 mx-auto" />
              <h4 className="text-sm font-bold text-stone-900">Run Automated System Verification</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Click "Run Live Tests" to automatically verify that duplicate check-ins are blocked, unverified submissions remain pending, and officer verification records audit stamps.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SubTab 5: Supabase Database Configuration & Client Integration */}
      {activeSubTab === 'supabase' && (
        <div className="space-y-6">
          {/* Supabase Status Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-stone-900">
                      Supabase Cloud Database
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Configured & Active
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    PostgreSQL database powering NYSC CDS attendance records, members roster, and 100-meeting sheets.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestSupabase}
                  disabled={checkingSupabase}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingSupabase ? 'animate-spin' : ''}`} />
                  <span>{checkingSupabase ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <a
                  href="https://supabase.com/dashboard/project/fxdfoylwulrijmwzxqnd"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                >
                  <span>Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                </a>
              </div>
            </div>

            {/* Connection Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200/80 text-xs font-mono">
              <div>
                <span className="text-stone-400 font-sans block text-[11px] mb-0.5">Project URL</span>
                <span className="text-stone-800 font-semibold truncate block">
                  {supabaseStatus?.url || 'https://fxdfoylwulrijmwzxqnd.supabase.co'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 font-sans block text-[11px] mb-0.5">Project Reference</span>
                <span className="text-emerald-800 font-semibold block">fxdfoylwulrijmwzxqnd</span>
              </div>
              <div>
                <span className="text-stone-400 font-sans block text-[11px] mb-0.5">Publishable Key</span>
                <span className="text-stone-700 truncate block">sb_publishable_P7KY...0oa</span>
              </div>
            </div>
          </div>

          {/* Code Files & Integration Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Client & Server Helpers */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Installed Supabase Client Helpers</span>
              </h4>
              <p className="text-xs text-stone-500">
                Created client, server, and middleware wrappers matching the Supabase SSR standard.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 font-mono text-[11px]">
                  <span className="text-stone-400 block font-sans text-[10px] uppercase font-bold">Browser Client</span>
                  <code className="text-emerald-800 font-semibold">utils/supabase/client.ts</code>
                  <p className="text-stone-500 font-sans text-xs mt-1">
                    Exports <code className="font-mono text-stone-700">createClient()</code> and <code className="font-mono text-stone-700">supabase</code> instance using <code className="font-mono text-stone-700">@supabase/ssr</code>.
                  </p>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 font-mono text-[11px]">
                  <span className="text-stone-400 block font-sans text-[10px] uppercase font-bold">Server Client</span>
                  <code className="text-emerald-800 font-semibold">utils/supabase/server.ts</code>
                  <p className="text-stone-500 font-sans text-xs mt-1">
                    Exports <code className="font-mono text-stone-700">createClient(cookieStore)</code> and <code className="font-mono text-stone-700">supabaseServer</code> for backend data operations.
                  </p>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 font-mono text-[11px]">
                  <span className="text-stone-400 block font-sans text-[10px] uppercase font-bold">Middleware Client</span>
                  <code className="text-emerald-800 font-semibold">utils/supabase/middleware.ts</code>
                  <p className="text-stone-500 font-sans text-xs mt-1">
                    Handles cookie synchronization and session refreshing.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Card: PostgreSQL Tables Schema */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-800" />
                    <span>Supabase SQL Tables Schema</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Run this SQL script in your Supabase SQL Editor to create all tables for corps members.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Copy SQL Script</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/fxdfoylwulrijmwzxqnd/sql/new"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <span>Open SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Sync action button */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-stone-900 block">Database Synchronization</span>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Once the tables are created in Supabase, click below to push all current members and attendance records directly into Supabase.
                  </p>
                </div>

                <button
                  onClick={handleSyncSupabase}
                  disabled={syncingSupabase}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-spin' : ''}`} />
                  <span>{syncingSupabase ? 'Syncing...' : 'Sync All to Supabase'}</span>
                </button>
              </div>

              <pre className="p-3.5 bg-stone-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
{`-- 1. Create 'members' Table (All Corps Members)
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY DEFAULT 'usr_' || gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    state_code TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'officer', 'admin')),
    cds_group TEXT NOT NULL,
    phone_number TEXT DEFAULT '',
    batch TEXT DEFAULT '2024 Batch B Stream 1',
    ppa TEXT DEFAULT '',
    is_verified BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create 'attendance_boxes' Table (100 Meeting Boxes per Member)
CREATE TABLE IF NOT EXISTS public.attendance_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code TEXT NOT NULL REFERENCES public.members(state_code) ON DELETE CASCADE,
    meeting_number INT NOT NULL CHECK (meeting_number BETWEEN 1 AND 100),
    attended BOOLEAN NOT NULL DEFAULT FALSE,
    marked_at TIMESTAMPTZ,
    marked_by TEXT,
    meeting_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(state_code, meeting_number)
);

-- 3. Create 'attendances' Table (Roll-call check-ins)
CREATE TABLE IF NOT EXISTS public.attendances (
    id TEXT PRIMARY KEY DEFAULT 'att_' || gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    state_code TEXT NOT NULL REFERENCES public.members(state_code) ON DELETE CASCADE,
    cds_group TEXT NOT NULL,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meeting_number INT DEFAULT 1,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Pending',
    approved_by JSONB,
    approval_timestamp TIMESTAMPTZ,
    meeting_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow anon insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon all attendance_boxes" ON public.attendance_boxes FOR ALL USING (true);
CREATE POLICY "Allow anon all attendances" ON public.attendances FOR ALL USING (true);`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
