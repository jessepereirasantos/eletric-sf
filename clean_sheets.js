const fs = require('fs');
const sheetsPath = 'client/src/views/SheetsView.tsx';
let content = fs.readFileSync(sheetsPath, 'utf8');

const startMarker = '{/* Painel de Controle de Folhas com Rolagem Própria */}';
const endMarker = '<div style={{ flex: 1, backgroundColor: \\'#090d16\\',';
const endMarker2 = '<div style={{ flex: 1, display: \\'flex\\', justifyContent: \\'center\\'';
const endMarker3 = '<div style={{ flex: 1, overflow: \\'auto\\',';
const endMarker4 = '<div style={{ flex: 1, position: \\'relative\\', overflow: \\'hidden\\' }} ref={containerRef}>';

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker4);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + content.slice(endIndex);
  fs.writeFileSync(sheetsPath, content, 'utf8');
  console.log('Sidebar removida do SheetsView!');
} else {
  console.log('Markers not found', startIndex, endIndex);
}
