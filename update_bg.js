const fs = require('fs');

const uPath = 'client/src/views/UnifilarView.tsx';
let uContent = fs.readFileSync(uPath, 'utf8');
uContent = uContent.replace(/backgroundColor: '#090d16'/g, "backgroundColor: '#f8fafc'");
uContent = uContent.replace(/<Background color="#1e293b"/g, '<Background color="#cbd5e1"');
uContent = uContent.replace(/fill: '#f8fafc'/g, "fill: '#475569'");
fs.writeFileSync(uPath, uContent, 'utf8');

const sPath = 'client/src/views/SheetsView.tsx';
let sContent = fs.readFileSync(sPath, 'utf8');
sContent = sContent.replace(/backgroundColor: '#090d16'/g, "backgroundColor: '#f8fafc'");
sContent = sContent.replace(/backgroundColor: '#0b0f19'/g, "backgroundColor: '#e2e8f0'");
fs.writeFileSync(sPath, sContent, 'utf8');

console.log('Unifilar and Sheets backgrounds updated to light theme!');
