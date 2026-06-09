// ============================================================
// Leave Balance Widget
// Shows CL/PL balance with progress bars per employee
// ============================================================

import { useState, useEffect } from 'react';
import { getLeaveBalance } from '../lib/leaveBalanceEngine';

interface LeaveBalanceWidgetProps {
  employeeId: string;
  year: number;
  compact?: boolean;
}

export default function LeaveBalanceWidget({ employeeId, year, compact = false }: LeaveBalanceWidgetProps) {
  const [balance, setBalance] = useState<{
    cl_total: number;
    pl_total: number;
    used_cl: number;
    used_pl: number;
    remaining_cl: number;
    remaining_pl: number;
  } | null>(null);

  useEffect(() => {
    if (employeeId && year) {
      getLeaveBalance(employeeId, year).then(setBalance);
    }
  }, [employeeId, year]);

  if (!balance) return null;

  const getColor = (remaining: number) => {
    if (remaining <= 0) return { bar: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10' };
    if (remaining <= 3) return { bar: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  };

  const clColor = getColor(balance.remaining_cl);
  const plColor = getColor(balance.remaining_pl);
  const clPct = Math.min(100, Math.max(0, (balance.used_cl / balance.cl_total) * 100));
  const plPct = Math.min(100, Math.max(0, (balance.used_pl / balance.pl_total) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider">
        <span className={clColor.text}>CL: {balance.remaining_cl}/{balance.cl_total}</span>
        <span className="opacity-30">|</span>
        <span className={plColor.text}>PL: {balance.remaining_pl}/{balance.pl_total}</span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4 space-y-3 shadow-sm">
      <h4 className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
        Leave Balance / अवकाश शेष — {year}
      </h4>

      {/* CL Balance */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[var(--text-primary)]">CL (आकस्मिक अवकाश)</span>
          <span className={`text-xs font-black font-mono ${clColor.text}`}>
            {balance.used_cl}/{balance.cl_total} used • {balance.remaining_cl} left
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className={`h-full ${clColor.bar} rounded-full transition-all duration-500`}
            style={{ width: `${clPct}%` }}
          />
        </div>
      </div>

      {/* PL Balance */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[var(--text-primary)]">PL (भुगतान अवकाश)</span>
          <span className={`text-xs font-black font-mono ${plColor.text}`}>
            {balance.used_pl}/{balance.pl_total} used • {balance.remaining_pl} left
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className={`h-full ${plColor.bar} rounded-full transition-all duration-500`}
            style={{ width: `${plPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
