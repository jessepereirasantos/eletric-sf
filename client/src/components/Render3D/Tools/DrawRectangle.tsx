import React, { useState } from 'react';
import { useCadStore, Point2D } from '../../../store/useCadStore';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { ToolMode } from '../../../types';

export const DrawRectangle: React.FC = () => {
  const { activeTool, addArea, setActiveTool, currentSnapPoint } = useCadStore();
  const [startPoint, setStartPoint] = useState<Point2D | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point2D | null>(null);

  if (activeTool !== ToolMode.RECTANGLE) return null;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { point } = e;

    // Converte R3F (X, Z) para CAD (X, -Y) devido ao padrão do projeto
    const cadX = currentSnapPoint ? currentSnapPoint.x : point.x;
    const cadY = currentSnapPoint ? currentSnapPoint.y : -point.z;

    if (!startPoint) {
      setStartPoint({ x: cadX, y: cadY });
      setCurrentPoint({ x: cadX, y: cadY });
    } else {
      // Segundo clique, finaliza a forma
      const p1 = startPoint;
      const p2 = { x: cadX, y: p1.y };
      const p3 = { x: cadX, y: cadY };
      const p4 = { x: p1.x, y: cadY };

      addArea({
        points: [p1, p2, p3, p4],
        type: 'piso'
      });

      setStartPoint(null);
      setCurrentPoint(null);
      setActiveTool(ToolMode.SELECT); // Voltar para seleção após desenhar
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!startPoint) return;
    const { point } = e;
    setCurrentPoint({ 
      x: currentSnapPoint ? currentSnapPoint.x : point.x, 
      y: currentSnapPoint ? currentSnapPoint.y : -point.z 
    });
  };

  // Criação do Mesh de Preview visual (Ghost)
  const renderPreview = () => {
    if (!startPoint || !currentPoint) return null;

    const width = currentPoint.x - startPoint.x;
    const height = currentPoint.y - startPoint.y;

    const centerX = startPoint.x + width / 2;
    const centerZ = -(startPoint.y + height / 2); // Retorna de CAD Y para R3F Z

    return (
      <mesh position={[centerX, 0.01, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.abs(width), Math.abs(height)]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    );
  };

  return (
    <group>
      {/* Hitbox Raycaster de Tela Inteira */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {renderPreview()}
    </group>
  );
};
