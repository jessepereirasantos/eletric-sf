import React from 'react';
import { useCadStore } from '../../../../store/useCadStore';
import { Camera, Eye, Footprints } from 'lucide-react';

export const CameraPanel: React.FC = () => {
  const { setCameraTarget } = useCadStore();

  const presets = [
    { label: 'Topo', pos: [0, 50, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
    { label: 'Frente', pos: [0, 2, 50] as [number, number, number], target: [0, 2, 0] as [number, number, number] },
    { label: 'ISO', pos: [30, 30, 30] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
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
        <Camera size={18} color="#a855f7" />
        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold' }}>Câmera</h4>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setCameraTarget(p.pos, p.target)}
            style={{
              flex: 1, padding: '4px', fontSize: '0.7rem',
              backgroundColor: '#1e293b', border: '1px solid #475569',
              borderRadius: '4px', color: '#e2e8f0', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            }}
          >
            <Eye size={14} />
            {p.label}
          </button>
        ))}
      </div>
      
      <button
        style={{
          marginTop: '4px',
          padding: '6px', fontSize: '0.75rem',
          backgroundColor: '#3b82f6', border: 'none',
          borderRadius: '4px', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}
      >
        <Footprints size={14} />
        Modo Caminhada (Walk)
      </button>
    </div>
  );
};
