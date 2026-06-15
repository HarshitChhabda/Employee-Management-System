import type {
  Employee,
  ResignedEmployee,
  AttendanceRecord,
  LeaveBalance,
  PayrollSummary,
  PLRecord,
  HistoryRecord,
  DashboardStats,
  Letter,
} from '../types/hrms';

// ============================================================
// Centralized API Service Layer
// All Electron IPC calls go through this single module.
// ============================================================

const getSession = () => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed?.state?.session || null;
    }
  } catch (e) {}
  return null;
};

const originalInvoke = window.electronAPI?.invoke;
const invoke = async (channel: string, ...args: any[]) => {
  const session = getSession();
  return originalInvoke?.(channel, ...args, session);
};

// ─── Dashboard ───────────────────────────────────────────────
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> =>
    (await invoke?.('api:dashboard')) as DashboardStats,
};

// ─── Employees ───────────────────────────────────────────────
export const employeeAPI = {
  getAll: async (params?: { search?: string; category?: string; is_active?: boolean; include_branch?: boolean }): Promise<Employee[]> =>
    (await invoke?.('api:employees', 'get', params)) as Employee[],

  getById: async (id: string): Promise<Employee | undefined> =>
    (await invoke?.('api:employees', 'get', { id })) as Employee | undefined,

  create: async (data: Partial<Employee>): Promise<Employee> =>
    (await invoke?.('api:employees', 'create', data)) as Employee,

  update: async (id: string, data: Partial<Employee> & { category_change_reason?: string }): Promise<Employee> =>
    (await invoke?.('api:employees', 'update', { id, ...data })) as Employee,

  delete: async (id: string): Promise<{ success: boolean }> =>
    (await invoke?.('api:employees', 'delete', { id })) as { success: boolean },

  hardDelete: async (id: string): Promise<{ success: boolean }> =>
    (await invoke?.('api:employees', 'hardDelete', { id })) as { success: boolean },

  batchRename: async (renames: Array<{ oldName: string; newName: string; field: 'department' | 'designation' }>): Promise<{ success: boolean; updated: number }> =>
    (await invoke?.('api:employees', 'batchRename', { renames })) as { success: boolean; updated: number },

  batchRenameMasters: async (renames: Array<{ oldName: string; newName: string; type: 'dept' | 'desig' }>): Promise<{ success: boolean; updated: number }> =>
    (await invoke?.('api:masters', 'batchRenameMasters', { renames })) as { success: boolean; updated: number },

  batchRenameNames: async (renames: Array<{ oldName: string; newName: string }>): Promise<{ success: boolean; updated: number }> =>
    (await invoke?.('api:employees', 'batchRenameNames', { renames })) as { success: boolean; updated: number },
};

// ─── Attendance ──────────────────────────────────────────────
export const attendanceAPI = {
  getByDate: async (date: string, params?: { include_branch?: boolean }): Promise<AttendanceRecord[]> =>
    (await invoke?.('api:attendance', 'get', { date, ...params })) as AttendanceRecord[],

  getByMonth: async (month: number, year: number, params?: { include_branch?: boolean }): Promise<AttendanceRecord[]> =>
    (await invoke?.('api:attendance', 'get', { month, year, ...params })) as AttendanceRecord[],

  getByEmployee: async (employee_id: string): Promise<AttendanceRecord[]> =>
    (await invoke?.('api:attendance', 'get', { employee_id })) as AttendanceRecord[],

  upsert: async (records: { employee_id: string; date: string; status: string; remarks?: string } | { employee_id: string; date: string; status: string; remarks?: string }[]): Promise<{ success: boolean; errors?: Array<{ employee_id: string; date: string; error: string }>; savedCount?: number }> =>
    (await invoke?.('api:attendance', 'upsert', records)) as { success: boolean; errors?: Array<{ employee_id: string; date: string; error: string }>; savedCount?: number },

  autoFillWeeklyOffs: async (month: number, year: number, params?: { include_branch?: boolean }): Promise<{ success: boolean; count: number; records: Array<{ employee_id: string; date: string; status: string }> }> =>
    (await invoke?.('api:attendance', 'auto-fill-weekly-offs', { month, year, ...params })) as { success: boolean; count: number; records: Array<{ employee_id: string; date: string; status: string }> },
};

