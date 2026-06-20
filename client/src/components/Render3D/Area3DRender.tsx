import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Area3D } from '../../store/useCadStore';
import { useFrame } from '@react-three/fiber';

interface Area3DRenderProps {
  area: Area3D;
}

export const Area3DRender: React.FC<Area3DRenderProps> = ({ area }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Calcula o shape 2D com base nos pontos da área
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (area.points.length > 2) {
      s.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        s.lineTo(area.points[i].x, area.points[i].y);
      }
      s.lineTo(area.points[0].x, area.points[0].y);
    }
    return s;
  }, [area.points]);

  // Se for piscina, ela fura o chão (extrusão negativa profunda), a grama sobe um pouco, teto sobe pra z alto.
  let zPos = 0;
  let depth = 0.05; // espessura padrão (piso)
  
  if (area.type === 'teto') {
    zPos = area.height ?? 2.80;
    depth = 0.15;
  } else if (area.type === 'piscina') {
    zPos = area.height ?? -1.50;
    depth = Math.abs(zPos); 
  } else if (area.type === 'grama') {
    zPos = 0.05; // Grama fica um pouco acima do solo zero para volume
    depth = 0.05;
  }

  // Gera a geometria de extrusão
  const extrudeSettings = useMemo(() => ({
    depth: depth,
    bevelEnabled: false,
  }), [depth]);

  // Animação para a água (piscina)
  useFrame(({ clock }) => {
    if (area.type === 'piscina' && meshRef.current) {
      const material = meshRef.current.material as THREE.MeshPhysicalMaterial;
      if (material && material.normalMap) {
        material.normalMap.offset.x = clock.getElapsedTime() * 0.05;
        material.normalMap.offset.y = clock.getElapsedTime() * 0.05;
      }
    }
  });

  return (
    <mesh 
      ref={meshRef}
      position={[0, 0, zPos]} 
      receiveShadow 
      castShadow={area.type !== 'piscina'} 
    >
      <extrudeGeometry args={[shape, extrudeSettings]} />
      {area.type === 'piscina' ? (
        <meshPhysicalMaterial 
          color="#0066ff" 
          transmission={0.9} 
          opacity={1} 
          roughness={0.1} 
          ior={1.33} 
          thickness={1.5}
        />
      ) : area.type === 'grama' ? (
        <meshStandardMaterial color="#22c55e" roughness={0.9} metalness={0.1} />
      ) : area.type === 'deck' ? (
        <meshStandardMaterial color="#b45309" roughness={0.8} metalness={0.1} />
      ) : area.type === 'asfalto' ? (
        <meshStandardMaterial color="#334155" roughness={0.9} metalness={0.1} />
      ) : area.type === 'teto' ? (
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} metalness={0.1} />
      ) : (
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.1} />
      )}
    </mesh>
  );
};
