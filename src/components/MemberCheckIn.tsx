import React, { useState, useEffect } from 'react';
import { User, Meeting, Attendance } from '../types';
import { api } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';

interface MemberCheckInProps {
  currentUser: User | null;
  onViewHistory: () => void;
  onAttendanceSubmitted?: () => void;
}

const CDS_GROUPS = [
  'Editorial & Publicity',
  'ICT & Digital Skills',
  'FRSC Road Safety',
  'NDLEA & Anti-Drug',
  'Medical & Health',
  'Environment & Sanitation',
  'Disaster Management / NEMA',
  'Gender & Vulnerable Groups',
  'Agro-Allied',
  'Education & Literacy',
  'Sports & Culture'
];

export const MemberCheckIn: React.FC<MemberCheckInProps> = ({
  currentUser,
  onViewHistory,
  onAttendanceSubmitted
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [stateCode, setStateCode] = useState(currentUser?.stateCode || '');
  const [cdsGroup, setCdsGroup] = useState(currentUser?.cdsGroup || 'Editorial & Publicity');
  const [meetingDate, setMeetingDate] = useState(todayStr);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);

  // Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result Feedback states
  const [successResult, setSuccessResult] = useState<{
    message: string;
    attendance: Attendance;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync when current user switches
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setStateCode(currentUser.stateCode);
      if (currentUser.cdsGroup && CDS_GROUPS.includes(currentUser.cdsGroup)) {
        setCdsGroup(currentUser.cdsGroup);
      }
    }
  }, [currentUser]);

  // Load active meetings
  useEffect(() => {
    api.getMeetings()
      .then(res => {
        setActiveMeetings(res.meetings);
        const matchingMeeting = res.meetings.find(
          m => m.date === todayStr && (m.cdsGroup === 'All' || m.cdsGroup === cdsGroup)
        );
        if (matchingMeeting) {
          setMeetingDate(matchingMeeting.date);
        }
      })
      .catch(() => {});
  }, [cdsGroup, todayStr]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessResult(null);

    if (!fullName.trim() || !stateCode.trim() || !cdsGroup.trim() || !meetingDate.trim()) {
      setErrorMessage('Please fill in all mandatory check-in fields.');
      return;
    }

    // Open confirmation popup
    setIsConfirmModalOpen(true);
  };

  const handleConfirmCheckIn = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const matchingMeeting = activeMeetings.find(
        m => m.date === meetingDate && (m.cdsGroup === 'All' || m.cdsGroup === cdsGroup)
      );

      const res = await api.submitCheckIn({
        fullName: fullName.trim(),
        stateCode: stateCode.trim().toUpperCase(),
        cdsGroup: cdsGroup.trim(),
        meetingDate: meetingDate.trim(),
        meetingId: matchingMeeting?.id
      });

      setIsConfirmModalOpen(false);
      setSuccessResult({
        message: res.message,
        attendance: res.attendance
      });

      if (onAttendanceSubmitted) {
        onAttendanceSubmitted();
      }
    } catch (err: any) {
      setIsConfirmModalOpen(false);
      setErrorMessage(err.message || 'Check-in submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCheckIn = () => {
    setIsConfirmModalOpen(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-4">
      {/* Editorial Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          Official Roll-Call Verification
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          CDS Attendance Check-In
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto">
          Please provide your verified NYSC credentials. Attendance is strictly recorded as <strong className="text-stone-800">Pending</strong> until the assigned attendance officer verifies your physical presence.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successResult && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-emerald-950">
                Check-In Submitted Successfully
              </h3>
              <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
                {successResult.message}
              </p>

              {/* Status Banner */}
              <div className="mt-4 p-3 bg-white/90 rounded-lg border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-stone-500">Record ID:</span>{' '}
                  <span className="font-mono text-stone-800">{successResult.attendance.id}</span>
                  <span className="mx-2 text-stone-300">·</span>
                  <span className="text-stone-500">Current Status:</span>{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Clock className="w-3 h-3" />
                    Pending Officer Verification
                  </span>
                </div>
                <button
                  onClick={onViewHistory}
                  className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-900 font-semibold transition-colors"
                >
                  <span>Track Status in History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Notice: An authorized attendance officer will inspect roll-call presence shortly.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error / Duplicate Warning Banner */}
      {errorMessage && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-950">Submission Error</p>
            <p className="mt-0.5 text-xs sm:text-sm leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Check-In Card */}
      <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Corps Member Details</h2>
            <p className="text-xs text-stone-500">Verify your call-up credentials before submission.</p>
          </div>
          <span className="text-xs font-mono text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
            {meetingDate}
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Full Name (Surname First or Official NYSC Name) *
            </label>
            <input
              type="text"
              id="fullName"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Ibrahim Oladepo Adeleke"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
            />
          </div>

          {/* NYSC State Code */}
          <div>
            <label htmlFor="stateCode" className="block text-xs font-semibold text-stone-700 mb-1.5">
              NYSC State Code *
            </label>
            <div className="relative">
              <input
                type="text"
                id="stateCode"
                required
                value={stateCode}
                onChange={e => setStateCode(e.target.value.toUpperCase())}
                placeholder="e.g. LA/24B/1042 or FC/25A/0192"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Must match your NYSC deployment state code format (e.g. LA/24B/1042).
            </p>
          </div>

          {/* CDS Group */}
          <div>
            <label htmlFor="cdsGroup" className="block text-xs font-semibold text-stone-700 mb-1.5">
              CDS Group *
            </label>
            <select
              id="cdsGroup"
              required
              value={cdsGroup}
              onChange={e => setCdsGroup(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900"
            >
              {CDS_GROUPS.map(group => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          {/* Meeting Date */}
          <div>
            <label htmlFor="meetingDate" className="block text-xs font-semibold text-stone-700 mb-1.5">
              CDS Meeting Date *
            </label>
            <input
              type="date"
              id="meetingDate"
              required
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 font-mono"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Select the official date for this CDS assembly or project.
            </p>
          </div>

          {/* Verification Protocol Warning */}
          <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200/80 text-xs text-stone-600 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-stone-900">Physical Verification Notice:</strong> Duplicate check-ins for the same meeting date are automatically blocked by the database. Submitting this check-in registers your request, but only physical roll-call verification by an authorized attendance officer will count you as officially present.
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Check-In for CDS Meeting
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Popup Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Confirm CDS Attendance Submission"
        message="Are you sure you want to submit your attendance for this CDS meeting?"
        confirmLabel="Yes, Submit Attendance"
        cancelLabel="No, Cancel"
        isLoading={isSubmitting}
        onConfirm={handleConfirmCheckIn}
        onCancel={handleCancelCheckIn}
      />
    </div>
  );
};
