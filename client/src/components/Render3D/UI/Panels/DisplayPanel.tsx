import React from 'react';
import { useCadStore } from '../../../../store/useCadStore';
import { Monitor } from 'lucide-react';

export const DisplayPanel: React.FC = () => {
  const { 
    showGrid, toggleGrid, 
    showOriginAxes, setShowOriginAxes, 
    shadowsEnabled, setShadowsEnabled 
  } = useCadStore();

  const toggleItems = [
    { label: 'Grade Base (Grid)', active: showGrid, action: toggleGrid },
    { label: 'Eixos (X, Y, Z)', active: showOriginAxes, action: () => setShowOriginAxes(!showOriginAxes) },
    { label: 'Sombras Dinâmicas', active: shadowsEnabled, action: () => setShadowsEnabled(!shadowsEnabled) },
  ];

  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px',
      color: '#cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'auto',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)',
      width: '220px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Monitor size={18} color="#10b981" />
        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold' }}>Visualização</h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {toggleItems.map((item, idx) => (
          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={item.active} 
              onChange={item.action} 
              style={{ cursor: 'pointer' }}
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
};
