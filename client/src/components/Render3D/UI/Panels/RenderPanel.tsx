import React from 'react';
import { useCadStore } from '../../../../store/useCadStore';
import { RenderMode } from '../../../../types';
import { Box, Grid3X3, Layers, Settings, Ghost, Move3D } from 'lucide-react';

export const RenderPanel: React.FC = () => {
  const { renderMode, setRenderMode } = useCadStore();

  const modes = [
    { mode: RenderMode.SOLID, label: 'Sólido', icon: <Box size={16} /> },
    { mode: RenderMode.TEXTURED, label: 'Texturizado', icon: <Layers size={16} /> },
    { mode: RenderMode.HIDDEN_LINE, label: 'Hidden Line', icon: <Ghost size={16} /> },
    { mode: RenderMode.ARCHITECTURAL, label: 'Arquitetônico', icon: <Move3D size={16} /> },
    { mode: RenderMode.WIREFRAME, label: 'Aramado', icon: <Grid3X3 size={16} /> }
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
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Settings size={18} color="#f59e0b" />
        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold' }}>Estilos de Render</h4>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {modes.map(m => (
          <button
            key={m.mode}
            onClick={() => setRenderMode(m.mode)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px',
              backgroundColor: renderMode === m.mode ? '#3b82f6' : 'transparent',
              color: renderMode === m.mode ? '#ffffff' : '#94a3b8',
              border: '1px solid',
              borderColor: renderMode === m.mode ? '#2563eb' : '#475569',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
};
