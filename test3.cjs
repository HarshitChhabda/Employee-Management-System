const { app } = require('electron');
const setupDatabase = require('./electron/database.cjs');
const registerApiHandlers = require('./electron/api.cjs');

app.whenReady().then(async () => {
    try {
        const db = await setupDatabase();
        const mockIpc = {
            handlers: {},
            handle(name, fn) { this.handlers[name] = fn; }
        };
        registerApiHandlers(mockIpc, db);
        
        const result = await mockIpc.handlers['api:employees'](null, 'get', {});
        console.log('RESULT LENGTH:', result.length);
        console.log('FIRST ITEM:', result.length > 0 ? result[0] : 'None');
        app.quit();
    } catch (e) {
        console.error('ERROR:', e);
        app.quit();
    }
});
