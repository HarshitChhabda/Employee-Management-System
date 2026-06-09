// ============================================================
// Payroll Calculation Engine
// Calculates payable/unpaid days from attendance data
// ============================================================

import { getStatusConfig, type AttendanceCode } from './attendanceConfig';

export interface MonthlyPayroll {
  payable_days: number;
  unpaid_days: number;
  present_days: number;
  absent_days: number;
  cl_days: number;
  pl_days: number;
  hcl_days: number;
  hd_days: number;
  wo_days: number;
  od_days: number;
  lwp_days: number;
}

/**
 * Calculate monthly payroll summary from attendance records.
 * @param attendance - Map of date -> status code for a single employee/month
 */
export const calculateMonthlyPayroll = (
  attendance: Record<string, string>
): MonthlyPayroll => {
  const result: MonthlyPayroll = {
    payable_days: 0,
    unpaid_days: 0,
    present_days: 0,
    absent_days: 0,
    cl_days: 0,
    pl_days: 0,
    hcl_days: 0,
    hd_days: 0,
    wo_days: 0,
    od_days: 0,
    lwp_days: 0
  };

  Object.values(attendance).forEach(status => {
    if (!status) return;
    const code = status.toUpperCase().trim();
    const config = getStatusConfig(code);
    if (!config) return;

    // Count individual status types
    switch (code) {
      case 'P': result.present_days++; break;
      case 'A': result.absent_days++; break;
      case 'CL': result.cl_days++; break;
      case 'PL': result.pl_days++; break;
      case 'HCL': result.hcl_days++; break;
      case 'HD': result.hd_days++; break;
      case 'WO': result.wo_days++; break;
      case 'OD': result.od_days++; break;
      case 'LWP': result.lwp_days++; break;
    }

    // Accumulate payroll values
    if (config.isPaid) {
      result.payable_days += config.payrollValue;
    } else {
      result.unpaid_days += 1;
    }
  });

  return result;
};

/**
 * Format payroll summary as a display string.
 */
export const formatPayrollSummary = (summary: MonthlyPayroll): string => {
  const parts = [];
  if (summary.present_days > 0) parts.push(`P:${summary.present_days}`);
  if (summary.absent_days > 0) parts.push(`A:${summary.absent_days}`);
  if (summary.cl_days > 0) parts.push(`CL:${summary.cl_days}`);
  if (summary.pl_days > 0) parts.push(`PL:${summary.pl_days}`);
  if (summary.hcl_days > 0) parts.push(`HCL:${summary.hcl_days}`);
  if (summary.hd_days > 0) parts.push(`HD:${summary.hd_days}`);
  if (summary.wo_days > 0) parts.push(`WO:${summary.wo_days}`);
  if (summary.od_days > 0) parts.push(`OD:${summary.od_days}`);
  if (summary.lwp_days > 0) parts.push(`LWP:${summary.lwp_days}`);
  return parts.join(' | ') || 'No data';
};

/**
 * Export attendance report data as CSV string.
 */
export const generatePayrollCSV = (
  data: Array<{
    employee_code: string;
    name: string;
    stats: Record<string, number>;
    payable: number;
    unpaid: number;
  }>
): string => {
  const header = 'Employee Code,Name,P,A,CL,PL,HCL,HD,WO,OD,LWP,Payable Days,Unpaid Days\n';
  const rows = data.map(row => {
    return [
      row.employee_code,
      `"${row.name}"`,
      row.stats['P'] || 0,
      row.stats['A'] || 0,
      row.stats['CL'] || 0,
      row.stats['PL'] || 0,
      row.stats['HCL'] || 0,
      row.stats['HD'] || 0,
      row.stats['WO'] || 0,
      row.stats['OD'] || 0,
      row.stats['LWP'] || 0,
      row.payable,
      row.unpaid
    ].join(',');
  }).join('\n');
  return header + rows;
};
