import React from 'react';
import { Environment as EnvironmentDrei, Sky, Grid } from '@react-three/drei';

export const EnvironmentManager: React.FC = () => {
  return (
    <>
      <EnvironmentDrei preset="city" background={false} />
      
      {/* Sky Gradient clássico do SketchUp (Céu) */}
      <Sky 
        distance={450000} 
        sunPosition={[50, 20, 10]} 
        inclination={0} 
        azimuth={0.25} 
        rayleigh={2} 
        mieCoefficient={0.005} 
        mieDirectionalG={0.8}
        turbidity={2}
      />
      
      {/* Grid Infinita do SketchUp com fade de horizonte */}
      <Grid
        position={[0, -0.02, 0]}
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.8}
        cellColor="#b4b4b4"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#9a9a9a"
        fadeDistance={80}
        fadeStrength={1.5}
        infiniteGrid
      />
      
      {/* Eixos XYZ clássicos do SketchUp: R=X, G=Z, B=Y (no ThreeJS o Y é pra cima) */}
      <axesHelper args={[500]} position={[0, -0.01, 0]} />
    </>
  );
};
