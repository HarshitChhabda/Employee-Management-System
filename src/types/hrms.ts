// ============================================================
// HRMS Centralized TypeScript Interfaces
// ============================================================

export interface Employee {
  id: string;
  name: string;
  title?: string;
  category: string;
  is_active: boolean | number;
  appointment_order_number?: string;
  appointment_date?: string;
  joining_date?: string;
  photo_url?: string;
  qualification?: string;
  address?: string;
  husband_name?: string;
  fathers_name?: string;
  mobile_number?: string;
  phone?: string;
  email?: string;
  blood_group?: string;
  pan_number?: string;
  aadhar_number?: string;
  pf_number?: string;
  epf_uan_number?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  employee_code: string;
  department: string;
  designation: string;
  dob?: string;
  weekly_off?: string;
  service_duration?: string;
  basic_salary?: string;
  tenure_end_date?: string;
  updated_at?: string;
  created_at?: string;
}

export interface ResignedEmployee {
  id: string;
  name: string;
  employee_code: string;
  department: string;
  designation: string;
  category: string;
  joining_date: string;
  resignation_date: string;
  resign_date: string; // alias of resignation_date
  reason: string;
  remarks?: string;
  tenure_end_date?: string;
  service_duration?: string;
}

export interface AttendanceRecord {
  id?: number;
  employee_id: string;
  date: string;
  status: string;
  remarks?: string;
  // Joined fields (from employee)
  employee_name?: string;
  employee_code?: string;
  category?: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  cl_total: number;
  pl_total: number;
  used_cl: number;
  used_pl: number;
  remaining_cl: number;
  remaining_pl: number;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveHistoryRecord {
  id: string;
  employee_id: string;
  leave_type: string;
  leave_date: string;
  leave_value: number;
  remarks?: string;
  created_at?: string;
}

export interface PayrollSummary {
  id: string;
  employee_id: string;
  month: number;
  year: number;
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
  created_at?: string;
  updated_at?: string;
}

export interface PLRecord {
  id: string;
  employee_id: string;
  month_year: string;
  opening_balance: number;
  added_pl: number;
  is_surrendered: number; // 0|1 from SQLite
  surrender_year: string;
  surrender_letter_number: string;
  surrender_letter_date: string;
  closing_balance: number;
  updated_at?: string;
}

export interface HistoryRecord {
  history_id: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  field_name: string;
  old_value: string;
  new_value: string;
  action_type: string;
  change_reason: string;
  changed_by?: string;
  changed_at: string;
}

export interface DashboardStats {
  counts: {
    totalEmployees: number;
    dailyWage: number;
    samvida: number;
    probation: number;
    permanent: number;
    resigned: number;
    [key: string]: number;
  };
  attendanceToday: Record<string, number>;
  recentLetters: Array<{
    id: string;
    subject: string;
    letter_number: string;
    dispatch_date: string;
    employee?: { name: string };
  }>;
  recentCategoryChanges: Array<{
    history_id: string;
    employee?: { name: string };
    old_category: string;
    category: string;
    changed_at: string;
  }>;
  expiringTenure?: Array<{
    id: string;
    name: string;
    employee_code: string;
    department: string;
    designation: string;
    tenure_end_date: string;
  }>;
  attendanceRate?: number;
  monthlyMarked?: number;
  lowLeaveBalance?: Array<{
    employee_id: string;
    employee_name: string;
    employee_code: string;
    remaining_cl: number;
    remaining_pl: number;
  }>;
}

export interface Letter {
  id: string;
  employee_id: string;
  subject: string;
  content?: string;
  letter_number?: string;
  dispatch_date?: string;
  file_url?: string;
  file_local_path?: string;
  file_name?: string;
  status?: string;
  priority?: string;
  direction?: string;
  confidential_level?: string;
  is_notice_board?: number;
  notice_expiry_date?: string;
  notice_pinned?: number;
  uploaded_by?: string;
  assigned_to_employee_id?: string;
  letter_type?: string;
  office?: string;
  sender?: string;
  receiver?: string;
  received_date?: string;
  remarks?: string;
  employee?: { name: string };
  source_entity?: string;
  target_entity?: string;
  acknowledged?: number;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
