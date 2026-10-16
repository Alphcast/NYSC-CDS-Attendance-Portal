import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  memberName: string;
  stateCode: string;
  meetingDate: string;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const COMMON_REASONS = [
  'Member absent during physical roll-call roll verification.',
  'Proxy check-in detected; corps member was not physically present.',
  'Late arrival after CDS roll-call closed.',
  'Attended incorrect CDS group session without authorization.',
  'Non-compliance with NYSC CDS attire / kit regulations.'
];

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  memberName,
  stateCode,
  meetingDate,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific rejection reason.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Reject Attendance Request
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {memberName} ({stateCode}) · {meetingDate}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <p className="text-sm text-stone-600">
              Please enter the official reason for rejecting this attendance submission. The member will be notified with this reason, and this decision will be permanently recorded in the audit trail.
            </p>

            {/* Quick Templates */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Quick Rejection Templates:
              </label>
              <div className="space-y-1">
                {COMMON_REASONS.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setReason(r);
                      setError('');
                    }}
                    className="w-full text-left text-xs p-2 rounded-md bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200/60 transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="rejectionReason" className="block text-xs font-semibold text-stone-700 mb-1">
                Rejection Reason (Required)
              </label>
              <textarea
                id="rejectionReason"
                rows={3}
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="State clearly why physical presence was not verified..."
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                required
              />
              {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 bg-stone-50 border-t border-stone-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                'Confirm Rejection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
