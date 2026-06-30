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
      absolutePath: fullPath,
      createdAt: `${dateStr} ${timeStr}`,
      sizeBytes: stat.size,
      sizeKB: Math.round(stat.size / 1024)
    };
  });
}

async function restoreBackup(app, backupPath, dbPath) {
  if (!fs.existsSync(backupPath)) throw new Error('Backup file not found');
  
  // SECURITY: Validate backup path is within allowed directory
  const path = require('path');
  const resolved = path.resolve(backupPath);
  const backupDir = path.resolve(getBackupDir(app));
  if (!resolved.startsWith(backupDir)) {
    throw new Error('ACCESS_DENIED: Backup path outside allowed directory');
  }
  
  // 1. Create a safety backup first!
  await createBackup(app, dbPath);
  
  // 2. Overwrite target db file
  fs.copyFileSync(resolved, dbPath);
  console.log(`[Backup] Database successfully restored from: ${resolved}`);
  return true;
}

async function exportBackup(app, sourceFilename, destPath) {
  const backupDir = getBackupDir(app);
  const sourcePath = path.join(backupDir, sourceFilename);
  
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Backup file not found in backups directory');
  }
  
  // Validate source is within backup directory
  const resolved = path.resolve(sourcePath);
  const resolvedBackupDir = path.resolve(backupDir);
  if (!resolved.startsWith(resolvedBackupDir)) {
    throw new Error('ACCESS_DENIED: Source backup path outside allowed directory');
  }
  
  // Copy to user-chosen destination
  fs.copyFileSync(resolved, destPath);
  console.log(`[Backup] Exported backup to: ${destPath}`);
  return { success: true, destPath };
}

async function importBackup(app, sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Selected file not found');
  }
  
  // Validate file is a .sqlite file
  if (!sourcePath.endsWith('.sqlite')) {
    throw new Error('Invalid file type. Only .sqlite backup files are supported.');
  }
  
  const backupDir = getBackupDir(app);
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Generate timestamped filename for imported backup
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const importName = `hrms_imported_${timestamp}.sqlite`;
  const destPath = path.join(backupDir, importName);
  
  // Copy imported file into backups directory
  fs.copyFileSync(sourcePath, destPath);
  console.log(`[Backup] Imported backup as: ${importName}`);
  return { success: true, filename: importName, path: destPath };
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  exportBackup,
  importBackup
};
