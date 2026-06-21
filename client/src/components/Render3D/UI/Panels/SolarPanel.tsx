import React from 'react';
import { useCadStore } from '../../../../store/useCadStore';
import { Sun } from 'lucide-react';

export const SolarPanel: React.FC = () => {
  const { solarAzimuth, solarElevation, setSolarSettings } = useCadStore();

  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px',
      color: '#cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'auto',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)',
      width: '220px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sun size={18} color="#fbbf24" />
        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold' }}>Estudo Solar</h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Azimute (Rotação)</span>
          <span style={{ color: '#fbbf24' }}>{solarAzimuth}°</span>
        </label>
        <input 
          type="range" 
          min="0" max="360" 
          value={solarAzimuth}
          onChange={(e) => setSolarSettings(Number(e.target.value), solarElevation)}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Elevação (Altura)</span>
          <span style={{ color: '#fbbf24' }}>{solarElevation}°</span>
        </label>
        <input 
          type="range" 
          min="0" max="90" 
          value={solarElevation}
          onChange={(e) => setSolarSettings(solarAzimuth, Number(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  );
};
