const path = require('path');
const fs = require('fs');

const MAX_BACKUPS = 3;

function getBackupDir(app) {
  return path.join(app.getPath('userData'), 'backups');
}

async function createBackup(app, dbPath) {
  const backupDir = getBackupDir(app);
  
  // 1. Ensure backup directory exists
  fs.mkdirSync(backupDir, { recursive: true });

  // 2. Generate clean timestamped filename: YYYY-MM-DD_HH-MM-SS
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const backupName = `hrms_backup_${timestamp}.sqlite`;
  const backupPath = path.join(backupDir, backupName);

  // 3. Copy database file
  fs.copyFileSync(dbPath, backupPath);

  // 4. List existing backups sorted oldest first (which naturally works with our date strings!)
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('hrms_backup_') && f.endsWith('.sqlite'))
    .sort();

  // 5. Delete oldest backups if we exceed MAX_BACKUPS
  while (backups.length > MAX_BACKUPS) {
    const oldest = backups.shift();
    fs.unlinkSync(path.join(backupDir, oldest));
    console.log(`[Backup] Auto-deleted oldest backup: ${oldest}`);
  }

  console.log(`[Backup] Created backup: ${backupName}`);
  return { filename: backupName, path: backupPath };
}

async function listBackups(app) {
  const backupDir = getBackupDir(app);
  if (!fs.existsSync(backupDir)) return [];

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('hrms_backup_') && f.endsWith('.sqlite'));

  return files.sort().reverse().map(f => {
    const fullPath = path.join(backupDir, f);
    const stat = fs.statSync(fullPath);
    // Parse time
    const parts = f.replace('hrms_backup_', '').replace('.sqlite', '').split('_');
    const dateStr = parts[0];
    const timeStr = parts[1] ? parts[1].replace(/-/g, ':') : '';
    
    return {
      filename: f,
      path: fullPath,
      createdAt: `${dateStr} ${timeStr}`,
      sizeKB: Math.round(stat.size / 1024)
    };
  });
}

async function restoreBackup(app, backupPath, dbPath) {
  if (!fs.existsSync(backupPath)) throw new Error('Backup file not found');
  
  // 1. Create a safety backup first!
  await createBackup(app, dbPath);
  
  // 2. Overwrite target db file
  fs.copyFileSync(backupPath, dbPath);
  console.log(`[Backup] Database successfully restored from: ${backupPath}`);
  return true;
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup
};