// ─── Letters ─────────────────────────────────────────────────
export const letterAPI = {
  getAll: async (params?: { employee_id?: string; include_cross_entity?: boolean }): Promise<Letter[]> =>
    (await invoke?.('api:letters', 'get', params || {})) as Letter[],

  create: async (data: Partial<Letter>): Promise<Letter> =>
    (await invoke?.('api:letters', 'create', data)) as Letter,

  update: async (id: string, data: Partial<Letter>): Promise<Letter> =>
    (await invoke?.('api:letters', 'update', { id, ...data })) as Letter,

  delete: async (id: string): Promise<{ success: boolean }> =>
    (await invoke?.('api:letters', 'delete', { id })) as { success: boolean },

  acknowledge: async (id: string): Promise<{ success: boolean; acknowledged_at?: string }> =>
    (await invoke?.('api:letters', 'acknowledge', { id })) as { success: boolean; acknowledged_at?: string },

  getStats: async (): Promise<any> =>
    (await invoke?.('api:letters', 'getStats', {})) as any,

  getAuditLog: async (letterId: string): Promise<any[]> =>
    (await invoke?.('api:letters', 'getAuditLog', { letter_id: letterId })) as any[],

  updateStatus: async (id: string, status: string): Promise<{ success: boolean }> =>
    (await invoke?.('api:letters', 'updateStatus', { id, status })) as { success: boolean },

  getNoticeBoard: async (): Promise<Letter[]> =>
    (await invoke?.('api:letters', 'getNoticeBoard', {})) as Letter[],

  getAllFiltered: async (filters: any): Promise<Letter[]> =>
    (await invoke?.('api:letters', 'get', { include_cross_entity: true, ...filters })) as Letter[],

  saveFile: async (letterId: string, fileData: string, fileName: string, mimeType: string): Promise<{ success: boolean; file_path?: string; file_local_path?: string; file_url?: string; file_name: string; storage: string }> =>
    (await invoke?.('api:letters', 'saveFile', { id: letterId, file_data: fileData, file_name: fileName, mime_type: mimeType })) as any,

  readFile: async (fileUrl?: string, fileLocalPath?: string): Promise<{ file_data: string; source: string }> =>
    (await invoke?.('api:letters', 'readFile', { file_url: fileUrl, file_local_path: fileLocalPath })) as any,

  retryPendingUploads: async (): Promise<{ success: boolean; retried: number }> =>
    (await invoke?.('api:letters', 'retryPendingUploads', {})) as any,
};

// ─── Resigned Employees ──────────────────────────────────────
export const resignedAPI = {
  getAll: async (params?: { search?: string; include_tenure_expired?: boolean }): Promise<ResignedEmployee[]> =>
    (await invoke?.('api:resigned', 'get', params)) as ResignedEmployee[],

  create: async (data: { employee_id: string; reason: string; resign_date: string }): Promise<{ success: boolean }> =>
    (await invoke?.('api:resigned', 'create', data)) as { success: boolean },

  update: async (id: string, data: { tenure_end_date?: string; reason?: string; remarks?: string }): Promise<{ success: boolean }> =>
    (await invoke?.('api:resigned', 'update', { id, ...data })) as { success: boolean },

  delete: async (id: string): Promise<{ success: boolean }> =>
    (await invoke?.('api:resigned', 'delete', { id })) as { success: boolean },
};

// ─── PL Records ──────────────────────────────────────────────
export const plAPI = {
  getAll: async (employee_id?: string): Promise<PLRecord[]> =>
    (await invoke?.('api:pl-records', 'get', employee_id ? { employee_id } : {})) as PLRecord[],

  getByMonth: async (employee_id: string, month_year: string): Promise<PLRecord | undefined> =>
    (await invoke?.('api:pl-records', 'get', { employee_id, month_year })) as PLRecord | undefined,

  upsert: async (data: Partial<PLRecord>): Promise<PLRecord> =>
    (await invoke?.('api:pl-records', 'upsert', data)) as PLRecord,
};

// ─── Masters (Departments & Designations) ────────────────────
export const masterAPI = {
  getAll: async (): Promise<{ departments: Array<{ id: string; name: string }>; designations: Array<{ id: string; name: string }> }> =>
    (await invoke?.('api:masters', 'get')) as { departments: Array<{ id: string; name: string }>; designations: Array<{ id: string; name: string }> },

  createDepartment: async (name: string): Promise<{ id: string; name: string }> =>
    (await invoke?.('api:masters', 'create_department', { name })) as { id: string; name: string },

  deleteDepartment: async (id: string): Promise<{ success: boolean }> =>
    (await invoke?.('api:masters', 'delete_department', { id })) as { success: boolean },

  createDesignation: async (name: string): Promise<{ id: string; name: string }> =>
    (await invoke?.('api:masters', 'create_designation', { name })) as { id: string; name: string },

  deleteDesignation: async (id: string): Promise<{ success: boolean }> =>
    (await invoke?.('api:masters', 'delete_designation', { id })) as { success: boolean },
};

