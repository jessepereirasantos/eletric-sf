import React from 'react';
import { useCadStore } from '../../../store/useCadStore';
import * as THREE from 'three';

export const GroundPlane: React.FC = () => {
  const { shadowsEnabled } = useCadStore();

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.05, 0]} // Levemente abaixo do Y=0 para não clipar com áreas de piso e texturas
      receiveShadow={shadowsEnabled}
    >
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial 
        color="#e5e7eb" 
        roughness={1} 
        metalness={0} 
        depthWrite={true}
      />
    </mesh>
  );
};
