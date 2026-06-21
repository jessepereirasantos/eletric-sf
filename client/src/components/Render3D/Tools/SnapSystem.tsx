import React, { useMemo } from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { ThreeEvent } from '@react-three/fiber';

export const SnapSystem: React.FC = () => {
  const { snapsEnabled, activeTool, areas, walls, currentSnapPoint, setCurrentSnapPoint } = useCadStore();

  // Reúne todos os Endpoints ativos (vértices de áreas e paredes) em uma lista 2D plana
  const endpoints = useMemo(() => {
    if (!snapsEnabled) return [];
    const pts: { x: number; y: number }[] = [];
    
    areas.forEach(area => {
      area.points.forEach(p => pts.push({ x: p.x, y: p.y }));
    });
    
    walls.forEach(w => {
      pts.push({ x: w.p1.x, y: w.p1.y });
      pts.push({ x: w.p2.x, y: w.p2.y });
    });

    return pts;
  }, [areas, walls, snapsEnabled]);

  // Se não está em nenhuma ferramenta de desenho, não precisa calcular snap.
  if (!snapsEnabled || activeTool === 'SELECT') return null;

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // Para economizar cálculo, se estourar o limite não ativamos Snap
    if (endpoints.length === 0) return;

    // Converte R3F (X, Z) para CAD (X, -Y)
    const cadX = e.point.x;
    const cadY = -e.point.z;

    let closestDist = Infinity;
    let closestPt = null;

    const SNAP_RADIUS = 0.6; // Raio magnético de 60 centímetros

    for (const pt of endpoints) {
      const dist = Math.sqrt(Math.pow(pt.x - cadX, 2) + Math.pow(pt.y - cadY, 2));
      if (dist < closestDist) {
        closestDist = dist;
        closestPt = pt;
      }
    }

    if (closestDist <= SNAP_RADIUS && closestPt) {
      setCurrentSnapPoint(closestPt);
    } else {
      // Tenta Snap do GRID (1 metro por padrão)
      const GRID_SIZE = 1.0;
      const snapGridX = Math.round(cadX / GRID_SIZE) * GRID_SIZE;
      const snapGridY = Math.round(cadY / GRID_SIZE) * GRID_SIZE;
      
      const gridDist = Math.sqrt(Math.pow(snapGridX - cadX, 2) + Math.pow(snapGridY - cadY, 2));
      
      if (gridDist <= (SNAP_RADIUS * 0.8)) {
        setCurrentSnapPoint({ x: snapGridX, y: snapGridY });
      } else {
        if (currentSnapPoint !== null) setCurrentSnapPoint(null);
      }
    }
  };

  return (
    <group>
      {/* Raycast Shield invisível ativado sempre nas ferramentas */}
      <mesh 
        position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[2000, 2000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Se houver um snap lock ativo, desenha o icone/indicador visual */}
      {currentSnapPoint && (
        <mesh position={[currentSnapPoint.x, 0.05, -currentSnapPoint.y]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial color="#ef4444" depthTest={false} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
};
