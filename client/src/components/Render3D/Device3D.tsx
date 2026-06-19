import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { useCadStore } from '../../store/useCadStore';
import type { Device } from '../../store/useCadStore';

interface Device3DProps {
  device: Device;
  isInner?: boolean;
}

const getClosestPointOnSegment = (pt: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t2 = dx * dx + dy * dy;
  if (t2 === 0) {
    const dist = Math.sqrt((pt.x - p1.x) ** 2 + (pt.y - p1.y) ** 2);
    return { point: p1, distance: dist };
  }
  let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / t2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: p1.x + t * dx, y: p1.y + t * dy };
  const dist = Math.sqrt((pt.x - proj.x) ** 2 + (pt.y - proj.y) ** 2);
  return { point: proj, distance: dist };
};

const getClosestWallThickness = (devX: number, devY: number, wallsList: any[]): number => {
  if (!wallsList || wallsList.length === 0) return 0.15;
  let minDistance = Infinity;
  let closestWallThickness = 0.15; // padrão 15cm

  wallsList.forEach(w => {
    const res = getClosestPointOnSegment({ x: devX, y: devY }, w.p1, w.p2);
    if (res.distance < minDistance) {
      minDistance = res.distance;
      closestWallThickness = w.thickness;
    }
  });

  return minDistance < 0.5 ? closestWallThickness : 0.15;
};

