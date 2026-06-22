const fs = require('fs');

// 1. Corrigir vazamento do CSS Grid que oculta a barra inferior
let css = fs.readFileSync('client/src/index.css', 'utf8');
css = css.replace(/\.su-viewport-area \{([\s\S]*?)\}/, (match, p1) => {
  if (!match.includes('min-height: 0;')) {
    return `.su-viewport-area {${p1}  min-height: 0;\n  min-width: 0;\n}`;
  }
  return match;
});
css = css.replace(/\.su-tray \{([\s\S]*?)\}/, (match, p1) => {
  if (!match.includes('min-height: 0;')) {
    return `.su-tray {${p1}  min-height: 0;\n}`;
  }
  return match;
});
fs.writeFileSync('client/src/index.css', css, 'utf8');


// 2. Clarear tudo nas views
const views = [
  'client/src/views/SheetsView.tsx',
  'client/src/views/UnifilarView.tsx',
  'client/src/views/Render3DView.tsx'
];

views.forEach(v => {
  let content = fs.readFileSync(v, 'utf8');
  // Troca cores escuras inline para cores claras
  content = content.replace(/#0f172a/gi, '#f8fafc');
  content = content.replace(/#1e293b/gi, '#ffffff');
  content = content.replace(/color:\s*['"]#f8fafc['"]/gi, \"color: '#0f172a'\");
  content = content.replace(/color:\s*['"]white['"]/gi, \"color: '#1e293b'\");
  // O unifilar tinha menus em painéis
  fs.writeFileSync(v, content, 'utf8');
});

console.log('Grid and Light theme applied');
