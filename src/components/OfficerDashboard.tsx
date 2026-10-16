import React, { useState, useEffect, useTransition } from 'react';
import { User, Attendance, AttendanceStats } from '../types';
import { api } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { RejectionModal } from './RejectionModal';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Percent,
  Search,
  Filter,
  Eye,
  Check,
  X,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';

interface OfficerDashboardProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  currentUser,
  onRefreshData
}) => {
  const [, startTransition] = useTransition();

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Approval Modal state
  const [recordToApprove, setRecordToApprove] = useState<Attendance | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Rejection Modal state
  const [recordToReject, setRecordToReject] = useState<Attendance | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // View Details Modal state
  const [viewingRecord, setViewingRecord] = useState<Attendance | null>(null);

  const isOfficerOrAdmin = currentUser?.role === 'officer' || currentUser?.role === 'admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attRes, statsRes] = await Promise.all([
        api.getAttendances({
          search: searchQuery || undefined,
          cdsGroup: selectedGroup !== 'all' ? selectedGroup : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          meetingDate: selectedDate !== 'all' ? selectedDate : undefined
        }),
        api.getStats(
          selectedDate !== 'all' ? selectedDate : undefined,
          selectedGroup !== 'all' ? selectedGroup : undefined
        )
      ]);

      setAttendances(attRes.attendances);
      setStats(statsRes.stats);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load attendance records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedGroup, selectedStatus, selectedDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      fetchData();
    });
  };

  const handleApproveConfirm = async () => {
    if (!recordToApprove) return;
    try {
      setIsApproving(true);
      const res = await api.approveAttendance(
        recordToApprove.id,
        `Officer ${currentUser?.fullName} verified physical presence at CDS session.`
      );
      setRecordToApprove(null);
      setFeedback({ type: 'success', text: res.message });
      fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to approve attendance.' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!recordToReject) return;
    try {
      setIsRejecting(true);
      const res = await api.rejectAttendance(recordToReject.id, reason);
      setRecordToReject(null);
      setFeedback({ type: 'success', text: res.message });
      fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to reject attendance.' });
    } finally {
      setIsRejecting(false);
    }
  };

  // Distinct CDS groups and dates for filters
  const uniqueGroups = Array.from(new Set(attendances.map(a => a.cdsGroup))).sort();
  const uniqueDates = Array.from(new Set(attendances.map(a => a.meetingDate))).sort().reverse();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Top Banner & Security Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Attendance Officer Dashboard
            </h1>
            <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Verified Officer Desk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Physical roll-call verification desk. Attendance is only marked official after physical presence confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Access Control Notice for unauthorized users */}
      {!isOfficerOrAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-950">Read-Only Mode Notice</p>
            <p className="mt-0.5">
              You are currently viewing as <strong>{currentUser?.fullName} ({currentUser?.role})</strong>.
              Only authorized CDS attendance officers and administrators can approve or reject attendance submissions.
              Use the top-right persona switcher to switch to <em>Fatima Aminu Bello (Officer)</em> or <em>Capt. Adeyemi (Admin)</em> to test live approval actions.
            </p>
          </div>
        </div>
      )}

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
          <button
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-600 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Registered */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">Registered</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 tabular-nums">
              {stats?.totalMembers ?? '—'}
            </span>
            <span className="text-xs text-stone-500">members</span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400 truncate">Roster strength</p>
        </div>

        {/* Card 2: Pending Requests */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-amber-200/80 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-700 tabular-nums">
              {stats?.pendingCount ?? '—'}
            </span>
            <span className="text-xs text-amber-600">awaiting</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700/80 truncate">Require physical roll-call</p>
        </div>

        {/* Card 3: Approved Attendance */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-medium uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-800 tabular-nums">
              {stats?.approvedCount ?? '—'}
            </span>
            <span className="text-xs text-emerald-700">present</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700/80 truncate">Verified physical presence</p>
        </div>

        {/* Card 4: Rejected Requests */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-medium uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-700 tabular-nums">
              {stats?.rejectedCount ?? '—'}
            </span>
            <span className="text-xs text-rose-600">declined</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-600/80 truncate">Absent / Proxy violations</p>
        </div>

        {/* Card 5: Overall Attendance % */}
        <div className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">Attendance %</span>
            <Percent className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 tabular-nums">
              {stats?.attendancePercentage ?? 0}%
            </span>
            <span className="text-xs text-stone-500">official rate</span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400 truncate">Only approved count</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by corps member name or state code (e.g. OS/24B)..."
            className="w-full pl-9 pr-24 py-2 text-xs sm:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span>Filter:</span>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending Only</option>
            <option value="Approved">Approved Only</option>
            <option value="Rejected">Rejected Only</option>
          </select>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 max-w-[140px] truncate"
          >
            <option value="all">All CDS Groups</option>
            {uniqueGroups.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-mono"
          >
            <option value="all">All Dates</option>
            {uniqueDates.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Searchable Records Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-900">Attendance Records</span>
            <span className="text-xs text-stone-500 tabular-nums">
              ({attendances.length} total)
            </span>
          </div>
          <span className="text-[11px] text-stone-400">
            Sorted by check-in time (newest first)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/50 text-stone-600 font-medium uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">State Code</th>
                <th className="py-3 px-4">CDS Group</th>
                <th className="py-3 px-4">Meeting Date</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-emerald-700/30 border-t-emerald-700 rounded-full animate-spin" />
                      <span>Loading attendance records...</span>
                    </div>
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <p className="text-sm font-medium text-stone-600">No attendance records found.</p>
                    <p className="text-xs text-stone-400 mt-1">Adjust your filters or submit a new check-in to get started.</p>
                  </td>
                </tr>
              ) : (
                attendances.map(row => {
                  const checkInDate = new Date(row.checkInTime);
                  const timeFormatted = checkInDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-stone-50/80 transition-colors group"
                    >
                      {/* Full Name */}
                      <td className="py-3 px-4 font-semibold text-stone-900">
                        {row.fullName}
                      </td>

                      {/* State Code */}
                      <td className="py-3 px-4 font-mono font-medium text-emerald-800">
                        {row.stateCode}
                      </td>

                      {/* CDS Group */}
                      <td className="py-3 px-4 text-stone-600">
                        {row.cdsGroup}
                      </td>

                      {/* Meeting Date */}
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {row.meetingDate}
                      </td>

                      {/* Check-In Time */}
                      <td className="py-3 px-4 font-mono text-stone-500 tabular-nums">
                        {timeFormatted}
                      </td>

                      {/* Current Status */}
                      <td className="py-3 px-4">
                        {row.status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Approved
                          </span>
                        ) : row.status === 'Rejected' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {row.status === 'Pending' ? (
                            <>
                              {/* 1. Approve Button */}
                              <button
                                onClick={() => setRecordToApprove(row)}
                                disabled={!isOfficerOrAdmin}
                                title={
                                  !isOfficerOrAdmin
                                    ? 'Only authorized officers can approve'
                                    : 'Verify presence & approve attendance'
                                }
                                className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>

                              {/* 2. Reject Button */}
                              <button
                                onClick={() => setRecordToReject(row)}
                                disabled={!isOfficerOrAdmin}
                                title={
                                  !isOfficerOrAdmin
                                    ? 'Only authorized officers can reject'
                                    : 'Reject attendance with reason'
                                }
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic mr-2">
                              {row.status === 'Approved' ? 'Verified' : 'Declined'}
                            </span>
                          )}

                          {/* 3. View Details Button */}
                          <button
                            onClick={() => setViewingRecord(row)}
                            className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded transition-colors"
                            title="View submission details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Officer Approve Confirmation Popup (Mandatory prompt wording) */}
      <ConfirmationModal
        isOpen={!!recordToApprove}
        title="Verify Physical Presence & Approve"
        message="Confirm that you have verified this member's physical presence at the CDS meeting."
        confirmLabel="Confirm Approval"
        cancelLabel="Cancel"
        isLoading={isApproving}
        onConfirm={handleApproveConfirm}
        onCancel={() => setRecordToApprove(null)}
      />

      {/* Officer Rejection Modal */}
      <RejectionModal
        isOpen={!!recordToReject}
        memberName={recordToReject?.fullName || ''}
        stateCode={recordToReject?.stateCode || ''}
        meetingDate={recordToReject?.meetingDate || ''}
        isLoading={isRejecting}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRecordToReject(null)}
      />

      {/* Record Details Modal */}
      {viewingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h3 className="text-base font-semibold text-stone-900">
                Attendance Record Details
              </h3>
              <button
                onClick={() => setViewingRecord(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                <div>
                  <span className="text-stone-400 block">Corps Member</span>
                  <span className="font-semibold text-stone-900 text-sm">{viewingRecord.fullName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">State Code</span>
                  <span className="font-mono font-semibold text-emerald-800 text-sm">{viewingRecord.stateCode}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">CDS Group</span>
                  <span className="text-stone-800">{viewingRecord.cdsGroup}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Meeting Date</span>
                  <span className="font-mono text-stone-800">{viewingRecord.meetingDate}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Check-In Timestamp</span>
                  <span className="font-mono text-stone-800">{new Date(viewingRecord.checkInTime).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Current Status</span>
                  <span className="font-semibold text-stone-800">{viewingRecord.status}</span>
                </div>
              </div>

              {viewingRecord.status === 'Approved' && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-1">
                  <span className="font-semibold text-emerald-950 block">Officer Verification Info:</span>
                  <p className="text-emerald-800">
                    Approved by: <strong>{viewingRecord.approvedBy?.fullName || 'CDS Officer'}</strong> ({viewingRecord.approvedBy?.role})
                  </p>
                  <p className="text-emerald-700 font-mono">
                    Timestamp: {viewingRecord.approvalTimestamp ? new Date(viewingRecord.approvalTimestamp).toLocaleString() : '—'}
                  </p>
                  {viewingRecord.meetingNotes && (
                    <p className="text-emerald-800 italic mt-1">"{viewingRecord.meetingNotes}"</p>
                  )}
                </div>
              )}

              {viewingRecord.status === 'Rejected' && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 space-y-1">
                  <span className="font-semibold text-rose-950 block">Rejection Details:</span>
                  <p className="text-rose-800">
                    Reason: <strong>{viewingRecord.rejectionReason}</strong>
                  </p>
                  <p className="text-rose-700">
                    Rejected by: {viewingRecord.rejectedBy?.fullName || 'Attendance Officer'}
                  </p>
                  <p className="text-rose-600 font-mono">
                    Timestamp: {viewingRecord.rejectionTimestamp ? new Date(viewingRecord.rejectionTimestamp).toLocaleString() : '—'}
                  </p>
                </div>
              )}

              {viewingRecord.status === 'Pending' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 text-amber-800">
                  <span className="font-semibold block">Pending Physical Presence Verification:</span>
                  <p className="mt-1">
                    This corps member submitted check-in online. An authorized attendance officer must physically verify their presence in the hall before confirming approval.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
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
