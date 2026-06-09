const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { randomUUID: uuidv4 } = require('crypto');
const { autoUpdater } = require('electron-updater');
const setupDatabase = require('./database.cjs');
const registerApiHandlers = require('./api.cjs');
const { saveSession, loadSession, clearSession, touchSession, isSessionExpired, getSessionTimeoutMinutes } = require('./sessionManager.cjs');
const { createBackup, listBackups, restoreBackup } = require('./backupManager.cjs');
const { saveSupabaseConfig, loadSupabaseConfig, processSyncQueue, checkSyncStatus, pullFromSupabase } = require('./syncEngine.cjs');
const { verifyPassword, hashPassword, isPasswordHashed, validatePasswordStrength } = require('./passwordUtils.cjs');
const {
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
} = require('./updateManager.cjs');

const isDev = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = 'http://localhost:5173';

let mainWindow;
let db;

// ===== Auto Updater Configuration =====
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

if (!isDev) {
  autoUpdater.logger = console;
}

function setupAutoUpdaterEvents() {
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
    if (mainWindow) mainWindow.webContents.send('update:checking', true);
  });

  autoUpdater.on('update-available', async (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }

    if (db) {
      console.log('[AutoUpdater] Creating pre-update snapshot...');
      const snapshotResult = await safeUpdateCheck(app, db);
      if (snapshotResult.snapshotCreated) {
        console.log('[AutoUpdater] Snapshot created:', snapshotResult.snapshotName);
      }
      if (!snapshotResult.success) {
        console.error('[AutoUpdater] Pre-update check failed:', snapshotResult.error);
      }
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] No update available');
    if (mainWindow) mainWindow.webContents.send('update:not-available', true);
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message);
    if (mainWindow) mainWindow.webContents.send('update:error', err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update:downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }

    if (db) {
      console.log('[AutoUpdater] Running post-update integrity check...');
      const postCheck = await safePostUpdateCheck(app, db);
      if (!postCheck.success) {
        console.error('[AutoUpdater] Post-update check failed:', postCheck.error);
        if (mainWindow) {
          const wantRecovery = await showRecoveryDialog(mainWindow);
          if (wantRecovery) {
            const recoveryResult = await attemptRecovery(app, db);
            if (recoveryResult.success) {
              console.log('[AutoUpdater] Recovery successful from:', recoveryResult.snapshotUsed);
              if (mainWindow) {
                mainWindow.webContents.send('update:recovery-success', {
                  snapshotName: recoveryResult.snapshotUsed,
                });
              }
            } else {
              console.error('[AutoUpdater] Recovery failed:', recoveryResult.error);
            }
          }
        }
      }
    }
  });
}

function checkForUpdates(force = false) {
  if (isDev) {
    console.log('[AutoUpdater] Skipping update check in development mode');
    return;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[AutoUpdater] Check failed:', err.message);
    if (mainWindow) mainWindow.webContents.send('update:error', err.message);
  });
}

// Wait for Vite dev server to be ready before loading
function waitForDevServer(url, maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else if (attempts < maxRetries) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Dev server not responding'));
        }
      }).on('error', () => {
        if (attempts < maxRetries) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Dev server not available after ' + maxRetries + ' retries'));
        }
      });
    };
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#020617',
    titleBarStyle: 'default',
    title: 'HRMS Pro Max — Employee Management System',
  });

  // Maximize the window automatically
  mainWindow.maximize();

  if (isDev) {
    // Wait for Vite dev server, then load
    waitForDevServer(DEV_SERVER_URL)
      .then(() => {
        mainWindow.loadURL(DEV_SERVER_URL);
        mainWindow.show();
        mainWindow.webContents.openDevTools();
        console.log('✓ Electron connected to Vite dev server');
      })
      .catch((err) => {
        console.error('✗ Failed to connect to dev server:', err.message);
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        mainWindow.show();
      });
  } else {
    // Production Vite build output
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    mainWindow.show();
  }

  // Handle page load errors gracefully
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page load failed:', errorDescription);
    if (isDev) {
      console.log('Retrying connection to dev server...');
      setTimeout(() => {
        mainWindow.loadURL(DEV_SERVER_URL);
      }, 2000);
    }
  });
}

