const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
  try {
    const db = await open({
      filename: process.env.APPDATA + '/placeholder-model-2/database.sqlite',
      driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys=off; BEGIN TRANSACTION;');

    await db.exec(`CREATE TABLE IF NOT EXISTS new_employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT,
      category TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      appointment_order_number TEXT,
      appointment_date TEXT,
      joining_date TEXT,
      photo_url TEXT,
      qualification TEXT,
      address TEXT,
      husband_name TEXT,
      fathers_name TEXT,
      mobile_number TEXT,
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
      service_duration TEXT
    )`);

    const columns = await db.all("PRAGMA table_info('employees')");
    const oldNames = columns.map(c => c.name);
    
    const newCols = await db.all("PRAGMA table_info('new_employees')");
    const newNames = newCols.map(c => c.name);
    
    const commonCols = oldNames.filter(name => newNames.includes(name)).join(', ');

    await db.exec(`INSERT INTO new_employees (${commonCols}) SELECT ${commonCols} FROM employees`);
    
    await db.exec('DROP TABLE employees;');
    await db.exec('ALTER TABLE new_employees RENAME TO employees;');
    
    await db.exec('COMMIT; PRAGMA foreign_keys=on;');
    console.log('Migration successful');
  } catch(e) {
    console.error('Error during migration:', e);
  }
})();
