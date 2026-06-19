import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCadStore } from '../../store/useCadStore';
import type { Device } from '../../store/useCadStore';

interface Device3DProps {
  device: Device;
}

export const Device3D: React.FC<Device3DProps> = ({ device }) => {
  const { shadingMode, clippingState } = useCadStore();
  const rotationRad = (device.rotation * Math.PI) / 180;

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

  // Sempre visível no 3D conforme solicitado: "todos devem aparecer na vista 3d, todos"
  const isVisible = true;

  if (!isVisible) return null;

  // Determinar a altura Z de fixação com base no peitoril ou norma e tipo de dispositivo
  const getZCoordAndHeight = (): { z: number; width: number; depth: number; height: number; color: string; isEsquadria: boolean } => {
    const type = device.type;
    
    // Esquadrias
    if (type.startsWith('door')) {
      const doorW = device.width ?? 0.8;
      const doorH = device.height3d ?? 2.10;
      return { z: doorH / 2, width: doorW, depth: 0.04, height: doorH, color: '#b45309', isEsquadria: true };
    }
    if (type === 'window') {
      const winW = device.width ?? 1.2;
      const winH = device.height3d ?? 1.10;
      const peitoril = device.peitoril ?? 1.00;
      return { z: peitoril + winH / 2, width: winW, depth: 0.05, height: winH, color: '#38bdf8', isEsquadria: true };
    }
    if (type === 'open_van') {
      const vanW = device.width ?? 1.0;
      const vanH = device.height3d ?? 2.10;
      return { z: vanH / 2, width: vanW, depth: 0.15, height: vanH, color: '#cbd5e1', isEsquadria: true };
    }

    // Altura inteligente Z de fixação (prioriza peitoril/altura do usuário)
    let z = 1.10; // altura média padrão
    if (device.peitoril !== undefined) {
      z = device.peitoril;
    } else {
      if (type.includes('baixa') || type === 'tomada_10a_nbr') {
        z = 0.30;
      } else if (type.includes('alta') || type.includes('tue_') || type === 'sconce' || type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent' || type === 'box_octogonal') {
        z = 2.80; // teto
      } else if (type === 'qdc' || type === 'qgbt') {
        z = 1.50;
      } else if (type === 'poste') {
        z = 1.60;
      }
    }

    let size = { width: 0.08, depth: 0.05, height: 0.12, color: '#f8fafc' };

    if (type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent' || type === 'box_octogonal') {
      size = { width: 0.20, depth: 0.20, height: 0.04, color: '#fef08a' };
    } else if (type === 'qdc' || type === 'qgbt') {
      size = { width: 0.40, depth: 0.12, height: 0.50, color: '#475569' };
    } else if (type === 'poste') {
      size = { width: 0.12, depth: 0.12, height: 3.20, color: '#64748b' };
    } else if (type === 'box_4x2' || type === 'box_4x4') {
      size = { width: 0.10, depth: 0.08, height: 0.10, color: '#eab308' }; // caixa amarela
    } else if (type === 'cftv_camera') {
      size = { width: 0.12, depth: 0.12, height: 0.10, color: '#1e293b' };
    } else if (type === 'sensor_presenca' || type === 'sensor_fumaca') {
      size = { width: 0.14, depth: 0.14, height: 0.04, color: '#ffffff' };
    } else if (type === 'central_alarme') {
      size = { width: 0.20, depth: 0.06, height: 0.15, color: '#cbd5e1' };
    }

    return { z, ...size, isEsquadria: false };
  };

  const { z, width, depth, height, color } = getZCoordAndHeight();

  // Se for vão livre simples, não precisa de malha sólida
  if (device.type === 'open_van') return null;

  // Desenhar portas realistas
  if (device.type.startsWith('door')) {
    const portalThickness = 0.03;
    const frameDepth = 0.16; // espessura do batente cobrindo a parede
    const isGiro = device.type === 'door' || device.type === 'door_pivotante';

    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        <group scale={[isGiro && device.flip ? -1 : 1, 1, 1]}>
          {/* Batente/Portal da porta */}
          {/* Batente Esquerdo */}
          <mesh position={[isGiro ? portalThickness / 2 : -width / 2 + portalThickness / 2, 0, 0]}>
            <boxGeometry args={[portalThickness, frameDepth, height]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} clippingPlanes={clippingPlanes} />
          </mesh>
          {/* Batente Direito */}
          <mesh position={[isGiro ? width - portalThickness / 2 : width / 2 - portalThickness / 2, 0, 0]}>
            <boxGeometry args={[portalThickness, frameDepth, height]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} clippingPlanes={clippingPlanes} />
          </mesh>
          {/* Batente Superior */}
          <mesh position={[isGiro ? width / 2 : 0, 0, height / 2 - portalThickness / 2]}>
            <boxGeometry args={[width, frameDepth, portalThickness]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} clippingPlanes={clippingPlanes} />
          </mesh>

          {/* Folha da porta - FECHADA */}
          <mesh position={[isGiro ? width / 2 : 0, 0, 0]}>
            <boxGeometry args={[width - portalThickness * 2, depth, height - portalThickness]} />
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

          {/* Maçaneta Metálica */}
          {isGiro && (
            <group position={[width - 0.10, 0, 0]}>
              {/* Haste interna */}
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.08, 8]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Maçaneta lado 1 */}
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.02, 0.015, 0.12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Maçaneta lado 2 */}
              <mesh position={[0, -0.04, 0]}>
                <boxGeometry args={[0.02, 0.015, 0.12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    );
  }

  // Desenhar janelas realistas
  if (device.type === 'window') {
    const frameThickness = 0.04;
    const frameDepth = 0.16; // espessura cobrindo a parede
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Moldura Vazada Branca de Alumínio */}
        {/* Superior */}
        <mesh position={[0, 0, height / 2 - frameThickness / 2]}>
          <boxGeometry args={[width, frameDepth, frameThickness]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Inferior */}
        <mesh position={[0, 0, -height / 2 + frameThickness / 2]}>
          <boxGeometry args={[width, frameDepth, frameThickness]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Esquerda */}
        <mesh position={[-width / 2 + frameThickness / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, frameDepth, height - frameThickness * 2]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Direita */}
        <mesh position={[width / 2 - frameThickness / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, frameDepth, height - frameThickness * 2]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} clippingPlanes={clippingPlanes} />
        </mesh>

        {/* Montante central vertical branco */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[frameThickness, frameDepth, height - frameThickness * 2]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} clippingPlanes={clippingPlanes} />
        </mesh>

        {/* Vidro translúcido duplo com reflexo real */}
        <mesh position={[-width / 4, 0, 0]}>
          <boxGeometry args={[width / 2 - frameThickness, 0.02, height - frameThickness * 2]} />
          <meshStandardMaterial
            color="#a5f3fc"
            transparent={true}
            opacity={shadingMode === 'transparent' ? 0.10 : 0.4}
            roughness={0.05}
            metalness={0.95}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
        </mesh>
        <mesh position={[width / 4, 0, 0]}>
          <boxGeometry args={[width / 2 - frameThickness, 0.02, height - frameThickness * 2]} />
          <meshStandardMaterial
            color="#a5f3fc"
            transparent={true}
            opacity={shadingMode === 'transparent' ? 0.10 : 0.4}
            roughness={0.05}
            metalness={0.95}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
        </mesh>
      </group>
    );
  }

  // Desenhar Câmera CFTV detalhada
  if (device.type === 'cftv_camera') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Base da câmera fixada na parede */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
          <meshStandardMaterial color="#475569" clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Corpo da câmera dome */}
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Lente da câmera */}
        <mesh position={[0, -0.04, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.01, 8]} />
          <meshBasicMaterial color="#000000" clippingPlanes={clippingPlanes} />
        </mesh>
      </group>
    );
  }

  // Desenhar Sensor de Presença / Fumaça
  if (device.type === 'sensor_presenca' || device.type === 'sensor_fumaca') {
    return (
      <group position={[device.x, device.y, z]}>
        {/* Corpo do sensor */}
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
        {/* LED indicador */}
        <mesh position={[0.03, 0.016, 0]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshBasicMaterial color={device.type === 'sensor_presenca' ? '#22c55e' : '#ef4444'} clippingPlanes={clippingPlanes} />
        </mesh>
      </group>
    );
  }

  // Desenhar Central de Alarme
  if (device.type === 'central_alarme') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Painel plástico cinza */}
        <mesh>
          <boxGeometry args={[0.20, 0.04, 0.15]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Visor LCD azul */}
        <mesh position={[0, 0.021, 0.03]}>
          <boxGeometry args={[0.12, 0.002, 0.04]} />
          <meshBasicMaterial color="#60a5fa" clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Teclado numérico */}
        <mesh position={[0, 0.021, -0.03]}>
          <boxGeometry args={[0.14, 0.002, 0.05]} />
          <meshStandardMaterial color="#475569" roughness={0.9} clippingPlanes={clippingPlanes} />
        </mesh>
      </group>
    );
  }

  // Desenhar Interruptores com placa de acabamento
  if (device.type.startsWith('switch_') || device.type.startsWith('interruptor') || device.type === 'dimmer') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Placa de acabamento externa */}
        <mesh>
          <boxGeometry args={[0.08, 0.015, 0.12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} clippingPlanes={clippingPlanes} />
        </mesh>
        {/* Módulo do interruptor central */}
        <mesh position={[0, 0.008, 0]}>
          <boxGeometry args={[0.03, 0.002, 0.05]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.6} clippingPlanes={clippingPlanes} />
        </mesh>
      </group>
    );
  }

  // Desenhar Poste de Entrada Realista (Padrão de Entrada de Concessionária)
  if (device.type === 'poste') {
    return (
      <group position={[device.x, device.y, z]} rotation={[0, 0, rotationRad]}>
        {/* Poste de Concreto Cinza Texturizado */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.14, 0.14, 3.2]} />
          <meshStandardMaterial
            color="#64748b"
            roughness={0.9}
            wireframe={shadingMode === 'wireframe'}
            transparent={shadingMode === 'transparent'}
            opacity={shadingMode === 'transparent' ? 0.35 : 1.0}
            clippingPlanes={clippingPlanes}
          />
        </mesh>

        {/* Bengala (Eletroduto Curvo Metálico de Entrada) */}
        <group position={[0.09, 0, 0.2]}>
          {/* Tubo reto que sobe no poste */}
          <mesh position={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} clippingPlanes={clippingPlanes} />
          </mesh>
          {/* Curva da Bengala superior */}
          <mesh position={[-0.05, 0, 1.6]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} clippingPlanes={clippingPlanes} />
          </mesh>
        </group>

        {/* Roldanas de Porcelana (Isoladores da Entrada Aérea) */}
        <group position={[0.15, 0, 1.4]}>
          {/* Suporte Metálico */}
          <mesh position={[-0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} clippingPlanes={clippingPlanes} />
          </mesh>
          {/* Roldanas */}
          {[-0.15, 0, 0.15].map((offsetZ, i) => (
            <mesh key={i} position={[0, 0, offsetZ]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.3} clippingPlanes={clippingPlanes} />
            </mesh>
          ))}
        </group>

        {/* Caixa de Medição de Energia (Padrão de Entrada) */}
        <group position={[0.12, 0, -0.2]}>
          {/* Caixa de Metal/Vidro */}
          <mesh>
            <boxGeometry args={[0.14, 0.32, 0.42]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.3} clippingPlanes={clippingPlanes} />
          </mesh>
          {/* Visor de Vidro do Medidor */}
          <mesh position={[0.075, 0, 0.05]}>
            <boxGeometry args={[0.005, 0.22, 0.26]} />
            <meshStandardMaterial color="#a5f3fc" transparent={true} opacity={0.6} clippingPlanes={clippingPlanes} />
          </mesh>
          {/* Medidor Interno e Disjuntor Geral */}
          <mesh position={[0.04, 0, 0.05]}>
            <boxGeometry args={[0.04, 0.12, 0.12]} />
            <meshStandardMaterial color="#0f172a" clippingPlanes={clippingPlanes} />
          </mesh>
          {/* Disjuntor Geral Din */}
          <mesh position={[0.04, 0, -0.08]}>
            <boxGeometry args={[0.03, 0.08, 0.08]} />
            <meshStandardMaterial color="#2563eb" clippingPlanes={clippingPlanes} />
          </mesh>
        </group>
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
