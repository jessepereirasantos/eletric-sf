import React, { useRef } from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

export const CameraController: React.FC = () => {
  const { orbitControlsEnabled } = useCadStore();
  const controlsRef = useRef<any>(null);

  // Aqui no futuro implementaremos o WalkMode (FirstPerson/PointerLockControls)
  // e os botões rápidos de Top/Side/ISO transformando essa câmera em Orthographic.

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 15, 20]} fov={50} near={0.1} far={1000} />
      
      {orbitControlsEnabled && (
        <OrbitControls 
          ref={controlsRef}
          makeDefault 
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2} // Restringe a câmera para não descer abaixo do chão (-Math.PI/2)
          minDistance={1}
          maxDistance={100}
          screenSpacePanning={true}
        />
      )}
    </>
  );
};
