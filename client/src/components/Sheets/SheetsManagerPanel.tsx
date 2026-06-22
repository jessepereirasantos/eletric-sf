
import { useCadStore } from '../../store/useCadStore';

export function SheetsManagerPanel() {
  const { 
    sheetsList, activeSheetId, setActiveSheetId, 
    addSheet, removeSheet, updateSheet, 
    addViewportToSheet, removeViewportFromSheet
  } = useCadStore();

  const activeSheet = sheetsList.find(s => s.id === activeSheetId) || sheetsList[0];
  if (!activeSheet) return null;

  const handleCreateSheet = () => {
    const nextNum = sheetsList.length + 1;
    addSheet({
      code: `PR-0${nextNum}/0${nextNum}`,
      title: `Nova Prancha ${nextNum}`,
      size: 'A1',
      orientation: 'landscape'
    });
  };

  const handleToggleViewport = (type: 'planta' | 'cargas' | 'materiais' | 'unifilar' | 'legenda') => {
    const exists = activeSheet.viewports.find(vp => vp.type === type);
    if (exists) {
      removeViewportFromSheet(activeSheet.id, exists.id);
    } else {
      addViewportToSheet(activeSheet.id, type);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '11px', color: 'var(--su-text)' }}>
      {/* Lista de Pranchas */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold' }}>Suas Pranchas</span>
          <button onClick={handleCreateSheet} style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>
            + Nova
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
          {sheetsList.map(s => (
            <div key={s.id} onClick={() => setActiveSheetId(s.id)} style={{
              padding: '6px', borderRadius: '4px', cursor: 'pointer',
              border: activeSheetId === s.id ? '1px solid var(--su-text-active)' : '1px solid var(--su-border)',
              backgroundColor: activeSheetId === s.id ? 'var(--su-bg-active)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{s.code}</div>
                <div style={{ color: 'var(--su-text-muted)' }}>{s.title}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeSheet(s.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--su-border)', margin: '8px 0' }} />

      {/* Configurações da Folha Atual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontWeight: 'bold' }}>Configurar Folha Atual</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label>Título</label>
          <input
            type="text"
            value={activeSheet.title}
            onChange={(e) => updateSheet(activeSheet.id, { title: e.target.value })}
            style={{ border: '1px solid var(--su-border)', padding: '4px', borderRadius: '2px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label>Tamanho do Papel</label>
          <select
            value={activeSheet.size}
            onChange={(e) => updateSheet(activeSheet.id, { size: e.target.value as any })}
            style={{ border: '1px solid var(--su-border)', padding: '4px', borderRadius: '2px' }}
          >
            <option value="A0">A0 (1189x841 mm)</option>
            <option value="A1">A1 (841x594 mm)</option>
            <option value="A2">A2 (594x420 mm)</option>
            <option value="A3">A3 (420x297 mm)</option>
            <option value="A4">A4 (297x210 mm)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
          <span style={{ color: 'var(--su-text-muted)' }}>Adicionar no Layout</span>
          {(['planta', 'unifilar', 'cargas', 'materiais', 'legenda'] as const).map(type => {
            const label = type === 'planta' ? 'Planta Baixa 2D' : type === 'unifilar' ? 'Diagrama Unifilar' : type === 'cargas' ? 'Quadro de Cargas' : type === 'materiais' ? 'Lista de Materiais' : 'Legenda de Símbolos';
            const isChecked = activeSheet.viewports.some(vp => vp.type === type);
            return (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={isChecked} onChange={() => handleToggleViewport(type)} />
                {label}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