export const Device3D: React.FC<Device3DProps> = ({ device: deviceProp, isInner = false }) => {
  const { shadingMode, clippingState, doorColor, windowColor, selectedDeviceId, updateDeviceProperties, walls } = useCadStore();
  
  // Rotação invertida: o Three.js rotaciona em torno de Z no sentido anti-horário,
  // enquanto o Konva (2D) e o SVG rotacionam no sentido horário.
  const computedRotationRad = (-deviceProp.rotation * Math.PI) / 180;

  // Sombreado de constantes para que o switch/ifs original rode na origem se isInner for true
  const device = isInner ? { ...deviceProp, x: 0, y: 0, rotation: 0 } : deviceProp;

  // Planos de corte dinâmicos (Clipping Planes)
  const clippingPlanes = useMemo(() => {
    if (!clippingState.enabled) return [];
    let normal = new THREE.Vector3(0, 0, -1); // Cortar acima de Z
    if (clippingState.axis === 'X') normal = new THREE.Vector3(-1, 0, 0);
    if (clippingState.axis === '-X') normal = new THREE.Vector3(1, 0, 0);
    if (clippingState.axis === 'Y') normal = new THREE.Vector3(0, -1, 0);
    if (clippingState.axis === '-Y') normal = new THREE.Vector3(0, 1, 0);
    if (clippingState.axis === 'Z') normal = new THREE.Vector3(0, 0, -1);
    if (clippingState.axis === '-Z') normal = new THREE.Vector3(0, 0, 1);
    return [new THREE.Plane(normal, clippingState.value)];
  }, [clippingState]);

  // Sempre visível no 3D
  const isVisible = true;
  if (!isVisible) return null;

  const type = deviceProp.type;

  // Determinar a altura Z de fixação com base no peitoril ou norma e tipo de dispositivo
  const getZCoordAndHeight = (): { z: number; width: number; depth: number; height: number; color: string; isEsquadria: boolean } => {
    // Esquadrias
    if (type.startsWith('door')) {
      const doorW = device.width ?? 0.8;
      const doorH = device.height3d ?? 2.10;
      return { z: doorH / 2, width: doorW, depth: 0.04, height: doorH, color: doorColor || '#78350f', isEsquadria: true };
    }
    if (type === 'window') {
      const winW = device.width ?? 1.2;
      const winH = device.height3d ?? 1.10;
      const peitoril = device.peitoril ?? 1.00;
      return { z: peitoril + winH / 2, width: winW, depth: 0.05, height: winH, color: windowColor || '#38bdf8', isEsquadria: true };
    }
    if (type === 'open_van') {
      const vanW = device.width ?? 1.0;
      const vanH = device.height3d ?? 2.10;
      return { z: vanH / 2, width: vanW, depth: 0.15, height: vanH, color: '#cbd5e1', isEsquadria: true };
    }

    // Mobiliários residenciais (altura do peitoril padrão = 0m, no chão)
    if (type === 'sofa' || type === 'geladeira' || type === 'fogao' || type === 'cama' || type === 'mesa_jantar') {
      let size = { width: 1.0, depth: 1.0, height: 1.0, color: '#94a3b8' };
      if (type === 'sofa') size = { width: device.width ?? 2.0, depth: 0.9, height: 0.85, color: '#475569' };
      else if (type === 'geladeira') size = { width: device.width ?? 0.7, depth: 0.7, height: device.height3d ?? 1.85, color: '#cbd5e1' };
      else if (type === 'fogao') size = { width: device.width ?? 0.7, depth: 0.6, height: 0.85, color: '#334155' };
      else if (type === 'cama') size = { width: device.width ?? 1.6, depth: 2.0, height: 0.55, color: '#f8fafc' };
      else if (type === 'mesa_jantar') size = { width: device.width ?? 1.2, depth: 0.8, height: 0.75, color: '#a16207' };
      return { z: size.height / 2, ...size, isEsquadria: false };
    }

    // Altura inteligente Z de fixação (prioriza peitoril/altura do usuário)
    let z = 1.10; // altura média padrão
    if (device.peitoril !== undefined) {
      z = device.peitoril;
    } else {
      if (type === 'maquina_lavar') {
        z = 0.00;
      } else if (type === 'tue_chuveiro' || type === 'tue_ar' || type === 'sconce' || type === 'cftv_camera') {
        z = 2.20;
      } else if (type.includes('baixa') || type === 'tomada_10a_nbr') {
        z = 0.30;
      } else if (type.includes('alta') || type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent' || type === 'box_octogonal' || type === 'sensor_presenca' || type === 'sensor_fumaca') {
        z = 2.80; // teto
      } else if (type === 'qdc' || type === 'qgbt') {
        z = 1.50;
      } else if (type === 'poste') {
        z = 1.60;
      } else if (type === 'ground_rod' || type === 'aterramento') {
        z = -1.20;
      }
    }

    let size = { width: 0.08, depth: 0.05, height: 0.12, color: '#ffffff' };

    if (type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent' || type === 'box_octogonal') {
      size = { width: 0.20, depth: 0.20, height: 0.04, color: '#fef08a' };
    } else if (type === 'qdc' || type === 'qgbt') {
      size = { width: 0.40, depth: 0.12, height: 0.50, color: '#475569' };
    } else if (type === 'poste') {
      size = { width: 0.12, depth: 0.12, height: 3.20, color: '#64748b' };
    } else if (type === 'box_4x2' || type === 'box_4x4') {
      size = { width: 0.10, depth: 0.08, height: 0.10, color: '#eab308' }; // caixas amarelas
    } else if (type === 'cftv_camera') {
      size = { width: 0.12, depth: 0.12, height: 0.10, color: '#1e293b' };
    } else if (type === 'sensor_presenca' || type === 'sensor_fumaca') {
      size = { width: 0.14, depth: 0.14, height: 0.04, color: '#ffffff' };
    } else if (type === 'central_alarme') {
      size = { width: 0.20, depth: 0.06, height: 0.15, color: '#cbd5e1' };
    } else if (type === 'maquina_lavar') {
      size = { width: 0.60, depth: 0.60, height: 0.85, color: '#f8fafc' };
    } else if (type === 'ground_rod' || type === 'aterramento') {
      size = { width: 0.02, depth: 0.02, height: 2.4, color: '#b45309' };
    } else if (type === 'device_dr' || type === 'dr' || type === 'idr' || type === 'dps') {
      size = { width: 0.08, depth: 0.05, height: 0.12, color: '#e2e8f0' };
    }

    return { z: z + size.height / 2, ...size, isEsquadria: false };
  };

  const { z: computedZ, width, depth, height, color } = getZCoordAndHeight();

  // Sombreado de constantes para que o switch/ifs original rode na origem se isInner for true
  const z = isInner ? 0 : computedZ;
  const rotationRad = isInner ? 0 : computedRotationRad;

  // Lógica para detectar se o dispositivo é montado em parede
  // Se for parede, calculamos a espessura da parede mais próxima para aplicar o yOffset de faceamento
  const isWallMounted = !type.startsWith('door') && 
                        type !== 'window' && 
                        type !== 'stairs' && 
                        type !== 'poste' && 
                        type !== 'motor' && 
                        type !== 'bomba_agua' && 
                        type !== 'gerador' && 
                        type !== 'nobreak' && 
                        type !== 'maquina_lavar' && 
                        type !== 'ground_rod' && 
                        type !== 'aterramento' && 
                        !type.includes('light') && 
                        type !== 'lampada' && 
                        type !== 'fluorescent' && 
                        type !== 'box_octogonal';

  const wallThickness = useMemo(() => {
    return getClosestWallThickness(deviceProp.x, deviceProp.y, walls);
  }, [deviceProp.x, deviceProp.y, walls]);

  const yOffset = useMemo(() => {
    if (!isWallMounted) return 0;
    if (type === 'qdc' || type === 'qgbt') {
      return wallThickness / 2;
    }
    if (type === 'box_4x2' || type === 'box_4x4') {
      return wallThickness / 2 - depth / 2 + 0.002;
    }
    return wallThickness / 2 + 0.002;
  }, [isWallMounted, type, wallThickness, depth]);

  // Lógica do Wrapper Pai (isInner === false)
  if (!isInner) {
    const isSelected = selectedDeviceId === deviceProp.id;
    const groupRef = useRef<THREE.Group>(null);
    const transformRef = useRef<any>(null);

    // Projetar portas, janelas e vãos livres na parede correspondente (auto-snap)
    const isEsquadria = type.startsWith('door') || type === 'window' || type === 'open_van';
    
    let renderX = deviceProp.x;
    let renderY = -deviceProp.y;
    let renderRotation = computedRotationRad;

    if (isEsquadria && walls && walls.length > 0) {
      let closestWall = null;
      let minDistance = Infinity;
      let projPoint = { x: deviceProp.x, y: deviceProp.y };

      for (const wall of walls) {
        const L = Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(wall.p2.y - wall.p1.y, 2));
        if (L === 0) continue;
        const dx = (wall.p2.x - wall.p1.x) / L;
        const dy = (wall.p2.y - wall.p1.y) / L;
        const wallAngle = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x) * (180 / Math.PI);

        let angleDiff = Math.abs((deviceProp.rotation - wallAngle) % 180);
        if (angleDiff > 90) angleDiff = 180 - angleDiff;
        if (angleDiff > 25) continue; // Só considera se estiver relativamente paralela

        const toDevX = deviceProp.x - wall.p1.x;
        const toDevY = deviceProp.y - wall.p1.y;
        const t = toDevX * dx + toDevY * dy;
        const projX = wall.p1.x + t * dx;
        const projY = wall.p1.y + t * dy;
        const dist = Math.sqrt(Math.pow(deviceProp.x - projX, 2) + Math.pow(deviceProp.y - projY, 2));

        if (dist < wall.thickness * 1.5 && t >= -0.1 && t <= L + 0.1) {
          if (dist < minDistance) {
            minDistance = dist;
            closestWall = wall;
            projPoint = { x: projX, y: projY };
          }
        }
      }

      if (closestWall) {
        renderX = projPoint.x;
        renderY = -projPoint.y;

        const p1y = -closestWall.p1.y;
        const p2y = -closestWall.p2.y;
        const wallAngle3D = Math.atan2(p2y - p1y, closestWall.p2.x - closestWall.p1.x);

        const diff1 = Math.abs((computedRotationRad - wallAngle3D) % (Math.PI * 2));
        const diff1Norm = diff1 > Math.PI ? Math.PI * 2 - diff1 : diff1;

        const angleAlternative = wallAngle3D + Math.PI;
        const diff2 = Math.abs((computedRotationRad - angleAlternative) % (Math.PI * 2));
        const diff2Norm = diff2 > Math.PI ? Math.PI * 2 - diff2 : diff2;

        renderRotation = diff1Norm < diff2Norm ? wallAngle3D : angleAlternative;
      }
    }

    const handleTransform = () => {
      if (!groupRef.current) return;
      const { x, y, z: curZ } = groupRef.current.position;
      const newPeitoril = curZ - height / 2;

      updateDeviceProperties(deviceProp.id, {
        x: Number(x.toFixed(3)),
        y: Number((-y).toFixed(3)), // Reinverte para a coordenada Y do CAD 2D
        peitoril: Number(newPeitoril.toFixed(3))
      });
    };

    useEffect(() => {
      if (!transformRef.current) return;
      const controls = transformRef.current;
      const callback = (e: any) => {
        useCadStore.getState().setOrbitControlsEnabled(!e.value);
      };
      controls.addEventListener('dragging-changed', callback);
      return () => controls.removeEventListener('dragging-changed', callback);
    }, [isSelected]);

    const handleSelect = (e: any) => {
      e.stopPropagation();
      useCadStore.getState().setSelectedDeviceId(deviceProp.id);
    };

    // Caixa aramada amarela de destaque de seleção
    const selectionBox = (() => {
      if (!isSelected) return null;

      let boxW = width + 0.01;
      let boxD = depth + 0.01;
      let boxH = height + 0.01;
      let boxX = 0;
      let boxY = yOffset;
      let boxZ = 0;

      if (type.startsWith('door')) {
        const isGiro = type === 'door' || type === 'door_pivotante';
        if (isGiro) {
          boxW = width + 0.01;
          boxD = 0.16 + 0.01;
          boxH = height + 0.01;
          boxX = width / 2;
          boxY = 0;
          boxZ = 0;
        } else {
          boxW = width + 0.01;
          boxD = 0.16 + 0.01;
          boxH = height + 0.01;
          boxX = 0;
          boxY = 0;
          boxZ = 0;
        }
      } else if (type === 'window') {
        boxW = width + 0.01;
        boxD = 0.16 + 0.01;
        boxH = height + 0.01;
        boxX = 0;
        boxY = 0;
        boxZ = 0;
      } else if (type === 'tue_chuveiro') {
        boxW = 1.6;
        boxD = 1.0;
        boxH = 2.2;
        boxX = 0.4;
        boxY = -0.4;
        boxZ = 1.0 - computedZ;
      } else if (type === 'torneira_eletrica') {
        boxW = 1.25;
        boxD = 0.65;
        boxH = 1.05;
        boxX = 0;
        boxY = -0.3;
        boxZ = 0.4 - computedZ;
      } else if (type === 'maquina_lavar') {
        boxW = 1.25;
        boxD = 0.65;
        boxH = 0.95;
        boxX = 0.325;
        boxY = 0;
        boxZ = 0.425 - computedZ;
      }

      return (
        <mesh position={[boxX, boxY, boxZ]}>
          <boxGeometry args={[boxW, boxD, boxH]} />
          <meshBasicMaterial
            color="#eab308"
            wireframe={true}
            transparent={true}
            opacity={0.85}
          />
        </mesh>
      );
    })();

    if (isSelected && shadingMode !== 'wireframe') {
      return (
        <TransformControls
          ref={transformRef}
          mode="translate"
          onObjectChange={handleTransform}
        >
          <group
            ref={groupRef}
            name={deviceProp.id}
            position={[renderX, renderY, computedZ]} // Usa posição projetada
            rotation={[0, 0, renderRotation]} // Usa rotação projetada
            onClick={handleSelect}
          >
            <Device3D device={deviceProp} isInner={true} />
            {selectionBox}
          </group>
        </TransformControls>
      );
    }

    return (
      <group
        ref={groupRef}
        name={deviceProp.id}
        position={[renderX, renderY, computedZ]} // Usa posição projetada
        rotation={[0, 0, renderRotation]} // Usa rotação projetada
        onClick={handleSelect}
      >
        <Device3D device={deviceProp} isInner={true} />
        {selectionBox}
      </group>
    );
  }

  // Propriedades comuns de material para os dispositivos de acabamento (sólidos e opacos)
  // Conforme solicitação, aparecem sólidos tanto em modo "sólido" quanto em "raio-X" (transparente).
  // Apenas em modo "arame" (wireframe) ficam em arame.
  const matProps = {
    wireframe: shadingMode === 'wireframe',
    transparent: false,
    opacity: 1.0,
    clippingPlanes: clippingPlanes,
  };

  // 1. Desenhar portas realistas e fechadas
  if (type.startsWith('door')) {
    const portalThickness = 0.03;
    const frameDepth = 0.16; // batente cobrindo a parede
    const isGiro = type === 'door' || type === 'door_pivotante';

    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group scale={[isGiro && device.flip ? -1 : 1, 1, 1]}>
          {/* Batente Esquerdo */}
          <mesh position={[isGiro ? portalThickness / 2 : -width / 2 + portalThickness / 2, 0, 0]}>
            <boxGeometry args={[portalThickness, frameDepth, height]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} {...matProps} />
          </mesh>
          {/* Batente Direito */}
          <mesh position={[isGiro ? width - portalThickness / 2 : width / 2 - portalThickness / 2, 0, 0]}>
            <boxGeometry args={[portalThickness, frameDepth, height]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} {...matProps} />
          </mesh>
          {/* Batente Superior */}
          <mesh position={[isGiro ? width / 2 : 0, 0, height / 2 - portalThickness / 2]}>
            <boxGeometry args={[width, frameDepth, portalThickness]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} {...matProps} />
          </mesh>

          {/* Folha da porta - FECHADA */}
          <mesh position={[isGiro ? width / 2 : 0, 0, 0]}>
            <boxGeometry args={[width - portalThickness * 2, depth, height - portalThickness]} />
            <meshStandardMaterial color="#a16207" roughness={0.6} {...matProps} />
          </mesh>

          {/* Maçaneta Metálica */}
          {isGiro && (
            <group position={[width - 0.10, 0, 0]}>
              {/* Haste interna */}
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.08, 8]} />
                <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Maçaneta externa */}
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.02, 0.015, 0.12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Maçaneta interna */}
              <mesh position={[0, -0.04, 0]}>
                <boxGeometry args={[0.02, 0.015, 0.12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    );
  }

  // 2. Desenhar janelas realistas (moldura branca, vidros duplos translúcidos)
  if (type === 'window') {
    const frameThickness = 0.04;
    const frameDepth = 0.16;
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Moldura Superior */}
        <mesh position={[0, 0, height / 2 - frameThickness / 2]}>
          <boxGeometry args={[width, frameDepth, frameThickness]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} {...matProps} />
        </mesh>
        {/* Moldura Inferior */}
        <mesh position={[0, 0, -height / 2 + frameThickness / 2]}>
          <boxGeometry args={[width, frameDepth, frameThickness]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} {...matProps} />
        </mesh>
        {/* Moldura Esquerda */}
        <mesh position={[-width / 2 + frameThickness / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, frameDepth, height - frameThickness * 2]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} {...matProps} />
        </mesh>
        {/* Moldura Direita */}
        <mesh position={[width / 2 - frameThickness / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, frameDepth, height - frameThickness * 2]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} {...matProps} />
        </mesh>
        {/* Montante central */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[frameThickness, frameDepth, height - frameThickness * 2]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} {...matProps} />
        </mesh>

        {/* Vidro Duplo Translúcido */}
        <mesh position={[-width / 4, 0, 0]}>
          <boxGeometry args={[width / 2 - frameThickness, 0.02, height - frameThickness * 2]} />
          <meshStandardMaterial color="#a5f3fc" transparent={true} opacity={0.4} roughness={0.05} metalness={0.9} clippingPlanes={clippingPlanes} />
        </mesh>
        <mesh position={[width / 4, 0, 0]}>
          <boxGeometry args={[width / 2 - frameThickness, 0.02, height - frameThickness * 2]} />
          <meshStandardMaterial color="#a5f3fc" transparent={true} opacity={0.4} roughness={0.05} metalness={0.9} clippingPlanes={clippingPlanes} />
        </mesh>
      </group>
    );
  }

  // 3. Desenhar Chuveiro Elétrico (`tue_chuveiro`) com Box de Vidro e Gabinete/Pia
  if (type === 'tue_chuveiro') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}> {/* Faceamento dinâmico na parede */}
          {/* Tubo Cromado horizontal */}
          <mesh position={[0, -0.18, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.36, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.05} {...matProps} />
          </mesh>
          {/* Corpo/Espalhador do Chuveiro (Moderno) */}
          <mesh position={[0, -0.36, 0.04]}>
            <boxGeometry args={[0.22, 0.22, 0.04]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} {...matProps} />
          </mesh>
          {/* Detalhe frontal cromado do chuveiro */}
          <mesh position={[0, -0.36, 0.06]}>
            <boxGeometry args={[0.18, 0.02, 0.01]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Queda de água 3D */}
          <group position={[0, -0.36, -0.1]}>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i * Math.PI * 2) / 8;
              const r = 0.06;
              const xPos = Math.cos(angle) * r;
              const yPos = Math.sin(angle) * r;
              return (
                <mesh key={i} position={[xPos, yPos, -1.0]} rotation={[0, 0, 0]}>
                  <cylinderGeometry args={[0.003, 0.003, 2.0, 4]} />
                  <meshStandardMaterial color="#a5f3fc" transparent={true} opacity={0.6} />
                </mesh>
              );
            })}
          </group>
          {/* Detalhe de acabamento na parede */}
          <mesh position={[0, -0.002, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.005, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} {...matProps} />
          </mesh>

          {/* Box de Banheiro (Vidro temperado + Perfil Preto) */}
          <group position={[0, -0.4, -2.2 + 1.0]}>
            {/* Vidro Frontal do Box */}
            <mesh position={[0, -0.4, 0]}>
              <boxGeometry args={[0.9, 0.01, 2.0]} />
              <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.3} metalness={0.9} roughness={0.05} />
            </mesh>
            {/* Vidro Lateral do Box */}
            <mesh position={[-0.45, 0, 0]}>
              <boxGeometry args={[0.01, 0.8, 2.0]} />
              <meshStandardMaterial color="#bae6fd" transparent={true} opacity={0.3} metalness={0.9} roughness={0.05} />
            </mesh>
            {/* Perfis pretos da moldura */}
            <mesh position={[0, -0.4, 1.0]}>
              <boxGeometry args={[0.92, 0.03, 0.03]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[-0.45, -0.4, 0]}>
              <boxGeometry args={[0.03, 0.03, 2.0]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0.45, -0.4, 0]}>
              <boxGeometry args={[0.03, 0.03, 2.0]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </group>

          {/* Gabinete de Banheiro com Pia ao lado do Box */}
          <group position={[0.8, -0.4, -2.2 + 0.4]}>
            {/* Gabinete de Madeira */}
            <mesh>
              <boxGeometry args={[0.6, 0.5, 0.8]} />
              <meshStandardMaterial color="#a16207" roughness={0.7} />
            </mesh>
            {/* Pia branca embutida */}
            <mesh position={[0, 0, 0.41]}>
              <boxGeometry args={[0.62, 0.52, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.1} />
            </mesh>
            {/* Cuba da pia */}
            <mesh position={[0, 0, 0.42]}>
              <boxGeometry args={[0.35, 0.25, 0.01]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.2} />
            </mesh>
            {/* Torneira cromada */}
            <mesh position={[0, 0.15, 0.48]} rotation={[0.2, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.1, 8]} />
              <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        </group>
      </group>
    );
  }

  // 4. Desenhar Torneira Elétrica (`torneira_eletrica`) com Bancada de Cozinha e Gabinete
  if (type === 'torneira_eletrica') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}>
          {/* Corpo da torneira (aquecedor branco) */}
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} {...matProps} />
          </mesh>
          {/* Bica curvada cromada */}
          <mesh position={[0, -0.10, 0.04]} rotation={[Math.PI / 6, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
            <meshStandardMaterial color="#d1d5db" metalness={0.95} roughness={0.05} {...matProps} />
          </mesh>
          {/* Registro lateral */}
          <mesh position={[0.042, -0.04, -0.02]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.015, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} {...matProps} />
          </mesh>

          {/* Bancada de Granito Escura, Pia e Gabinete de Cozinha */}
          <group position={[0, -0.3, -0.2]}>
            {/* Bancada de Granito Preto */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1.2, 0.6, 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.3} />
            </mesh>
            {/* Cuba de Inox da Pia */}
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[0.5, 0.4, 0.03]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Gabinete de Cozinha em Madeira (abaixo da bancada) */}
            <mesh position={[0, 0.02, -0.45]}>
              <boxGeometry args={[1.16, 0.56, 0.86]} />
              <meshStandardMaterial color="#7c2d12" roughness={0.8} />
            </mesh>
            {/* Puxadores de Metal */}
            <mesh position={[-0.2, -0.27, -0.3]}>
              <boxGeometry args={[0.1, 0.02, 0.01]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
            <mesh position={[0.2, -0.27, -0.3]}>
              <boxGeometry args={[0.1, 0.02, 0.01]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>
        </group>
      </group>
    );
  }

  // 5. Desenhar Máquina de Lavar (`maquina_lavar`) com Tanque de Lavanderia ao lado
  if (type === 'maquina_lavar') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Máquina de Lavar (Gabinete principal) */}
        <mesh position={[0, 0, 0.425]}>
          <boxGeometry args={[0.60, 0.60, 0.85]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} {...matProps} />
        </mesh>
        {/* Painel superior inclinado cinza */}
        <mesh position={[0, 0.02, 0.825]} rotation={[-0.25, 0, 0]}>
          <boxGeometry args={[0.58, 0.15, 0.06]} />
          <meshStandardMaterial color="#334155" roughness={0.6} {...matProps} />
        </mesh>
        {/* Porta frontal circular escura (vidro) */}
        <mesh position={[0, -0.301, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.01, 24]} />
          <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.1} {...matProps} />
        </mesh>
        {/* Moldura da porta circular */}
        <mesh position={[0, -0.302, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.012, 8, 24]} />
          <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.1} {...matProps} />
        </mesh>

        {/* Tanque de Lavar Roupas de Louça Branca ao lado (Direito) */}
        <group position={[0.65, 0, 0]}>
          {/* Gabinete de lavanderia inferior */}
          <mesh position={[0, 0, 0.4]}>
            <boxGeometry args={[0.55, 0.55, 0.8]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          {/* Cuba do Tanque de Louça Branca */}
          <mesh position={[0, 0, 0.825]}>
            <boxGeometry args={[0.58, 0.58, 0.05]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} />
          </mesh>
          {/* Interior cavidade do tanque */}
          <mesh position={[0, 0, 0.84]}>
            <boxGeometry args={[0.48, 0.44, 0.02]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} />
          </mesh>
          {/* Torneira de metal simples do tanque */}
          <mesh position={[0, 0.22, 0.94]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
        </group>
      </group>
    );
  }

  // 6. Desenhar Tomadas Residenciais (`tug_baixa`, `tug_media`, `tug_alta`, `tomada_10a_nbr`, `tomada_20a`, `tomada_220`)
  if (type.startsWith('tug_') || type.startsWith('tomada_') || type === 'tomada_220') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}>
          {/* Placa plástica branca (espelho) */}
          <mesh position={[0, -0.005, 0]}>
            <boxGeometry args={[0.08, 0.01, 0.12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} {...matProps} />
          </mesh>
          {/* Módulo interno cinza claro */}
          <mesh position={[0, -0.009, 0]}>
            <boxGeometry args={[0.03, 0.005, 0.05]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} {...matProps} />
          </mesh>
          {/* 3 Furos do padrão brasileiro */}
          <mesh position={[0, -0.012, 0.012]}>
            <cylinderGeometry args={[0.002, 0.002, 0.002, 8]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, -0.012, -0.012]}>
            <cylinderGeometry args={[0.002, 0.002, 0.002, 8]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.006, -0.012, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.002, 8]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>
      </group>
    );
  }

  // 7. Desenhar Interruptores Residenciais com Placa de Acabamento e Tecla Saliente
  if (type.startsWith('switch_') || type.startsWith('interruptor') || type === 'dimmer') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}>
          {/* Placa plástica branca */}
          <mesh position={[0, -0.005, 0]}>
            <boxGeometry args={[0.08, 0.01, 0.12]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} {...matProps} />
          </mesh>
          {/* Tecla central inclinado */}
          <mesh position={[0, -0.011, 0]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.03, 0.005, 0.05]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} {...matProps} />
          </mesh>
        </group>
      </group>
    );
  }

  // 8. Câmera de Segurança Dome CFTV
  if (type === 'cftv_camera') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}>
          {/* Base */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
            <meshStandardMaterial color="#475569" {...matProps} />
          </mesh>
          {/* Cúpula escura */}
          <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.04, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} {...matProps} />
          </mesh>
          {/* Lente */}
          <mesh position={[0, -0.04, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.01, 8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
      </group>
    );
  }

  // 9. Sensores de Fumaça ou de Presença
  if (type === 'sensor_presenca' || type === 'sensor_fumaca') {
    const isCeiling = device.peitoril === undefined || device.peitoril >= 2.70;
    return (
      <group position={[device.x, device.y, z]} rotation={isCeiling ? undefined : [0, 0, rotationRad]}>
        <group position={isCeiling ? [0, 0, 0] : [0, yOffset, 0]}>
          <mesh rotation={isCeiling ? undefined : [Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} {...matProps} />
          </mesh>
          {/* LED indicador de atividade */}
          <mesh position={isCeiling ? [0.03, 0, 0.016] : [0.03, -0.016, 0]}>
            <sphereGeometry args={[0.006, 8, 8]} />
            <meshBasicMaterial color={type === 'sensor_presenca' ? '#22c55e' : '#ef4444'} />
          </mesh>
        </group>
      </group>
    );
  }

  // 10. Central de Alarme
  if (type === 'central_alarme') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}>
          {/* Painel plástico cinza */}
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[0.20, 0.04, 0.15]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} {...matProps} />
          </mesh>
          {/* Visor LCD azul */}
          <mesh position={[0, -0.041, 0.03]}>
            <boxGeometry args={[0.12, 0.002, 0.04]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
          {/* Teclado numérico */}
          <mesh position={[0, -0.041, -0.03]}>
            <boxGeometry args={[0.14, 0.002, 0.05]} />
            <meshStandardMaterial color="#475569" roughness={0.9} {...matProps} />
          </mesh>
        </group>
      </group>
    );
  }

  // 11. Poste de Entrada de Concessionária ( Bengala + Roldanas + Caixa )
  if (type === 'poste') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Poste de Concreto Cinza */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.14, 0.14, 3.2]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} {...matProps} />
        </mesh>
        {/* Bengala Metálica */}
        <group position={[0.09, 0, 0.2]}>
          <mesh position={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} {...matProps} />
          </mesh>
          <mesh position={[-0.05, 0, 1.6]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} {...matProps} />
          </mesh>
        </group>
        {/* Roldanas de Porcelana Isoladoras */}
        <group position={[0.15, 0, 1.4]}>
          <mesh position={[-0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
          {[-0.15, 0, 0.15].map((offsetZ, i) => (
            <mesh key={i} position={[0, 0, offsetZ]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.3} />
            </mesh>
          ))}
        </group>
        {/* Caixa de Medição de Energia do Padrão */}
        <group position={[0.12, 0, -0.2]}>
          <mesh>
            <boxGeometry args={[0.14, 0.32, 0.42]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.3} {...matProps} />
          </mesh>
          {/* Visor de Vidro */}
          <mesh position={[0.075, 0, 0.05]}>
            <boxGeometry args={[0.005, 0.22, 0.26]} />
            <meshStandardMaterial color="#a5f3fc" transparent={true} opacity={0.6} />
          </mesh>
          {/* Medidor Interno */}
          <mesh position={[0.04, 0, 0.05]}>
            <boxGeometry args={[0.04, 0.12, 0.12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Disjuntor Geral */}
          <mesh position={[0.04, 0, -0.08]}>
            <boxGeometry args={[0.03, 0.08, 0.08]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
        </group>
      </group>
    );
  }

  // 12. Ponto de Luz no Teto
  if (type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent') {
    return (
      <group position={[device.x, device.y, z]}>
        {/* Luminária */}
        <mesh>
          <boxGeometry args={[width, depth, height]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} {...matProps} />
        </mesh>
        {/* Lâmpada brilhante */}
        <mesh position={[0, 0, -0.015]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>
    );
  }

  // 13. Quadro de Distribuição de Circuitos (QDC) Hiper-Realista
  if (type === 'qdc' || type === 'qgbt') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}> {/* Faceamento dinâmico na parede */}
          {/* Caixa Embutida Traseira (preta) */}
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[0.38, 0.08, 0.48]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} {...matProps} />
          </mesh>

          {/* Tampa / Moldura Externa Branca */}
          <mesh position={[0, 0.002, 0]}>
            <boxGeometry args={[0.42, 0.01, 0.52]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} {...matProps} />
          </mesh>

          {/* Fundo do Quadro Interno onde ficam os trilhos */}
          <mesh position={[0, -0.03, 0]}>
            <boxGeometry args={[0.34, 0.01, 0.44]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
          </mesh>

          {/* Trilho DIN Metálico superior */}
          <mesh position={[0, -0.025, 0.10]}>
            <boxGeometry args={[0.30, 0.01, 0.025]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Trilho DIN Metálico inferior */}
          <mesh position={[0, -0.025, -0.10]}>
            <boxGeometry args={[0.30, 0.01, 0.025]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </mesh>

          {/* DISPOSITIVOS INTERNOS NO TRILHO SUPERIOR */}
          <group position={[0, -0.015, 0.10]}>
            {/* Disjuntor Geral (Bipolar/Tripolar) - Preto */}
            <mesh position={[-0.10, 0, 0]}>
              <boxGeometry args={[0.05, 0.03, 0.08]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </mesh>
            {/* Alavanca Geral - Laranja */}
            <mesh position={[-0.10, 0.016, 0]}>
              <boxGeometry args={[0.01, 0.01, 0.02]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>

            {/* Disjuntor DR - Cinza com Botão de Teste Vermelho */}
            <mesh position={[-0.04, 0, 0]}>
              <boxGeometry args={[0.06, 0.03, 0.08]} />
              <meshStandardMaterial color="#64748b" roughness={0.4} />
            </mesh>
            {/* Botão de Teste DR - Vermelho */}
            <mesh position={[-0.05, 0.016, 0.02]}>
              <boxGeometry args={[0.012, 0.005, 0.012]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>

            {/* DPS (Dispositivos de Proteção contra Surtos) - Verdes */}
            <mesh position={[0.02, 0, 0]}>
              <boxGeometry args={[0.03, 0.03, 0.08]} />
              <meshStandardMaterial color="#22c55e" roughness={0.4} />
            </mesh>
            <mesh position={[0.05, 0, 0]}>
              <boxGeometry args={[0.03, 0.03, 0.08]} />
              <meshStandardMaterial color="#22c55e" roughness={0.4} />
            </mesh>
          </group>

          {/* DISPOSITIVOS INTERNOS NO TRILHO INFERIOR (Disjuntores Termomagnéticos Mono/Bipolares) */}
          <group position={[0, -0.015, -0.10]}>
            {/* Disjuntor 1 (Iluminação) - Branco com alavanca preta */}
            <mesh position={[-0.10, 0, 0]}>
              <boxGeometry args={[0.025, 0.03, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
            </mesh>
            <mesh position={[-0.10, 0.016, 0]}>
              <boxGeometry args={[0.006, 0.01, 0.015]} />
              <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Disjuntor 2 (Tomadas) - Branco */}
            <mesh position={[-0.07, 0, 0]}>
              <boxGeometry args={[0.025, 0.03, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
            </mesh>
            <mesh position={[-0.07, 0.016, 0]}>
              <boxGeometry args={[0.006, 0.01, 0.015]} />
              <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Disjuntor 3 (Chuveiro) - Preto */}
            <mesh position={[-0.03, 0, 0]}>
              <boxGeometry args={[0.04, 0.03, 0.08]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </mesh>
            <mesh position={[-0.03, 0.016, 0]}>
              <boxGeometry args={[0.01, 0.01, 0.015]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>

            {/* Outros mini disjuntores de reserva */}
            <mesh position={[0.02, 0, 0]}>
              <boxGeometry args={[0.025, 0.03, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.3} opacity={0.6} transparent={true} />
            </mesh>
            <mesh position={[0.05, 0, 0]}>
              <boxGeometry args={[0.025, 0.03, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.3} opacity={0.6} transparent={true} />
            </mesh>
          </group>

          {/* BARRAMENTOS LATERAIS */}
          {/* Barramento de Neutro */}
          <group position={[-0.13, -0.025, 0]}>
            <mesh>
              <boxGeometry args={[0.015, 0.01, 0.12]} />
              <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.005, 0]}>
              <boxGeometry args={[0.02, 0.01, 0.14]} />
              <meshBasicMaterial color="#2563eb" />
            </mesh>
          </group>

          {/* Barramento de Terra */}
          <group position={[0.13, -0.025, 0]}>
            <mesh>
              <boxGeometry args={[0.015, 0.01, 0.12]} />
              <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.005, 0]}>
              <boxGeometry args={[0.02, 0.01, 0.14]} />
              <meshBasicMaterial color="#16a34a" />
            </mesh>
          </group>

          {/* Porta de Acrílico Fumê Translúcida (Aberta) */}
          <group position={[-0.17, 0.008, 0]} rotation={[0, -0.6, 0]}>
            <mesh position={[0.17, 0.002, 0]}>
              <boxGeometry args={[0.34, 0.006, 0.44]} />
              <meshStandardMaterial
                color="#0f172a"
                transparent={true}
                opacity={0.4}
                roughness={0.1}
                metalness={0.9}
                clippingPlanes={clippingPlanes}
              />
            </mesh>
            <mesh position={[0.33, 0.005, 0]}>
              <boxGeometry args={[0.02, 0.008, 0.04]} />
              <meshStandardMaterial color="#d1d5db" metalness={0.9} />
            </mesh>
          </group>
        </group>
      </group>
    );
  }

  // Haste de aterramento
  if (type === 'ground_rod' || type === 'aterramento') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Caixa de inspeção de aterramento no chão */}
        <mesh position={[0, 0, 0.02]}>
          <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
          <meshStandardMaterial color="#475569" roughness={0.9} {...matProps} />
        </mesh>
        {/* Tampa da caixa de inspeção */}
        <mesh position={[0, 0, 0.042]}>
          <cylinderGeometry args={[0.09, 0.09, 0.005, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        {/* Haste de cobre descendo */}
        <mesh position={[0, 0, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 2.4, 8]} />
          <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.2} {...matProps} />
        </mesh>
      </group>
    );
  }

  // Módulos DR e DPS
  if (type === 'device_dr' || type === 'dr' || type === 'idr' || type === 'dps') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group position={[0, yOffset, 0]}>
          {/* Caixa do dispositivo */}
          <mesh>
            <boxGeometry args={[width, depth, height]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} {...matProps} />
          </mesh>
          {/* Alavanca de acionamento (preta/laranja) */}
          <mesh position={[0.01, -depth/2 - 0.002, 0]}>
            <boxGeometry args={[0.015, 0.01, 0.03]} />
            <meshStandardMaterial color={type === 'dps' ? '#ef4444' : '#f97316'} />
          </mesh>
          {/* Botão de teste para DR */}
          {(type === 'device_dr' || type === 'dr' || type === 'idr') && (
            <mesh position={[-0.02, -depth/2 - 0.002, 0.02]}>
              <boxGeometry args={[0.01, 0.005, 0.01]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          )}
          {/* Indicador de estado para DPS */}
          {type === 'dps' && (
            <mesh position={[-0.02, -depth/2 - 0.002, 0.02]}>
              <boxGeometry args={[0.015, 0.005, 0.015]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          )}
        </group>
      </group>
    );
  }

  // 14. Mobiliário: Sofá Residencial
  if (type === 'sofa') {
    const sofaW = width;
    const sofaH = height;
    const sofaD = depth;
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Assento Principal */}
        <mesh position={[0, 0, -sofaH * 0.15]}>
          <boxGeometry args={[sofaW * 0.8, sofaD * 0.8, sofaH * 0.4]} />
          <meshStandardMaterial color="#475569" roughness={0.9} {...matProps} />
        </mesh>
        {/* Encosto Traseiro */}
        <mesh position={[0, sofaD * 0.35, sofaH * 0.15]}>
          <boxGeometry args={[sofaW * 0.8, sofaD * 0.2, sofaH * 0.7]} />
          <meshStandardMaterial color="#475569" roughness={0.9} {...matProps} />
        </mesh>
        {/* Braço Esquerdo */}
        <mesh position={[-sofaW * 0.45, 0, 0]}>
          <boxGeometry args={[sofaW * 0.1, sofaD * 0.9, sofaH * 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.9} {...matProps} />
        </mesh>
        {/* Braço Direito */}
        <mesh position={[sofaW * 0.45, 0, 0]}>
          <boxGeometry args={[sofaW * 0.1, sofaD * 0.9, sofaH * 0.7]} />
          <meshStandardMaterial color="#334155" roughness={0.9} {...matProps} />
        </mesh>
      </group>
    );
  }

  // 15. Mobiliário: Geladeira
  if (type === 'geladeira') {
    const gelW = width;
    const gelD = depth;
    const gelH = height;
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Corpo principal */}
        <mesh>
          <boxGeometry args={[gelW, gelD, gelH]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} {...matProps} />
        </mesh>
        {/* Porta superior (freezer) */}
        <mesh position={[0, -gelD * 0.505, gelH * 0.25]}>
          <boxGeometry args={[gelW * 0.98, 0.01, gelH * 0.4]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.15} {...matProps} />
        </mesh>
        {/* Porta inferior (refrigerador) */}
        <mesh position={[0, -gelD * 0.505, -gelH * 0.2]}>
          <boxGeometry args={[gelW * 0.98, 0.01, gelH * 0.5]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.15} {...matProps} />
        </mesh>
        {/* Puxador */}
        <mesh position={[-gelW * 0.4, -gelD * 0.52, gelH * 0.05]}>
          <boxGeometry args={[0.02, 0.02, 0.3]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Painel Display */}
        <mesh position={[0, -gelD * 0.51, gelH * 0.28]}>
          <boxGeometry args={[0.15, 0.005, 0.12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>
      </group>
    );
  }

  // 16. Mobiliário: Fogão
  if (type === 'fogao') {
    const fogW = width;
    const fogD = depth;
    const fogH = height;
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Corpo */}
        <mesh>
          <boxGeometry args={[fogW, fogD, fogH]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} {...matProps} />
        </mesh>
        {/* Mesa de Vidro */}
        <mesh position={[0, 0, fogH * 0.505]}>
          <boxGeometry args={[fogW * 0.98, fogD * 0.98, 0.01]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} {...matProps} />
        </mesh>
        {/* Bocas do fogão */}
        {[-fogW * 0.22, fogW * 0.22].map((bx, i) => (
          <group key={i}>
            <mesh position={[bx, -fogD * 0.2, fogH * 0.51]}>
              <cylinderGeometry args={[0.04, 0.04, 0.01, 12]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
            <mesh position={[bx, fogD * 0.2, fogH * 0.51]}>
              <cylinderGeometry args={[0.04, 0.04, 0.01, 12]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* Porta do forno */}
        <mesh position={[0, -fogD * 0.505, -fogH * 0.1]}>
          <boxGeometry args={[fogW * 0.88, 0.01, fogH * 0.5]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} {...matProps} />
        </mesh>
        {/* Puxador do Forno */}
        <mesh position={[0, -fogD * 0.53, fogH * 0.12]}>
          <boxGeometry args={[fogW * 0.7, 0.02, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
      </group>
    );
  }

  // 17. Mobiliário: Cama de Casal
  if (type === 'cama') {
    const camaW = width;
    const camaD = depth;
    const camaH = height;
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Colchão */}
        <mesh position={[0, 0, camaH * 0.1]}>
          <boxGeometry args={[camaW, camaD, camaH * 0.6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} {...matProps} />
        </mesh>
        {/* Base de madeira */}
        <mesh position={[0, 0, -camaH * 0.3]}>
          <boxGeometry args={[camaW * 0.98, camaD * 0.98, camaH * 0.4]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.8} {...matProps} />
        </mesh>
        {/* Cabeceira */}
        <mesh position={[0, camaD * 0.48, camaH * 0.6]}>
          <boxGeometry args={[camaW * 1.02, 0.06, camaH * 1.4]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.8} {...matProps} />
        </mesh>
        {/* Travesseiros */}
        <mesh position={[-camaW * 0.22, camaD * 0.35, camaH * 0.45]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[camaW * 0.35, 0.4, 0.1]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
        </mesh>
        <mesh position={[camaW * 0.22, camaD * 0.35, camaH * 0.45]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[camaW * 0.35, 0.4, 0.1]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  // 18. Mobiliário: Mesa de Jantar
  if (type === 'mesa_jantar') {
    const mesaW = width;
    const mesaD = depth;
    const mesaH = height;
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Tampo */}
        <mesh position={[0, 0, mesaH * 0.48]}>
          <boxGeometry args={[mesaW, mesaD, 0.04]} />
          <meshStandardMaterial color="#a16207" roughness={0.6} {...matProps} />
        </mesh>
        {/* Pernas */}
        {[-mesaW * 0.45, mesaW * 0.45].map((px) => (
          <group key={px}>
            <mesh position={[px, -mesaD * 0.42, 0]}>
              <cylinderGeometry args={[0.02, 0.02, mesaH - 0.04, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[px, mesaD * 0.42, 0]}>
              <cylinderGeometry args={[0.02, 0.02, mesaH - 0.04, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  // Fallback genérico para outros dispositivos
  return (
    <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
      <group position={[0, yOffset, 0]}>
        <mesh>
          <boxGeometry args={[width, depth, height]} />
          <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={type === 'qdc' || type === 'qgbt' ? 0.6 : 0.1}
            {...matProps}
          />
        </mesh>
      </group>
    </group>
  );
};
