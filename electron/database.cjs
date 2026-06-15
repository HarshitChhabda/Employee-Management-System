const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { app } = require('electron');
const { randomUUID: uuidv4 } = require('crypto');

async function setupDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.run('PRAGMA busy_timeout = 5000');
  console.log(`Database connected at ${dbPath}`);

  await db.run(`
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
      employee_code TEXT,
      department TEXT,
      designation TEXT,
      dob TEXT,
      weekly_off TEXT,
      service_duration TEXT,
      basic_salary TEXT,
      tenure_end_date TEXT,
      entity TEXT DEFAULT 'BRANCH',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
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
      entity TEXT DEFAULT 'BRANCH',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
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
      changed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('P','A','CL','PL','HCL','HD','WO','OD','LWP')),
      remarks TEXT DEFAULT '',
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT,
      letter_number TEXT,
      dispatch_date TEXT,
      file_url TEXT,
      letter_type TEXT,
      office TEXT,
      sender TEXT,
      receiver TEXT,
      received_date TEXT,
      remarks TEXT,
      source_entity TEXT,
      target_entity TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      acknowledged_by TEXT,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS letter_audit_log (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      performed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (letter_id) REFERENCES letters(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS letter_acknowledgements (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      seen_at TEXT,
      acknowledged_at TEXT,
      FOREIGN KEY (letter_id) REFERENCES letters(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS employee_category_history (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      old_category TEXT,
      category TEXT NOT NULL,
      changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
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
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, month_year),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS designations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS tenure_renewals (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      renewal_date TEXT,
      new_tenure_end_date TEXT,
      letter_number TEXT,
      letter_date TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      employee_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      cl_total INTEGER DEFAULT 12,
      pl_total INTEGER DEFAULT 15,
      used_cl REAL DEFAULT 0,
      used_pl REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, year),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS leave_history (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      employee_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      leave_date TEXT NOT NULL,
      leave_value REAL NOT NULL DEFAULT 1,
      remarks TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, leave_date),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS payroll_summary (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, month, year),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS employee_weekly_off_history (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      weekly_off TEXT NOT NULL,
      effective_from TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS visibility_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      controlled_role TEXT NOT NULL,
      data_scope TEXT NOT NULL,
      can_view_branch INTEGER DEFAULT 1,
      can_view_ho INTEGER DEFAULT 0,
      updated_by TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS page_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      can_read INTEGER DEFAULT 1,
      can_write INTEGER DEFAULT 0,
      can_update INTEGER DEFAULT 0,
      updated_by TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, page_path),
      FOREIGN KEY (user_id) REFERENCES app_users(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
      payload TEXT NOT NULL,
      entity TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      pushed_at TEXT,
      push_status TEXT DEFAULT 'PENDING',
      synced INTEGER DEFAULT 0
    )
  `);

  await db.run(`
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS security_audit_log (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      username TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      success INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      attempt_count INTEGER DEFAULT 1,
      locked_until TEXT,
      last_attempt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(username)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS app_updates (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      title TEXT,
      description TEXT,
      source TEXT NOT NULL DEFAULT 'local',
      file_path TEXT,
      file_url TEXT,
      file_size INTEGER DEFAULT 0,
      checksum TEXT,
      status TEXT DEFAULT 'available',
      module_scope TEXT DEFAULT 'all',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      installed_at TEXT
    )
  `);

  // Seed default super admin if table is empty
  try {
    const userCount = await db.get("SELECT COUNT(*) as count FROM app_users");
    if (userCount && userCount.count === 0) {
      const { hashPassword } = require('./passwordUtils.cjs');
      const adminHash = await hashPassword('7014');
      await db.run(`
        INSERT INTO app_users (id, username, display_name, password, password_hash, role, entity, is_active)
        VALUES (?, 'admin', 'Super Admin', '7014', ?, 'ROLE_SUPER', 'ALL', 1)
      `, [uuidv4(), adminHash]);
      console.log('[Database] Seeded default admin user successfully.');
    }
  } catch (e) {
    console.error('Seed app_users error:', e);
  }

  // Seed default system prefix settings if empty
  try {
    const configCount = await db.get("SELECT COUNT(*) as count FROM system_config");
    if (configCount && configCount.count === 0) {
      await db.run("INSERT OR IGNORE INTO system_config (key, value) VALUES ('branch_id_prefix', 'MAH')");
      await db.run("INSERT OR IGNORE INTO system_config (key, value) VALUES ('ho_id_prefix', 'HOJ')");
      await db.run("INSERT OR IGNORE INTO system_config (key, value) VALUES ('branch_id_counter', '0')");
      await db.run("INSERT OR IGNORE INTO system_config (key, value) VALUES ('ho_id_counter', '0')");
    }
  } catch(e) { console.error('Seed system_config error:', e); }

  // Migrations for existing databases (safe ALTER TABLE for older installations)
  const addColSafe = async (table, col, defVal = null) => {
    try { 
      let query = `ALTER TABLE ${table} ADD COLUMN ${col}`;
      if (defVal !== null) {
        query += ` DEFAULT ${defVal}`;
      }
      await db.run(query); 
    } catch(e) { /* exists or other error */ }
  };

  await addColSafe('employees', 'phone TEXT');
  await addColSafe('employees', 'entity TEXT', "'BRANCH'");
  await addColSafe('resigned_employees', 'employee_code TEXT');
  await addColSafe('resigned_employees', 'entity TEXT', "'BRANCH'");
  await addColSafe('resigned_employees', 'department TEXT');
  await addColSafe('resigned_employees', 'designation TEXT');
  await addColSafe('resigned_employees', 'service_duration TEXT');
  await addColSafe('resigned_employees', 'dob TEXT');
  await addColSafe('resigned_employees', 'weekly_off TEXT');
  await addColSafe('resigned_employees', 'tenure_end_date TEXT');
  await addColSafe('resigned_employees', 'phone TEXT');
  await addColSafe('resigned_employees', 'remarks TEXT');
  await addColSafe('attendance', 'remarks TEXT', "''");
  await addColSafe('letters', 'source_entity TEXT');
  await addColSafe('letters', 'target_entity TEXT');
  await addColSafe('letters', 'acknowledged INTEGER', '0');
  await addColSafe('letters', 'acknowledged_at TEXT');
  await addColSafe('letters', 'acknowledged_by TEXT');
  
  await addColSafe('letters', 'status TEXT', "'dispatched'");
  await addColSafe('letters', 'priority TEXT', "'normal'");
  await addColSafe('letters', 'direction TEXT');
  await addColSafe('letters', 'department TEXT');
  await addColSafe('letters', 'confidential_level TEXT', "'public'");
  await addColSafe('letters', 'is_notice_board INTEGER', '0');
  await addColSafe('letters', 'notice_expiry_date TEXT');
  await addColSafe('letters', 'notice_pinned INTEGER', '0');
  await addColSafe('letters', 'file_name TEXT');
  await addColSafe('letters', 'file_local_path TEXT');
  await addColSafe('letters', 'uploaded_by TEXT');
  await addColSafe('letters', 'assigned_to_employee_id TEXT');
  await addColSafe('app_users', 'password_hash TEXT');
  await addColSafe('app_users', 'force_password_change INTEGER', '0');
  await addColSafe('app_users', 'last_login TEXT');
  await addColSafe('sync_queue', 'synced INTEGER', '0');

  try {
    const { hashPassword, isPasswordHashed } = require('./passwordUtils.cjs');
    const plainUsers = await db.all("SELECT id, password FROM app_users WHERE password_hash IS NULL AND password IS NOT NULL");
    for (const user of plainUsers) {
      if (!isPasswordHashed(user.password)) {
        const hashed = await hashPassword(user.password);
        await db.run("UPDATE app_users SET password_hash = ? WHERE id = ?", [hashed, user.id]);
      }
    }
    if (plainUsers.length > 0) {
      console.log(`[Migration] Hashed ${plainUsers.length} plain-text passwords`);
    }
  } catch(e) {
    console.log('[Migration] Password hashing migration skipped:', e.message);
  }

  // Ensure default admin user exists (username: admin, password: 7014)
  try {
    const { hashPassword } = require('./passwordUtils.cjs');
    const adminUser = await db.get("SELECT id FROM app_users WHERE LOWER(username) = 'admin'");
    if (!adminUser) {
      const adminHash = await hashPassword('7014');
      await db.run(`
        INSERT INTO app_users (id, username, display_name, password, password_hash, role, entity, is_active)
        VALUES (?, 'admin', 'Super Admin', '7014', ?, 'ROLE_SUPER', 'ALL', 1)
      `, [uuidv4(), adminHash]);
      console.log('[Migration] Created default admin user (admin/7014)');
    }
  } catch(e) {
    console.log('[Migration] Admin user migration skipped:', e.message);
  }

  // Sync existing mobile_number to phone if phone is null
  try {
    await db.run('UPDATE employees SET phone = mobile_number WHERE (phone IS NULL OR phone = "") AND mobile_number IS NOT NULL AND mobile_number != ""');
    await db.run('UPDATE employees SET mobile_number = phone WHERE (mobile_number IS NULL OR mobile_number = "") AND phone IS NOT NULL AND phone != ""');
  } catch (e) { /* ignore */ }

  // Seed default departments & designations if empty
  try {
    const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
    if (deptCount && deptCount.count === 0) {
      const defaultDepts = ['Administration', 'Accounts & Finance', 'Sanitation / स्वच्छता', 'Information Technology', 'Human Resources'];
      for (const d of defaultDepts) {
        await db.run('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)', [uuidv4(), d]);
      }
    }

    const desigCount = await db.get('SELECT COUNT(*) as count FROM designations');
    if (desigCount && desigCount.count === 0) {
      const defaultDesigs = ['Manager / प्रबंधक', 'Supervisor / पर्यवेक्षक', 'Clerk / लिपिक', 'Operator / ऑपरेटर', 'Assistant / सहायक', 'Peon / चपरासी'];
      for (const d of defaultDesigs) {
        await db.run('INSERT OR IGNORE INTO designations (id, name) VALUES (?, ?)', [uuidv4(), d]);
      }
    }
  } catch (e) { console.error('Seed error:', e); }

  // Performance Indexes
  const createIndexSafe = async (name, sql) => {
    try { await db.run(`CREATE INDEX IF NOT EXISTS ${name} ON ${sql}`); } catch(e) {}
  };
  await createIndexSafe('idx_emp_entity', 'employees(entity)');
  await createIndexSafe('idx_emp_active', 'employees(is_active)');
  await createIndexSafe('idx_att_emp_date', 'attendance(employee_id, date)');
  await createIndexSafe('idx_letters_status', 'letters(status)');
  await createIndexSafe('idx_letters_type', 'letters(letter_type)');
  await createIndexSafe('idx_letters_entity', 'letters(source_entity, target_entity)');
  await createIndexSafe('idx_sync_queue_status', 'sync_queue(push_status, synced)');
  await createIndexSafe('idx_emp_history_emp', 'employee_history(employee_id)');

  // Migrate old category history into employee_history
  try {
    const oldRows = await db.all('SELECT * FROM employee_category_history');
    for (const row of oldRows) {
      const exists = await db.get(
        'SELECT 1 FROM employee_history WHERE history_id = ?', [row.id]
      );
      if (!exists) {
        const emp = await db.get('SELECT name FROM employees WHERE id = ?', [row.employee_id]);
        await db.run(
          `INSERT INTO employee_history (history_id, employee_id, employee_name, action_type, field_name, old_value, new_value, previous_category, new_category, changed_at)
           VALUES (?, ?, ?, 'CATEGORY_CHANGE', 'category', ?, ?, ?, ?, ?)`,
          [row.id, row.employee_id, emp?.name || '', row.old_category, row.category, row.old_category, row.category, row.changed_at]
        );
      }
    }
    console.log(`Migrated ${oldRows.length} old category history rows`);
  } catch(e) {
    console.log('Category history migration skipped:', e.message);
  }

  // Fix legacy attendance CHECK constraint and normalize status codes
  try {
    const tableSql = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance'");
    if (tableSql && tableSql.sql.toLowerCase().includes("'present'")) {
      console.log('[Migration] Recreating attendance table to fix legacy CHECK constraint...');
      await db.run("PRAGMA foreign_keys=off");
      await db.run("BEGIN TRANSACTION");
      await db.run("ALTER TABLE attendance RENAME TO attendance_old");
      await db.run(`CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('P','A','CL','PL','HCL','HD','WO','OD','LWP')),
        remarks TEXT DEFAULT '',
        UNIQUE(employee_id, date),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )`);
      await db.run("INSERT INTO attendance (id, employee_id, date, status, remarks) SELECT id, employee_id, date, status, remarks FROM attendance_old");
      await db.run("DROP TABLE attendance_old");
      await db.run("COMMIT");
      await db.run("PRAGMA foreign_keys=on");
      console.log('[Migration] Attendance table recreated successfully.');
    }
  } catch(e) { 
    console.log('[Migration] Recreate attendance table failed:', e.message); 
    await db.run("ROLLBACK").catch(()=>{}); 
    await db.run("PRAGMA foreign_keys=on").catch(()=>{}); 
  }

  try {
    await db.run(`UPDATE attendance SET status = CASE
      WHEN status = 'present' THEN 'P' WHEN status = 'absent' THEN 'A'
      WHEN status = 'pl' THEN 'PL' WHEN status = 'cl' THEN 'CL'
      WHEN status = 'half_cl' THEN 'HCL' WHEN status = 'weekly_off' THEN 'WO'
      WHEN status = 'on_duty' THEN 'OD' WHEN status = 'half_day' THEN 'HD'
      ELSE status END
      WHERE status IN ('present','absent','pl','cl','half_cl','weekly_off','on_duty','half_day')`);
    console.log('[Migration] Attendance status codes normalized to uppercase');
  } catch(e) { console.log('[Migration] Status migration skipped:', e.message); }

  // Fix: Remove wrong 'Sunday' history entries for employees with no weekly off (None/empty)
  try {
    await db.run(`
      DELETE FROM employee_weekly_off_history
      WHERE employee_id IN (
        SELECT id FROM employees WHERE weekly_off IS NULL OR weekly_off = '' OR weekly_off = 'None'
      )
      AND weekly_off = 'Sunday'
    `);
    console.log('[Migration] Cleaned up wrong Sunday history entries for employees with no weekly off');
  } catch(e) { console.log('[Migration] Weekly off cleanup skipped:', e.message); }

  return db;
}

module.exports = setupDatabase;
