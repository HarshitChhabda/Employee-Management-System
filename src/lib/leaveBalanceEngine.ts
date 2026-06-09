// ============================================================
// Leave Balance Engine
// Business logic for CL/PL leave balance tracking
// ============================================================

import { getStatusConfig } from './attendanceConfig';

interface LeaveBalanceResult {
  cl_total: number;
  pl_total: number;
  used_cl: number;
  used_pl: number;
  remaining_cl: number;
  remaining_pl: number;
}

/**
 * Calculate the leave deduction delta when changing from one status to another.
 * Returns { cl_delta, pl_delta } — positive means deduction, negative means reversal.
 */
export const calculateLeaveDelta = (
  newStatus: string,
  oldStatus: string | null
): { cl_delta: number; pl_delta: number } => {
  let cl_delta = 0;
  let pl_delta = 0;

  // Reverse old status deduction
  if (oldStatus) {
    const oldConfig = getStatusConfig(oldStatus);
    if (oldConfig && oldConfig.affectsLeaveBalance) {
      const balanceType = (oldConfig as any).balanceType;
      if (balanceType === 'cl') cl_delta -= oldConfig.leaveDeduction;
      if (balanceType === 'pl') pl_delta -= oldConfig.leaveDeduction;
    }
  }

  // Apply new status deduction
  if (newStatus) {
    const newConfig = getStatusConfig(newStatus);
    if (newConfig && newConfig.affectsLeaveBalance) {
      const balanceType = (newConfig as any).balanceType;
      if (balanceType === 'cl') cl_delta += newConfig.leaveDeduction;
      if (balanceType === 'pl') pl_delta += newConfig.leaveDeduction;
    }
  }

  return { cl_delta, pl_delta };
};

/**
 * Validate if an employee has sufficient leave balance for a status change.
 * Called before saving attendance.
 */
export const validateLeaveBalance = async (
  employeeId: string,
  _date: string,
  newStatus: string,
  oldStatus: string | null,
  year: number
): Promise<{ valid: boolean; message: string; messageHi: string }> => {
  const config = getStatusConfig(newStatus);
  if (!config || !config.affectsLeaveBalance) {
    return { valid: true, message: '', messageHi: '' };
  }

  try {
    const res = await fetch(`/api/leave-balances?employee_id=${employeeId}&year=${year}`);
    const balance = await res.json();

    const { cl_delta, pl_delta } = calculateLeaveDelta(newStatus, oldStatus);

    const currentCl = balance?.used_cl || 0;
    const currentPl = balance?.used_pl || 0;
    const clTotal = balance?.cl_total || 12;
    const plTotal = balance?.pl_total || 15;

    const remainingCl = clTotal - currentCl;
    const remainingPl = plTotal - currentPl;

    if (cl_delta > 0 && remainingCl < cl_delta) {
      return {
        valid: false,
        message: `Insufficient CL balance. Remaining: ${remainingCl}, Required: ${cl_delta}`,
        messageHi: `अपर्याप्त सीएल शेष। शेष: ${remainingCl}, आवश्यक: ${cl_delta}`
      };
    }

    if (pl_delta > 0 && remainingPl < pl_delta) {
      return {
        valid: false,
        message: `Insufficient PL balance. Remaining: ${remainingPl}, Required: ${pl_delta}`,
        messageHi: `अपर्याप्त पीएल शेष। शेष: ${remainingPl}, आवश्यक: ${pl_delta}`
      };
    }

    return { valid: true, message: '', messageHi: '' };
  } catch (err) {
    console.error('Leave balance validation error:', err);
    // Allow save on error — don't block attendance for network issues
    return { valid: true, message: '', messageHi: '' };
  }
};

/**
 * Get current leave balance for an employee in a given year.
 */
export const getLeaveBalance = async (
  employeeId: string,
  year: number
): Promise<LeaveBalanceResult> => {
  try {
    const res = await fetch(`/api/leave-balances?employee_id=${employeeId}&year=${year}`);
    const data = await res.json();

    const cl_total = data?.cl_total ?? 12;
    const pl_total = data?.pl_total ?? 15;
    const used_cl = data?.used_cl ?? 0;
    const used_pl = data?.used_pl ?? 0;

    return {
      cl_total,
      pl_total,
      used_cl,
      used_pl,
      remaining_cl: cl_total - used_cl,
      remaining_pl: pl_total - used_pl
    };
  } catch (err) {
    console.error('Failed to fetch leave balance:', err);
    return {
      cl_total: 12,
      pl_total: 15,
      used_cl: 0,
      used_pl: 0,
      remaining_cl: 12,
      remaining_pl: 15
    };
  }
};
