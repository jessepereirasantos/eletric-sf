import React from 'react';
import type { Device } from '../../store/useCadStore';

interface Device3DProps {
  device: Device;
}

export const Device3D: React.FC<Device3DProps> = ({ device }) => {
  const rotationRad = (device.rotation * Math.PI) / 180;

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
          <meshStandardMaterial color="#78350f" />
        </mesh>
        {/* Folha da porta rotacionada */}
        <group rotation={[0, 0, rotationRad + angleOffset]} position={[device.flip ? width / 2 : -width / 2, 0, 0]}>
          <mesh position={[device.flip ? -width / 2 : width / 2, 0, 0]}>
            <boxGeometry args={[width, depth, height]} />
            <meshStandardMaterial color={color} roughness={0.6} />
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
          <meshStandardMaterial color="#475569" wireframe />
        </mesh>
        {/* Vidro semi-transparente */}
        <mesh>
          <boxGeometry args={[width - 0.05, 0.02, height - 0.05]} />
          <meshStandardMaterial color={color} transparent opacity={0.4} roughness={0.1} metalness={0.9} />
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
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        {/* Brilho da lâmpada */}
        <mesh position={[0, 0, -0.01]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>
    );
  }

  // Desenhar outros dispositivos como tomadas/quadros
  return (
    <mesh position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
      <boxGeometry args={[width, depth, height]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={device.type === 'qdc' ? 0.6 : 0.1} />
    </mesh>
  );
};
