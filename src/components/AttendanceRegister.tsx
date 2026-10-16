import React, { useState, useEffect } from 'react';
import { Attendance, AttendanceStats, Meeting } from '../types';
import { api } from '../api';
import {
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer
} from 'lucide-react';

export const AttendanceRegister: React.FC = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');

  // Report view modal
  const [showReportModal, setShowReportModal] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [attRes, meetRes, statsRes] = await Promise.all([
        api.getAttendances({
          search: searchQuery || undefined,
          cdsGroup: selectedGroup !== 'all' ? selectedGroup : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          meetingDate: selectedDate !== 'all' ? selectedDate : undefined
        }),
        api.getMeetings(),
        api.getStats(
          selectedDate !== 'all' ? selectedDate : undefined,
          selectedGroup !== 'all' ? selectedGroup : undefined
        )
      ]);

      setAttendances(attRes.attendances);
      setMeetings(meetRes.meetings);
      setStats(statsRes.stats);
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedGroup, selectedStatus, selectedDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleExportCsv = () => {
    const exportUrl = api.getExportCsvUrl(selectedDate, selectedGroup, selectedStatus);
    window.location.href = exportUrl;
  };

  // Distinct CDS Groups and Dates
  const uniqueGroups = Array.from(new Set(attendances.map(a => a.cdsGroup))).sort();
  const uniqueDates = Array.from(
    new Set([...meetings.map(m => m.date), ...attendances.map(a => a.meetingDate)])
  ).sort().reverse();

  const approvedList = attendances.filter(a => a.status === 'Approved');
  const pendingList = attendances.filter(a => a.status === 'Pending');
  const rejectedList = attendances.filter(a => a.status === 'Rejected');

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Official Attendance Register & Spreadsheet
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Official NYSC register of roll-call records, physical verification status, and officer audit stamps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs"
          >
            <FileText className="w-4 h-4 text-emerald-800" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip: Displays Approved totals separately from Pending */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider block">
              Official Present (Approved)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-emerald-800 tabular-nums">
                {stats?.approvedCount ?? approvedList.length}
              </span>
              <span className="text-xs text-emerald-700">physically verified</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider block">
              Pending Verification
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-amber-700 tabular-nums">
                {stats?.pendingCount ?? pendingList.length}
              </span>
              <span className="text-xs text-amber-600">awaiting officer</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-stone-100/70 border border-stone-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider block">
              Total Check-In Submissions
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-stone-900 tabular-nums">
                {attendances.length}
              </span>
              <span className="text-xs text-stone-500">
                ({rejectedList.length} rejected)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-stone-700 text-white flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Multi-Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search register by member name or state code..."
            className="w-full pl-9 pr-20 py-2 text-xs sm:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-stone-600">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span>View:</span>
          </div>

          {/* Meeting Date Selector */}
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 font-mono"
          >
            <option value="all">All Meeting Dates</option>
            {uniqueDates.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* CDS Group Selector */}
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 max-w-[150px] truncate"
          >
            <option value="all">All CDS Groups</option>
            {uniqueGroups.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-700"
          >
            <option value="all">All Statuses</option>
            <option value="Approved">Approved (Present)</option>
            <option value="Pending">Pending Review</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Complete NYSC Attendance Register Spreadsheet */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-900">Official CDS Attendance Register</span>
            <span className="text-xs text-stone-500 tabular-nums">
              ({attendances.length} records in view)
            </span>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">
            {selectedDate !== 'all' ? `Meeting: ${selectedDate}` : 'All Dates'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/70 text-stone-700 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center">S/N</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">State Code</th>
                <th className="py-3 px-4">CDS Group</th>
                <th className="py-3 px-4">Meeting Date</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Loading attendance register...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No records found matching current criteria.
                  </td>
                </tr>
              ) : (
                attendances.map((item, index) => {
                  const timeFormatted = new Date(item.checkInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-50 transition-colors"
                    >
                      {/* S/N */}
                      <td className="py-3 px-3 text-center font-mono text-stone-400 tabular-nums">
                        {index + 1}
                      </td>

                      {/* Full Name */}
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {item.fullName}
                      </td>

                      {/* State Code */}
                      <td className="py-3 px-4 font-mono font-medium text-emerald-800">
                        {item.stateCode}
                      </td>

                      {/* CDS Group */}
                      <td className="py-3 px-4 text-stone-600">
                        {item.cdsGroup}
                      </td>

                      {/* Meeting Date */}
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {item.meetingDate}
                      </td>

                      {/* Check-In Time */}
                      <td className="py-3 px-4 font-mono text-stone-500 tabular-nums">
                        {timeFormatted}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {item.status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Approved
                          </span>
                        ) : item.status === 'Rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Approved By */}
                      <td className="py-3 px-4 text-stone-700 font-mono text-[11px]">
                        {item.approvedBy ? (
                          <div>
                            <span className="font-semibold text-stone-900 font-sans block">{item.approvedBy.fullName}</span>
                            <span className="text-[10px] text-stone-400">
                              {item.approvalTimestamp ? new Date(item.approvalTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ) : item.status === 'Approved' ? (
                          'CDS Officer'
                        ) : item.status === 'Rejected' ? (
                          <span className="text-rose-600 font-sans italic">Declined</span>
                        ) : (
                          <span className="text-stone-400 font-sans italic">Awaiting verification</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meeting-Specific Attendance Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Official NYSC CDS Attendance Report
                </h3>
                <p className="text-xs text-stone-500">
                  Meeting Date: {selectedDate !== 'all' ? selectedDate : 'Comprehensive Summary'} · Group: {selectedGroup}
                </p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-700">
              {/* Executive Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Total Roster</span>
                  <span className="text-xl font-bold font-mono text-stone-900">{stats?.totalMembers ?? 0}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Present (Approved)</span>
                  <span className="text-xl font-bold font-mono text-emerald-800">{stats?.approvedCount ?? approvedList.length}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-amber-700 block text-[10px] uppercase font-bold">Pending Verification</span>
                  <span className="text-xl font-bold font-mono text-amber-700">{stats?.pendingCount ?? pendingList.length}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Attendance Rate</span>
                  <span className="text-xl font-bold font-mono text-emerald-800">{stats?.attendancePercentage ?? 0}%</span>
                </div>
              </div>

              {/* Certified Present Corps Members */}
              <div>
                <h4 className="font-semibold text-stone-900 text-sm mb-2">
                  Certified Present Members ({approvedList.length})
                </h4>
                {approvedList.length === 0 ? (
                  <p className="text-stone-400 italic">No approved attendance records for this selection.</p>
                ) : (
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                        <tr>
                          <th className="py-2 px-3">State Code</th>
                          <th className="py-2 px-3">Full Name</th>
                          <th className="py-2 px-3">CDS Group</th>
                          <th className="py-2 px-3">Verified By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono">
                        {approvedList.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-semibold text-emerald-800">{item.stateCode}</td>
                            <td className="py-2 px-3 font-sans text-stone-900">{item.fullName}</td>
                            <td className="py-2 px-3 font-sans text-stone-600">{item.cdsGroup}</td>
                            <td className="py-2 px-3 font-sans text-stone-500">{item.approvedBy?.fullName || 'CDS Officer'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pending Verification Notice */}
              {pendingList.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="font-semibold text-amber-900">
                    Awaiting Physical Presence Roll-Call ({pendingList.length} members)
                  </p>
                  <p className="text-amber-800 mt-1">
                    These members checked in online, but their attendance has NOT yet been officially verified and therefore does NOT count toward the official attendance total.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
