import React from 'react';
import { useCadStore } from '../store/useCadStore';

interface BottomBarProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar';
}

export const BottomBar: React.FC<BottomBarProps> = ({ activeTab }) => {
  const {
    activeViewFilter, setViewFilter,
    shadingMode, setShadingMode,
    clippingState, setClippingState,
    projectScale, setProjectScale,
    utilityGridType, setUtilityGridType
  } = useCadStore();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '40px',
      padding: '0 16px',
      backgroundColor: '#0f172a',
      borderTop: '1px solid #1e293b',
      color: '#cbd5e1',
      fontSize: '0.75rem',
      userSelect: 'none',
      zIndex: 100
    }}>
      {/* ─── LADO ESQUERDO: Escala e Concessionária ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Seletor de Escala */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📐 Escala:</span>
          <select
            value={projectScale}
            onChange={(e) => setProjectScale(parseInt(e.target.value))}
            style={{
              backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
              borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="20">1:20</option>
            <option value="50">1:50</option>
            <option value="100">1:100</option>
          </select>
        </div>

        {/* Tipo de Ligação Concessionária */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚡ Rede:</span>
          <select
            value={utilityGridType}
            onChange={(e) => setUtilityGridType(e.target.value as any)}
            style={{
              backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
              borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="monofasico">Monofásico (127V)</option>
            <option value="bifasico">Bifásico (120/240V)</option>
            <option value="trifasico">Trifásico (127/220V)</option>
          </select>
        </div>
      </div>

      {/* ─── LADO CENTRAL: Filtro de Planta (2D/3D) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>👁️ Planta/Visibilidade:</span>
          <select
            value={activeViewFilter}
            onChange={(e) => setViewFilter(e.target.value as any)}
            style={{
              backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
              borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', outline: 'none', cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            <option value="completa">Planta Completa (Sobreposta)</option>
            <option value="infraestrutura">Planta de Infraestrutura (Caixas/Eletrodutos)</option>
            <option value="fiacao_dispositivos">Planta de Dispositivos e Fiação</option>
          </select>
        </div>
      </div>

      {/* ─── LADO DIREITO: Controles 3D (Shading e Clipping) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {activeTab === 'render3d' && (
          <>
            {/* Modo de Sombreamento 3D */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎨 Visualização 3D:</span>
              <div style={{ display: 'flex', border: '1px solid #334155', borderRadius: '4px', overflow: 'hidden' }}>
                {(['shaded', 'transparent', 'wireframe'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setShadingMode(mode)}
                    style={{
                      backgroundColor: shadingMode === mode ? '#3b82f6' : '#1e293b',
                      color: shadingMode === mode ? '#ffffff' : '#cbd5e1',
                      border: 'none', padding: '3px 8px', fontSize: '0.65rem', cursor: 'pointer',
                      textTransform: 'uppercase', fontWeight: 'bold'
                    }}
                  >
                    {mode === 'shaded' ? 'Sólido' : mode === 'transparent' ? 'Raio-X' : 'Arame'}
                  </button>
                ))}
              </div>
            </div>

            {/* Plano de Corte 3D */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={clippingState.enabled}
                  onChange={(e) => setClippingState({ enabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>Corte 3D</span>
              </label>

              {clippingState.enabled && (
                <>
                  <select
                    value={clippingState.axis}
                    onChange={(e) => setClippingState({ axis: e.target.value as any })}
                    style={{
                      backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
                      borderRadius: '4px', padding: '1px 4px', fontSize: '0.65rem', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="X">Eixo X</option>
                    <option value="Y">Eixo Y</option>
                    <option value="Z">Eixo Z</option>
                  </select>

                  <input
                    type="range"
                    min={clippingState.axis === 'Z' ? 0.0 : -20.0}
                    max={clippingState.axis === 'Z' ? 3.0 : 20.0}
                    step={0.05}
                    value={clippingState.value}
                    onChange={(e) => setClippingState({ value: parseFloat(e.target.value) })}
                    style={{ width: '80px', height: '4px', cursor: 'ew-resize' }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', width: '35px', textAlign: 'right' }}>
                    {clippingState.value.toFixed(1)}m
                  </span>
                </>
              )}
            </div>
          </>
        )}

        {/* Indicador de Status Geral */}
        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Eletric SF BIM v1.5</span>
      </div>
    </div>
  );
};
