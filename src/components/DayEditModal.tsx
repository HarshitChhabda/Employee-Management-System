import { X, Calendar, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { attendanceStatuses, hindiLabels } from '../lib/hindiLabels';
import LeaveBalanceWidget from './LeaveBalanceWidget';

interface DayEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  employeeId: number;
  employeeName: string;
  currentStatus: string;
  onSave: (data: { employee_id: number; date: string; status: string; remarks: string }) => void;
}

export default function DayEditModal({ 
  isOpen, 
  onClose, 
  date, 
  employeeId, 
  employeeName,
  currentStatus,
  onSave 
}: DayEditModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || '');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    setSelectedStatus(currentStatus || '');
  }, [currentStatus, isOpen]);

  const handleSave = () => {
    if (!selectedStatus) return;
    onSave({
      employee_id: employeeId,
      date,
      status: selectedStatus,
      remarks
    });
    onClose();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const statusObj = attendanceStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'bg-[var(--bg-tertiary)]';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans font-bold">
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in text-[var(--text-primary)] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] font-black text-lg tracking-tight">दिन संपादित करें</h3>
              <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 tracking-wide uppercase font-mono">Edit Day Attendance</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-secondary)] hover:text-red-500 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Employee Info */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3.5 shadow-inner">
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">कर्मचारी / Employee</p>
            <p className="text-[var(--text-primary)] font-black text-base mt-0.5">{employeeName}</p>
          </div>

          {/* Date Display */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-3.5 shadow-inner font-mono">
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">तारीख / Date</p>
            <p className="text-[var(--text-primary)] font-black text-base mt-0.5">{formatDate(date)}</p>
          </div>

          {/* Status Dropdown Selection */}
          <div className="space-y-2">
            <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">उपस्थिति चुनें / Select Status *</p>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] font-bold font-mono focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer text-sm"
            >
              <option value="">-- स्थिति चुनें / Select Status --</option>
              {attendanceStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.labelHi} ({status.label})
                </option>
              ))}
            </select>

            {/* Selected Status Preview */}
            {selectedStatus && (
              <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm space-y-3">
                <div className="flex items-center gap-2.5 font-mono font-black text-sm">
                  <div className={`w-3.5 h-3.5 rounded-md shadow-sm ${getStatusColor(selectedStatus)}`} />
                  <span className="text-[var(--text-primary)]">
                    {attendanceStatuses.find(s => s.value === selectedStatus)?.labelHi}
                  </span>
                  <span className="text-[var(--text-secondary)] text-xs">
                    ({attendanceStatuses.find(s => s.value === selectedStatus)?.label})
                  </span>
                </div>
                {['CL', 'PL', 'HCL'].includes(selectedStatus) && (
                  <div className="border-t border-[var(--border-primary)] pt-3">
                    <LeaveBalanceWidget
                      employeeId={String(employeeId)}
                      year={new Date(date).getFullYear()}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-mono">टिप्पणी / Remarks</p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="कोई टिप्पणी हो तो... (Any remarks...)"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-bold focus:border-blue-500 focus:outline-none shadow-inner resize-none text-sm"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex gap-4 font-black">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-all cursor-pointer uppercase tracking-wider text-xs font-mono"
          >
            {hindiLabels.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedStatus}
            className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer uppercase tracking-wider text-xs font-mono"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{hindiLabels.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
