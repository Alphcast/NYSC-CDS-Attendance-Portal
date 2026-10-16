import React, { useState, useEffect, useRef } from 'react';
import { MemberAttendanceSheet, CDSAttendanceRecordsResponse, User } from '../types';
import { api } from '../api';
import { CDS_GROUPS } from './CDSRegistration';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Search,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Grid,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  Users,
  Award
} from 'lucide-react';

interface AttendanceRecordProps {
  currentUser: User | null;
  selectedGroupOverride?: string;
}

export const AttendanceRecord: React.FC<AttendanceRecordProps> = ({
  currentUser,
  selectedGroupOverride
}) => {
  const [data, setData] = useState<CDSAttendanceRecordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>(selectedGroupOverride || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredBox, setHoveredBox] = useState<{
    memberCode: string;
    meetingNum: number;
    attended: boolean;
    markedBy?: string;
    markedAt?: string;
  } | null>(null);
  const [updatingBox, setUpdatingBox] = useState<string | null>(null); // "stateCode-meetingNum"
  const [feedback, setFeedback] = useState<string | null>(null);

  // Unmark Attendance Confirmation Modal State
  const [pendingUnmark, setPendingUnmark] = useState<{
    member: MemberAttendanceSheet;
    meetingNumber: number;
  } | null>(null);
  const [isUnmarking, setIsUnmarking] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedGroupOverride) {
      setActiveGroup(selectedGroupOverride);
    }
  }, [selectedGroupOverride]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getCDSAttendanceRecords(
        activeGroup !== 'All' ? activeGroup : undefined,
        searchQuery || undefined
      );
      setData(res);
    } catch (err: any) {
      console.error('Error fetching CDS attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [activeGroup]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  // Handle clicking a square box in the 100-meeting row
  const handleBoxClick = (member: MemberAttendanceSheet, meetingNumber: number) => {
    const box = member.boxes[meetingNumber];
    const isAttended = box?.attended || false;

    if (isAttended) {
      // The meeting is currently marked! Show confirmation popup before unmarking
      setPendingUnmark({ member, meetingNumber });
    } else {
      // The meeting is unmarked: Mark as attended immediately
      executeToggle(member.stateCode, meetingNumber);
    }
  };

  // Perform API call to mark or unmark meeting box and update state
  const executeToggle = async (stateCode: string, meetingNumber: number) => {
    const key = `${stateCode}-${meetingNumber}`;
    try {
      setUpdatingBox(key);
      const res = await api.toggleMeetingBox(stateCode, meetingNumber);

      // Update local state smoothly
      setData(prev => {
        if (!prev) return prev;

        const updateSheet = (sheet: MemberAttendanceSheet) => {
          if (sheet.stateCode !== stateCode) return sheet;
          const updatedBoxes = { ...sheet.boxes, [meetingNumber]: res.box };
          const attendedCount = Object.values(updatedBoxes).filter(b => b.attended).length;
          return {
            ...sheet,
            boxes: updatedBoxes,
            attendedCount,
            attendancePercentage: Math.round((attendedCount / 100) * 100)
          };
        };

        const updatedAll = prev.allMembers.map(updateSheet);
        const updatedGroups: Record<string, MemberAttendanceSheet[]> = {};
        for (const [groupName, sheets] of Object.entries(prev.groups)) {
          updatedGroups[groupName] = sheets.map(updateSheet);
        }

        return {
          ...prev,
          allMembers: updatedAll,
          groups: updatedGroups
        };
      });

      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3500);
      return res;
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to update meeting box'}`);
      setTimeout(() => setFeedback(null), 4000);
      throw err;
    } finally {
      setUpdatingBox(null);
    }
  };

  // User confirmed unmarking in the popup modal -> remove the mark
  const handleConfirmUnmark = async () => {
    if (!pendingUnmark) return;
    try {
      setIsUnmarking(true);
      await executeToggle(pendingUnmark.member.stateCode, pendingUnmark.meetingNumber);
      setPendingUnmark(null);
    } catch {
      // Error feedback is already handled in executeToggle
    } finally {
      setIsUnmarking(false);
    }
  };

  // User clicked cancel in the popup modal -> keep the mark intact
  const handleCancelUnmark = () => {
    setPendingUnmark(null);
  };

  // Scroll 100 boxes quickly
  const scrollBoxes = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -350 : 350;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const jumpToMeeting = (num: number) => {
    if (scrollContainerRef.current) {
      // Each box is ~34px wide
      scrollContainerRef.current.scrollTo({ left: (num - 1) * 34, behavior: 'smooth' });
    }
  };

  // Determine which list of members to render based on activeGroup
  const membersToDisplay: MemberAttendanceSheet[] =
    activeGroup === 'All'
      ? data?.allMembers || []
      : data?.groups[activeGroup] || [];

  // Available groups for tab selector
  const availableGroups = ['All', ...CDS_GROUPS];

  // Calculate overall metrics
  const totalEnrolled = membersToDisplay.length;
  const totalAttendedBoxes = membersToDisplay.reduce((sum, m) => sum + m.attendedCount, 0);
  const possibleBoxes = totalEnrolled * 100;
  const overallRate = possibleBoxes > 0 ? Math.round((totalAttendedBoxes / possibleBoxes) * 100) : 0;

  return (
    <div className="max-w-[1550px] mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-start gap-3.5">
          <img
            src="/nysc-logo.jpg"
            alt="NYSC Logo"
            className="w-12 h-12 rounded-full object-contain p-0.5 border border-amber-300/80 bg-white shadow-xs shrink-0 mt-0.5"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                CDS Attendance Record (100 Meetings Sheet)
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Official NYSC Roster
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Registered corps members split into their chosen CDS groups. Click any of the <strong>100 square boxes</strong> in front of a member's name to mark them present for that CDS meeting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRecords()}
            className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Record</span>
          </button>

          <a
            href={api.getExportCsvUrl(undefined, activeGroup !== 'All' ? activeGroup : undefined)}
            download
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-900 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-600 font-bold">✕</button>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">
            Registered Members in View
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-stone-900 tabular-nums">
              {totalEnrolled}
            </span>
            <span className="text-xs text-stone-400">corps members</span>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider block">
            Total Meetings Marked
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-emerald-800 tabular-nums">
              {totalAttendedBoxes}
            </span>
            <span className="text-xs text-emerald-700">present marks</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">
            Active CDS Group
          </span>
          <div className="mt-1 truncate font-bold text-base text-stone-900">
            {activeGroup}
          </div>
        </div>

        <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider block">
            Overall Attendance Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-stone-900 tabular-nums">
              {overallRate}%
            </span>
            <span className="text-xs text-stone-400">across 100 meetings</span>
          </div>
        </div>
      </div>

      {/* CDS Group Split Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-800" />
            <span>Select CDS Group Roster:</span>
          </span>
          <span className="text-xs text-stone-400">
            Split according to chosen CDS group
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {availableGroups.map(g => {
            const count = g === 'All' ? data?.totalRegistered || 0 : data?.groups[g]?.length || 0;
            const isActive = activeGroup === g;
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white font-bold shadow-xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{g}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive ? 'bg-emerald-900 text-emerald-100' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Quick 100-Meeting Scroller Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, state code..."
            className="w-full pl-9 pr-16 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded"
          >
            Find
          </button>
        </form>

        {/* Quick Jump Buttons to Meeting Numbers */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-stone-500 font-medium text-[11px] whitespace-nowrap">
            Jump to Meeting:
          </span>
          {[1, 10, 25, 50, 75, 100].map(n => (
            <button
              key={n}
              onClick={() => jumpToMeeting(n)}
              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[11px] rounded border border-stone-200 transition-colors"
            >
              #{n}
            </button>
          ))}

          <div className="h-4 w-px bg-stone-200 mx-1" />

          {/* Scroll Buttons */}
          <button
            onClick={() => scrollBoxes('left')}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
            title="Scroll meetings left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollBoxes('right')}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors"
            title="Scroll meetings right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 100-Box Attendance Record Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 text-xs uppercase tracking-wider">
              {activeGroup === 'All' ? 'All Registered CDS Groups' : activeGroup} Attendance Record
            </span>
            <span className="text-xs font-mono text-stone-500 tabular-nums">
              ({membersToDisplay.length} corps members)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-700 flex items-center justify-center text-white text-[9px] font-bold">
                ✓
              </span>
              <span>Marked (Present)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border border-stone-300 bg-white" />
              <span>Unmarked</span>
            </div>
            <span className="text-stone-300">|</span>
            <span className="italic text-[11px] text-stone-400">Click any box to mark/unmark</span>
          </div>
        </div>

        {/* Scrollable Container with Sticky Left Column */}
        <div className="overflow-x-auto relative" ref={scrollContainerRef}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/90 text-stone-700 font-semibold uppercase text-[11px] tracking-wider">
                {/* Sticky Left Column 1: S/N */}
                <th className="py-3 px-3 w-12 text-center sticky left-0 z-20 bg-stone-100 shadow-[1px_0_0_0_#e7e5e4]">
                  S/N
                </th>

                {/* Sticky Left Column 2: Member Name & State Code */}
                <th className="py-3 px-4 min-w-[200px] sm:min-w-[240px] sticky left-12 z-20 bg-stone-100 shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]">
                  Corps Member & State Code
                </th>

                {/* Sticky Left Column 3: Total Attended Score */}
                <th className="py-3 px-3 min-w-[100px] text-center sticky left-[252px] sm:left-[288px] z-20 bg-stone-100 shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]">
                  Total Present
                </th>

                {/* 100 Meeting Square Box Header Columns */}
                {Array.from({ length: 100 }, (_, i) => i + 1).map(meetingNum => (
                  <th
                    key={meetingNum}
                    className="py-2 px-1 text-center font-mono text-[10px] text-stone-500 w-9 min-w-9 select-none border-r border-stone-200/50"
                  >
                    M{meetingNum}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={103} className="py-16 text-center text-stone-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-emerald-700/30 border-t-emerald-700 rounded-full animate-spin" />
                      <span>Loading attendance record for {activeGroup}...</span>
                    </div>
                  </td>
                </tr>
              ) : membersToDisplay.length === 0 ? (
                <tr>
                  <td colSpan={103} className="py-16 text-center text-stone-400">
                    <p className="text-sm font-semibold text-stone-600">
                      No corps members registered in {activeGroup} yet.
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      Go to the CDS Registration tab to enroll members into this group.
                    </p>
                  </td>
                </tr>
              ) : (
                membersToDisplay.map((member, idx) => {
                  return (
                    <tr
                      key={member.memberId || member.stateCode}
                      className="hover:bg-stone-50/70 transition-colors group"
                    >
                      {/* Sticky S/N */}
                      <td className="py-3 px-3 text-center font-mono text-stone-400 text-xs tabular-nums sticky left-0 z-10 bg-white group-hover:bg-stone-50 shadow-[1px_0_0_0_#e7e5e4]">
                        {idx + 1}
                      </td>

                      {/* Sticky Name & Code */}
                      <td className="py-3 px-4 sticky left-12 z-10 bg-white group-hover:bg-stone-50 shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]">
                        <div>
                          <span className="font-bold text-stone-900 block truncate">
                            {member.fullName}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                            <span className="font-mono font-semibold text-emerald-800">
                              {member.stateCode}
                            </span>
                            <span>·</span>
                            <span className="truncate max-w-[110px]">{member.cdsGroup}</span>
                          </div>
                        </div>
                      </td>

                      {/* Sticky Attended Count Column */}
                      <td className="py-3 px-3 text-center sticky left-[252px] sm:left-[288px] z-10 bg-white group-hover:bg-stone-50 shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-emerald-800 text-xs tabular-nums">
                            {member.attendedCount} / 100
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {member.attendancePercentage}%
                          </span>
                        </div>
                      </td>

                      {/* 100 Square Shape Boxes in a row */}
                      {Array.from({ length: 100 }, (_, i) => i + 1).map(meetingNum => {
                        const box = member.boxes[meetingNum];
                        const isAttended = box?.attended || false;
                        const boxKey = `${member.stateCode}-${meetingNum}`;
                        const isUpdating = updatingBox === boxKey;

                        return (
                          <td
                            key={meetingNum}
                            className="p-1 text-center align-middle border-r border-stone-200/50"
                          >
                            <button
                              type="button"
                              onClick={() => handleBoxClick(member, meetingNum)}
                              onMouseEnter={() =>
                                setHoveredBox({
                                  memberCode: member.stateCode,
                                  meetingNum,
                                  attended: isAttended,
                                  markedBy: box?.markedBy,
                                  markedAt: box?.markedAt
                                })
                              }
                              onMouseLeave={() => setHoveredBox(null)}
                              disabled={isUpdating}
                              title={`Meeting #${meetingNum} - ${member.fullName} (${isAttended ? 'Present' : 'Click to mark present'})`}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md transition-all flex items-center justify-center font-mono text-[10px] cursor-pointer select-none ${
                                isAttended
                                  ? 'bg-emerald-700 text-white shadow-2xs hover:bg-emerald-800 border border-emerald-800 font-bold scale-[1.03]'
                                  : 'bg-white hover:bg-emerald-50 text-stone-400 hover:text-emerald-700 border border-stone-300 hover:border-emerald-500'
                              } ${isUpdating ? 'animate-pulse opacity-60' : ''}`}
                            >
                              {isAttended ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <span className="opacity-40">{meetingNum}</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Hover Tooltip / Status Inspector Bar */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-600">
          {hoveredBox ? (
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>
                Meeting <strong className="font-mono">#{hoveredBox.meetingNum}</strong> for{' '}
                <strong className="font-mono">{hoveredBox.memberCode}</strong>:{' '}
                {hoveredBox.attended ? (
                  <span className="text-emerald-800 font-semibold">
                    ✓ Marked Present
                    {hoveredBox.markedBy ? ` by ${hoveredBox.markedBy}` : ''}
                    {hoveredBox.markedAt ? ` on ${new Date(hoveredBox.markedAt).toLocaleDateString()}` : ''}
                  </span>
                ) : (
                  <span className="text-stone-500 italic">Not yet attended (Click box to mark present)</span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-400">
              <Info className="w-4 h-4 shrink-0" />
              <span>Hover over any of the 100 boxes to inspect verification details.</span>
            </div>
          )}

          <div className="text-[11px] text-stone-500">
            Official NYSC Requirement: 100 Scheduled CDS Meetings
          </div>
        </div>
      </div>

      {/* Unmark Attendance Confirmation Popup Modal */}
      <ConfirmationModal
        isOpen={!!pendingUnmark}
        title="Unmark Attendance Record"
        icon="alert"
        isDestructive={true}
        confirmLabel="Confirm & Remove Mark"
        cancelLabel="Cancel"
        isLoading={isUnmarking}
        onConfirm={handleConfirmUnmark}
        onCancel={handleCancelUnmark}
        message={
          pendingUnmark ? (
            <div className="space-y-3.5 text-stone-600">
              <p className="text-xs sm:text-sm leading-relaxed">
                Are you sure you want to remove the attendance mark for this corps member?
              </p>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">Corps Member:</span>
                  <span className="font-bold text-stone-900">{pendingUnmark.member.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">NYSC State Code:</span>
                  <span className="font-mono font-bold text-emerald-800">{pendingUnmark.member.stateCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">CDS Group:</span>
                  <span className="text-stone-700">{pendingUnmark.member.cdsGroup}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-stone-200">
                  <span className="text-stone-500 font-medium">Meeting Session:</span>
                  <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                    Meeting #{pendingUnmark.meetingNumber}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/80 text-[11px] text-amber-900">
                Notice: Clicking <strong>Confirm & Remove Mark</strong> will remove the checkmark and decrement the attendance score. Clicking <strong>Cancel</strong> will keep the attendance mark intact.
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
};
