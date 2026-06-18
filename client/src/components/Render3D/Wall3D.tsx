import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCadStore } from '../../store/useCadStore';
import type { Wall } from '../../store/useCadStore';

interface Wall3DProps {
  wall: Wall;
}

export const Wall3D: React.FC<Wall3DProps> = ({ wall }) => {
  const { shadingMode, clippingState } = useCadStore();

  const L = Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(wall.p2.y - wall.p1.y, 2));
  if (L === 0) return null;

  const dx = (wall.p2.x - wall.p1.x) / L;
  const dy = (wall.p2.y - wall.p1.y) / L;
  const angle = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x);

  // Obter vãos livres (cutouts) ordenados
  const cutouts = wall.cutouts || [];

  // Definir materiais com base nas propriedades da parede
  const getMaterialProperties = () => {
    switch (wall.material) {
      case 'concreto':
        return { color: '#64748b', roughness: 0.8, metalness: 0.2 };
      case 'drywall':
        return { color: '#f8fafc', roughness: 0.9, metalness: 0.0 };
      case 'vidro':
        return { color: '#93c5fd', roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.4 };
      case 'alvenaria':
      default:
        return { color: '#cbd5e1', roughness: 0.7, metalness: 0.1 };
    }
  };

  const matProps = getMaterialProperties();

  // Planos de corte dinâmicos (Clipping Planes)
  const clippingPlanes = useMemo(() => {
    if (!clippingState.enabled) return [];
    let normal = new THREE.Vector3(0, 0, -1); // Cortar acima de Z
    if (clippingState.axis === 'X') normal = new THREE.Vector3(-1, 0, 0);
    if (clippingState.axis === 'Y') normal = new THREE.Vector3(0, -1, 0);
    return [new THREE.Plane(normal, clippingState.value)];
  }, [clippingState]);

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
    const y = wall.p1.y + centerDist * dy;

    return (
      <mesh key={`full-${idx}`} position={[x, y, wall.height / 2]} rotation={[0, 0, angle]}>
        <boxGeometry args={[segL, wall.thickness, wall.height]} />
        <meshStandardMaterial
          {...matProps}
          wireframe={shadingMode === 'wireframe'}
          transparent={shadingMode === 'transparent' || matProps.transparent}
          opacity={shadingMode === 'transparent' ? 0.20 : matProps.opacity ?? 1.0}
          clippingPlanes={clippingPlanes}
          clipShadows={true}
        />
      </mesh>
    );
  });

  // 3. Renderizar as partes acima de portas/vãos livres (lintéis/headers) e acima/abaixo de janelas
  const cutoutFills = cutouts.map((c, idx) => {
    const cL = c.end - c.start;
    const centerDist = c.start + cL / 2;
    const x = wall.p1.x + centerDist * dx;
    const y = wall.p1.y + centerDist * dy;

    // Assumir alturas padrão em metros
    const doorHeight = 2.10;
    const windowStart = 1.00;
    const windowEnd = 2.10;

    // Obter o tipo do cutout para fazer o preenchimento correto
    const isWindow = c.deviceId.includes('window');

    if (isWindow) {
      // Para janela, renderiza alvenaria abaixo da janela (Z de 0 a 1.0m) e acima da janela (Z de 2.10m a 2.80m)
      const belowHeight = windowStart;
      const aboveHeight = Math.max(0.1, wall.height - windowEnd);

      return (
        <React.Fragment key={`cutout-fill-${idx}`}>
          {/* Parede abaixo da janela */}
          <mesh position={[x, y, belowHeight / 2]} rotation={[0, 0, angle]}>
            <boxGeometry args={[cL, wall.thickness, belowHeight]} />
            <meshStandardMaterial
              {...matProps}
              wireframe={shadingMode === 'wireframe'}
              transparent={shadingMode === 'transparent' || matProps.transparent}
              opacity={shadingMode === 'transparent' ? 0.20 : matProps.opacity ?? 1.0}
              clippingPlanes={clippingPlanes}
              clipShadows={true}
            />
          </mesh>
          {/* Parede acima da janela */}
          <mesh position={[x, y, wall.height - aboveHeight / 2]} rotation={[0, 0, angle]}>
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
        </React.Fragment>
      );
    } else {
      // Para portas e vãos livres, renderiza apenas a parede superior acima da porta (Z de 2.10m a 2.80m)
      const aboveHeight = Math.max(0.1, wall.height - doorHeight);
      return (
        <mesh key={`cutout-fill-${idx}`} position={[x, y, wall.height - aboveHeight / 2]} rotation={[0, 0, angle]}>
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
