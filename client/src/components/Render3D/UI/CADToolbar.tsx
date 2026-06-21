import React from 'react';
import { useCadStore } from '../../../../store/useCadStore';
import { MousePointer2, Minus, Square, Hexagon, ArrowUpFromLine, Move, RotateCw, Scaling } from 'lucide-react';
import { ToolMode } from '../../../../types';

export const CADToolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useCadStore();

  const tools = [
    { mode: ToolMode.SELECT, label: 'Seleção', icon: <MousePointer2 size={16} /> },
    { mode: ToolMode.LINE, label: 'Linha', icon: <Minus size={16} /> },
    { mode: ToolMode.RECTANGLE, label: 'Retângulo', icon: <Square size={16} /> },
    { mode: ToolMode.POLYGON, label: 'Polígono', icon: <Hexagon size={16} /> },
    { mode: ToolMode.PUSH_PULL, label: 'Push/Pull', icon: <ArrowUpFromLine size={16} /> },
    { mode: ToolMode.MOVE, label: 'Move', icon: <Move size={16} /> },
    { mode: ToolMode.ROTATE, label: 'Rotate', icon: <RotateCw size={16} /> },
    { mode: ToolMode.SCALE, label: 'Scale', icon: <Scaling size={16} /> },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '6px',
      display: 'flex',
      gap: '4px',
      pointerEvents: 'auto',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)',
    }}>
      {tools.map(t => (
        <button
          key={t.mode}
          onClick={() => setActiveTool(t.mode)}
          title={t.label}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px',
            backgroundColor: activeTool === t.mode ? '#3b82f6' : 'transparent',
            color: activeTool === t.mode ? '#ffffff' : '#94a3b8',
            border: '1px solid',
            borderColor: activeTool === t.mode ? '#2563eb' : 'transparent',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};
