import React from 'react';
import { RenderPanel } from './Panels/RenderPanel';
import { SolarPanel } from './Panels/SolarPanel';
import { DisplayPanel } from './Panels/DisplayPanel';
import { CameraPanel } from './Panels/CameraPanel';

export const FloatingHUD: React.FC = () => {
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none' // Para não blocar o click no canvas, mas os filhos devem ter 'auto'
    }}>
      <RenderPanel />
      <CameraPanel />
      <DisplayPanel />
      <SolarPanel />
    </div>
  );
};
