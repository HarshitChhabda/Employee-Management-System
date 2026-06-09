// ============================================================
// HRMS Centralized Attendance Configuration
// Single source of truth for all attendance status codes,
// colors, labels, payroll values, and leave impact.
// ============================================================

export const ATTENDANCE_CONFIG = {
  P: {
    code: 'P',
    label: 'Present',
    labelHi: 'उपस्थित',
    color: '#c6efce',
    textColor: '#276221',
    bgClass: 'bg-green-500',
    payrollValue: 1,
    leaveDeduction: 0,
    isPaid: true,
    affectsLeaveBalance: false
  },
  A: {
    code: 'A',
    label: 'Absent',
    labelHi: 'अनुपस्थित',
    color: '#ffc7ce',
    textColor: '#9c0006',
    bgClass: 'bg-red-500',
    payrollValue: 0,
    leaveDeduction: 0,
    isPaid: false,
    affectsLeaveBalance: false
  },
  CL: {
    code: 'CL',
    label: 'Casual Leave',
    labelHi: 'आकस्मिक अवकाश',
    color: '#ffeb9c',
    textColor: '#9c6500',
    bgClass: 'bg-yellow-500',
    payrollValue: 1,
    leaveDeduction: 1,
    isPaid: true,
    affectsLeaveBalance: true,
    balanceType: 'cl' as const
  },
  PL: {
    code: 'PL',
    label: 'Paid Leave',
    labelHi: 'भुगतान अवकाश',
    color: '#fff2cc',
    textColor: '#7d6608',
    bgClass: 'bg-blue-500',
    payrollValue: 1,
    leaveDeduction: 1,
    isPaid: true,
    affectsLeaveBalance: true,
    balanceType: 'pl' as const
  },
  HCL: {
    code: 'HCL',
    label: 'Half Casual Leave',
    labelHi: 'आधा आकस्मिक अवकाश',
    color: '#ffe0b2',
    textColor: '#6d3b00',
    bgClass: 'bg-orange-500',
    payrollValue: 0.5,
    leaveDeduction: 0.5,
    isPaid: true,
    affectsLeaveBalance: true,
    balanceType: 'cl' as const
  },
  HD: {
    code: 'HD',
    label: 'Half Day',
    labelHi: 'आधा दिन',
    color: '#fce4ec',
    textColor: '#880e4f',
    bgClass: 'bg-pink-500',
    payrollValue: 0.5,
    leaveDeduction: 0,
    isPaid: true,
    affectsLeaveBalance: false
  },
  WO: {
    code: 'WO',
    label: 'Weekly Off',
    labelHi: 'साप्ताहिक अवकाश',
    color: '#e2e8f0',
    textColor: '#334155',
    bgClass: 'bg-purple-500',
    payrollValue: 1,
    leaveDeduction: 0,
    isPaid: true,
    affectsLeaveBalance: false
  },
  OD: {
    code: 'OD',
    label: 'On Duty',
    labelHi: 'ड्यूटी पर',
    color: '#e8d5f5',
    textColor: '#5b2d8e',
    bgClass: 'bg-indigo-500',
    payrollValue: 1,
    leaveDeduction: 0,
    isPaid: true,
    affectsLeaveBalance: false
  },
  LWP: {
    code: 'LWP',
    label: 'Leave Without Pay',
    labelHi: 'बिना वेतन अवकाश',
    color: '#f5f5f5',
    textColor: '#616161',
    bgClass: 'bg-gray-500',
    payrollValue: 0,
    leaveDeduction: 0,
    isPaid: false,
    affectsLeaveBalance: false
  }
} as const;

export type AttendanceCode = keyof typeof ATTENDANCE_CONFIG;

/** Array version for dropdowns and iterations */
export const attendanceStatusList = Object.values(ATTENDANCE_CONFIG);

/** Get config for a status code, returns null if unknown */
export const getStatusConfig = (code: string) =>
  ATTENDANCE_CONFIG[code as AttendanceCode] || null;

/** Get payroll value for a given status */
export const calculatePayrollValue = (status: string): number => {
  return getStatusConfig(status)?.payrollValue ?? 0;
};

/** Calculate total payable days from a month's attendance map */
export const calculateMonthlyPayableDays = (
  attendanceMap: Record<string, string>
): number => {
  return Object.values(attendanceMap).reduce((total, status) => {
    return total + calculatePayrollValue(status);
  }, 0);
};

/** Normalize legacy lowercase status codes to standard uppercase codes */
export const normalizeStatusCode = (raw: string): string => {
  if (!raw) return '';
  const s = raw.toUpperCase().trim();
  const legacyMap: Record<string, string> = {
    'PRESENT': 'P',
    'ABSENT': 'A',
    'PAID LEAVE': 'PL',
    'PAID_LEAVE': 'PL',
    'CASUAL LEAVE': 'CL',
    'CASUAL_LEAVE': 'CL',
    'HALF_CL': 'HCL',
    'HALF CL': 'HCL',
    'WEEKLY_OFF': 'WO',
    'WEEKLY OFF': 'WO',
    'ON DUTY': 'OD',
    'ON_DUTY': 'OD',
    'HALF DAY': 'HD',
    'HALF_DAY': 'HD',
    'LEAVE WITHOUT PAY': 'LWP',
    'LEAVE_WITHOUT_PAY': 'LWP',
  };
  return legacyMap[s] || s;
};
