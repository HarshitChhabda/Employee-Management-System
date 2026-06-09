const { app, ipcMain } = require('electron');
const setupDatabase = require('./electron/database.cjs');
const registerApiHandlers = require('./electron/api.cjs');

app.whenReady().then(async () => {
    try {
      const db = await setupDatabase();
      console.log('Database initialized successfully from test!');
      registerApiHandlers(ipcMain, db);
      console.log('API handlers registered! Quitting normally.');
      app.quit();
    } catch(e) {
      console.error('CAUGHT ERROR:', e);
      app.quit();
    }
});
