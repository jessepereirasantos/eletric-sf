import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Device } from '../../store/useCadStore';

interface Conduit3DProps {
  fromDevice: Device;
  toDevice: Device;
  diameter: string;
}

export const Conduit3D: React.FC<Conduit3DProps> = ({ fromDevice, toDevice, diameter }) => {
  const points = useMemo(() => {
    // 1. Obter alturas Z normatizadas de cada dispositivo
    const getZ = (d: Device) => {
      const type = d.type;
      if (type.includes('baixa') || type === 'tomada_10a_nbr') return 0.30;
      if (type.includes('alta') || type.includes('tue_') || type === 'sconce') return 2.20;
      if (type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent' || type === 'box_octogonal') return 2.80; // teto
      if (type === 'qdc' || type === 'qgbt') return 1.50;
      if (type === 'poste') return 1.60;
      return 1.10; // padrão médio
    };

    const zA = getZ(fromDevice);
    const zB = getZ(toDevice);

    const posA = new THREE.Vector3(fromDevice.x, fromDevice.y, zA);
    const posB = new THREE.Vector3(toDevice.x, toDevice.y, zB);

    const pathPoints: THREE.Vector3[] = [];

    // Se um dispositivo estiver no teto e o outro na parede/baixo:
    // Fazemos o conduíte correr pelo teto (Z=2.8) até a prumada da parede, e descer verticalmente.
    if (zA === 2.80 && zB < 2.80) {
      const ctrl = new THREE.Vector3(toDevice.x, toDevice.y, 2.80);
      pathPoints.push(posA, ctrl, posB);
    } else if (zB === 2.80 && zA < 2.80) {
      const ctrl = new THREE.Vector3(fromDevice.x, fromDevice.y, 2.80);
      pathPoints.push(posA, ctrl, posB);
    } else if (zA < 2.80 && zB < 2.80 && zA !== zB) {
      // Se forem de alturas diferentes na parede, faz uma descida/subida suave na parede
      const mid = new THREE.Vector3(
        (fromDevice.x + toDevice.x) / 2,
        (fromDevice.y + toDevice.y) / 2,
        (zA + zB) / 2
      );
      pathPoints.push(posA, mid, posB);
    } else {
      // Se forem da mesma altura, faz uma curva sutil para baixo (efeito "barriga" de cabo/tubo)
      const mid = new THREE.Vector3(
        (fromDevice.x + toDevice.x) / 2,
        (fromDevice.y + toDevice.y) / 2,
        zA - 0.08 // curva 8cm para baixo
      );
      pathPoints.push(posA, mid, posB);
    }

    return pathPoints;
  }, [fromDevice, toDevice]);

  // Criar curva CatmullRom a partir dos pontos calculados
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points);
  }, [points]);

  // Espessura do tubo do conduíte baseada no diâmetro
  const radius = useMemo(() => {
    if (diameter === '1/2') return 0.012;  // ~12mm
    if (diameter === '1') return 0.024;    // ~24mm
    if (diameter === '1 1/4') return 0.032; // ~32mm
    return 0.018; // 3/4" padrão ~18mm
  }, [diameter]);

  return (
    <mesh>
      <tubeGeometry args={[curve, 32, radius, 8, false]} />
      <meshStandardMaterial color="#f59e0b" roughness={0.6} metalness={0.1} />
    </mesh>
  );
};