// ─── Tenure Renewals ─────────────────────────────────────────
export const tenureAPI = {
  getAll: async (employee_id: string): Promise<Array<{ id: string; employee_id: string; renewal_date: string; new_tenure_end_date: string; letter_number: string; letter_date: string; remarks: string }>> =>
    (await invoke?.('api:tenure-renewals', 'get', { employee_id })) as Array<{ id: string; employee_id: string; renewal_date: string; new_tenure_end_date: string; letter_number: string; letter_date: string; remarks: string }>,

  create: async (data: { employee_id: string; renewal_date: string; new_tenure_end_date: string; letter_number: string; letter_date: string; remarks: string }): Promise<{ id: string }> =>
    (await invoke?.('api:tenure-renewals', 'create', data)) as { id: string },
};

// ─── Leave Balances ──────────────────────────────────────────
export const leaveBalanceAPI = {
  getAll: async (params?: { employee_id?: string; year?: number }): Promise<LeaveBalance[]> =>
    (await invoke?.('api:leave-balances', 'get', params)) as LeaveBalance[],

  getByEmployeeAndYear: async (employee_id: string, year: number): Promise<LeaveBalance | undefined> =>
    (await invoke?.('api:leave-balances', 'get', { employee_id, year })) as LeaveBalance | undefined,

  upsert: async (data: { employee_id: string; year: number; cl_total?: number; pl_total?: number; used_cl?: number; used_pl?: number }): Promise<{ success: boolean }> =>
    (await invoke?.('api:leave-balances', 'upsert', data)) as { success: boolean },
};

// ─── Payroll Summary ─────────────────────────────────────────
export const payrollAPI = {
  getByMonth: async (month: number, year: number): Promise<(PayrollSummary & { employee_name?: string; employee_code?: string })[]> =>
    (await invoke?.('api:payroll-summary', 'get', { month, year })) as (PayrollSummary & { employee_name?: string; employee_code?: string })[],

  getByEmployee: async (employee_id: string, month: number, year: number): Promise<PayrollSummary | undefined> =>
    (await invoke?.('api:payroll-summary', 'get', { employee_id, month, year })) as PayrollSummary | undefined,
};

// ─── Employee History (Audit Log) ────────────────────────────
export const historyAPI = {
  getAll: async (params?: { employee_id?: string; action_type?: string; from_date?: string; to_date?: string; search?: string; limit?: number; offset?: number }): Promise<{ rows: HistoryRecord[]; total: number }> =>
    (await invoke?.('api:employee-history', 'get', params)) as { rows: HistoryRecord[]; total: number },
};

// ─── App Updates ─────────────────────────────────────────────
export const updateAPI = {
  list: async (): Promise<{ success: boolean; updates: any[]; error?: string }> =>
    (await invoke?.('api:update:list')) as any,

  check: async (): Promise<{ success: boolean; local: boolean; supabase: boolean; updates: any[]; error?: string }> =>
    (await invoke?.('api:update:check')) as any,

  scanPendrive: async (drivePath: string): Promise<{ success: boolean; updates: any[]; error?: string }> =>
    (await invoke?.('api:update:scan-pendrive', drivePath)) as any,

  register: async (data: { version: string; title?: string; description?: string; source?: string; file_path?: string; file_url?: string; file_size?: number; checksum?: string; module_scope?: string }): Promise<{ success: boolean; update?: any; error?: string }> =>
    (await invoke?.('api:update:register', data)) as any,

  install: async (updateId: string): Promise<{ success: boolean; message?: string; error?: string }> =>
    (await invoke?.('api:update:install', updateId)) as any,

  syncFromSupabase: async (): Promise<{ success: boolean; count: number; error?: string }> =>
    (await invoke?.('api:update:sync-from-supabase')) as any,
};

// ─── AI Search (stub - backend not yet implemented) ──────────
export const aiSearchAPI = {
  search: async (query: string): Promise<{ employees: Employee[]; letters: Letter[]; insights: string[] }> => {
    try {
      return (await invoke?.('api:ai-search', { query })) as { employees: Employee[]; letters: Letter[]; insights: string[] };
    } catch {
      return { employees: [], letters: [], insights: [] };
    }
  },
};
