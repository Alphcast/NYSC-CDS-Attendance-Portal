import React, { useState } from 'react';
import { User, MemberAttendanceSheet } from '../types';
import { api } from '../api';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  BookOpen,
  Building,
  Phone,
  Mail,
  Grid
} from 'lucide-react';

interface CDSRegistrationProps {
  currentUser: User | null;
  onRegistrationComplete: (sheet: MemberAttendanceSheet, chosenGroup: string) => void;
  onNavigateToRecord: (chosenGroup?: string) => void;
}

export const CDS_GROUPS = [
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

export const CDSRegistration: React.FC<CDSRegistrationProps> = ({
  currentUser,
  onRegistrationComplete,
  onNavigateToRecord
}) => {
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [stateCode, setStateCode] = useState(currentUser?.stateCode || '');
  const [cdsGroup, setCdsGroup] = useState(currentUser?.cdsGroup || 'Editorial & Publicity');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [batch, setBatch] = useState(currentUser?.batch || '2024 Batch B Stream 1');
  const [ppa, setPpa] = useState(currentUser?.ppa || '');

  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [createdSheet, setCreatedSheet] = useState<MemberAttendanceSheet | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !stateCode.trim() || !cdsGroup.trim()) {
      setErrorMessage('Full Name, NYSC State Code, and CDS Group are required.');
      return;
    }

    try {
      setIsLoading(true);
      const cleanCode = stateCode.trim().toUpperCase();
      const res = await api.registerCDS({
        fullName: fullName.trim(),
        stateCode: cleanCode,
        email: email.trim() || `${cleanCode.replace(/\//g, '.').toLowerCase()}@nysc.gov.ng`,
        cdsGroup: cdsGroup.trim(),
        phoneNumber: phoneNumber.trim(),
        batch: batch.trim(),
        ppa: ppa.trim()
      });

      setCreatedSheet(res.sheet);
      setIsDone(true);
      onRegistrationComplete(res.sheet, res.user.cdsGroup);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterAnother = () => {
    setIsDone(false);
    setCreatedSheet(null);
    setFullName('');
    setStateCode('');
    setPpa('');
    setPhoneNumber('');
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-4">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-200">
          <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
          <span>Official NYSC CDS Enrollment</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Corps Member CDS Registration
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Register your details and choose your Community Development Service (CDS) group. Upon registration, your name will be enrolled and your 100-meeting attendance card will be created in your chosen group.
        </p>
      </div>

      {/* Done State Announcement */}
      {isDone && createdSheet && (
        <div className="mb-8 bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-emerald-700 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-sm uppercase tracking-widest rounded-full mb-1">
              DONE!
            </span>
            <h2 className="text-2xl font-bold text-emerald-950">
              Registration Completed Successfully
            </h2>
            <p className="text-sm text-emerald-800 mt-1 max-w-md mx-auto">
              Corps Member <strong>{createdSheet.fullName}</strong> ({createdSheet.stateCode}) has been registered into the <strong>{createdSheet.cdsGroup}</strong> group.
            </p>
          </div>

          {/* Attendance Record Preview Badge */}
          <div className="p-4 bg-white rounded-xl border border-emerald-200/90 text-left shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Assigned CDS Group:</span>
              <span className="font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {createdSheet.cdsGroup}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">NYSC State Code:</span>
              <span className="font-mono font-bold text-stone-900">{createdSheet.stateCode}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Attendance Sheet Created:</span>
              <span className="font-semibold text-emerald-800 flex items-center gap-1">
                <Grid className="w-3.5 h-3.5" />
                100 Square Boxes Generated
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigateToRecord(createdSheet.cdsGroup)}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Attendance Record ({createdSheet.cdsGroup})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleRegisterAnother}
              className="w-full sm:w-auto px-4 py-3 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs rounded-xl border border-stone-300 transition-colors"
            >
              Register Another Corps Member
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs sm:text-sm text-rose-800">
          <strong>Registration Error:</strong> {errorMessage}
        </div>
      )}

      {/* Registration Form */}
      {!isDone && (
        <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">CDS Enrollment Form</h2>
              <p className="text-xs text-stone-500">Provide official deployment credentials.</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
              100-Meeting Sheet
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name (Surname First) *
              </label>
              <input
                type="text"
                id="fullName"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Babatunde Kehinde Olusegun"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {/* NYSC State Code */}
            <div>
              <label htmlFor="stateCode" className="block text-xs font-semibold text-stone-700 mb-1">
                NYSC State Code *
              </label>
              <input
                type="text"
                id="stateCode"
                required
                value={stateCode}
                onChange={e => setStateCode(e.target.value.toUpperCase())}
                placeholder="e.g. LA/24B/3042"
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900 placeholder:text-stone-400"
              />
              <p className="text-[11px] text-stone-400 mt-0.5">
                Format: 2 State letters / Batch year & stream / 4 digits (e.g. LA/24B/1042)
              </p>
            </div>

            {/* CDS Group Selection */}
            <div>
              <label htmlFor="cdsGroup" className="block text-xs font-semibold text-stone-700 mb-1">
                Choose CDS Group *
              </label>
              <div className="relative">
                <select
                  id="cdsGroup"
                  required
                  value={cdsGroup}
                  onChange={e => setCdsGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-medium bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900"
                >
                  {CDS_GROUPS.map(g => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Your name will be added directly into this group's Attendance Record with 100 meeting boxes.
              </p>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="corpsmember@nysc.gov.ng"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-semibold text-stone-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+234..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900"
                />
              </div>
            </div>

            {/* Batch & PPA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="batch" className="block text-xs font-semibold text-stone-700 mb-1">
                  NYSC Batch
                </label>
                <input
                  type="text"
                  id="batch"
                  value={batch}
                  onChange={e => setBatch(e.target.value)}
                  placeholder="2024 Batch B Stream 1"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900"
                />
              </div>

              <div>
                <label htmlFor="ppa" className="block text-xs font-semibold text-stone-700 mb-1">
                  Primary Place of Assignment (PPA)
                </label>
                <input
                  type="text"
                  id="ppa"
                  value={ppa}
                  onChange={e => setPpa(e.target.value)}
                  placeholder="e.g. Government College, Lagos"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900"
                />
              </div>
            </div>

            {/* Note */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 text-xs text-stone-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
              <span>
                Once you click Register, your name is permanently enrolled into the CDS Attendance Record with 100 square attendance boxes in a row to track each CDS meeting during your service year.
              </span>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Attendance Record...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register for CDS & Create Attendance Record</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
