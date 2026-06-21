import React, { useRef } from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const CameraController: React.FC = () => {
  const { orbitControlsEnabled, cameraTransition, targetCameraPos, targetCameraLookAt, setCameraTransition } = useCadStore();
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Animação contínua da câmera para Preset Views
  useFrame((state, delta) => {
    if (cameraTransition && targetCameraPos && targetCameraLookAt && controlsRef.current && cameraRef.current) {
      const step = 4.0 * delta; // Velocidade da interpolação 
      const currentPos = cameraRef.current.position;
      const currentTarget = controlsRef.current.target;

      const destPos = new THREE.Vector3(...targetCameraPos);
      const destTarget = new THREE.Vector3(...targetCameraLookAt);

      // Lerp
      currentPos.lerp(destPos, step);
      currentTarget.lerp(destTarget, step);

      // Se a distância for muito pequena, encerra a animação
      if (currentPos.distanceTo(destPos) < 0.1 && currentTarget.distanceTo(destTarget) < 0.1) {
        currentPos.copy(destPos);
        currentTarget.copy(destTarget);
        setCameraTransition(false); // Para o ciclo de Lerp
      }
      
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 15, 20]} fov={50} near={0.1} far={1000} />
      
      {orbitControlsEnabled && (
        <OrbitControls 
          ref={controlsRef}
          makeDefault 
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2} 
          minDistance={1}
          maxDistance={100}
          screenSpacePanning={true}
        />
      )}
    </>
  );
};
