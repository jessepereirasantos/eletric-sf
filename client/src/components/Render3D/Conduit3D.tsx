import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCadStore } from '../../store/useCadStore';
import type { Device, Point2D } from '../../store/useCadStore';

interface Conduit3DProps {
  id: string;
  fromDevice: Device;
  toDevice: Device;
  diameter: string;
  waypoints?: Point2D[];
}

export const Conduit3D: React.FC<Conduit3DProps> = ({ fromDevice, toDevice, diameter, waypoints }) => {
  const { shadingMode, clippingState } = useCadStore();

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

    // Se houver waypoints customizados (2D), traçar a prumada e o caminho interpolado por eles
    if (waypoints && waypoints.length > 0) {
      pathPoints.push(posA);
      waypoints.forEach(wp => {
        // Assume altura média Z (ou interpola entre zA e zB) para os waypoints no espaço 3D
        const wpZ = zA === 2.80 || zB === 2.80 ? 2.80 : (zA + zB) / 2;
        pathPoints.push(new THREE.Vector3(wp.x, wp.y, wpZ));
      });
      pathPoints.push(posB);
    } else {
      // Se um dispositivo estiver no teto e o outro na parede/baixo:
      // A prumada deve seguir exatamente a coordenada (X, Y) do dispositivo na parede,
      // descendo ortogonalmente de modo a se manter dentro do alinhamento da alvenaria.
      if (zA === 2.80 && zB < 2.80) {
        // Corre pelo teto (Z=2.8) até a prumada exata do dispositivo de destino (X, Y)
        const tetoCtrl = new THREE.Vector3(toDevice.x, toDevice.y, 2.80);
        // Faz uma pequena curva para entrar reto na alvenaria
        const descidaCtrl = new THREE.Vector3(toDevice.x, toDevice.y, 2.70);
        pathPoints.push(posA, tetoCtrl, descidaCtrl, posB);
      } else if (zB === 2.80 && zA < 2.80) {
        const descidaCtrl = new THREE.Vector3(fromDevice.x, fromDevice.y, 2.70);
        const tetoCtrl = new THREE.Vector3(fromDevice.x, fromDevice.y, 2.80);
        pathPoints.push(posA, descidaCtrl, tetoCtrl, posB);
      } else if (zA < 2.80 && zB < 2.80 && zA !== zB) {
        // Corre verticalmente dentro da mesma parede/prumada de um dispositivo ao outro
        // Interpola ortogonalmente pelo eixo X/Y do destino ou origem para não desviar no 3D
        const descidaCtrl = new THREE.Vector3(fromDevice.x, fromDevice.y, zB);
        pathPoints.push(posA, descidaCtrl, posB);
      } else {
        // Se forem da mesma altura, faz uma curva sutil para baixo (efeito "barriga" de cabo/tubo)
        const mid = new THREE.Vector3(
          (fromDevice.x + toDevice.x) / 2,
          (fromDevice.y + toDevice.y) / 2,
          zA - 0.08 // curva 8cm para baixo
        );
        pathPoints.push(posA, mid, posB);
      }
    }

    return pathPoints;
  }, [fromDevice, toDevice, waypoints]);

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

  // Planos de corte dinâmicos (Clipping Planes)
  const clippingPlanes = useMemo(() => {
    if (!clippingState.enabled) return [];
    let normal = new THREE.Vector3(0, 0, -1); // Cortar acima de Z
    if (clippingState.axis === 'X') normal = new THREE.Vector3(-1, 0, 0);
    if (clippingState.axis === '-X') normal = new THREE.Vector3(1, 0, 0);
    if (clippingState.axis === 'Y') normal = new THREE.Vector3(0, -1, 0);
    if (clippingState.axis === '-Y') normal = new THREE.Vector3(0, 1, 0);
    if (clippingState.axis === 'Z') normal = new THREE.Vector3(0, 0, -1);
    if (clippingState.axis === '-Z') normal = new THREE.Vector3(0, 0, 1);
    return [new THREE.Plane(normal, clippingState.value)];
  }, [clippingState]);

  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 8, false]} />
      <meshStandardMaterial
        color="#f59e0b"
        roughness={0.6}
        metalness={0.1}
        wireframe={shadingMode === 'wireframe'}
        transparent={shadingMode === 'transparent'}
        opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
        clippingPlanes={clippingPlanes}
        clipShadows={true}
      />
    </mesh>
  );
};
