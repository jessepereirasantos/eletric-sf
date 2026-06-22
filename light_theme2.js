const fs = require('fs');

const views = [
  'client/src/views/SheetsView.tsx',
  'client/src/views/UnifilarView.tsx',
  'client/src/views/Render3DView.tsx'
];

views.forEach(v => {
  if (!fs.existsSync(v)) return;
  let content = fs.readFileSync(v, 'utf8');
  
  // Clarear fundos
  content = content.replace(/backgroundColor: '#0f172a'/g, "backgroundColor: '#f5f5f5'");
  content = content.replace(/backgroundColor: '#1e293b'/g, "backgroundColor: '#ffffff'");
  content = content.replace(/background: '#1e293b'/g, "background: '#ffffff'");
  
  // Clarear bordas
  content = content.replace(/border: '1px solid #1e293b'/g, "border: '1px solid #c0c0c0'");
  
  // Escurecer textos (que estavam brancos no dark theme)
  content = content.replace(/color: '#f8fafc'/g, "color: '#1a1a1a'");
  content = content.replace(/color: '#94a3b8'/g, "color: '#555555'");
  content = content.replace(/color: 'white'/g, "color: '#1a1a1a'");
  
  fs.writeFileSync(v, content, 'utf8');
});

console.log('Themes in Views replaced successfully.');
