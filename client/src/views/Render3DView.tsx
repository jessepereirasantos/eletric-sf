// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { useCadStore } from '../store/useCadStore';

import { Wall3D } from '../components/Render3D/Wall3D';
import { Device3D } from '../components/Render3D/Device3D';
import { Conduit3D } from '../components/Render3D/Conduit3D';
import { Area3DRender } from '../components/Render3D/Area3DRender';
import { BottomBar } from '../components/BottomBar';

// Importação dos Módulos da Engine 3D Baseados no SketchUp
import { EnvironmentManager } from '../components/Render3D/Scene/Environment';
import { Lighting } from '../components/Render3D/Scene/Lighting';
import { CameraController } from '../components/Render3D/Camera/CameraController';
import { PostProcessingEffects } from '../components/Render3D/Effects/PostProcessing';

// Interface 3D (HUD)
import { FloatingHUD } from '../components/Render3D/UI/FloatingHUD';
import { CADToolbar } from '../components/Render3D/UI/CADToolbar';
import { BIMOutliner } from '../components/Render3D/UI/BIMOutliner';
import { ToolManager } from '../components/Render3D/Tools/ToolManager';

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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#e2e8f0', color: '#1a1a1a', overflow: 'hidden' }}>

      {/* ─── Área do Canvas 3D (WebGL) ─── */}
      <div style={{ flex: 1, position: 'relative', outline: 'none' }}>
        

        
        {/* UI HUD e Menus Flutuantes */}
        <FloatingHUD />
        <CADToolbar />
        <BIMOutliner />
        


        {/* Canvas WebGL do R3F modularizado (Engine estilo SketchUp) */}
        <Canvas
          shadows
          gl={{ localClippingEnabled: true, preserveDrawingBuffer: true, antialias: false }} // antialias native is off because we use SMAA
          style={{ width: '100%', height: '100%', outline: 'none', backgroundColor: '#e2e8f0' }}
        >
          {/* Módulos do Sistema Visual */}
          <EnvironmentManager />
          <Lighting />
          <CameraController />
          <PostProcessingEffects />
          <ToolManager />

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
        </Canvas>
      </div>

    </div>
  );
};

