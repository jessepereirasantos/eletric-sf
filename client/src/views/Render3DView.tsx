import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useCadStore } from '../store/useCadStore';
import { Wall3D } from '../components/Render3D/Wall3D';
import { Device3D } from '../components/Render3D/Device3D';
import { Conduit3D } from '../components/Render3D/Conduit3D';
import { BottomBar } from '../components/BottomBar';

const Laje3D: React.FC = () => {
  const { walls, clippingState } = useCadStore();

  const clippingPlanes = useMemo(() => {
    if (!clippingState.enabled) return [];
    let normal = new THREE.Vector3(0, 0, -1);
    if (clippingState.axis === 'X') normal = new THREE.Vector3(-1, 0, 0);
    if (clippingState.axis === '-X') normal = new THREE.Vector3(1, 0, 0);
    if (clippingState.axis === 'Y') normal = new THREE.Vector3(0, -1, 0);
    if (clippingState.axis === '-Y') normal = new THREE.Vector3(0, 1, 0);
    if (clippingState.axis === 'Z') normal = new THREE.Vector3(0, 0, -1);
    if (clippingState.axis === '-Z') normal = new THREE.Vector3(0, 0, 1);
    return [new THREE.Plane(normal, clippingState.value)];
  }, [clippingState]);

  const geometry = useMemo(() => {
    if (walls.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    walls.forEach(w => {
      minX = Math.min(minX, w.p1.x, w.p2.x);
      maxX = Math.max(maxX, w.p1.x, w.p2.x);
      minY = Math.min(minY, w.p1.y, w.p2.y);
      maxY = Math.max(maxY, w.p1.y, w.p2.y);
    });

    const w = (maxX - minX) + 1.0;
    const h = (maxY - minY) + 1.0;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return { cx, cy, w, h };
  }, [walls]);

  if (!geometry) return null;

  return (
    <mesh position={[geometry.cx, geometry.cy, 2.80 + 0.05]}>
      <boxGeometry args={[geometry.w, geometry.h, 0.10]} />
      <meshStandardMaterial
        color="#475569"
        roughness={0.8}
        metalness={0.2}
        transparent={true}
        opacity={0.45}
        clippingPlanes={clippingPlanes}
      />
    </mesh>
  );
};

const Piso3D: React.FC = () => {
  const { walls } = useCadStore();

  const geometry = useMemo(() => {
    if (walls.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    walls.forEach(w => {
      minX = Math.min(minX, w.p1.x, w.p2.x);
      maxX = Math.max(maxX, w.p1.x, w.p2.x);
      minY = Math.min(minY, w.p1.y, w.p2.y);
      maxY = Math.max(maxY, w.p1.y, w.p2.y);
    });

    const w = (maxX - minX) + 12.0; // Margem generosa ao redor do projeto
    const h = (maxY - minY) + 12.0;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return { cx, cy, w, h };
  }, [walls]);

  if (!geometry) return null;

  return (
    <mesh position={[geometry.cx, geometry.cy, -0.005]} receiveShadow>
      <planeGeometry args={[geometry.w, geometry.h]} />
      <meshStandardMaterial
        color="#e2e8f0" // porcelanato cinza claro
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
};

const OriginAxes3D: React.FC = () => {
  const { showOriginAxes } = useCadStore();
  if (!showOriginAxes) return null;

  return (
    <group position={[0, 0, 0.01]}>
      {/* Eixo X - Vermelho */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[1.5, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 3, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Seta X */}
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[3, 0, 0]}>
        <coneGeometry args={[0.05, 0.15, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Eixo Y - Verde */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 3, 8]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      {/* Seta Y */}
      <mesh rotation={[0, 0, 0]} position={[0, 3, 0]}>
        <coneGeometry args={[0.05, 0.15, 8]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>

      {/* Esfera central da origem */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
};

interface Render3DViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets') => void;
}

export const Render3DView: React.FC<Render3DViewProps> = ({ activeTab, onTabChange }) => {
  const { walls, devices, conduits } = useCadStore();

  const projectCenter = useMemo(() => {
    if (walls.length === 0) return { x: 0, y: 0 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    walls.forEach(w => {
      minX = Math.min(minX, w.p1.x, w.p2.x);
      maxX = Math.max(maxX, w.p1.x, w.p2.x);
      minY = Math.min(minY, w.p1.y, w.p2.y);
      maxY = Math.max(maxY, w.p1.y, w.p2.y);
    });

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    };
  }, [walls]);

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
          <button
            onClick={() => onTabChange('sheets')}
            className={`tab-btn ${activeTab === 'sheets' ? 'active' : ''}`}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              border: '1px solid #334155', backgroundColor: '#1e293b', color: '#cbd5e1'
            }}
          >
            📋 Pranchas / Folhas
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
          camera={{ position: [projectCenter.x + 8, projectCenter.y - 8, 8], fov: 45, up: [0, 0, 1] }}
          shadows
          gl={{ localClippingEnabled: true }}
          style={{ width: '100%', height: '100%', outline: 'none' }}
        >
          {/* Fundo do Espaço 3D */}
          <color attach="background" args={['#090d16']} />
          
          {/* Iluminação Premium */}
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1.2} castShadow />
          <pointLight position={[-10, -10, 8]} intensity={0.6} />
          <directionalLight position={[0, 0, 15]} intensity={0.8} />

          {/* Piso de Porcelanato sob o projeto */}
          <Piso3D />

          {/* Eixos de Origem Técnicos coincidentes */}
          <OriginAxes3D />

          {/* Grid Técnico sutil no piso */}
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

           {/* Renderização da Laje de Cobertura */}
          <Laje3D />

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
                  id={conduit.id}
                  fromDevice={fromDev}
                  toDevice={toDev}
                  diameter={conduit.diameter}
                  waypoints={conduit.waypoints}
                />
              );
            })}
          </group>

          {/* Controles de Câmera e Órbita centralizada */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2 - 0.05} // impede a câmera de passar para debaixo do chão
            minDistance={0.05}
            maxDistance={60}
            target={[projectCenter.x, projectCenter.y, 1.10]}
          />
        </Canvas>
      </div>
      <BottomBar activeTab={activeTab} />
    </div>
  );
};
