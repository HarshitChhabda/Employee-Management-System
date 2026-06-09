const fs = require('fs');
let code = fs.readFileSync('src/pages/Letters.tsx', 'utf-8');
code = code.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/pages/Letters.tsx', code);
console.log('Fixed syntax errors');
