const { app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { randomUUID: uuidv4 } = require('crypto');
const { createBackup } = require('./backupManager.cjs');

const UPDATE_SNAPSHOT_DIR = 'update_snapshots';
const MAX_SNAPSHOTS = 5;

function getSnapshotDir(app) {
  return path.join(app.getPath('userData'), UPDATE_SNAPSHOT_DIR);
}

function getDbPath(app) {
  return path.join(app.getPath('userData'), 'database.sqlite');
}

function getLogPath(app) {
  return path.join(app.getPath('userData'), 'update_log.json');
}

function writeUpdateLog(app, entry) {
  const logPath = getLogPath(app);
  let logs = [];
  if (fs.existsSync(logPath)) {
    try { logs = JSON.parse(fs.readFileSync(logPath, 'utf-8')); } catch(e) {}
  }
  logs.push({ ...entry, timestamp: new Date().toISOString() });
  if (logs.length > 100) logs = logs.slice(-100);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

function readUpdateLog(app) {
  const logPath = getLogPath(app);
  if (!fs.existsSync(logPath)) return [];
  try { return JSON.parse(fs.readFileSync(logPath, 'utf-8')); } catch(e) { return []; }
}

function createUpdateSnapshot(app) {
  const snapshotDir = getSnapshotDir(app);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const dbPath = getDbPath(app);
  if (!fs.existsSync(dbPath)) {
    console.log('[UpdateManager] No database found, skipping snapshot');
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotName = `snapshot_${timestamp}`;
  const snapshotPath = path.join(snapshotDir, snapshotName);

  fs.mkdirSync(snapshotPath, { recursive: true });

  const dbSnapshotPath = path.join(snapshotPath, 'database.sqlite');
  fs.copyFileSync(dbPath, dbSnapshotPath);

  const snapshotMeta = {
    id: uuidv4(),
    name: snapshotName,
    version: app.getVersion(),
    createdAt: new Date().toISOString(),
    dbSize: fs.statSync(dbPath).size,
    dbPath: dbSnapshotPath,
  };
  fs.writeFileSync(path.join(snapshotPath, 'meta.json'), JSON.stringify(snapshotMeta, null, 2));

  const snapshots = fs.readdirSync(snapshotDir)
    .filter(f => f.startsWith('snapshot_') && fs.statSync(path.join(snapshotDir, f)).isDirectory())
    .sort();

  while (snapshots.length > MAX_SNAPSHOTS) {
    const oldest = snapshots.shift();
    const oldestPath = path.join(snapshotDir, oldest);
    fs.rmSync(oldestPath, { recursive: true, force: true });
    console.log(`[UpdateManager] Deleted old snapshot: ${oldest}`);
  }

  console.log(`[UpdateManager] Snapshot created: ${snapshotName}`);
  return snapshotMeta;
}

function restoreFromSnapshot(app, snapshotName) {
  const snapshotDir = getSnapshotDir(app);
  const snapshotPath = path.join(snapshotDir, snapshotName);
  const snapshotMetaPath = path.join(snapshotPath, 'meta.json');

  if (!fs.existsSync(snapshotMetaPath)) {
    throw new Error(`Snapshot not found: ${snapshotName}`);
  }

  const meta = JSON.parse(fs.readFileSync(snapshotMetaPath, 'utf-8'));
  const dbSnapshotPath = path.join(snapshotPath, 'database.sqlite');

  if (!fs.existsSync(dbSnapshotPath)) {
    throw new Error(`Database file missing in snapshot: ${snapshotName}`);
  }

  const dbPath = getDbPath(app);

  if (fs.existsSync(dbPath)) {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const preRecoveryName = `hrms_pre_recovery_${Date.now()}.sqlite`;
    fs.copyFileSync(dbPath, path.join(backupDir, preRecoveryName));
    console.log(`[UpdateManager] Pre-recovery backup saved: ${preRecoveryName}`);
  }

  fs.copyFileSync(dbSnapshotPath, dbPath);
  console.log(`[UpdateManager] Database restored from snapshot: ${snapshotName}`);
  return meta;
}

function listSnapshots(app) {
  const snapshotDir = getSnapshotDir(app);
  if (!fs.existsSync(snapshotDir)) return [];

  const dirs = fs.readdirSync(snapshotDir)
    .filter(f => f.startsWith('snapshot_'))
    .sort()
    .reverse();

  return dirs.map(name => {
    const metaPath = path.join(snapshotDir, name, 'meta.json');
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch(e) {
      return { name, error: 'corrupted' };
    }
  });
}

async function safeUpdateCheck(app, db) {
  const result = {
    success: false,
    currentVersion: app.getVersion(),
    snapshotCreated: false,
    snapshotName: null,
    dbIntegrity: null,
    error: null,
  };

  try {
    const integrity = await checkDatabaseIntegrity(db);
    result.dbIntegrity = integrity;

    if (!integrity.valid) {
      result.error = `Database integrity check failed: ${integrity.errors.join(', ')}`;
      console.error('[UpdateManager]', result.error);
      return result;
    }

    const snapshot = createUpdateSnapshot(app);
    if (snapshot) {
      result.snapshotCreated = true;
      result.snapshotName = snapshot.name;
    }

    result.success = true;
    writeUpdateLog(app, {
      type: 'pre_update_check',
      version: app.getVersion(),
      snapshotName: snapshot?.name || null,
      dbIntegrity: integrity.valid,
    });

  } catch (err) {
    result.error = err.message;
    console.error('[UpdateManager] Safe update check failed:', err);
    writeUpdateLog(app, { type: 'pre_update_check_failed', error: err.message });
  }

  return result;
}

async function safePostUpdateCheck(app, db) {
  const result = {
    success: false,
    dbIntegrity: null,
    error: null,
  };

  try {
    const integrity = await checkDatabaseIntegrity(db);
    result.dbIntegrity = integrity;

    if (!integrity.valid) {
      result.error = `Post-update database check failed: ${integrity.errors.join(', ')}`;
      console.error('[UpdateManager]', result.error);

      writeUpdateLog(app, {
        type: 'post_update_integrity_failed',
        errors: integrity.errors,
        action: 'attempting_restore',
      });

      const restoreResult = await attemptRecovery(app, db);
      if (restoreResult.success) {
        result.dbIntegrity = await checkDatabaseIntegrity(db);
        result.error = null;
        result.recoveryApplied = true;
        console.log('[UpdateManager] Recovery successful');
      } else {
        result.error = `Recovery failed: ${restoreResult.error}`;
        console.error('[UpdateManager] Recovery failed:', restoreResult.error);
      }
    }

    result.success = result.dbIntegrity?.valid || false;

    writeUpdateLog(app, {
      type: 'post_update_check',
      version: app.getVersion(),
      dbIntegrity: result.dbIntegrity?.valid || false,
      recoveryApplied: result.recoveryApplied || false,
    });

  } catch (err) {
    result.error = err.message;
    console.error('[UpdateManager] Post-update check failed:', err);
    writeUpdateLog(app, { type: 'post_update_check_failed', error: err.message });
  }

  return result;
}

async function attemptRecovery(app, db) {
  const result = { success: false, error: null, snapshotUsed: null };

  try {
    const snapshots = listSnapshots(app);
    if (snapshots.length === 0) {
      result.error = 'No snapshots available for recovery';
      return result;
    }

    const latestSnapshot = snapshots[0];
    console.log(`[UpdateManager] Attempting recovery from: ${latestSnapshot.name}`);

    restoreFromSnapshot(app, latestSnapshot.name);
    result.success = true;
    result.snapshotUsed = latestSnapshot.name;

    writeUpdateLog(app, {
      type: 'recovery_attempted',
      snapshotName: latestSnapshot.name,
      success: true,
    });

  } catch (err) {
    result.error = err.message;
    writeUpdateLog(app, {
      type: 'recovery_failed',
      error: err.message,
    });
  }

  return result;
}

async function checkDatabaseIntegrity(db) {
  const result = { valid: true, errors: [], warnings: [], tableCount: 0, corruptTables: [] };

  try {
    const integrityCheck = await db.get('PRAGMA integrity_check');
    if (integrityCheck && integrityCheck.integrity_check !== 'ok') {
      result.valid = false;
      result.errors.push(`Integrity check: ${integrityCheck.integrity_check}`);
    }
  } catch(e) {
    result.valid = false;
    result.errors.push(`Integrity check failed: ${e.message}`);
  }

  try {
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    result.tableCount = tables.length;

    for (const table of tables) {
      try {
        await db.get(`SELECT COUNT(*) as count FROM "${table.name}"`);
      } catch(e) {
        result.corruptTables.push(table.name);
        result.warnings.push(`Table ${table.name} has issues: ${e.message}`);
      }
    }

    if (result.corruptTables.length > 0) {
      result.valid = false;
      result.errors.push(`Corrupt tables: ${result.corruptTables.join(', ')}`);
    }
  } catch(e) {
    result.warnings.push(`Table check failed: ${e.message}`);
  }

  try {
    const fkCheck = await db.get('PRAGMA foreign_key_check');
    if (fkCheck && fkCheck.table) {
      result.warnings.push(`Foreign key violation in table: ${fkCheck.table}`);
    }
  } catch(e) {}

  try {
    await db.run('VACUUM');
  } catch(e) {
    result.warnings.push(`VACUUM failed: ${e.message}`);
  }

  return result;
}

async function showRecoveryDialog(mainWindow) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Update Recovery',
    message: 'Update ke baad database mein problem aa gayi.',
    detail: 'Kya aap snapshot se recovery karna chahte hain? Agar haan to latest snapshot restore hoga.',
    buttons: ['Haan, Restore Karo', 'Nahi, Skip Karo'],
    defaultId: 0,
    cancelId: 1,
  });

  return result.response === 0;
}

module.exports = {
  createUpdateSnapshot,
  restoreFromSnapshot,
  listSnapshots,
  safeUpdateCheck,
  safePostUpdateCheck,
  attemptRecovery,
  checkDatabaseIntegrity,
  showRecoveryDialog,
  writeUpdateLog,
  readUpdateLog,
};