app.whenReady().then(async () => {
  // Initialize Database
  db = await setupDatabase();
  
  // Register API Handlers
  registerApiHandlers(ipcMain, db);

  const dbPath = path.join(app.getPath('userData'), 'database.sqlite');

  // Session storage IPC handlers
  ipcMain.handle('api:session:save', async (event, sessionData) => {
    saveSession(app, sessionData);
    return { success: true };
  });

  ipcMain.handle('api:session:load', async () => {
    return loadSession(app);
  });

  ipcMain.handle('api:session:clear', async () => {
    clearSession(app);
    return { success: true };
  });

  ipcMain.handle('api:session:touch', async () => {
    const touched = touchSession(app);
    return { success: touched };
  });

  ipcMain.handle('api:session:timeout', async () => {
    return { timeoutMinutes: getSessionTimeoutMinutes() };
  });

  // Backup IPC handlers
  ipcMain.handle('api:backup:create', async () => {
    return await createBackup(app, dbPath);
  });

  ipcMain.handle('api:backup:list', async () => {
    return await listBackups(app);
  });

  ipcMain.handle('api:backup:restore', async (event, backupFilePath) => {
    return await restoreBackup(app, backupFilePath, dbPath);
  });

  // Sync Engine IPC Handlers
  ipcMain.handle('api:sync:save-config', async (event, { url, anonKey }) => {
    try {
      await saveSupabaseConfig(db, url, anonKey);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:sync:load-config', async () => {
    try {
      const config = await loadSupabaseConfig(db);
      return { success: true, config };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:sync:trigger', async (event, session) => {
    try {
      const pushResult = await processSyncQueue(db);
      if (!pushResult.success) {
        return pushResult;
      }
      const pullResult = await pullFromSupabase(db, session);
      return {
        success: true,
        pushCount: pushResult.count,
        pullCount: pullResult.count || 0,
        total: pushResult.count + (pullResult.count || 0)
      };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:sync:status', async () => {
    try {
      const status = await checkSyncStatus(db);
      return status;
    } catch (err) {
      console.error(err);
      return { configured: false, connected: false, pendingCount: 0, lastSyncAt: null };
    }
  });

  // Secure Auth IPC Handlers
  async function logSecurityEvent(db, eventType, username, success, details) {
    try {
      await db.run(
        `INSERT INTO security_audit_log (id, event_type, username, details, success, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), eventType, username || 'unknown', details || '', success ? 1 : 0, new Date().toISOString()]
      );
    } catch(e) { console.error('[Security] Failed to log event:', e.message); }
  }

  async function checkLoginLockout(db, username) {
    try {
      const attempt = await db.get('SELECT * FROM login_attempts WHERE LOWER(username) = LOWER(?)', [username]);
      if (!attempt) return { locked: false, attempts: 0 };
      
      if (attempt.locked_until) {
        const lockUntil = new Date(attempt.locked_until);
        if (new Date() < lockUntil) {
          const remaining = Math.ceil((lockUntil - new Date()) / 60000);
          return { locked: true, attempts: attempt.attempt_count, remainingMinutes: remaining };
        } else {
          await db.run('DELETE FROM login_attempts WHERE LOWER(username) = LOWER(?)', [username]);
        }
      }
      return { locked: false, attempts: attempt.attempt_count };
    } catch(e) {
      console.error('[Security] Lockout check error:', e.message);
      return { locked: false, attempts: 0 };
    }
  }

  async function recordFailedLogin(db, username) {
    try {
      const MAX_ATTEMPTS = 5;
      const LOCKOUT_MINUTES = 15;
      
      const existing = await db.get('SELECT * FROM login_attempts WHERE LOWER(username) = LOWER(?)', [username]);
      if (!existing) {
        await db.run(
          'INSERT INTO login_attempts (username, attempt_count, last_attempt) VALUES (?, 1, ?)',
          [username, new Date().toISOString()]
        );
        return { attempts: 1 };
      }
      
      const newCount = existing.attempt_count + 1;
      if (newCount >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
        await db.run(
          'UPDATE login_attempts SET attempt_count = ?, locked_until = ?, last_attempt = ? WHERE LOWER(username) = LOWER(?)',
          [newCount, lockUntil, new Date().toISOString(), username]
        );
        return { attempts: newCount, locked: true, remainingMinutes: LOCKOUT_MINUTES };
      }
      
      await db.run(
        'UPDATE login_attempts SET attempt_count = ?, last_attempt = ? WHERE LOWER(username) = LOWER(?)',
        [newCount, new Date().toISOString(), username]
      );
      return { attempts: newCount };
    } catch(e) {
      console.error('[Security] Failed login record error:', e.message);
      return { attempts: 0 };
    }
  }

  async function clearLoginAttempts(db, username) {
    try {
      await db.run('DELETE FROM login_attempts WHERE LOWER(username) = LOWER(?)', [username]);
    } catch(e) { /* ignore */ }
  }

  async function authenticateUser(db, username, password) {
    let dbUser = await db.get(
      "SELECT * FROM app_users WHERE LOWER(username) = LOWER(?) AND is_active = 1",
      [username]
    );
    
    if (!dbUser) return null;
    
    let passwordValid = false;
    
    if (dbUser.password_hash && isPasswordHashed(dbUser.password_hash)) {
      passwordValid = await verifyPassword(password, dbUser.password_hash);
    } else if (dbUser.password) {
      if (isPasswordHashed(dbUser.password)) {
        passwordValid = await verifyPassword(password, dbUser.password);
        if (passwordValid && !dbUser.password_hash) {
          const hashed = await hashPassword(password);
          await db.run("UPDATE app_users SET password_hash = ? WHERE id = ?", [hashed, dbUser.id]);
        }
      } else {
        passwordValid = (dbUser.password === password);
        if (passwordValid) {
          const hashed = await hashPassword(password);
          await db.run("UPDATE app_users SET password_hash = ? WHERE id = ?", [hashed, dbUser.id]);
        }
      }
    }
    
    return passwordValid ? dbUser : null;
  }

  ipcMain.handle('api:auth:login', async (event, { username, password }) => {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const config = await loadSupabaseConfig(db);
      
      let client = null;
      if (config) {
        try {
          client = createClient(config.url, config.key, { auth: { persistSession: false } });
        } catch (e) {
          console.error('[Auth] Failed to initialize Supabase client:', e);
        }
      }

      const lockoutCheck = await checkLoginLockout(db, username);
      if (lockoutCheck.locked) {
        await logSecurityEvent(db, 'LOGIN_FAILED', username, false, `Account locked. ${lockoutCheck.remainingMinutes}min remaining`);
        return { 
          success: false, 
          error: `Account locked due to too many failed attempts. Try again in ${lockoutCheck.remainingMinutes} minutes.`,
          locked: true,
          remainingMinutes: lockoutCheck.remainingMinutes
        };
      }

      let dbUser = await authenticateUser(db, username, password);

      if (!dbUser && client) {
        try {
          let supaUser = null;
          const { data: appUserRes, error: appUserErr } = await client
            .from('app_users').select('*').eq('username', username).single();
          if (appUserRes && !appUserErr) supaUser = appUserRes;
          else {
            const { data: userRes, error: userErr } = await client
              .from('users').select('*').eq('username', username).single();
            if (userRes && !userErr) supaUser = userRes;
          }

          if (supaUser) {
            let supaPasswordValid = false;
            if (supaUser.password_hash && isPasswordHashed(supaUser.password_hash)) {
              supaPasswordValid = await verifyPassword(password, supaUser.password_hash);
            } else if (supaUser.password) {
              if (isPasswordHashed(supaUser.password)) {
                supaPasswordValid = await verifyPassword(password, supaUser.password);
              } else {
                supaPasswordValid = (supaUser.password === password);
              }
            }

            if (supaPasswordValid) {
              const lastLoginISO = new Date().toISOString();
              const localCheck = await db.get("SELECT * FROM app_users WHERE LOWER(username) = LOWER(?)", [username]);
              let hashedPassword = supaUser.password_hash || supaUser.password;
              if (!isPasswordHashed(hashedPassword)) {
                hashedPassword = await hashPassword(password);
              }
              
              if (!localCheck) {
                await db.run(
                  "INSERT INTO app_users (id, username, display_name, password, password_hash, role, entity, is_active, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
                  [supaUser.id || uuidv4(), supaUser.username, supaUser.display_name || supaUser.username, password, hashedPassword, supaUser.role, supaUser.entity, lastLoginISO]
                );
              } else {
                await db.run(
                  "UPDATE app_users SET password_hash = ?, display_name = ?, role = ?, entity = ?, last_login = ? WHERE id = ?",
                  [hashedPassword, supaUser.display_name || localCheck.display_name, supaUser.role, supaUser.entity, lastLoginISO, localCheck.id]
                );
              }
              dbUser = { ...supaUser, password_hash: hashedPassword };
            }
          }
        } catch (supaErr) {
          console.error('[Auth] Supabase online login fallback error:', supaErr.message);
        }
      }

      if (dbUser) {
        const lastLoginISO = new Date().toISOString();
        await db.run("UPDATE app_users SET last_login = ? WHERE id = ?", [lastLoginISO, dbUser.id]);
        await clearLoginAttempts(db, username);
        
        const session = {
          username: dbUser.username,
          display_name: dbUser.display_name,
          role: dbUser.role,
          entity: dbUser.entity,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastActivity: lastLoginISO
        };

        saveSession(app, session);
        await logSecurityEvent(db, 'LOGIN_SUCCESS', username, true, `Role: ${dbUser.role}, Entity: ${dbUser.entity}`);

        if (client) {
          client.from('app_users').update({ last_login: lastLoginISO }).eq('username', dbUser.username)
            .then(({ error }) => { if (error) console.error('[Auth] Background sync failed:', error.message); });
        }

        return { success: true, session };
      }

      const localSession = loadSession(app);
      if (localSession && localSession.username.toLowerCase() === username.toLowerCase()) {
        const isExpired = new Date(localSession.expiresAt) < new Date();
        if (!isExpired) {
          return { success: true, session: localSession, offline: true };
        }
      }

      await recordFailedLogin(db, username);
      await logSecurityEvent(db, 'LOGIN_FAILED', username, false, 'Invalid credentials');
      return { success: false, error: 'Incorrect username or password.' };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:auth:check-session', async () => {
    try {
      if (isSessionExpired(app)) {
        clearSession(app);
        return { success: false, error: 'Session expired' };
      }
      const session = loadSession(app);
      if (session) {
        touchSession(app);
        return { success: true, session };
      }
      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Background Sync Loop (Interval: 30 seconds)
  setInterval(async () => {
    try {
      console.log('[Sync Engine] Background sync task started...');
      const res = await processSyncQueue(db);
      if (res && res.success && res.count > 0) {
        console.log(`[Sync Engine] Background sync successful. Synced ${res.count} items.`);
      }
    } catch (err) {
      console.error('[Sync Engine] Error during background sync loop:', err.message);
    }
  }, 30000);

  // Auto Backup Scheduler (10 AM to 5 PM, max 3 backups per day)
  let autoBackupCountToday = 0;
  let lastAutoBackupDate = '';
  const AUTO_BACKUP_MAX = 3;
  const AUTO_BACKUP_START_HOUR = 10;
  const AUTO_BACKUP_END_HOUR = 17;
  let nextAutoBackupTime = 0;

  setInterval(async () => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      if (lastAutoBackupDate !== todayStr) {
        autoBackupCountToday = 0;
        lastAutoBackupDate = todayStr;
        nextAutoBackupTime = 0;
      }

      if (now.getHours() >= AUTO_BACKUP_START_HOUR && now.getHours() < AUTO_BACKUP_END_HOUR) {
        if (autoBackupCountToday < AUTO_BACKUP_MAX && now.getTime() >= nextAutoBackupTime) {
          await createBackup(app, dbPath);
          autoBackupCountToday++;
          console.log(`[Auto Backup] Created backup #${autoBackupCountToday}/${AUTO_BACKUP_MAX} for today`);
          
          const windowMs = (AUTO_BACKUP_END_HOUR - AUTO_BACKUP_START_HOUR) * 60 * 60 * 1000;
          const slotMs = windowMs / (AUTO_BACKUP_MAX + 1);
          nextAutoBackupTime = now.getTime() + slotMs + (Math.random() * 30 * 60 * 1000);
          console.log(`[Auto Backup] Next auto backup scheduled around ${new Date(nextAutoBackupTime).toLocaleTimeString()}`);
        }
      }
    } catch (err) {
      console.error('[Auto Backup] Error:', err.message);
    }
  }, 60000);

  // ===== Auto Updater IPC Handlers =====
  setupAutoUpdaterEvents();

  ipcMain.handle('api:updater:check', async () => {
    checkForUpdates();
    return { success: true };
  });

  ipcMain.handle('api:updater:download', async () => {
    try {
      autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      console.error('[AutoUpdater] Download failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:updater:install', async () => {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });

  ipcMain.handle('api:updater:status', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        currentVersion: app.getVersion(),
        updateAvailable: result?.updateInfo ? true : false,
        updateVersion: result?.updateInfo?.version || null,
      };
    } catch (err) {
      return {
        success: false,
        currentVersion: app.getVersion(),
        updateAvailable: false,
        error: err.message,
      };
    }
  });

  // ===== Update Manager IPC Handlers =====
  ipcMain.handle('api:update-manager:snapshot', async () => {
    try {
      const snapshot = createUpdateSnapshot(app);
      return { success: true, snapshot };
    } catch (err) {
      console.error('[UpdateManager] Snapshot failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update-manager:snapshots', async () => {
    try {
      const snapshots = listSnapshots(app);
      return { success: true, snapshots };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update-manager:restore', async (event, snapshotName) => {
    try {
      restoreFromSnapshot(app, snapshotName);
      return { success: true };
    } catch (err) {
      console.error('[UpdateManager] Restore failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update-manager:integrity', async () => {
    try {
      if (!db) return { success: false, error: 'Database not initialized' };
      const result = await checkDatabaseIntegrity(db);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update-manager:safe-update', async () => {
    try {
      if (!db) return { success: false, error: 'Database not initialized' };
      const result = await safeUpdateCheck(app, db);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update-manager:post-update', async () => {
    try {
      if (!db) return { success: false, error: 'Database not initialized' };
      const result = await safePostUpdateCheck(app, db);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update-manager:recovery', async () => {
    try {
      if (!db) return { success: false, error: 'Database not initialized' };
      const result = await attemptRecovery(app, db);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update-manager:logs', async () => {
    try {
      const logs = readUpdateLog(app);
      return { success: true, logs };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Photo Upload Dialog
  ipcMain.handle('dialog:select-photo', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Employee Photo',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const mime = mimeMap[ext] || 'image/jpeg';
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    return `data:${mime};base64,${base64}`;
  });

  createWindow();

  // Check for updates after window is ready (production only)
  if (!isDev) {
    setTimeout(() => {
      checkForUpdates();
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
