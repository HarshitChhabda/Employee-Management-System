const { safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

const SESSION_TIMEOUT_MINUTES = 30;
let memorySession = null;

function getSessionFilePath(app) {
  return path.join(app.getPath('userData'), 'session.enc');
}

function clearLegacyFile(app) {
  try {
    const filePath = getSessionFilePath(app);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('Failed to clear legacy session file:', e);
  }
}

function saveSession(app, sessionData) {
  memorySession = {
    ...sessionData,
    lastActivity: new Date().toISOString()
  };
  clearLegacyFile(app);
}

function loadSession(app) {
  // Also clear legacy file if it exists, to ensure fresh start
  clearLegacyFile(app);
  return memorySession;
}

function clearSession(app) {
  memorySession = null;
  clearLegacyFile(app);
}

function touchSession(app) {
  if (memorySession) {
    memorySession.lastActivity = new Date().toISOString();
    return true;
  }
  return false;
}

function isSessionExpired(app) {
  if (!memorySession) return true;
  
  const expiresAt = new Date(memorySession.expiresAt);
  if (new Date() > expiresAt) return true;
  
  if (memorySession.lastActivity) {
    const lastActivity = new Date(memorySession.lastActivity);
    const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;
    if (new Date() - lastActivity > timeoutMs) return true;
  }
  
  return false;
}

function getSessionTimeoutMinutes() {
  return SESSION_TIMEOUT_MINUTES;
}

module.exports = {
  saveSession,
  loadSession,
  clearSession,
  touchSession,
  isSessionExpired,
  getSessionTimeoutMinutes
};
