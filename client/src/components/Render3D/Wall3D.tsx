import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCadStore } from '../../store/useCadStore';
import { TextureGenerator } from '../../utils/textureGenerator';
import type { Wall } from '../../store/useCadStore';
import { RenderMode } from '../../types';
import { Edges } from '@react-three/drei';

interface Wall3DProps {
  wall: Wall;
}

export const Wall3D: React.FC<Wall3DProps> = ({ wall }) => {
  const { 
    shadingMode, 
    clippingState, 
    wallColor, 
    selectedWallId, 
    setSelectedWallId, 
    setSelectedDeviceId 
  } = useCadStore();

  const p1y = -wall.p1.y;
  const p2y = -wall.p2.y;
  const L = Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(p2y - p1y, 2));
  if (L === 0) return null;

  const dx = (wall.p2.x - wall.p1.x) / L;
  const dy = (p2y - p1y) / L;
  const angle = Math.atan2(p2y - p1y, wall.p2.x - wall.p1.x);

  // Obter vãos livres (cutouts) ordenados
  const cutouts = wall.cutouts || [];

  // Definir materiais com base nas propriedades individuais ou globais da parede
  const getMaterialProperties = () => {
    const wallCol = wall.color || wallColor || '#cbd5e1';
    const wallTex = wall.texture || 'gesso';
    
    let texture = undefined;
    if (shadingMode === 'realistic') {
      if (wallTex === 'tijolo') {
        texture = TextureGenerator.getTijolo(wallCol);
      } else if (wallTex === 'azulejo') {
        texture = TextureGenerator.getAzulejo(wallCol);
      } else if (wallTex === 'concreto') {
        texture = TextureGenerator.getConcretoAparente();
      } else if (wallTex === 'madeira') {
        texture = TextureGenerator.getWood(wallCol, '#451a03');
      } else if (wallTex === 'porcelanato') {
        texture = TextureGenerator.getPorcelanato(wallCol);
      } else {
        texture = TextureGenerator.getWallPaint(wallCol);
      }
    }

    if (wall.material === 'vidro') {
      return { color: '#93c5fd', roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.4, map: undefined };
    }

    // HIDDEN_LINE força a cor para um branco fosco padrão, sem mapas de textura
    if (renderMode === RenderMode.HIDDEN_LINE) {
      return {
        color: '#ffffff',
        roughness: 1.0,
        metalness: 0.0,
        map: undefined
      };
    }

    return {
      color: shadingMode === 'realistic' ? undefined : wallCol,
      roughness: wallTex === 'concreto' ? 0.8 : wallTex === 'porcelanato' ? 0.2 : wallTex === 'madeira' ? 0.7 : 0.6,
      metalness: wallTex === 'concreto' ? 0.15 : wallTex === 'porcelanato' ? 0.3 : 0.05,
      map: texture
    };
  };

  const matProps = getMaterialProperties();

  // Planos de corte dinâmicos (Clipping Planes)
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

  // Função genérica de clique na parede
  const handleWallClick = (e: any) => {
    e.stopPropagation();
    setSelectedWallId(wall.id);
    setSelectedDeviceId(null); // desmarca dispositivo
  };

  const isSelected = selectedWallId === wall.id;

  // 1. Calcular os segmentos cheios da parede (onde não há vãos)
  const segments: { start: number; end: number }[] = [];
  let lastPos = 0;
  cutouts.forEach(c => {
    if (c.start > lastPos + 0.01) {
      segments.push({ start: lastPos, end: c.start });
    }
    lastPos = c.end;
  });
  if (L > lastPos + 0.01) {
    segments.push({ start: lastPos, end: L });
  }
  if (segments.length === 0 && cutouts.length === 0) {
    segments.push({ start: 0, end: L });
  }

  // 2. Renderizar os blocos cheios da parede (altura completa)
  const fullWallMeshes = segments.map((seg, idx) => {
    const segL = seg.end - seg.start;
    const centerDist = seg.start + segL / 2;
    const x = wall.p1.x + centerDist * dx;
    const y = p1y + centerDist * dy;

    return (
      <group key={`full-group-${idx}`}>
        <mesh 
          position={[x, y, wall.height / 2]} 
          rotation={[0, 0, angle]}
          onClick={handleWallClick}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[segL, wall.thickness, wall.height]} />
          <meshStandardMaterial
            {...matProps}
            wireframe={shadingMode === 'wireframe' || renderMode === RenderMode.WIREFRAME}
            transparent={shadingMode === 'transparent' || matProps.transparent}
            opacity={shadingMode === 'transparent' ? 0.20 : matProps.opacity ?? 1.0}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
          {renderMode !== RenderMode.SOLID && renderMode !== RenderMode.WIREFRAME && (
             <Edges linewidth={1} threshold={15} color="black" />
          )}
        </mesh>
        {/* Contorno de Seleção Aramado */}
        {isSelected && (
          <mesh position={[x, y, wall.height / 2]} rotation={[0, 0, angle]}>
            <boxGeometry args={[segL + 0.02, wall.thickness + 0.02, wall.height + 0.02]} />
            <meshBasicMaterial color="#eab308" wireframe={true} transparent={true} opacity={0.8} />
          </mesh>
        )}
      </group>
    );
  });

  // 3. Renderizar as partes acima de portas/vãos livres e acima/abaixo de janelas
  const { devices } = useCadStore();

  const cutoutFills = cutouts.map((c, idx) => {
    const cL = c.end - c.start;
    const centerDist = c.start + cL / 2;
    const x = wall.p1.x + centerDist * dx;
    const y = p1y + centerDist * dy;

    const dev = devices.find(d => d.id === c.deviceId);
    const isWindow = c.deviceId.includes('window') || (dev && dev.type === 'window');

    if (isWindow) {
      const peitoril = dev?.peitoril ?? 1.00;
      const windowH = dev?.height3d ?? 1.10;
      const belowHeight = peitoril;
      const aboveHeight = Math.max(0.01, wall.height - (peitoril + windowH));

      return (
        <React.Fragment key={`cutout-fill-${idx}`}>
          {/* Parede abaixo da janela */}
          {belowHeight > 0.01 && (
            <group>
              <mesh 
                position={[x, y, belowHeight / 2]} 
                rotation={[0, 0, angle]}
                onClick={handleWallClick}
              >
                <boxGeometry args={[cL, wall.thickness, belowHeight]} />
                <meshStandardMaterial
                  {...matProps}
                  wireframe={shadingMode === 'wireframe' || renderMode === RenderMode.WIREFRAME}
                  transparent={shadingMode === 'transparent' || matProps.transparent}
                  opacity={shadingMode === 'transparent' ? 0.20 : matProps.opacity ?? 1.0}
                  clippingPlanes={clippingPlanes}
                  clipShadows={true}
                />
                {renderMode !== RenderMode.SOLID && renderMode !== RenderMode.WIREFRAME && (
                   <Edges linewidth={1} threshold={15} color="black" />
                )}
              </mesh>
              {isSelected && (
                <mesh position={[x, y, belowHeight / 2]} rotation={[0, 0, angle]}>
                  <boxGeometry args={[cL + 0.02, wall.thickness + 0.02, belowHeight + 0.02]} />
                  <meshBasicMaterial color="#eab308" wireframe={true} transparent={true} opacity={0.8} />
                </mesh>
              )}
            </group>
          )}
          {/* Parede acima da janela */}
          {aboveHeight > 0.01 && (
            <group>
              <mesh 
                position={[x, y, wall.height - aboveHeight / 2]} 
                rotation={[0, 0, angle]}
                onClick={handleWallClick}
              >
                <boxGeometry args={[cL, wall.thickness, aboveHeight]} />
                <meshStandardMaterial
                  {...matProps}
                  wireframe={shadingMode === 'wireframe'}
                  transparent={shadingMode === 'transparent' || matProps.transparent}
                  opacity={shadingMode === 'transparent' ? 0.20 : matProps.opacity ?? 1.0}
                  clippingPlanes={clippingPlanes}
                  clipShadows={true}
                />
              </mesh>
              {isSelected && (
                <mesh position={[x, y, wall.height - aboveHeight / 2]} rotation={[0, 0, angle]}>
                  <boxGeometry args={[cL + 0.02, wall.thickness + 0.02, aboveHeight + 0.02]} />
                  <meshBasicMaterial color="#eab308" wireframe={true} transparent={true} opacity={0.8} />
                </mesh>
              )}
            </group>
          )}
        </React.Fragment>
      );
    } else {
      const doorH = dev?.height3d ?? 2.10;
      const aboveHeight = Math.max(0.01, wall.height - doorH);
      const topFillH = aboveHeight;
      const topFillCenterZ = wall.height - topFillH / 2;
      const bottomFillH = 0;
      const bottomFillCenterZ = 0;
      return (
        <group key={`cutout-fill-${idx}`}>
          {/* Parte superior (acima do vão/porta) */}
          <mesh position={[x, y, topFillCenterZ]} rotation={[0, 0, angle]} onClick={handleWallClick} castShadow receiveShadow>
            <boxGeometry args={[cL, wall.thickness, topFillH]} />
            <meshStandardMaterial
              {...matProps}
              wireframe={shadingMode === 'wireframe'}
              transparent={shadingMode === 'transparent' || matProps.transparent}
              opacity={shadingMode === 'transparent' ? 0.20 : matProps.opacity ?? 1.0}
              clippingPlanes={clippingPlanes}
              clipShadows={true}
            />
          </mesh>
          {isSelected && (
            <mesh position={[x, y, topFillCenterZ]} rotation={[0, 0, angle]}>
              <boxGeometry args={[cL + 0.02, wall.thickness + 0.02, topFillH + 0.02]} />
              <meshBasicMaterial color="#eab308" wireframe={true} transparent={true} opacity={0.8} />
            </mesh>
          )}

          {/* Parte inferior (abaixo da janela), se houver peitoril */}
          {bottomFillH > 0 && (
            <>
              <mesh position={[x, y, bottomFillCenterZ]} rotation={[0, 0, angle]} onClick={handleWallClick} castShadow receiveShadow>
                <boxGeometry args={[cL, wall.thickness, bottomFillH]} />
                <meshStandardMaterial
                  {...matProps}
                  wireframe={shadingMode === 'wireframe'}
                  transparent={shadingMode === 'transparent' || matProps.transparent}
                  opacity={shadingMode === 'transparent' ? 0.20 : matProps.opacity ?? 1.0}
                  clippingPlanes={clippingPlanes}
                  clipShadows={true}
                />
              </mesh>
              {isSelected && (
                <mesh position={[x, y, bottomFillCenterZ]} rotation={[0, 0, angle]}>
                  <boxGeometry args={[cL + 0.02, wall.thickness + 0.02, bottomFillH + 0.02]} />
                  <meshBasicMaterial color="#eab308" wireframe={true} transparent={true} opacity={0.8} />
                </mesh>
              )}
            </>
          )}
        </group>
      );
    }
  });

  return (
    <group>
      {fullWallMeshes}
      {cutoutFills}
    </group>
  );
};
