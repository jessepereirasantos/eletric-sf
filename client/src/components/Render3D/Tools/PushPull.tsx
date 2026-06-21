import React, { useState, useMemo } from 'react';
import { useCadStore } from '../../../store/useCadStore';
import type { Area3D } from '../../../store/useCadStore';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { ToolMode } from '../../../types';

export const PushPull: React.FC = () => {
  const { activeTool, areas, updateArea, setActiveTool } = useCadStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Estado de Arraste (Drag)
  const [dragTarget, setDragTarget] = useState<Area3D | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [currentExtrudeHeight, setCurrentExtrudeHeight] = useState<number>(0);

  if (activeTool !== ToolMode.PUSH_PULL) return null;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>, area: Area3D) => {
    e.stopPropagation();
    // Inicia o drag
    setDragTarget(area);
    setDragStartY(e.clientY); // Y da tela, mais previsível do que interseção espacial pra push/pull
    setCurrentExtrudeHeight(area.height || 0.05); // Altura atual como base
    
    // Trava os controles da câmera para não rodar enquanto faz o push
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (dragTarget) {
      e.stopPropagation();
      // O Y cresce pra baixo na tela. Então negativo é "pra cima" no mouse.
      const deltaScreen = dragStartY - e.clientY; 
      
      // Converte pixels da tela para metros (fator de sensibilidade paramétrica)
      const deltaMeters = deltaScreen * 0.05; 
      
      // Soma à altura inicial
      const targetH = (dragTarget.height || 0.05) + deltaMeters;
      setCurrentExtrudeHeight(Math.max(0.01, targetH)); // Não deixa ficar com altura 0
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragTarget) {
      e.stopPropagation();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      
      // "Bake" da geometria extrudada de volta na Store
      updateArea(dragTarget.id, { 
        height: currentExtrudeHeight,
        type: currentExtrudeHeight > 0.5 ? 'teto' : dragTarget.type // teto sinaliza 'bloco/parede' na renderização visual atual
      });
      
      setDragTarget(null);
      setActiveTool(ToolMode.SELECT);
    }
  };

  // Precalcula as formas THREE.Shape de cada área pra gerar os Hitboxes
  const areaShapes = useMemo(() => {
    return areas.map(area => {
      const s = new THREE.Shape();
      if (area.points.length > 2) {
        s.moveTo(area.points[0].x, area.points[0].y);
        for (let i = 1; i < area.points.length; i++) {
          s.lineTo(area.points[i].x, area.points[i].y);
        }
        s.lineTo(area.points[0].x, area.points[0].y);
      }
      return { id: area.id, shape: s, area };
    });
  }, [areas]);

  return (
    <group>
      {/* Um painel invisível gigante só para capturar o Move e Up *durante* o arraste */}
      {dragTarget && (
        <mesh 
          position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {/* Hitboxes sobre cada área para detectar Hover e Click Inicial */}
      {areaShapes.map(({ id, shape, area }) => {
        const isHovered = hoveredId === id && !dragTarget;
        const isDraggingThis = dragTarget?.id === id;

        // Se está sendo arrastado, renderiza o Ghost Mesh subindo!
        // Se está só no hover, pinta uma máscara amarela.
        return (
          <group key={id} position={[0, 0, 0]}>
            {/* O Ghost Mesh ou Hover Mesh */}
            <mesh 
              position={[0, 0, 0]} 
              onPointerEnter={(e) => { e.stopPropagation(); if (!dragTarget) setHoveredId(id); }}
              onPointerLeave={(e) => { e.stopPropagation(); if (hoveredId === id) setHoveredId(null); }}
              onPointerDown={(e) => handlePointerDown(e, area)}
            >
              <extrudeGeometry 
                args={[shape, { 
                  depth: isDraggingThis ? currentExtrudeHeight : (area.height || 0.05), 
                  bevelEnabled: false 
                }]} 
              />
              <meshStandardMaterial 
                color={isDraggingThis ? "#fef08a" : "#facc15"} 
                transparent opacity={isDraggingThis ? 0.8 : (isHovered ? 0.4 : 0.0)} 
                side={THREE.DoubleSide}
                depthTest={false} // Para aparecer por cima da renderização original
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
