import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCadStore } from '../../store/useCadStore';
import type { Device } from '../../store/useCadStore';

interface Device3DProps {
  device: Device;
}

export const Device3D: React.FC<Device3DProps> = ({ device }) => {
  const { shadingMode, activeViewFilter, clippingState } = useCadStore();
  const rotationRad = (device.rotation * Math.PI) / 180;

  // Planos de corte dinâmicos (Clipping Planes)
  const clippingPlanes = useMemo(() => {
    if (!clippingState.enabled) return [];
    let normal = new THREE.Vector3(0, 0, -1); // Cortar acima de Z
    if (clippingState.axis === 'X') normal = new THREE.Vector3(-1, 0, 0);
    if (clippingState.axis === 'Y') normal = new THREE.Vector3(0, -1, 0);
    return [new THREE.Plane(normal, clippingState.value)];
  }, [clippingState]);

  // Filtros de Visibilidade de Planta 3D
  const isVisible = useMemo(() => {
    const isInfra = device.type === 'qdc' || device.type === 'qgbt' || device.type === 'meter' || device.type === 'medidor' || device.type === 'poste' || device.type === 'caixa_passagem' || device.type.startsWith('box_');
    const isArch = device.type.startsWith('door') || device.type === 'window' || device.type === 'open_van' || device.type === 'stairs';

    if (activeViewFilter === 'infraestrutura') {
      return isInfra || isArch;
    }

    if (activeViewFilter === 'fiacao_dispositivos') {
      // Oculta caixas de passagem vazias (sem módulos)
      const isEmptyBox = (device.type === 'caixa_passagem' || device.type.startsWith('box_')) && (!device.modules || device.modules.length === 0);
      if (isEmptyBox) return false;
      return true;
    }

    return true;
  }, [device.type, device.modules, activeViewFilter]);

  if (!isVisible) return null;

  // Determinar a altura Z de fixação com base na norma e tipo de dispositivo
  const getZCoordAndHeight = (): { z: number; width: number; depth: number; height: number; color: string; isEsquadria: boolean } => {
    const type = device.type;
    
    // Esquadrias
    if (type.startsWith('door')) {
      const doorW = device.width ?? 0.8;
      return { z: 1.05, width: doorW, depth: 0.04, height: 2.10, color: '#b45309', isEsquadria: true };
    }
    if (type === 'window') {
      const winW = device.width ?? 1.2;
      return { z: 1.55, width: winW, depth: 0.05, height: 1.10, color: '#38bdf8', isEsquadria: true };
    }
    if (type === 'open_van') {
      const vanW = device.width ?? 1.0;
      return { z: 1.05, width: vanW, depth: 0.15, height: 2.10, color: '#cbd5e1', isEsquadria: true }; // transparente/vazio na real, mas podemos fazer algo sutil
    }

    // Tomadas e Interruptores (Z de Norma)
    let z = 1.10; // altura média padrão
    let size = { width: 0.08, depth: 0.05, height: 0.12, color: '#f8fafc' };

    if (type.includes('baixa') || type === 'tomada_10a_nbr') {
      z = 0.30;
    } else if (type.includes('alta') || type.includes('tue_') || type === 'sconce') {
      z = 2.20;
    } else if (type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent' || type === 'box_octogonal') {
      z = 2.80; // teto
      size = { width: 0.20, depth: 0.20, height: 0.04, color: '#fef08a' };
    } else if (type === 'qdc' || type === 'qgbt') {
      z = 1.50; // altura do trinco
      size = { width: 0.40, depth: 0.12, height: 0.50, color: '#475569' };
    } else if (type === 'poste') {
      z = 1.60;
      size = { width: 0.12, depth: 0.12, height: 3.20, color: '#64748b' };
    } else if (type === 'box_4x2' || type === 'box_4x4') {
      z = 1.10;
      size = { width: 0.10, depth: 0.08, height: 0.10, color: '#eab308' }; // caixa amarela embutida
    }

    return { z, ...size, isEsquadria: false };
  };

  const { z, width, depth, height, color } = getZCoordAndHeight();

  // Se for vão livre simples, não precisa de malha sólida
  if (device.type === 'open_van') return null;

  // Desenhar portas com painéis pivotados se aplicável
  if (device.type.startsWith('door')) {
    // Porta aberta a 90 graus para veracidade visual
    const angleOffset = device.flip ? -Math.PI / 2 : Math.PI / 2;
    return (
      <group position={[device.x, device.y, z]}>
        {/* Batente/Portal fixo */}
        <mesh rotation={[0, 0, rotationRad]}>
          <boxGeometry args={[width, 0.15, 0.05]} />
          <meshStandardMaterial
            color="#78350f"
            wireframe={shadingMode === 'wireframe'}
            transparent={shadingMode === 'transparent'}
            opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
        </mesh>
        {/* Folha da porta rotacionada */}
        <group rotation={[0, 0, rotationRad + angleOffset]} position={[device.flip ? width / 2 : -width / 2, 0, 0]}>
          <mesh position={[device.flip ? -width / 2 : width / 2, 0, 0]}>
            <boxGeometry args={[width, depth, height]} />
            <meshStandardMaterial
              color={color}
              roughness={0.6}
              wireframe={shadingMode === 'wireframe'}
              transparent={shadingMode === 'transparent'}
              opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
              clippingPlanes={clippingPlanes}
              clipShadows={true}
            />
          </mesh>
        </group>
      </group>
    );
  }

  // Desenhar janelas
  if (device.type === 'window') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Moldura da janela */}
        <mesh>
          <boxGeometry args={[width, 0.15, height]} />
          <meshStandardMaterial
            color="#475569"
            wireframe={shadingMode === 'wireframe'}
            transparent={shadingMode === 'transparent'}
            opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
        </mesh>
        {/* Vidro semi-transparente */}
        <mesh>
          <boxGeometry args={[width - 0.05, 0.02, height - 0.05]} />
          <meshStandardMaterial
            color={color}
            transparent={true}
            opacity={shadingMode === 'transparent' ? 0.15 : 0.4}
            roughness={0.1}
            metalness={0.9}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
        </mesh>
      </group>
    );
  }

  // Desenhar ponto de luz no teto
  if (device.type === 'ceiling_light' || device.type === 'lampada' || device.type === 'fluorescent') {
    return (
      <group position={[device.x, device.y, z]}>
        {/* Base da luminária */}
        <mesh>
          <boxGeometry args={[width, depth, height]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.5}
            wireframe={shadingMode === 'wireframe'}
            transparent={shadingMode === 'transparent'}
            opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
        </mesh>
        {/* Brilho da lâmpada */}
        <mesh position={[0, 0, -0.01]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent={shadingMode === 'transparent'}
            opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
      </group>
    );
  }

  // Desenhar outros dispositivos como tomadas/quadros
  return (
    <mesh position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
      <boxGeometry args={[width, depth, height]} />
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={device.type === 'qdc' ? 0.6 : 0.1}
        wireframe={shadingMode === 'wireframe'}
        transparent={shadingMode === 'transparent'}
        opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
        clippingPlanes={clippingPlanes}
        clipShadows={true}
      />
    </mesh>
  );
};
