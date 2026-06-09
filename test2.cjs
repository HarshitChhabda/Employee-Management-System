const path = require('path');
const mockApp = {
    getPath: () => path.join(process.env.APPDATA, 'placeholder-model-2')
};
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(arg) {
    if (arg === 'electron') {
        return { app: mockApp };
    }
    return originalRequire.apply(this, arguments);
};

const setupDatabase = require('./electron/database.cjs');
setupDatabase().then(() => console.log('SUCCESS')).catch(e => console.error('SQL_ERROR:', e));
