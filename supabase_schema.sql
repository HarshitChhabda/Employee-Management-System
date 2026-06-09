-- HRMS Pro Max - Database Schema (PostgreSQL for Supabase)
-- Clean, conflict-free schema with proper constraints
-- Run this in your Supabase SQL Editor

-- â”€â”€â”€ Core Tables â”€â”€â”€

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  category TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  appointment_order_number TEXT,
  appointment_date TEXT,
  joining_date TEXT,
  photo_url TEXT,
  qualification TEXT,
  address TEXT,
  husband_name TEXT,
  fathers_name TEXT,
  mobile_number TEXT,
  phone TEXT,
  email TEXT,
  blood_group TEXT,
  pan_number TEXT,
  aadhar_number TEXT,
  pf_number TEXT,
  epf_uan_number TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  employee_code TEXT UNIQUE,
  department TEXT,
  designation TEXT,
  dob TEXT,
  weekly_off TEXT,
  service_duration TEXT,
  basic_salary TEXT,
  tenure_end_date TEXT,
  entity TEXT NOT NULL DEFAULT 'BRANCH' CHECK (entity IN ('BRANCH', 'HO', 'ALL')),
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resigned_employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  employee_code TEXT,
  department TEXT,
  designation TEXT,
  category TEXT,
  joining_date TEXT,
  resignation_date TEXT,
  service_duration TEXT,
  dob TEXT,
  weekly_off TEXT,
  appointment_order_number TEXT,
  appointment_date TEXT,
  photo_url TEXT,
  qualification TEXT,
  address TEXT,
  husband_name TEXT,
  fathers_name TEXT,
  mobile_number TEXT,
  phone TEXT,
  email TEXT,
  blood_group TEXT,
  pan_number TEXT,
  aadhar_number TEXT,
  pf_number TEXT,
  epf_uan_number TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  reason TEXT,
  remarks TEXT,
  tenure_end_date TEXT,
  entity TEXT NOT NULL DEFAULT 'BRANCH' CHECK (entity IN ('BRANCH', 'HO', 'ALL')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- â”€â”€â”€ Attendance â”€â”€â”€

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('P','A','CL','PL','HCL','HD','WO','OD','LWP')),
  remarks TEXT DEFAULT '',
  UNIQUE(employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- â”€â”€â”€ Letters / DOLMS â”€â”€â”€

CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  subject TEXT NOT NULL,
  content TEXT,
  letter_number TEXT,
  dispatch_date TEXT,
  received_date TEXT,
  file_url TEXT,
  file_name TEXT,
  file_local_path TEXT,
  letter_type TEXT,
  office TEXT,
  sender TEXT,
  receiver TEXT,
  remarks TEXT,
  source_entity TEXT,
  target_entity TEXT,
  status TEXT DEFAULT 'dispatched',
  priority TEXT DEFAULT 'normal',
  direction TEXT,
  department TEXT,
  confidential_level TEXT DEFAULT 'public',
  is_notice_board INTEGER DEFAULT 0,
  notice_expiry_date TEXT,
  notice_pinned INTEGER DEFAULT 0,
  uploaded_by TEXT,
  assigned_to_employee_id TEXT,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS letter_audit_log (
  id TEXT PRIMARY KEY,
  letter_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS letter_acknowledgements (
  id TEXT PRIMARY KEY,
  letter_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  seen_at TEXT,
  acknowledged_at TEXT,
  FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- â”€â”€â”€ History & Tracking â”€â”€â”€

CREATE TABLE IF NOT EXISTS employee_history (
  history_id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  action_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  previous_category TEXT,
  new_category TEXT,
  changed_by TEXT DEFAULT 'Admin',
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_category_history (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  old_category TEXT,
  category TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_weekly_off_history (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  weekly_off TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- â”€â”€â”€ Leave Management â”€â”€â”€

CREATE TABLE IF NOT EXISTS pl_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  month_year TEXT NOT NULL,
  opening_balance REAL DEFAULT 0,
  added_pl REAL DEFAULT 0,
  is_surrendered INTEGER DEFAULT 0,
  surrender_year TEXT,
  surrender_letter_number TEXT,
  surrender_letter_date TEXT,
  closing_balance REAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, month_year),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  cl_total INTEGER DEFAULT 12,
  pl_total INTEGER DEFAULT 15,
  used_cl REAL DEFAULT 0,
  used_pl REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, year),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_history (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  leave_date TEXT NOT NULL,
  leave_value REAL NOT NULL DEFAULT 1,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, leave_date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- â”€â”€â”€ Payroll â”€â”€â”€

CREATE TABLE IF NOT EXISTS payroll_summary (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  payable_days REAL DEFAULT 0,
  unpaid_days REAL DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  cl_days REAL DEFAULT 0,
  pl_days REAL DEFAULT 0,
  hcl_days REAL DEFAULT 0,
  hd_days REAL DEFAULT 0,
  wo_days INTEGER DEFAULT 0,
  od_days INTEGER DEFAULT 0,
  lwp_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, month, year),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- â”€â”€â”€ Masters â”€â”€â”€

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenure_renewals (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  renewal_date TEXT,
  new_tenure_end_date TEXT,
  letter_number TEXT,
  letter_date TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- â”€â”€â”€ System & Config â”€â”€â”€

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visibility_config (
  id SERIAL PRIMARY KEY,
  controlled_role TEXT NOT NULL,
  data_scope TEXT NOT NULL,
  can_view_branch INTEGER DEFAULT 1,
  can_view_ho INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- â”€â”€â”€ Sync Queue (Offline-first) â”€â”€â”€

CREATE TABLE IF NOT EXISTS sync_queue (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  payload TEXT NOT NULL,
  entity TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  pushed_at TEXT,
  push_status TEXT DEFAULT 'PENDING',
  synced INTEGER DEFAULT 0
);

-- â”€â”€â”€ Page Permissions â”€â”€â”€

CREATE TABLE IF NOT EXISTS page_permissions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  can_read INTEGER DEFAULT 1,
  can_write INTEGER DEFAULT 0,
  can_update INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_path),
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_page_permissions_user ON page_permissions(user_id);

-- â”€â”€â”€ Security & Auth â”€â”€â”€

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('ROLE_BRANCH', 'ROLE_HO', 'ROLE_SUPER')),
  entity TEXT NOT NULL CHECK (entity IN ('BRANCH', 'HO', 'ALL')),
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  force_password_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_audit_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  username TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  success INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  locked_until TEXT,
  last_attempt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(username)
);

-- â”€â”€â”€ Indexes for Performance â”€â”€â”€

CREATE INDEX IF NOT EXISTS idx_employees_entity ON employees(entity);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status);
CREATE INDEX IF NOT EXISTS idx_letters_type ON letters(letter_type);
CREATE INDEX IF NOT EXISTS idx_letters_entity ON letters(source_entity, target_entity);
CREATE INDEX IF NOT EXISTS idx_letters_employee ON letters(employee_id);
CREATE INDEX IF NOT EXISTS idx_letter_audit_letter ON letter_audit_log(letter_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(push_status, synced);
CREATE INDEX IF NOT EXISTS idx_employee_history_employee ON employee_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON payroll_summary(employee_id, month, year);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, year);

-- â”€â”€â”€ Seed Data â”€â”€â”€

INSERT INTO app_users (id, username, display_name, password, role, entity, is_active)
VALUES 
  ('usr_branch_001', 'branch_admin', 'Mahaveer Ji', 'branch123', 'ROLE_BRANCH', 'BRANCH', 1),
  ('usr_ho_001', 'ho_admin', 'Head Office Admin', 'ho123', 'ROLE_HO', 'HO', 1),
  ('usr_super_001', 'super_admin', 'Super Admin', 'super123', 'ROLE_SUPER', 'ALL', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_config (key, value) VALUES 
  ('branch_id_prefix', 'MAH'),
  ('ho_id_prefix', 'HOJ'),
  ('branch_id_counter', '0'),
  ('ho_id_counter', '0')
ON CONFLICT (key) DO NOTHING;

INSERT INTO departments (id, name) VALUES 
  ('dept_001', 'Administration'),
  ('dept_002', 'Accounts & Finance'),
  ('dept_003', 'Sanitation / à¤¸à¥à¤µà¤šà¥à¤›à¤¤à¤¾'),
  ('dept_004', 'Information Technology'),
  ('dept_005', 'Human Resources')
ON CONFLICT (id) DO NOTHING;

INSERT INTO designations (id, name) VALUES 
  ('desig_001', 'Manager / à¤ªà¥à¤°à¤¬à¤‚à¤§à¤•'),
  ('desig_002', 'Supervisor / à¤ªà¤°à¥à¤¯à¤µà¥‡à¤•à¥à¤·à¤•'),
  ('desig_003', 'Clerk / à¤²à¤¿à¤ªà¤¿à¤•'),
  ('desig_004', 'Operator / à¤‘à¤ªà¤°à¥‡à¤Ÿà¤°'),
  ('desig_005', 'Assistant / à¤¸à¤¹à¤¾à¤¯à¤•'),
  ('desig_006', 'Peon / à¤šà¤ªà¤°à¤¾à¤¸à¥€')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Updates â”€â”€â”€

CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'supabase',
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER DEFAULT 0,
  checksum TEXT,
  status TEXT DEFAULT 'available',
  module_scope TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  installed_at TIMESTAMPTZ
);
-- Migration Script to add missing columns to existing Supabase tables
-- Run this in your Supabase SQL Editor

-- Add missing columns to 'letters' table
ALTER TABLE letters ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS letter_number TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS dispatch_date TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS received_date TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_local_path TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS letter_type TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS office TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS receiver TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS source_entity TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS target_entity TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'dispatched';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS confidential_level TEXT DEFAULT 'public';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS is_notice_board INTEGER DEFAULT 0;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS notice_expiry_date TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS notice_pinned INTEGER DEFAULT 0;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS assigned_to_employee_id TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS acknowledged INTEGER DEFAULT 0;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS acknowledged_at TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS acknowledged_by TEXT;

-- Add missing columns to 'employees' table (if any recent changes were made)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS entity TEXT NOT NULL DEFAULT 'BRANCH' CHECK (entity IN ('BRANCH', 'HO', 'ALL'));

-- Add missing columns to 'resigned_employees' table
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS service_duration TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS dob TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS weekly_off TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS tenure_end_date TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE resigned_employees ADD COLUMN IF NOT EXISTS entity TEXT NOT NULL DEFAULT 'BRANCH' CHECK (entity IN ('BRANCH', 'HO', 'ALL'));

-- Add missing columns to 'attendance' table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT '';

-- Add missing columns to 'app_users' table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS force_password_change INTEGER DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login TEXT;

-- Add missing columns to 'sync_queue' table
ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS synced INTEGER DEFAULT 0;

-- Add 'visibility_config' table
CREATE TABLE IF NOT EXISTS visibility_config (
  id SERIAL PRIMARY KEY,
  controlled_role TEXT NOT NULL,
  data_scope TEXT NOT NULL,
  can_view_branch INTEGER DEFAULT 1,
  can_view_ho INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure the indexes can now be created
CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status);
CREATE INDEX IF NOT EXISTS idx_letters_type ON letters(letter_type);
CREATE INDEX IF NOT EXISTS idx_letters_entity ON letters(source_entity, target_entity);
CREATE INDEX IF NOT EXISTS idx_letters_employee ON letters(employee_id);

-- App Updates table (for cloud-based update distribution)
CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'supabase',
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER DEFAULT 0,
  checksum TEXT,
  status TEXT DEFAULT 'available',
  module_scope TEXT DEFAULT 'all',
  created_at TIMESTAMP DEFAULT NOW(),
  installed_at TIMESTAMP
);

-- Page Permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS page_permissions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  can_read INTEGER DEFAULT 1,
  can_write INTEGER DEFAULT 0,
  can_update INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_path),
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_page_permissions_user ON page_permissions(user_id);

-- Storage bucket for update packages
-- Run this in Supabase Storage > Create bucket > Name: app-updates > Public: false
