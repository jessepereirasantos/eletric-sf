import React, { useMemo } from 'react';
import { useCadStore } from '../../../store/useCadStore';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';

export const Lighting: React.FC = () => {
  const { solarAzimuth, solarElevation, shadowsEnabled } = useCadStore();

  // Converte azimute (0-360) e elevação (0-90) para vetor direcional XYZ no R3F
  const sunPosition = useMemo(() => {
    const phi = (90 - solarElevation) * (Math.PI / 180);
    const theta = solarAzimuth * (Math.PI / 180);
    const radius = 100;

    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, [solarAzimuth, solarElevation]);

  return (
    <>
      {/* Luz Ambiente Básica suave para não ter breu absoluto nas sombras */}
      <ambientLight intensity={0.3} color="#ffffff" />
      
      {/* Sistema do Céu Paramétrico reativo ao Sol */}
      <Sky 
        sunPosition={sunPosition} 
        turbidity={0.1}
        rayleigh={1.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.7}
      />

      {/* Luz Solar Principal e Geradora de Sombras (Directional Light) */}
      <directionalLight
        position={sunPosition}
        intensity={2.5}
        castShadow={shadowsEnabled}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
      >
        <orthographicCamera 
          attach="shadow-camera" 
          args={[-30, 30, 30, -30, 0.1, 200]} 
        />
      </directionalLight>
    </>
  );
};
