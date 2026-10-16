import React, { useState, useEffect } from 'react';
import { User, Attendance } from '../types';
import { api } from '../api';
import { Clock, CheckCircle2, XCircle, Calendar, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';

interface MemberHistoryProps {
  currentUser: User | null;
  onNavigateToCheckIn: () => void;
}

export const MemberHistory: React.FC<MemberHistoryProps> = ({
  currentUser,
  onNavigateToCheckIn
}) => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStateCode, setFilterStateCode] = useState(currentUser?.stateCode || '');

  const fetchHistory = async () => {
    if (!filterStateCode) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getAttendances({ stateCode: filterStateCode });
      setAttendances(res.attendances);
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.stateCode) {
      setFilterStateCode(currentUser.stateCode);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchHistory();
  }, [filterStateCode]);

  const approvedCount = attendances.filter(a => a.status === 'Approved').length;
  const pendingCount = attendances.filter(a => a.status === 'Pending').length;
  const rejectedCount = attendances.filter(a => a.status === 'Rejected').length;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            My CDS Attendance Records
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Personal attendance log, officer verification stamps, and approval tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={onNavigateToCheckIn}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
          >
            New Check-In
          </button>
        </div>
      </div>

      {/* Member Identity Strip */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-sm">
            {currentUser?.fullName.charAt(0) || 'C'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">{currentUser?.fullName || 'Corps Member'}</h3>
            <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
              <span className="font-mono text-emerald-800 font-semibold">{currentUser?.stateCode}</span>
              <span>·</span>
              <span>{currentUser?.cdsGroup}</span>
              <span>·</span>
              <span>{currentUser?.batch || '2024 Batch B'}</span>
            </div>
          </div>
        </div>

        {/* State Code manual search for testing other state codes */}
        <div className="flex items-center gap-2">
          <label htmlFor="lookupCode" className="text-xs font-medium text-stone-600 whitespace-nowrap">
            Lookup State Code:
          </label>
          <input
            id="lookupCode"
            type="text"
            value={filterStateCode}
            onChange={e => setFilterStateCode(e.target.value.toUpperCase())}
            placeholder="e.g. OS/24B/1042"
            className="px-2.5 py-1 text-xs font-mono uppercase border border-stone-300 rounded-lg w-36"
          />
        </div>
      </div>

      {/* Personal Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-emerald-800 tabular-nums">
              {approvedCount}
            </span>
            <span className="text-[11px] text-emerald-700">official present</span>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-amber-700 tabular-nums">
              {pendingCount}
            </span>
            <span className="text-[11px] text-amber-700">awaiting officer</span>
          </div>
        </div>

        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-rose-700 tabular-nums">
              {rejectedCount}
            </span>
            <span className="text-[11px] text-rose-700">declined</span>
          </div>
        </div>
      </div>

      {/* Attendance History Timeline Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Attendance History Records ({attendances.length})
        </h3>

        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-stone-200 text-center text-stone-400 text-xs">
            Loading your attendance history...
          </div>
        ) : attendances.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-stone-200 text-center space-y-3">
            <p className="text-stone-600 text-sm font-medium">No check-in submissions found for {filterStateCode}.</p>
            <p className="text-stone-400 text-xs">Submit your check-in during the next CDS meeting.</p>
            <button
              onClick={onNavigateToCheckIn}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
            >
              Check-In Now
            </button>
          </div>
        ) : (
          attendances.map(record => {
            const checkInDate = new Date(record.checkInTime);
            return (
              <div
                key={record.id}
                className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-2xs space-y-3 hover:border-stone-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span className="font-mono font-bold text-stone-900 text-sm">
                      {record.meetingDate}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-600 font-medium">
                      {record.cdsGroup}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {record.status === 'Approved' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Approved (Present)
                      </span>
                    ) : record.status === 'Rejected' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Pending Officer Review
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Check-In Time: <strong className="font-mono text-stone-700">{checkInDate.toLocaleTimeString()}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Submission ID: <code className="font-mono text-[11px] text-stone-600">{record.id}</code>
                  </span>
                </div>

                {/* Status Specific Details */}
                {record.status === 'Approved' && (
                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-emerald-950 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Physical Verification Confirmed</span>
                    </div>
                    <p className="text-emerald-800">
                      Verified by CDS Attendance Officer <strong>{record.approvedBy?.fullName || 'Authorized Officer'}</strong>
                      {record.approvalTimestamp && (
                        <span> on {new Date(record.approvalTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}.
                    </p>
                    {record.meetingNotes && (
                      <p className="text-emerald-700 italic text-[11px]">Note: "{record.meetingNotes}"</p>
                    )}
                  </div>
                )}

                {record.status === 'Rejected' && (
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-xs space-y-1">
                    <span className="font-semibold text-rose-950 block">Rejection Notice:</span>
                    <p className="text-rose-800">
                      Reason: <strong>{record.rejectionReason}</strong>
                    </p>
                    <p className="text-rose-600 text-[11px]">
                      Reviewed by: {record.rejectedBy?.fullName || 'Attendance Officer'}
                    </p>
                  </div>
                )}

                {record.status === 'Pending' && (
                  <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/80 text-xs text-stone-600 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Your check-in is submitted. You must remain physically present for officer verification.</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
