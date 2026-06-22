const fs = require('fs');

const path = 'client/src/views/Cad2DView.tsx';
let cad = fs.readFileSync(path, 'utf8');

// Retira PropertiesPanel do Cad2DView
cad = cad.replace(/import \{ PropertiesPanel \} from '\.\.\/components\/PropertiesPanel';\r?\n/, '');
cad = cad.replace(/<PropertiesPanel \/>/g, '');

fs.writeFileSync(path, cad, 'utf8');

const appPath = 'client/src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(/InformaÃ§Ãµes da Entidade/g, 'Informações da Entidade');
fs.writeFileSync(appPath, app, 'utf8');

const bimPath = 'client/src/components/Render3D/UI/Panels/BimLibraryPanel.tsx';
let bim = fs.readFileSync(bimPath, 'utf8');
bim = bim.replace(/InformaÃ§Ãµes/g, 'Informações');
bim = bim.replace(/ElÃ©trica/g, 'Elétrica');
bim = bim.replace(/Hidr\./g, 'Hidr.');
bim = bim.replace(/âš¡/g, '⚡');
bim = bim.replace(/âŠ⊕/g, '⊕');
bim = bim.replace(/âŠ•/g, '⊕');
bim = bim.replace(/â¬¡/g, '⬡');
bim = bim.replace(/â— /g, '⬤');
bim = bim.replace(/â˜€/g, '☀️');
bim = bim.replace(/ðŸ”†/g, '🔆');
bim = bim.replace(/â–¬/g, '▬');
bim = bim.replace(/ðŸš¿/g, '🚿');
bim = bim.replace(/â „/g, '❄️');
bim = bim.replace(/â–¦/g, '▦');
bim = bim.replace(/â–©/g, '▩');
bim = bim.replace(/âŠ¡/g, '🛡️');
bim = bim.replace(/âŠŸ/g, '🌩️');
bim = bim.replace(/ðŸ“·/g, '📷');
bim = bim.replace(/ðŸ‘ /g, '👁️');
bim = bim.replace(/ðŸ”¥/g, '🔥');
bim = bim.replace(/ðŸš¨/g, '🚨');
bim = bim.replace(/â–¡/g, '□');
bim = bim.replace(/â–­/g, '▯');
bim = bim.replace(/â–ª/g, '▪');
bim = bim.replace(/ðŸ”Œ/g, '🔌');
bim = bim.replace(/ðŸ“ž/g, '📞');
bim = bim.replace(/ðŸ“¡/g, '📡');
bim = bim.replace(/ðŸšª/g, '🚪');
bim = bim.replace(/â¬œ/g, '⬛');
bim = bim.replace(/ðŸªœ/g, '🪜');
bim = bim.replace(/ðŸ›‹/g, '🛋️');
bim = bim.replace(/ðŸ› /g, '🛏️');
bim = bim.replace(/ðŸ ½/g, '🍽️');
bim = bim.replace(/ðŸ§Š/g, '🧊');
bim = bim.replace(/ðŸ”„/g, '🔄');
bim = bim.replace(/ðŸš½/g, '🚽');
bim = bim.replace(/ðŸš°/g, '🚰');
bim = bim.replace(/âš™/g, '⚙️');
bim = bim.replace(/ðŸ”‹/g, '🔋');
bim = bim.replace(/ðŸ  /g, '🏠');
bim = bim.replace(/ðŸ’§/g, '💧');
fs.writeFileSync(bimPath, bim, 'utf8');

const instPath = 'client/src/components/Render3D/UI/Panels/InstructorPanel.tsx';
let inst = fs.readFileSync(instPath, 'utf8');
inst = inst.replace(/â†’/g, '→');
inst = inst.replace(/InformaÃ§Ãµes/g, 'Informações');
fs.writeFileSync(instPath, inst, 'utf8');

const infoPath = 'client/src/components/Render3D/UI/Panels/EntityInfoPanel.tsx';
let info = fs.readFileSync(infoPath, 'utf8');
info = info.replace(/InformaÃ§Ãµes/g, 'Informações');
info = info.replace(/InformaÃ§Ãµes da Entidade/g, 'Informações da Entidade');
info = info.replace(/NÃ£o/g, 'Não');
info = info.replace(/PadrÃ£o/g, 'Padrão');
info = info.replace(/VisÃ­vel/g, 'Visível');
info = info.replace(/AplicaÃ§Ã£o/g, 'Aplicação');
info = info.replace(/PosiÃ§Ã£o/g, 'Posição');
fs.writeFileSync(infoPath, info, 'utf8');

console.log('Codificação corrigida e caixa vazia removida!');
