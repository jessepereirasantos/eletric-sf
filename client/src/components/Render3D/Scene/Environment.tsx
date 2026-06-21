import React from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';

export const EnvironmentManager: React.FC = () => {
  const { showGrid, showOriginAxes, renderMode } = useCadStore();

  return (
    <>
      {/* Reflexões HDR de Cidade (Ideal para Arquitetura) */}
      {/* Ocultamos o background real se quisermos ver o Skybox do Lighting.tsx */}
      <Environment preset="city" background={false} />

      {/* Helper dos eixos (X Vermelho, Y Verde, Z Azul) */}
      {showOriginAxes && (
        <axesHelper args={[50]} />
      )}

      {/* Grid Quadriculado Chão Arquitetônico (1x1 m) com fade nas bordas */}
      {showGrid && (
        <Grid
          position={[0, -0.01, 0]}
          args={[100, 100]}
          cellSize={1}
          cellThickness={1}
          cellColor="#9ca3af"
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#6b7280"
          fadeDistance={50}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
      )}
    </>
  );
};
