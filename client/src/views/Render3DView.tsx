import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useCadStore } from '../store/useCadStore';
import { Wall3D } from '../components/Render3D/Wall3D';
import { Device3D } from '../components/Render3D/Device3D';
import { Conduit3D } from '../components/Render3D/Conduit3D';

interface Render3DViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar') => void;
}

export const Render3DView: React.FC<Render3DViewProps> = ({ activeTab, onTabChange }) => {
  const { walls, devices, conduits } = useCadStore();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ─── Top Header da View 3D ─── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>🧊</span>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>
              Maquete Tridimensional 3D
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Visualizador WebGL em tempo real de infraestrutura elétrica
            </p>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="tab-buttons" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onTabChange('cad2d')}
            className={`tab-btn ${activeTab === 'cad2d' ? 'active' : ''}`}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              border: '1px solid #334155', backgroundColor: '#1e293b', color: '#cbd5e1'
            }}
          >
            📐 Editor CAD 2D
          </button>
          <button
            className="tab-btn active"
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'
            }}
          >
            🧊 Visualizador 3D
          </button>
          <button
            onClick={() => onTabChange('unifilar')}
            className={`tab-btn ${activeTab === 'unifilar' ? 'active' : ''}`}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              border: '1px solid #334155', backgroundColor: '#1e293b', color: '#cbd5e1'
            }}
          >
            ⚡ Diagrama Unifilar
          </button>
        </div>
      </header>

      {/* ─── Área do Canvas 3D (WebGL) ─── */}
      <div style={{ flex: 1, position: 'relative', outline: 'none' }}>
        
        {/* Painel Lateral de Instruções/Legenda */}
        <div style={{
          position: 'absolute', top: '16px', left: '16px', zIndex: 10,
          backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155',
          borderRadius: '8px', padding: '14px', width: '220px', pointerEvents: 'auto',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
        }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#3b82f6', margin: '0 0 8px 0' }}>
            Controles 3D
          </h4>
          <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '0.7rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            <li><strong>Botão Esquerdo:</strong> Rotacionar câmera</li>
            <li><strong>Botão Direito / Shift:</strong> Arrastar (Pan)</li>
            <li><strong>Scroll / Wheel:</strong> Zoom in/out</li>
          </ul>

          <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#f59e0b', margin: '12px 0 6px 0' }}>
            Legenda 3D
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
              <span>Conduítes (Eletrodutos)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#fef08a', display: 'inline-block' }}></span>
              <span>Luzes / Luminárias</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', display: 'inline-block' }}></span>
              <span>Tomadas / Interruptores</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#475569', display: 'inline-block' }}></span>
              <span>QDC / Proteções</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#b45309', display: 'inline-block' }}></span>
              <span>Portas (Madeira)</span>
            </div>
          </div>
        </div>

        {/* Canvas WebGL do R3F */}
        <Canvas
          camera={{ position: [8, -8, 8], fov: 45, up: [0, 0, 1] }}
          shadows
          style={{ width: '100%', height: '100%', outline: 'none' }}
        >
          {/* Fundo do Espaço 3D */}
          <color attach="background" args={['#090d16']} />
          
          {/* Iluminação Premium */}
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1.2} castShadow />
          <pointLight position={[-10, -10, 8]} intensity={0.6} />
          <directionalLight position={[0, 0, 15]} intensity={0.8} />

          {/* Grid Técnico no Piso */}
          <Grid
            renderOrder={-1}
            position={[0, 0, 0]}
            args={[30, 30]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1e293b"
            sectionSize={2.5}
            sectionThickness={1}
            sectionColor="#334155"
            fadeDistance={30}
            infiniteGrid
          />

          {/* Renderização das Paredes */}
          <group>
            {walls.map((wall) => (
              <Wall3D key={wall.id} wall={wall} />
            ))}
          </group>

          {/* Renderização dos Dispositivos */}
          <group>
            {devices.map((device) => (
              <Device3D key={device.id} device={device} />
            ))}
          </group>

          {/* Renderização dos Conduítes */}
          <group>
            {conduits.map((conduit) => {
              const fromDev = devices.find((d) => d.id === conduit.fromDeviceId);
              const toDev = devices.find((d) => d.id === conduit.toDeviceId);
              if (!fromDev || !toDev) return null;
              return (
                <Conduit3D
                  key={conduit.id}
                  fromDevice={fromDev}
                  toDevice={toDev}
                  diameter={conduit.diameter}
                />
              );
            })}
          </group>

          {/* Controles de Câmera e Órbita */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2 - 0.05} // impede a câmera de passar para debaixo do chão
            minDistance={1}
            maxDistance={40}
          />
        </Canvas>
      </div>
    </div>
  );
};
