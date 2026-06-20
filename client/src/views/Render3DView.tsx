import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useCadStore } from '../store/useCadStore';
import { TextureGenerator } from '../utils/textureGenerator';
import { Wall3D } from '../components/Render3D/Wall3D';
import { Device3D } from '../components/Render3D/Device3D';
import { Conduit3D } from '../components/Render3D/Conduit3D';
import { Area3DRender } from '../components/Render3D/Area3DRender';
import { BottomBar } from '../components/BottomBar';

const Laje3D: React.FC = () => {
  const { walls, clippingState, showLaje3D } = useCadStore();

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
      minY = Math.min(minY, -w.p1.y, -w.p2.y); // Usa Y invertido
      maxY = Math.max(maxY, -w.p1.y, -w.p2.y);
    });

    const w = (maxX - minX) + 1.0;
    const h = (maxY - minY) + 1.0;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return { cx, cy, w, h };
  }, [walls]);

  if (!showLaje3D || !geometry) return null;

  return (
    <mesh position={[geometry.cx, geometry.cy, 2.80 + 0.05]} raycast={() => null}>
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
  const { walls, floorTextureType, shadingMode, clearSelection } = useCadStore();

  const geometry = useMemo(() => {
    if (walls.length === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    walls.forEach(w => {
      minX = Math.min(minX, w.p1.x, w.p2.x);
      maxX = Math.max(maxX, w.p1.x, w.p2.x);
      minY = Math.min(minY, -w.p1.y, -w.p2.y); // Usa Y invertido
      maxY = Math.max(maxY, -w.p1.y, -w.p2.y);
    });

    const w = (maxX - minX) + 12.0; // Margem generosa ao redor do projeto
    const h = (maxY - minY) + 12.0;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    return { cx, cy, w, h };
  }, [walls]);

  const texture = useMemo(() => {
    if (shadingMode !== 'realistic') return null;
    if (floorTextureType === 'madeira') {
      return TextureGenerator.getWood('#d97706', '#7c2d12');
    } else if (floorTextureType === 'ceramica') {
      return TextureGenerator.getAzulejo('#fca5a5', '#b91c1c');
    } else {
      return TextureGenerator.getPorcelanato('#f8fafc');
    }
  }, [floorTextureType, shadingMode]);

  if (!geometry) return null;

  return (
    <mesh 
      position={[geometry.cx, geometry.cy, -0.005]} 
      receiveShadow 
      onClick={(e) => {
        e.stopPropagation();
        clearSelection();
      }}
    >
      <planeGeometry args={[geometry.w, geometry.h]} />
      <meshStandardMaterial
        color={shadingMode === 'realistic' ? undefined : '#e2e8f0'}
        map={texture || undefined}
        roughness={shadingMode === 'realistic' ? 0.35 : 0.4}
        metalness={shadingMode === 'realistic' ? 0.2 : 0.1}
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
  const {
    walls,
    areas,
    devices,
    conduits,
    orbitControlsEnabled,
    shadingMode,
    setShadingMode,
    activeViewFilter,
    setViewFilter,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedWallId,
    setSelectedWallId,
    updateWall,
    updateDeviceProperties,
    removeDevice,
    showLaje3D,
    setShowLaje3D,
    customColors,
    addCustomColor,
    removeCustomColor,
    updateCustomColor
  } = useCadStore();

  const [hiddenDeviceIds, setHiddenDeviceIds] = useState<Set<string>>(new Set());
  const [isTouring, setIsTouring] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingFormatRef = useRef<{ mimeType: string; ext: string }>({ mimeType: 'video/webm', ext: 'webm' });

  // Estados locais para biblioteca de materiais dinâmicos (Estilo SketchUp)
  const [selectedPaletteColor, setSelectedPaletteColor] = useState<{ name: string; value: string } | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [materialColor, setMaterialColor] = useState('#3b82f6');
  const [activeCategory, setActiveCategory] = useState('cores');

  const categories = useMemo(() => [
    {
      id: 'cores',
      name: '🎨 Cores Sólidas',
      items: [
        { name: 'Branco Neve', value: '#ffffff', texture: 'gesso' },
        { name: 'Cinza Gelo', value: '#e2e8f0', texture: 'gesso' },
        { name: 'Cinza Chumbo', value: '#475569', texture: 'gesso' },
        { name: 'Preto Absoluto', value: '#090d16', texture: 'gesso' },
        { name: 'Azul Petróleo', value: '#1e3a8a', texture: 'gesso' },
        { name: 'Verde Floresta', value: '#14532d', texture: 'gesso' },
        { name: 'Vermelho Terracota', value: '#991b1b', texture: 'gesso' },
        { name: 'Amarelo Mostarda', value: '#eab308', texture: 'gesso' },
        { name: 'Bege Palha', value: '#fef08a', texture: 'gesso' }
      ]
    },
    {
      id: 'madeira',
      name: '🪵 Pisos de Madeira',
      items: [
        { name: 'Carvalho Real', value: '#d97706', texture: 'madeira' },
        { name: 'Ipê Escuro', value: '#7c2d12', texture: 'madeira' },
        { name: 'Marfim Claro', value: '#f59e0b', texture: 'madeira' },
        { name: 'Imbuia Nobre', value: '#451a03', texture: 'madeira' }
      ]
    },
    {
      id: 'porcelanato',
      name: '✨ Porcelanato',
      items: [
        { name: 'Carrara Polido', value: '#f8fafc', texture: 'porcelanato' },
        { name: 'Bege Carrara', value: '#f5f5f4', texture: 'porcelanato' },
        { name: 'Cinza Polido', value: '#cbd5e1', texture: 'porcelanato' },
        { name: 'Nero Mármore', value: '#1e293b', texture: 'porcelanato' }
      ]
    },
    {
      id: 'azulejo',
      name: '🧱 Azulejos',
      items: [
        { name: 'Azulejo Branco', value: '#ffffff', texture: 'azulejo' },
        { name: 'Pastilha Azul', value: '#38bdf8', texture: 'azulejo' },
        { name: 'Azulejo Menta', value: '#a7f3d0', texture: 'azulejo' },
        { name: 'Azulejo Retro Amarelo', value: '#fef08a', texture: 'azulejo' }
      ]
    },
    {
      id: 'pedras',
      name: '🪨 Pedras e Tijolo',
      items: [
        { name: 'Concreto Aparente', value: '#94a3b8', texture: 'concreto' },
        { name: 'Concreto Escuro', value: '#475569', texture: 'concreto' },
        { name: 'Tijolo Vermelho', value: '#b91c1c', texture: 'tijolo' },
        { name: 'Tijolo Rústico', value: '#7c2d12', texture: 'tijolo' }
      ]
    },
    {
      id: 'custom',
      name: '⚙️ Personalizados',
      items: customColors.map(c => ({ name: c.name, value: c.value, texture: 'gesso' }))
    }
  ], [customColors]);

  const activeCategoryItems = useMemo(() => {
    const cat = categories.find(c => c.id === activeCategory);
    return cat ? cat.items : [];
  }, [activeCategory, categories]);

  const projectCenter = useMemo(() => {
    if (walls.length === 0) return { x: 0, y: 0 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    walls.forEach(w => {
      minX = Math.min(minX, w.p1.x, w.p2.x);
      maxX = Math.max(maxX, w.p1.x, w.p2.x);
      minY = Math.min(minY, -w.p1.y, -w.p2.y); // Inverte o Y das paredes
      maxY = Math.max(maxY, -w.p1.y, -w.p2.y);
    });

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    };
  }, [walls]);

  const handleCaptureSnapshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Erro ao localizar o visualizador 3D.');
      return;
    }
    
    // Captura o base64 do canvas
    const dataUrl = canvas.toDataURL('image/png');
    
    // Pergunta o título da imagem
    const title = prompt('Digite o título para este corte/vista 3D:', 'Corte Técnico 3D');
    if (title === null) return; // cancelado
    
    // Adiciona na store
    useCadStore.getState().addSnapshot3D(title || 'Vista 3D', dataUrl);
    alert('Corte 3D capturado com sucesso! Agora você pode adicioná-lo como viewport em qualquer prancha.');
  };

  const handleStartTour = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Erro ao localizar o visualizador 3D.');
      return;
    }

    setIsTouring(true);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      // @ts-ignore
      stream = canvas.captureStream(30);
    } catch (e) {
      alert('Seu navegador não suporta capturar stream do canvas.');
      setIsTouring(false);
      return;
    }

    let mimeType = 'video/mp4;codecs=h264';
    let ext = 'mp4';

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp9';
      ext = 'webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      ext = 'webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      ext = 'webm';
    }

    recordingFormatRef.current = { mimeType, ext };

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const format = recordingFormatRef.current;
        const blob = new Blob(chunksRef.current, { type: format.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `percurso-3d-${Date.now()}.${format.ext}`;
        a.click();
        URL.revokeObjectURL(url);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) {
      console.error('Falha ao iniciar MediaRecorder:', err);
      alert('Seu navegador não suporta gravação de vídeo.');
      setIsTouring(false);
    }
  };

  const handleTourComplete = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsTouring(false);
  };

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

      {/* ─── Barra de Ferramentas do Visualizador 3D ─── */}
      <div style={{
        display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Seletor de Modo de Renderização */}
          <span style={{ color: '#94a3b8' }}>Estilo Visual:</span>
          <div style={{ display: 'flex', backgroundColor: '#090d16', padding: '2px', borderRadius: '6px', border: '1px solid #334155' }}>
            {(['shaded', 'transparent', 'wireframe', 'realistic'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setShadingMode(mode)}
                style={{
                  padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 'bold',
                  backgroundColor: shadingMode === mode ? '#3b82f6' : 'transparent',
                  color: shadingMode === mode ? '#fff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                {mode === 'shaded' ? 'Sólido' : mode === 'transparent' ? 'Raio-X' : mode === 'wireframe' ? 'Aramado' : 'Realista'}
              </button>
            ))}
          </div>

          {/* Filtro de Disciplinas MEP (Revit-like) */}
          <span style={{ color: '#94a3b8', marginLeft: '12px' }}>Filtro MEP:</span>
          <select
            value={activeViewFilter}
            onChange={(e) => setViewFilter(e.target.value as any)}
            style={{
              backgroundColor: '#090d16', border: '1px solid #334155', color: '#fff',
              padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="completa">Vista Completa (Todas)</option>
            <option value="infraestrutura">Somente Infraestrutura (Eletrodutos + Caixas)</option>
            <option value="fiacao_dispositivos">Fiação e Acabamento (Tomadas/Interruptores)</option>
          </select>
        </div>

        {/* Captura de Foto 3D, Gravação de Percurso, Controles de Laje e Ocultamento */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedDeviceId && (
            <>
              <button
                onClick={() => {
                  removeDevice(selectedDeviceId);
                  setSelectedDeviceId(null);
                }}
                style={{
                  backgroundColor: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                🗑️ Excluir
              </button>
              <button
                onClick={() => {
                  setHiddenDeviceIds(prev => {
                    const next = new Set(prev);
                    next.add(selectedDeviceId);
                    return next;
                  });
                  setSelectedDeviceId(null);
                }}
                style={{
                  backgroundColor: '#f59e0b', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                👁️ Ocultar
              </button>
              <button
                onClick={() => setSelectedDeviceId(null)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1', border: '1px solid #334155',
                  borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                Desmarcar
              </button>
            </>
          )}

          {hiddenDeviceIds.size > 0 && (
            <button
              onClick={() => setHiddenDeviceIds(new Set())}
              style={{
                backgroundColor: '#10b981', color: '#fff', border: 'none',
                borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              👁️ Mostrar Todos ({hiddenDeviceIds.size})
            </button>
          )}

          <button
            onClick={() => setShowLaje3D(!showLaje3D)}
            style={{
              backgroundColor: showLaje3D ? '#1e293b' : '#3b82f6',
              color: '#fff', border: '1px solid #334155',
              borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {showLaje3D ? '🏠 Ocultar Teto' : '🏠 Exibir Teto'}
          </button>

          <button
            onClick={isTouring ? handleTourComplete : handleStartTour}
            style={{
              backgroundColor: isTouring ? '#ef4444' : '#6366f1',
              color: '#fff', border: 'none',
              borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {isTouring ? '⏹️ Parar Gravação' : '🎥 Gravar Percurso'}
          </button>

          <button
            onClick={handleCaptureSnapshot}
            style={{
              backgroundColor: '#22c55e', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            📸 Foto 3D
          </button>
        </div>
      </div>

      {/* ─── Área do Canvas 3D (WebGL) ─── */}
      <div style={{ flex: 1, position: 'relative', outline: 'none' }}>
        
        {/* Painel Lateral Direito - Biblioteca de Materiais & Pintura */}
        <div style={{
          position: 'absolute', top: '16px', right: '16px', zIndex: 10,
          backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #d97706',
          borderRadius: '8px', padding: '16px', width: '290px', pointerEvents: 'auto',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.7)',
          maxHeight: 'calc(100% - 32px)', overflowY: 'auto',
          fontFamily: 'Inter, sans-serif',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          
          {/* Seção 1: Elemento Selecionado */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#f59e0b', margin: 0 }}>
                🎯 Seleção Ativa
              </h4>
              {(selectedWallId || selectedDeviceId) && (
                <button 
                  onClick={() => {
                    setSelectedWallId(null);
                    setSelectedDeviceId(null);
                  }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Limpar
                </button>
              )}
            </div>

            {selectedWallId ? (() => {
              const selWall = walls.find(w => w.id === selectedWallId);
              if (!selWall) return null;
              return (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: '1.4' }}>
                    <strong>🧱 Parede ({selWall.material || 'Gesso'})</strong><br />
                    <span>Cor: {selWall.color || 'Padrão'} | Textura: {selWall.texture || 'Nenhuma'}</span><br />
                    <span>Espessura: {selWall.thickness}m | Altura: {selWall.height}m</span>
                  </div>

                  <button
                    onClick={() => updateWall(selectedWallId, { color: undefined, texture: undefined })}
                    style={{
                      width: '100%', padding: '6px', borderRadius: '4px', border: '1px dashed #ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#f87171', fontSize: '0.7rem',
                      cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', marginTop: '6px'
                    }}
                  >
                    Resetar Parede
                  </button>
                </div>
              );
            })() : selectedDeviceId ? (() => {
              const selDev = devices.find(d => d.id === selectedDeviceId);
              if (!selDev) return null;
              const isPorta = selDev.type.startsWith('door');
              return (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: '1.4' }}>
                    <strong>{isPorta ? '🚪 Porta' : '📦 Componente'} ({selDev.name})</strong><br />
                    <span>Tipo: {selDev.type}</span>
                  </div>

                  <button
                    onClick={() => updateDeviceProperties(selectedDeviceId, { color: undefined })}
                    style={{
                      width: '100%', padding: '6px', borderRadius: '4px', border: '1px dashed #ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#f87171', fontSize: '0.7rem',
                      cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', marginTop: '4px'
                    }}
                  >
                    Resetar Cor do Objeto
                  </button>
                </div>
              );
            })() : (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                Nenhum elemento selecionado.<br />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Clique em uma parede ou objeto no 3D para pintar.</span>
              </div>
            )}
          </div>

          {/* Seção 2: Biblioteca de Materiais (SketchUp) */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: '12px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎨 Biblioteca de Materiais</span>
            </h4>

            {/* Seletor de Categoria */}
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#090d16',
                border: '1px solid #d97706',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                outline: 'none',
                marginBottom: '10px'
              }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Paleta de Cores/Materiais em Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '12px' }}>
              {activeCategoryItems.map(item => {
                const isSelected = selectedPaletteColor?.value === item.value && (selectedWallId ? (walls.find(w => w.id === selectedWallId)?.texture === item.texture) : true);
                return (
                  <div key={`${item.value}_${item.texture}`} style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                    <button
                      onClick={() => {
                        setSelectedPaletteColor({ name: item.name, value: item.value });
                        setMaterialName(item.name);
                        setMaterialColor(item.value);

                        // Aplica cor e textura imediatamente
                        if (selectedWallId) {
                          updateWall(selectedWallId, { color: item.value, texture: item.texture });
                        } else if (selectedDeviceId) {
                          updateDeviceProperties(selectedDeviceId, { color: item.value });
                        }
                      }}
                      title={`${item.name} (${item.value})`}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '4px',
                        border: isSelected ? '2px solid #f59e0b' : '1px solid #475569',
                        backgroundColor: item.value,
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: isSelected ? '0 0 6px #f59e0b' : 'none',
                        transition: 'transform 0.1s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Gerenciamento de Cores Personalizadas (Aparece apenas na categoria Personalizados) */}
            {activeCategory === 'custom' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '6px', padding: '10px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#cbd5e1' }}>
                    {selectedPaletteColor ? '✏️ Editar Material' : '➕ Novo Material'}
                  </span>
                  {selectedPaletteColor && (
                    <button
                      onClick={() => {
                        setSelectedPaletteColor(null);
                        setMaterialName('');
                        setMaterialColor('#3b82f6');
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      Novo
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Nome do Material */}
                  <div>
                    <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Nome:</label>
                    <input
                      type="text"
                      value={materialName}
                      onChange={(e) => setMaterialName(e.target.value)}
                      placeholder="Ex: Tinta Parede"
                      style={{
                        width: '100%',
                        backgroundColor: '#090d16',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        color: '#fff',
                        padding: '4px 6px',
                        fontSize: '0.75rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Seleção de Cor */}
                  <div>
                    <label style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Cor (HEX):</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="color"
                        value={materialColor}
                        onChange={(e) => setMaterialColor(e.target.value)}
                        style={{
                          width: '32px',
                          height: '24px',
                          border: 'none',
                          padding: '0',
                          backgroundColor: 'transparent',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={materialColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith('#') && val.length <= 7) {
                            setMaterialColor(val);
                          }
                        }}
                        placeholder="#3b82f6"
                        style={{
                          flex: 1,
                          backgroundColor: '#090d16',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          color: '#fff',
                          padding: '2px 6px',
                          fontSize: '0.75rem',
                          outline: 'none',
                          textTransform: 'uppercase'
                        }}
                      />
                    </div>
                  </div>

                  {/* Botões */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {selectedPaletteColor ? (
                      <>
                        <button
                          onClick={() => {
                            if (!selectedPaletteColor) return;
                            if (!materialName.trim()) {
                              alert('Insira um nome para o material.');
                              return;
                            }
                            const oldValue = selectedPaletteColor.value;
                            const newValue = materialColor;
                            const newName = materialName;

                            // 1. Atualizar paleta na store
                            updateCustomColor(oldValue, newValue, newName);

                            // 2. Cascata nas paredes
                            walls.forEach(w => {
                              if (w.color === oldValue) {
                                updateWall(w.id, { color: newValue });
                              }
                            });

                            // 3. Cascata nos objetos
                            devices.forEach(d => {
                              if (d.color === oldValue) {
                                updateDeviceProperties(d.id, { color: newValue });
                              }
                            });

                            setSelectedPaletteColor({ name: newName, value: newValue });
                            alert('Material atualizado com sucesso!');
                          }}
                          style={{
                            flex: 1, backgroundColor: '#f59e0b', color: '#000', border: 'none',
                            borderRadius: '4px', padding: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
                          }}
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            if (!selectedPaletteColor) return;
                            const oldValue = selectedPaletteColor.value;

                            // 1. Remover da store
                            removeCustomColor(oldValue);

                            // 2. Cascata: remover cor dos elementos afetados
                            walls.forEach(w => {
                              if (w.color === oldValue) {
                                updateWall(w.id, { color: undefined });
                              }
                            });
                            devices.forEach(d => {
                              if (d.color === oldValue) {
                                updateDeviceProperties(d.id, { color: undefined });
                              }
                            });

                            setSelectedPaletteColor(null);
                            setMaterialName('');
                            setMaterialColor('#3b82f6');
                            alert('Material excluído!');
                          }}
                          style={{
                            backgroundColor: '#ef4444', color: '#fff', border: 'none',
                            borderRadius: '4px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
                          }}
                        >
                          Excluir
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (!materialName.trim()) {
                            alert('Insira um nome para o material.');
                            return;
                          }
                          if (customColors.some(c => c.value.toLowerCase() === materialColor.toLowerCase())) {
                            alert('Já existe um material com esta cor na paleta.');
                            return;
                          }

                          addCustomColor({ name: materialName, value: materialColor });
                          setMaterialName('');
                          setMaterialColor('#3b82f6');
                        }}
                        style={{
                          width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none',
                          borderRadius: '4px', padding: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
                        }}
                      >
                        Criar Material
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
        
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
          gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
          style={{ width: '100%', height: '100%', outline: 'none' }}
        >
          {/* Fundo do Espaço 3D */}
          <color attach="background" args={['#090d16']} />
          
          {/* Iluminação Premium e Sombras */}
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0001} />
          <pointLight position={[-10, -10, 8]} intensity={0.4} />
          <directionalLight 
            position={[10, -10, 15]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize-width={2048} 
            shadow-mapSize-height={2048} 
            shadow-camera-left={-20} 
            shadow-camera-right={20} 
            shadow-camera-top={20} 
            shadow-camera-bottom={-20} 
            shadow-bias={-0.0005} 
          />

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

          {/* Renderização de Áreas e Terrenos Livres (Grama, Piscina, Piso, Asfalto) */}
          <group>
            {areas.map((area) => (
              <Area3DRender key={area.id} area={area} />
            ))}
          </group>

          {/* Renderização das Paredes */}
          <group>
            {walls.map((wall) => (
              <Wall3D key={wall.id} wall={wall} />
            ))}
          </group>

          {/* Renderização dos Dispositivos (com filtro de ocultados) */}
          <group>
            {devices
              .filter(device => !hiddenDeviceIds.has(device.id))
              .map((device) => (
                <Device3D key={device.id} device={device} />
              ))}
          </group>

          {/* Renderização dos Conduítes (com filtro se algum dispositivo ponta estiver oculto) */}
          <group>
            {conduits
              .filter(conduit => !hiddenDeviceIds.has(conduit.fromDeviceId) && !hiddenDeviceIds.has(conduit.toDeviceId))
              .map((conduit) => {
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
            enabled={orbitControlsEnabled}
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
