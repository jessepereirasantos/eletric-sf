import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Image, Circle, Group, Text, Transformer } from 'react-konva';
import { useCadStore } from '../../store/useCadStore';
import type { Point2D, Device, Wall } from '../../store/useCadStore';
import { getClosestPointOnSegment, getWallVertices, computeMiterJoints } from '../../utils/geometry';
import { DeviceSymbol } from './DeviceSymbol';
import { calculateWiringRouting } from '../../utils/pathfinding';

interface CadCanvasProps {
  width: number;
  height: number;
}

const getConduitPoints = (p1: Point2D, p2: Point2D, inWall: boolean) => {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return { points: [p1.x, p1.y, p2.x, p2.y], midPoint: p1, angle: 0 };

  if (inWall) {
    return {
      points: [p1.x, p1.y, p2.x, p2.y],
      midPoint: { x: midX, y: midY },
      angle: Math.atan2(dy, dx) * (180 / Math.PI),
    };
  }

  const offset = Math.min(dist * 0.12, 40);
  const nx = -dy / dist;
  const ny = dx / dist;
  const ctrlX = midX + nx * offset;
  const ctrlY = midY + ny * offset;

  return {
    points: [p1.x, p1.y, ctrlX, ctrlY, p2.x, p2.y],
    midPoint: { x: ctrlX, y: ctrlY },
    angle: Math.atan2(dy, dx) * (180 / Math.PI),
  };
};

const isEsquadria = (type: string) => {
  return type.startsWith('door') || type === 'window' || type === 'open_van';
};

const isConduitInWall = (devA: Device, devB: Device, walls: Wall[]): boolean => {
  const isCeilingA = devA.type === 'ceiling_light' || devA.type === 'lampada' || devA.type === 'box_octogonal' || devA.type === 'fluorescent';
  const isCeilingB = devB.type === 'ceiling_light' || devB.type === 'lampada' || devB.type === 'box_octogonal' || devB.type === 'fluorescent';
  if (isCeilingA || isCeilingB) return false;

  for (const wall of walls) {
    const resA = getClosestPointOnSegment({ x: devA.x, y: devA.y }, wall.p1, wall.p2);
    const resB = getClosestPointOnSegment({ x: devB.x, y: devB.y }, wall.p1, wall.p2);

    const maxDist = wall.thickness / 2 + 0.05; // 5cm de tolerância além da face da parede
    if (resA.distance <= maxDist && resB.distance <= maxDist) {
      return true;
    }
  }
  return false;
};

const getWallVans = (wall: Wall, devs: Device[]) => {
  const vans: { start: number; end: number }[] = [];
  const L = Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(wall.p2.y - wall.p1.y, 2));
  if (L === 0) return [];
  const dx = (wall.p2.x - wall.p1.x) / L;
  const dy = (wall.p2.y - wall.p1.y) / L;
  const wallAngle = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x) * (180 / Math.PI);

  devs.forEach(dev => {
    if (!isEsquadria(dev.type)) return;

    // Filtro de alinhamento angular: esquadrias só recortam a parede se forem paralelas a ela (diferença < 25°)
    let angleDiff = Math.abs((dev.rotation - wallAngle) % 180);
    if (angleDiff > 90) angleDiff = 180 - angleDiff;
    if (angleDiff > 25) return; // Se for perpendicular, ignora o recorte nesta parede

    const toDevX = dev.x - wall.p1.x;
    const toDevY = dev.y - wall.p1.y;
    const t = toDevX * dx + toDevY * dy;
    const projX = wall.p1.x + t * dx;
    const projY = wall.p1.y + t * dy;
    const dist = Math.sqrt(Math.pow(dev.x - projX, 2) + Math.pow(dev.y - projY, 2));

    if (dist < wall.thickness * 1.5 && t >= -0.1 && t <= L + 0.1) {
      let width = dev.width;
      if (width === undefined) {
        width = 0.8;
        if (dev.type === 'window') width = 1.2;
        else if (dev.type === 'open_van') width = 1.0;
      }

      let start = t;
      let end = t + width;

      if (dev.type === 'window' || dev.type === 'open_van' || dev.type === 'door_correr') {
        start = t - width / 2;
        end = t + width / 2;
      } else if (dev.type === 'door' || dev.type === 'door_pivotante') {
        if (dev.flip) {
          start = t - width;
          end = t;
        } else {
          start = t;
          end = t + width;
        }
      }

      start = Math.max(0, start);
      end = Math.min(L, end);

      if (start < end) {
        vans.push({ start, end });
      }
    }
  });

  vans.sort((a, b) => a.start - b.start);
  const mergedVans: { start: number; end: number }[] = [];
  vans.forEach(v => {
    if (mergedVans.length === 0) {
      mergedVans.push(v);
    } else {
      const last = mergedVans[mergedVans.length - 1];
      if (v.start <= last.end) {
        last.end = Math.max(last.end, v.end);
      } else {
        mergedVans.push(v);
      }
    }
  });

  return mergedVans;
};

export const CadCanvas: React.FC<CadCanvasProps> = ({ width, height }) => {
  const {
    ppm, bgImageSrc, bgImageLock, bgImageScale, bgImagePos, bgImageRotation, bgImageSelected,
    isCalibrating, calibrationPoints, zoom, pan, showGrid,
    walls, devices, circuits, conduits,
    currentTool, selectedDeviceType, activeWallPoints, selectedDeviceId, selectedWallId,
    setZoom, setPan, setBgImagePos, setBgImageRotation, setBgImageSelected, addCalibrationPoint, setIsCalibrating,
    setSelectedDeviceId, setSelectedWallId, setSelectedConduitId, clearSelection,
    addWall, addActiveWallPoint, clearActiveWallPoints,
    addDevice, addConduit, selectedConduitId,
    paperSpaceActive, paperSize, paperScale, paperPos,
    paperTitle, paperOwner, paperDesigner, paperDate, paperSheetNum,
    setPaperPos,
    // Novos estados e ações adicionados
    guideLines, selectedGuideLineId, selectedGuideType,
    texts, selectedTextId,
    dimensions, selectedDimensionId, activeDimensionPoints,
    addGuideLine, setSelectedGuideLineId,
    addText, updateTextPosition, setSelectedTextId,
    addDimension, addActiveDimensionPoint, clearActiveDimensionPoints, setSelectedDimensionId,
    updateWall,
  } = useCadStore();

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [conduitStartDeviceId, setConduitStartDeviceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point2D>({ x: 0, y: 0 });
  const [snappedMousePos, setSnappedMousePos] = useState<Point2D>({ x: 0, y: 0 });
  const [deviceSnapInfo, setDeviceSnapInfo] = useState<{
    point: Point2D; rotation: number; isSnapped: boolean;
  } | null>(null);
  const [snappedWallPoint, setSnappedWallPoint] = useState<Point2D | null>(null);
  const [doorCycle, setDoorCycle] = useState<number>(0);
  const [activeHandle, setActiveHandle] = useState<{ wallId: string; pointKey: 'p1' | 'p2' } | null>(null);
  const [conduitSnapDevice, setConduitSnapDevice] = useState<Device | null>(null);

  const { updateDeviceProperties, setBgImageScale } = useCadStore();

  const getWallDragSnap = (pt: Point2D, excludeWallId?: string): Point2D => {
    let snapPt = { ...pt };
    const tolerance = 12 / (ppm * zoom);

    // 1. Prioridade Máxima: Cruzamento / Interseção de linhas de guia
    let closestGuideX: number | null = null;
    let closestGuideY: number | null = null;
    let minGuideXDist = Infinity;
    let minGuideYDist = Infinity;

    if (guideLines && guideLines.length > 0) {
      guideLines.forEach(g => {
        const dist = Math.abs(pt.x - g.value);
        if (g.type === 'vertical') {
          if (dist <= tolerance && dist < minGuideXDist) {
            minGuideXDist = dist;
            closestGuideX = g.value;
          }
        } else if (g.type === 'horizontal') {
          const distY = Math.abs(pt.y - g.value);
          if (distY <= tolerance && distY < minGuideYDist) {
            minGuideYDist = distY;
            closestGuideY = g.value;
          }
        }
      });
    }

    // Se temos tanto guia vertical quanto horizontal na tolerância, gruda na interseção
    if (closestGuideX !== null && closestGuideY !== null) {
      snapPt.x = closestGuideX;
      snapPt.y = closestGuideY;
      return snapPt;
    }

    // 2. Segunda Prioridade: Guias individuais (vertical ou horizontal)
    let snappedToGuide = false;
    if (closestGuideX !== null) {
      snapPt.x = closestGuideX;
      snappedToGuide = true;
    }
    if (closestGuideY !== null) {
      snapPt.y = closestGuideY;
      snappedToGuide = true;
    }

    // 3. Terceira Prioridade: Snap magnético em quinas de outras paredes
    let minCornerDist = Infinity;
    let closestCorner: Point2D | null = null;

    walls.forEach(w => {
      if (excludeWallId && w.id === excludeWallId) return;
      [w.p1, w.p2].forEach(corner => {
        const dist = Math.sqrt(Math.pow(pt.x - corner.x, 2) + Math.pow(pt.y - corner.y, 2));
        if (dist < tolerance && dist < minCornerDist) {
          minCornerDist = dist;
          closestCorner = corner;
        }
      });
    });

    if (closestCorner) {
      // Se não estiver em guia, ou se a quina estiver muito próxima (metade da tolerância), gruda na quina
      if (!snappedToGuide || minCornerDist < tolerance * 0.6) {
        return closestCorner;
      }
    }

    // 4. Quarta Prioridade: Snap magnético ao longo do segmento (corpo) de outras paredes
    let minSegmentDist = Infinity;
    let closestSegmentPoint: Point2D | null = null;

    walls.forEach(w => {
      if (excludeWallId && w.id === excludeWallId) return;
      const res = getClosestPointOnSegment(pt, w.p1, w.p2);
      if (res.distance < tolerance && res.distance < minSegmentDist) {
        minSegmentDist = res.distance;
        closestSegmentPoint = res.point;
      }
    });

    if (closestSegmentPoint) {
      return closestSegmentPoint;
    }

    return snapPt;
  };

  const isPointConnected = (pt: Point2D, currentWallId: string) => {
    return walls.some(w => {
      if (w.id === currentWallId) return false;
      const res = getClosestPointOnSegment(pt, w.p1, w.p2);
      return res.distance <= 0.05; // tolerância de 5cm
    });
  };

  const getDeviceWallThickness = (dev: Device) => {
    if (!isEsquadria(dev.type)) return undefined;
    
    let minDistance = Infinity;
    let snapWall: Wall | null = null;
    walls.forEach(wall => {
      const res = getClosestPointOnSegment(dev, wall.p1, wall.p2);
      if (res.distance < minDistance) {
        minDistance = res.distance;
        snapWall = wall;
      }
    });
    if (snapWall && minDistance <= 0.45) {
      return (snapWall as Wall).thickness;
    }
    return undefined;
  };

  useEffect(() => {
    if (stageRef.current) {
      (window as any).cadStage = stageRef.current;
    }
    return () => {
      (window as any).cadStage = null;
    };
  }, [stageRef.current]);

  useEffect(() => {
    if (!stageRef.current || !transformerRef.current) return;
    if (selectedDeviceId) {
      const node = stageRef.current.findOne('#' + selectedDeviceId);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
        return;
      }
    } else if (bgImageSelected) {
      const node = stageRef.current.findOne('#bg-image-node');
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
        return;
      }
    }
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedDeviceId, bgImageSelected, devices, imageObj]);

  const isPanning = useRef(false);
  const startPanPos = useRef<Point2D>({ x: 0, y: 0 });
  const stageOffset = useRef<Point2D>({ x: 0, y: 0 });

  useEffect(() => {
    if (bgImageSrc) {
      const img = new window.Image();
      img.src = bgImageSrc;
      img.onload = () => setImageObj(img);
    } else {
      setImageObj(null);
    }
  }, [bgImageSrc]);

  useEffect(() => {
    const { undo, redo, removeDevice: delDev, removeWall: delWall } = useCadStore.getState();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const { selectedDeviceId: sid, devices, currentTool: tool, selectedDeviceType: devType } = useCadStore.getState();
        if (sid) {
          const dev = devices.find(d => d.id === sid);
          if (dev && (dev.type.startsWith('door') || dev.type === 'window' || dev.type === 'open_van')) {
            const has180 = Math.round(dev.rotation / 180) % 2 === 1;
            let currentCycle = 0;
            if (!dev.flip && !has180) currentCycle = 0;
            else if (dev.flip && !has180) currentCycle = 1;
            else if (!dev.flip && has180) currentCycle = 2;
            else if (dev.flip && has180) currentCycle = 3;

            const nextCycle = (currentCycle + 1) % 4;
            const nextFlip = nextCycle === 1 || nextCycle === 3;
            const baseRot = dev.rotation - (has180 ? 180 : 0);
            const nextRot = (baseRot + (nextCycle >= 2 ? 180 : 0)) % 360;

            updateDeviceProperties(sid, { flip: nextFlip, rotation: nextRot });
          }
        } else if (tool === 'device' && devType && isEsquadria(devType)) {
          setDoorCycle(prev => (prev + 1) % 4);
        }
      }

      if (e.key === 'Escape') {
        clearActiveWallPoints();
        setConduitStartDeviceId(null);
        clearSelection();
        clearActiveDimensionPoints();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const {
          selectedDeviceId: sid,
          selectedWallId: wid,
          selectedGuideLineId: gid,
          selectedTextId: tid,
          selectedDimensionId: did,
          selectedConduitId: cid,
          removeGuideLine: delGuide,
          removeText: delText,
          removeDimension: delDim,
          removeConduit: delConduit,
        } = useCadStore.getState();
        if (sid) delDev(sid);
        if (wid) delWall(wid);
        if (gid) delGuide(gid);
        if (tid) delText(tid);
        if (did) delDim(did);
        if (cid) delConduit(cid);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearActiveWallPoints, clearSelection, clearActiveDimensionPoints]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const scaleBy = 1.15;
    const newScale = Math.max(0.05, Math.min(e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy, 30));
    stage.scale({ x: newScale, y: newScale });
    const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    stage.position(newPos);
    setZoom(newScale);
    setPan(newPos);
    stage.batchDraw();
  };

  const handleMouseDown = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (e.evt.button === 1 || e.evt.button === 2) {
      e.evt.preventDefault();
      isPanning.current = true;
      startPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      stageOffset.current = { x: stage.x(), y: stage.y() };
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (isPanning.current) {
      const dx = e.evt.clientX - startPanPos.current.x;
      const dy = e.evt.clientY - startPanPos.current.y;
      const newPos = { x: stageOffset.current.x + dx, y: stageOffset.current.y + dy };
      stage.position(newPos);
      setPan(newPos);
      stage.batchDraw();
      return;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const realPos = {
      x: (pointer.x - stage.x()) / (ppm * zoom),
      y: (pointer.y - stage.y()) / (ppm * zoom),
    };
    setMousePos(realPos);
    
    const tolerance = 12 / (ppm * zoom);

    // Se estivermos na ferramenta de eletroduto manual
    if (currentTool === 'conduit') {
      let closestDev: Device | null = null;
      let minDist = Infinity;
      const snapRadius = 40 / (ppm * zoom); // 40 pixels na tela
      
      devices.forEach(d => {
        const dist = Math.sqrt(Math.pow(realPos.x - d.x, 2) + Math.pow(realPos.y - d.y, 2));
        if (dist < snapRadius && dist < minDist) {
          minDist = dist;
          closestDev = d;
        }
      });
      
      setConduitSnapDevice(closestDev);
      
      if (closestDev) {
        setSnappedMousePos({ x: (closestDev as Device).x, y: (closestDev as Device).y });
      } else {
        setSnappedMousePos(realPos);
      }
      return;
    } else {
      setConduitSnapDevice(null);
    }

    // Se estivermos arrastando uma alça de parede
    if (activeHandle) {
      const snapped = getWallDragSnap(realPos, activeHandle.wallId);
      let finalPos = { ...snapped };
      
      // Trava ortogonal (Shift key) para esticar a parede reta
      if (e.evt.shiftKey) {
        const targetWall = walls.find(w => w.id === activeHandle.wallId);
        if (targetWall) {
          const fixedPoint = activeHandle.pointKey === 'p1' ? targetWall.p2 : targetWall.p1;
          const dx = Math.abs(snapped.x - fixedPoint.x);
          const dy = Math.abs(snapped.y - fixedPoint.y);
          if (dx > dy) {
            finalPos.y = fixedPoint.y;
          } else {
            finalPos.x = fixedPoint.x;
          }
        }
      }
      
      updateWall(activeHandle.wallId, { [activeHandle.pointKey]: finalPos });
      stage.batchDraw();
      return;
    }

    const { meterSpacing } = getGridConfig();
    let snappedX = realPos.x;
    let snappedY = realPos.y;
    let snappedToGuideX = false;
    let snappedToGuideY = false;

    // Novo Snap de quinas de parede para a ferramenta de cota
    let snapWallPoint: Point2D | null = null;
    let minCornerDist = Infinity;

    if (currentTool === 'dimension') {
      walls.forEach(w => {
        [w.p1, w.p2].forEach(pt => {
          const dist = Math.sqrt(Math.pow(realPos.x - pt.x, 2) + Math.pow(realPos.y - pt.y, 2));
          if (dist < minCornerDist) {
            minCornerDist = dist;
            snapWallPoint = pt;
          }
        });
      });
      if (minCornerDist <= tolerance * 1.5 && snapWallPoint) { // Tolerância dinâmica para quinas
        const pt = snapWallPoint as Point2D;
        snappedX = pt.x;
        snappedY = pt.y;
        snappedToGuideX = true;
        snappedToGuideY = true;
      } else {
        snapWallPoint = null;
      }
    }
    setSnappedWallPoint(snapWallPoint);

    if (!snappedToGuideX || !snappedToGuideY) {
      if (guideLines && guideLines.length > 0) {
        guideLines.forEach(g => {
          if (g.type === 'vertical' && !snappedToGuideX) {
            if (Math.abs(realPos.x - g.value) <= tolerance) {
              snappedX = g.value;
              snappedToGuideX = true;
            }
          } else if (g.type === 'horizontal' && !snappedToGuideY) {
            if (Math.abs(realPos.y - g.value) <= tolerance) {
              snappedY = g.value;
              snappedToGuideY = true;
            }
          }
        });

        // Snap de interseção de guias se estiver desenhando cota/parede/outro
        let closestX: number | null = null;
        let closestY: number | null = null;
        guideLines.forEach(g => {
          if (g.type === 'vertical' && Math.abs(realPos.x - g.value) <= tolerance) closestX = g.value;
          else if (g.type === 'horizontal' && Math.abs(realPos.y - g.value) <= tolerance) closestY = g.value;
        });
        if (closestX !== null && closestY !== null) {
          snappedX = closestX;
          snappedY = closestY;
          snappedToGuideX = true;
          snappedToGuideY = true;
        }
      }
    }

    if (!snappedToGuideX) {
      snappedX = Math.round(realPos.x / meterSpacing) * meterSpacing;
    }
    if (!snappedToGuideY) {
      snappedY = Math.round(realPos.y / meterSpacing) * meterSpacing;
    }

    let snappedPos = currentTool === 'wall' ? getWallDragSnap(realPos) : { x: snappedX, y: snappedY };
    
    // Trava ortogonal (Shift key) para o desenho de paredes
    if (currentTool === 'wall' && activeWallPoints.length === 1) {
      const p1 = activeWallPoints[0];
      const rawSnapped = getWallDragSnap(realPos);
      snappedPos = { ...rawSnapped };
      if (e.evt.shiftKey) {
        const dx = Math.abs(rawSnapped.x - p1.x);
        const dy = Math.abs(rawSnapped.y - p1.y);
        if (dx > dy) {
          snappedPos.y = p1.y;
        } else {
          snappedPos.x = p1.x;
        }
      }
    }
    
    setSnappedMousePos(snappedPos);

    if (currentTool === 'device' && selectedDeviceType) {
      calculateDeviceSnap(realPos);
    } else {
      setDeviceSnapInfo(null);
    }
  };

  const handleMouseUp = () => { 
    isPanning.current = false; 
    if (activeHandle) {
      setActiveHandle(null);
      useCadStore.getState().recomputeDerivedState();
    }
  };

  const calculateDeviceSnap = (mouseReal: Point2D) => {
    const freeTypes = ['lampada', 'ceiling_light', 'fluorescent', 'qdc', 'poste', 'medidor', 'box_octogonal'];
    if (freeTypes.includes(selectedDeviceType!)) {
      setDeviceSnapInfo({ point: mouseReal, rotation: 0, isSnapped: false });
      return;
    }
    let minDistance = Infinity;
    let snapPos: Point2D = mouseReal;
    let snapRotation = 0;
    const tolerance = (12 / (ppm * zoom)) * 2.5; // tolerância maior para grudar dispositivos facilmente
    
    walls.forEach(wall => {
      const res = getClosestPointOnSegment(mouseReal, wall.p1, wall.p2);
      if (res.distance < minDistance) {
        minDistance = res.distance;
        snapPos = res.point;
        if (isEsquadria(selectedDeviceType!)) {
          const isDoor = selectedDeviceType!.startsWith('door');
          const rotationOffset = (isDoor && (doorCycle === 2 || doorCycle === 3)) ? 180 : 0;
          snapRotation = (res.angle + rotationOffset) % 360;
        } else {
          const sideOffset = res.side > 0 ? 90 : -90;
          snapRotation = res.angle + sideOffset;
        }
      }
    });
    // Para esquadrias (portas/janelas) e tomadas/interruptores, o snap só é considerado válido se estiver perto de uma parede
    const isSnapped = minDistance <= tolerance;
    setDeviceSnapInfo({ point: isSnapped ? snapPos : mouseReal, rotation: isSnapped ? snapRotation : 0, isSnapped });
  };

  const handleStageClick = (e: any) => {
    if (e.evt.button === 1 || e.evt.button === 2) {
      e.evt.preventDefault();
      if (e.evt.button === 2) {
        if (currentTool === 'wall') clearActiveWallPoints();
        else if (currentTool === 'conduit') setConduitStartDeviceId(null);
        else if (currentTool === 'dimension') clearActiveDimensionPoints();
      }
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const clickPixels = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
    const clickMetres = { x: clickPixels.x / ppm, y: clickPixels.y / ppm };

    if (isCalibrating) {
      if (calibrationPoints.length < 2) {
        addCalibrationPoint(clickPixels);
        if (calibrationPoints.length === 1) {
          const p1 = calibrationPoints[0];
          const p2 = clickPixels;
          setTimeout(() => {
            const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            const m = window.prompt(`Distância no canvas: ${distPx.toFixed(1)}px.\nDigite a distância real em metros:`);
            if (m) {
              const metros = parseFloat(m.replace(',', '.'));
              if (!isNaN(metros) && metros > 0) {
                // Calibração proporcional: ajusta a escala da imagem de fundo para se adequar ao ppm global fixo
                const newScale = bgImageScale * (metros * ppm) / distPx;
                setBgImageScale(newScale);
              }
            }
            setIsCalibrating(false);
          }, 100);
        }
      }
      return;
    }

    if (currentTool === 'wall') {
      const snapped = snappedMousePos; // Usa a coordenada calculada com snap e visualizada no handleMouseMove
      if (activeWallPoints.length === 0) {
        addActiveWallPoint(snapped);
      } else {
        const p1 = activeWallPoints[0];
        if (p1.x !== snapped.x || p1.y !== snapped.y) {
          addWall(p1, snapped, 0.15);
          clearActiveWallPoints();
          addActiveWallPoint(snapped);
        }
      }
      return;
    }

    if (currentTool === 'guide_line') {
      addGuideLine(selectedGuideType, selectedGuideType === 'vertical' ? clickMetres.x : clickMetres.y);
      return;
    }

    if (currentTool === 'text') {
      const textVal = window.prompt('Digite o texto da anotação:');
      if (textVal && textVal.trim() !== '') {
        addText({
          x: clickMetres.x,
          y: clickMetres.y,
          text: textVal.trim(),
          fontSize: 14,
        });
      }
      return;
    }

    if (currentTool === 'dimension') {
      const targetPoint = snappedWallPoint || snappedMousePos;
      const { lastDimensionOffset } = useCadStore.getState();
      
      if (!activeDimensionPoints || activeDimensionPoints.length === 0) {
        addActiveDimensionPoint(targetPoint);
      } else if (activeDimensionPoints.length === 1) {
        const p1 = activeDimensionPoints[0];
        if (p1.x !== targetPoint.x || p1.y !== targetPoint.y) {
          if (lastDimensionOffset !== null) {
            // Se já temos um offset da cota anterior, cria a cota sequencial instantaneamente
            addDimension(p1, targetPoint, lastDimensionOffset);
            useCadStore.setState({ activeDimensionPoints: [targetPoint] });
          } else {
            addActiveDimensionPoint(targetPoint);
          }
        }
      } else if (activeDimensionPoints.length === 2) {
        const p1 = activeDimensionPoints[0];
        const p2 = activeDimensionPoints[1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const L = Math.sqrt(dx * dx + dy * dy);
        let offset = 0;
        if (L > 0) {
          const nx = -dy / L;
          const ny = dx / L;
          offset = (clickMetres.x - p1.x) * nx + (clickMetres.y - p1.y) * ny;
        }
        addDimension(p1, p2, offset);
        // Salva o offset e redefine o activeDimensionPoints para continuar a cota a partir de p2
        useCadStore.setState({
          activeDimensionPoints: [p2],
          lastDimensionOffset: offset,
        });
      }
      return;
    }

    if (currentTool === 'device' && selectedDeviceType && deviceSnapInfo) {
      // Bloquear inserção de esquadrias (portas/janelas) fora de paredes
      if (isEsquadria(selectedDeviceType) && !deviceSnapInfo.isSnapped) {
        alert('Atenção: Portas e janelas só podem ser inseridas sobre uma parede existente!');
        return;
      }

      const powerMap: Record<string, number> = {
        // Tomadas TUG
        tug_baixa: 100, tomada_baixa: 100,
        tug_media: 100, tomada_media: 100,
        tug_alta: 100, tomada_alta: 100,
        tomada_220: 1500,
        // Tomadas TUE
        tue_chuveiro: 5500,
        tue_ar: 1500,
        // Cargas do Catálogo
        motor: 750, // 1 CV ~750W
        bomba_agua: 375, // 0.5 CV ~375W
        torneira_eletrica: 4400,
        // Iluminação
        ceiling_light: 60, lampada: 60,
        sconce: 40, lampada_parede: 40,
        fluorescent: 40,
        // Interruptores e Comandos (0W)
        switch_simple: 0, interruptor: 0,
        switch_parallel: 0, switch_intermediate: 0,
        interruptor_duplo: 0, interruptor_triplo: 0,
        interruptor_teleruptora: 0,
        sensor_presenca: 0,
        fotocelula: 0,
        campainha: 15,
        // Telecom e outros
        tele_rj45: 0, tele_rj11: 0, tele_coaxial: 0,
        cftv_camera: 10, central_alarme: 20,
        // Caixas e infraestrutura
        qdc: 0, poste: 0, medidor: 0, meter: 0,
        box_octogonal: 0, box_4x2: 0, box_4x4: 0
      };

      const voltageMap: Record<string, 127 | 220> = {
        tomada_220: 220,
        tue_chuveiro: 220,
        tue_ar: 220,
        motor: 220,
        bomba_agua: 220,
        torneira_eletrica: 220
      };
      
      const isDoor = selectedDeviceType.startsWith('door');
      const finalFlip = isDoor ? (doorCycle === 1 || doorCycle === 3) : false;

      // Fase inicial para novas cargas do catálogo
      const isCargaCatalogo = ['motor', 'bomba_agua', 'torneira_eletrica'].includes(selectedDeviceType);
      const phasesDefault = isCargaCatalogo ? 'mono' : undefined;

      addDevice({
        type: selectedDeviceType,
        name: getDeviceFriendlyName(selectedDeviceType),
        x: deviceSnapInfo.point.x,
        y: deviceSnapInfo.point.y,
        rotation: deviceSnapInfo.rotation,
        power: powerMap[selectedDeviceType] ?? 100,
        voltage: voltageMap[selectedDeviceType] ?? 127,
        flip: finalFlip,
        phases: phasesDefault as any,
      });
      return;
    }

    if (currentTool === 'conduit') {
      const targetDev = conduitSnapDevice;
      if (targetDev) {
        if (!conduitStartDeviceId) {
          setConduitStartDeviceId(targetDev.id);
        } else {
          addConduit(conduitStartDeviceId, targetDev.id);
          setConduitStartDeviceId(null);
        }
      } else {
        setConduitStartDeviceId(null);
      }
      return;
    }

    if (currentTool === 'select') {
      let closestWallId: string | null = null;
      let minDist = Infinity;
      walls.forEach(wall => {
        const res = getClosestPointOnSegment(clickMetres, wall.p1, wall.p2);
        if (res.distance < wall.thickness * 1.2 && res.distance < minDist) {
          minDist = res.distance;
          closestWallId = wall.id;
        }
      });
      if (closestWallId) {
        setSelectedWallId(closestWallId);
      } else {
        clearSelection();
      }
    }
  };

  const getDeviceFriendlyName = (type: string): string => {
    const names: Record<string, string> = {
      // Tomadas TUG e TUE
      tug_baixa: 'Tomada TUG Baixa 10A (0.3m)',
      tomada_baixa: 'Tomada TUG Baixa 10A (0.3m)',
      tug_media: 'Tomada TUG Média 10A (1.1m)',
      tomada_media: 'Tomada TUG Média 10A (1.1m)',
      tug_alta: 'Tomada TUG Alta 10A (2.2m)',
      tomada_alta: 'Tomada TUG Alta 10A (2.2m)',
      tomada_220: 'Tomada Específica 20A 220V (1.1m)',
      tue_chuveiro: 'Tomada TUE Chuveiro (2.2m)',
      tue_ar: 'Tomada TUE Ar Condicionado (2.2m)',
      
      // Cargas do Catálogo
      motor: 'Motor Elétrico (Força)',
      bomba_agua: 'Bomba d\'Água (Força)',
      torneira_eletrica: 'Torneira Elétrica (Força)',
      
      // Iluminação
      ceiling_light: 'Ponto de Luz no Teto',
      lampada: 'Ponto de Luz no Teto',
      sconce: 'Arandela (Ponto de Luz na Parede)',
      lampada_parede: 'Arandela (Ponto de Luz na Parede)',
      fluorescent: 'Lâmpada Fluorescente (Teto)',
      
      // Interruptores e Sensores (Comandos)
      switch_simple: 'Interruptor Simples (1.1m)',
      interruptor: 'Interruptor Simples (1.1m)',
      switch_parallel: 'Interruptor Paralelo 3-Way (1.1m)',
      switch_intermediate: 'Interruptor Intermediário 4-Way (1.1m)',
      interruptor_duplo: 'Interruptor Duplo (1.1m)',
      interruptor_triplo: 'Interruptor Triplo (1.1m)',
      interruptor_teleruptora: 'Interruptor Telerruptora (1.1m)',
      sensor_presenca: 'Sensor de Presença (Parede)',
      fotocelula: 'Relé Fotocélula (Parede)',
      campainha: 'Campainha / Cigarra',
      
      // Telecom e Segurança
      tele_rj45: 'Tomada RJ45 (Rede/Dados)',
      tele_rj11: 'Tomada RJ11 (Telefone)',
      tele_coaxial: 'Tomada Coaxial (TV)',
      cftv_camera: 'Câmera CFTV',
      central_alarme: 'Central de Alarme',
      
      // Infraestrutura
      qdc: 'Quadro de Distribuição (QDC)',
      poste: 'Poste Padrão de Entrada',
      medidor: 'Caixa de Medição Concessionária',
      meter: 'Caixa de Medição Concessionária',
      box_octogonal: 'Caixa Octogonal (Teto)',
      box_4x2: 'Caixa 4x2 (Parede)',
      box_4x4: 'Caixa 4x4 (Parede)',
    };
    return names[type] ?? 'Dispositivo Elétrico';
  };

  const getGridConfig = () => {
    let spacingMeters = 1.0;
    const minPx = 40;
    const pixPerMeter = ppm * zoom;
    if (pixPerMeter < minPx) {
      for (const r of [1, 2, 5, 10, 20, 50, 100]) {
        if (pixPerMeter * r >= minPx) { spacingMeters = r; break; }
      }
    } else {
      for (const s of [0.5, 0.2, 0.1, 0.05, 0.01]) {
        if (pixPerMeter * s >= minPx) spacingMeters = s; else break;
      }
    }
    return { spacing: spacingMeters * ppm, meterSpacing: spacingMeters };
  };

  const { spacing } = getGridConfig();

  // ─── Grid técnico fino (sempre visível) ──────────────────────
  const gridLines: React.ReactNode[] = [];
  if (spacing > 0) {
    const stageX = stageRef.current?.x() ?? pan.x;
    const stageY = stageRef.current?.y() ?? pan.y;
    const startX = Math.floor((-stageX / zoom) / spacing) * spacing;
    const endX = startX + (width / zoom) + spacing * 2;
    const startY = Math.floor((-stageY / zoom) / spacing) * spacing;
    const endY = startY + (height / zoom) + spacing * 2;

    for (let gx = startX; gx <= endX; gx += spacing) {
      const m = Math.round(gx / ppm);
      const isMajor = m % 5 === 0;
      gridLines.push(
        <Line key={`v-${gx}`}
          points={[gx, startY, gx, endY]}
          stroke={isMajor ? '#d4d4d8' : '#e5e7eb'}
          strokeWidth={isMajor ? 0.6 : 0.3}
          listening={false}
        />
      );
    }
    for (let gy = startY; gy <= endY; gy += spacing) {
      const m = Math.round(gy / ppm);
      const isMajor = m % 5 === 0;
      gridLines.push(
        <Line key={`h-${gy}`}
          points={[startX, gy, endX, gy]}
          stroke={isMajor ? '#d4d4d8' : '#e5e7eb'}
          strokeWidth={isMajor ? 0.6 : 0.3}
          listening={false}
        />
      );
    }
  }

  const miterMap = computeMiterJoints(walls);

  const wiringRouting = calculateWiringRouting(devices, conduits, circuits);

  const cursorStyle = isCalibrating ? 'crosshair'
    : currentTool === 'wall' || currentTool === 'conduit' ? 'crosshair'
    : currentTool === 'device' ? 'cell'
    : 'default';

  const renderedWallsData = walls.map(wall => {
    const miter = miterMap.get(wall.id);
    const isSelected = selectedWallId === wall.id;
    const strokeColor = isSelected ? '#0078d7' : '#475569';
    const fillColor = isSelected ? 'rgba(0, 120, 215, 0.08)' : '#e2e8f0';
    const sw = (isSelected ? 2.0 : 1.5) / zoom;

    const L = Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(wall.p2.y - wall.p1.y, 2));
    if (L === 0) return null;
    const dx = (wall.p2.x - wall.p1.x) / L;
    const dy = (wall.p2.y - wall.p1.y) / L;

    const vans = getWallVans(wall, devices);

    const segments: { s1: number; s2: number }[] = [];
    let lastPos = 0;
    vans.forEach(v => {
      if (v.start > lastPos + 0.01) {
        segments.push({ s1: lastPos, s2: v.start });
      }
      lastPos = v.end;
    });
    if (L > lastPos + 0.01) {
      segments.push({ s1: lastPos, s2: L });
    }
    if (segments.length === 0 && vans.length === 0) {
      segments.push({ s1: 0, s2: L });
    }

    const segmentsPoints = segments.map((seg) => {
      const subP1 = { x: wall.p1.x + seg.s1 * dx, y: wall.p1.y + seg.s1 * dy };
      const subP2 = { x: wall.p1.x + seg.s2 * dx, y: wall.p1.y + seg.s2 * dy };

      const nx = -dy * wall.thickness / 2;
      const ny = dx * wall.thickness / 2;

      let p1Top = { x: subP1.x + nx, y: subP1.y + ny };
      let p1Bot = { x: subP1.x - nx, y: subP1.y - ny };
      let p2Top = { x: subP2.x + nx, y: subP2.y + ny };
      let p2Bot = { x: subP2.x - nx, y: subP2.y - ny };

      if (seg.s1 === 0 && miter) {
        p1Top = miter.p1Top;
        p1Bot = miter.p1Bot;
      }
      if (seg.s2 === L && miter) {
        p2Top = miter.p2Top;
        p2Bot = miter.p2Bot;
      }

      const vertices = [
        p1Top.x * ppm, p1Top.y * ppm,
        p2Top.x * ppm, p2Top.y * ppm,
        p2Bot.x * ppm, p2Bot.y * ppm,
        p1Bot.x * ppm, p1Bot.y * ppm,
      ];

      return {
        seg,
        p1Top,
        p1Bot,
        p2Top,
        p2Bot,
        vertices,
      };
    });

    return {
      wall,
      isSelected,
      strokeColor,
      fillColor,
      sw,
      segmentsPoints,
      L,
    };
  }).filter(Boolean) as Array<{
    wall: Wall;
    isSelected: boolean;
    strokeColor: string;
    fillColor: string;
    sw: number;
    L: number;
    segmentsPoints: Array<{
      seg: { s1: number; s2: number };
      p1Top: Point2D;
      p1Bot: Point2D;
      p2Top: Point2D;
      p2Bot: Point2D;
      vertices: number[];
    }>;
  }>;

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleStageClick}
      x={pan.x}
      y={pan.y}
      scaleX={zoom}
      scaleY={zoom}
      style={{ cursor: cursorStyle, display: 'block', background: paperSpaceActive ? '#e2e8f0' : '#ffffff' }}
    >
      <Layer>
        <Rect
          x={-10000 / zoom}
          y={-10000 / zoom}
          width={width / zoom + 20000 / zoom}
          height={height / zoom + 20000 / zoom}
          fill={paperSpaceActive ? '#f1f5f9' : '#ffffff'}
          listening={false}
        />

        {!paperSpaceActive && showGrid && gridLines}

        {imageObj && (
          <Image
            id="bg-image-node"
            image={imageObj}
            x={bgImagePos.x}
            y={bgImagePos.y}
            scaleX={bgImageScale}
            scaleY={bgImageScale}
            rotation={bgImageRotation}
            opacity={0.45}
            listening={!bgImageLock}
            draggable={!bgImageLock}
            onDragEnd={(e) => setBgImagePos({ x: e.target.x(), y: e.target.y() })}
            onClick={(e) => {
              e.cancelBubble = true;
              if (currentTool === 'select' && !bgImageLock) {
                setBgImageSelected(true);
              }
            }}
          />
        )}
      </Layer>

      <Layer>
        {paperSpaceActive && (() => {
          const dims = {
            A0: { w: 1189, h: 841 },
            A1: { w: 841, h: 594 },
            A2: { w: 594, h: 420 },
            A3: { w: 420, h: 297 },
            A4: { w: 297, h: 210 },
          };
          const paperDim = dims[paperSize] || dims.A3;
          const paperW = (paperDim.w * paperScale) / 1000;
          const paperH = (paperDim.h * paperScale) / 1000;
          const mLeft = (25 * paperScale) / 1000;
          const mOther = ((paperSize === 'A4' ? 5 : 10) * paperScale) / 1000;
          const stampW = (paperSize === 'A4' ? (paperDim.w - 25 - 5) : 175) * paperScale / 1000;
          const stampH = 60 * paperScale / 1000;

          return (
            <Group
              x={paperPos.x * ppm}
              y={paperPos.y * ppm}
              draggable={currentTool === 'select'}
              onDragEnd={(e) => {
                setPaperPos({ x: e.target.x() / ppm, y: e.target.y() / ppm });
              }}
            >
              {/* Folha física branca com borda escura e sombra */}
              <Rect
                x={0}
                y={0}
                width={paperW * ppm}
                height={paperH * ppm}
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth={1.5 / zoom}
                shadowColor="#000000"
                shadowBlur={12}
                shadowOpacity={0.12}
                shadowOffset={{ x: 3, y: 3 }}
              />
              {/* Linha vermelha tracejada para representar área de corte física */}
              <Rect
                x={0}
                y={0}
                width={paperW * ppm}
                height={paperH * ppm}
                stroke="#ef4444"
                strokeWidth={0.7 / zoom}
                dash={[5, 5]}
                listening={false}
              />
              {/* Margens internas regulamentadas pela ABNT */}
              <Rect
                x={mLeft * ppm}
                y={mOther * ppm}
                width={(paperW - mLeft - mOther) * ppm}
                height={(paperH - 2 * mOther) * ppm}
                stroke="#0f172a"
                strokeWidth={1.8 / zoom}
                listening={false}
              />
              {/* Carimbo / Selo ABNT no canto inferior direito */}
              <Group x={(paperW - mOther - stampW) * ppm} y={(paperH - mOther - stampH) * ppm}>
                <Rect
                  x={0}
                  y={0}
                  width={stampW * ppm}
                  height={stampH * ppm}
                  fill="#f8fafc"
                  stroke="#0f172a"
                  strokeWidth={1.5 / zoom}
                  listening={false}
                />
                {/* Linhas horizontais do selo */}
                <Line points={[0, stampH * 0.35 * ppm, stampW * ppm, stampH * 0.35 * ppm]} stroke="#0f172a" strokeWidth={0.8 / zoom} listening={false} />
                <Line points={[0, stampH * 0.7 * ppm, stampW * ppm, stampH * 0.7 * ppm]} stroke="#0f172a" strokeWidth={0.8 / zoom} listening={false} />
                
                {/* Linhas verticais da base do selo */}
                <Line points={[stampW * 0.35 * ppm, stampH * 0.7 * ppm, stampW * 0.35 * ppm, stampH * ppm]} stroke="#0f172a" strokeWidth={0.8 / zoom} listening={false} />
                <Line points={[stampW * 0.7 * ppm, stampH * 0.7 * ppm, stampW * 0.7 * ppm, stampH * ppm]} stroke="#0f172a" strokeWidth={0.8 / zoom} listening={false} />

                {/* Textos Informativos */}
                <Text
                  text={`PROJETO: ${paperTitle}`}
                  x={8}
                  y={8}
                  fontSize={Math.max(9, stampH * 0.08 * ppm)}
                  fontStyle="bold"
                  fill="#0f172a"
                  listening={false}
                />
                <Text
                  text={`PROPRIETÁRIO: ${paperOwner}`}
                  x={8}
                  y={stampH * 0.38 * ppm}
                  fontSize={Math.max(7.5, stampH * 0.065 * ppm)}
                  fill="#334155"
                  listening={false}
                />
                <Text
                  text={`RESP. TÉCNICO: ${paperDesigner}`}
                  x={8}
                  y={stampH * 0.54 * ppm}
                  fontSize={Math.max(7.5, stampH * 0.065 * ppm)}
                  fill="#334155"
                  listening={false}
                />
                <Text
                  text={`ESCALA: 1:${paperScale}`}
                  x={8}
                  y={stampH * 0.75 * ppm}
                  fontSize={Math.max(7, stampH * 0.06 * ppm)}
                  fill="#475569"
                  listening={false}
                />
                <Text
                  text={`DATA: ${paperDate}`}
                  x={stampW * 0.38 * ppm}
                  y={stampH * 0.75 * ppm}
                  fontSize={Math.max(7, stampH * 0.06 * ppm)}
                  fill="#475569"
                  listening={false}
                />
                <Text
                  text={`FOLHA: ${paperSheetNum}`}
                  x={stampW * 0.73 * ppm}
                  y={stampH * 0.75 * ppm}
                  fontSize={Math.max(7, stampH * 0.06 * ppm)}
                  fontStyle="bold"
                  fill="#0f172a"
                  listening={false}
                />
              </Group>
            </Group>
          );
        })()}

        {/* Renderização das Linhas de Guia (Construction Lines) */}
        {guideLines && guideLines.map((g) => {
          const isSelected = selectedGuideLineId === g.id;
          const color = isSelected ? '#0078d7' : '#94a3b8';
          const strokeW = (isSelected ? 2.0 : 1.0) / zoom;
          const points = g.type === 'vertical'
            ? [g.value * ppm, -10000, g.value * ppm, 10000]
            : [-10000, g.value * ppm, 10000, g.value * ppm];

          return (
            <Line
              key={g.id}
              points={points}
              stroke={color}
              strokeWidth={strokeW}
              hitStrokeWidth={16}
              dash={[6, 4]}
              draggable={currentTool === 'select'}
              dragBoundFunc={(pos) => {
                const stage = stageRef.current;
                if (!stage) return pos;
                return g.type === 'vertical'
                  ? { x: pos.x, y: stage.y() }
                  : { x: stage.x(), y: pos.y };
              }}
              onDragEnd={(e) => {
                const node = e.target;
                const deltaX = node.x() / ppm;
                const deltaY = node.y() / ppm;

                if (g.type === 'vertical') {
                  const rawNewValue = g.value + deltaX;
                  useCadStore.setState((s) => ({
                    guideLines: s.guideLines.map(gl => gl.id === g.id ? { ...gl, value: rawNewValue } : gl)
                  }));
                } else {
                  const rawNewValue = g.value + deltaY;
                  useCadStore.setState((s) => ({
                    guideLines: s.guideLines.map(gl => gl.id === g.id ? { ...gl, value: rawNewValue } : gl)
                  }));
                }
                node.position({ x: 0, y: 0 });
                node.getLayer()?.batchDraw();
              }}
              onClick={(e) => {
                e.cancelBubble = true;
                if (currentTool === 'select') {
                  setSelectedGuideLineId(g.id);
                }
              }}
              onMouseEnter={(e) => {
                if (currentTool === 'select') {
                  e.target.getStage()!.container().style.cursor = g.type === 'vertical' ? 'col-resize' : 'row-resize';
                }
              }}
              onMouseLeave={(e) => {
                e.target.getStage()!.container().style.cursor = cursorStyle;
              }}
            />
          );
        })}

        {/* Renderização das Cotas Técnicas (Medidas) */}
        {dimensions && dimensions.map((d) => {
          const isSelected = selectedDimensionId === d.id;
          const strokeColor = isSelected ? '#0078d7' : '#475569';
          const textColor = isSelected ? '#0078d7' : '#1e293b';
          const sw = (isSelected ? 2 : 1) / zoom;

          const dx = d.p2.x - d.p1.x;
          const dy = d.p2.y - d.p1.y;
          const L = Math.sqrt(dx * dx + dy * dy);
          if (L === 0) return null;

          const angle = Math.atan2(dy, dx);
          const angleDeg = angle * (180 / Math.PI);

          const nx = -dy / L;
          const ny = dx / L;
          const offset = d.offset || 0;

          // Pontos deslocados perpendicularmente
          const cp1 = { x: d.p1.x + nx * offset, y: d.p1.y + ny * offset };
          const cp2 = { x: d.p2.x + nx * offset, y: d.p2.y + ny * offset };

          const midX = (cp1.x + cp2.x) / 2 * ppm;
          const midY = (cp1.y + cp2.y) / 2 * ppm;

          let textRot = angleDeg;
          if (textRot > 90 || textRot < -90) {
            textRot += 180;
          }

          const tickLength = 6;

          return (
            <Group
              key={d.id}
              onClick={(e) => {
                e.cancelBubble = true;
                if (currentTool === 'select') {
                  setSelectedDimensionId(d.id);
                }
              }}
            >
              {/* Linhas de extensão (Extension lines) ligando a parede à linha de cota */}
              {offset !== 0 && (
                <>
                  <Line
                    points={[d.p1.x * ppm, d.p1.y * ppm, cp1.x * ppm, cp1.y * ppm]}
                    stroke="#94a3b8"
                    strokeWidth={0.7 / zoom}
                    dash={[3, 3]}
                  />
                  <Line
                    points={[d.p2.x * ppm, d.p2.y * ppm, cp2.x * ppm, cp2.y * ppm]}
                    stroke="#94a3b8"
                    strokeWidth={0.7 / zoom}
                    dash={[3, 3]}
                  />
                </>
              )}

              {/* Linha principal de cota */}
              <Line
                points={[cp1.x * ppm, cp1.y * ppm, cp2.x * ppm, cp2.y * ppm]}
                stroke={strokeColor}
                strokeWidth={sw}
              />

              {/* Ticks oblíquos de cota */}
              <Line
                points={[
                  cp1.x * ppm - Math.cos(angle + Math.PI / 4) * tickLength,
                  cp1.y * ppm - Math.sin(angle + Math.PI / 4) * tickLength,
                  cp1.x * ppm + Math.cos(angle + Math.PI / 4) * tickLength,
                  cp1.y * ppm + Math.sin(angle + Math.PI / 4) * tickLength,
                ]}
                stroke={strokeColor}
                strokeWidth={sw * 1.5}
              />
              <Line
                points={[
                  cp2.x * ppm - Math.cos(angle + Math.PI / 4) * tickLength,
                  cp2.y * ppm - Math.sin(angle + Math.PI / 4) * tickLength,
                  cp2.x * ppm + Math.cos(angle + Math.PI / 4) * tickLength,
                  cp2.y * ppm + Math.sin(angle + Math.PI / 4) * tickLength,
                ]}
                stroke={strokeColor}
                strokeWidth={sw * 1.5}
              />

              {/* Rótulo de distância com máscara de fundo */}
              <Group x={midX} y={midY} rotation={textRot}>
                <Rect
                  x={-24}
                  y={-8}
                  width={48}
                  height={16}
                  fill="#ffffff"
                  stroke={isSelected ? '#0078d7' : undefined}
                  strokeWidth={0.5 / zoom}
                  cornerRadius={2}
                />
                <Text
                  text={`${L.toFixed(2)} m`}
                  x={-24}
                  y={-6}
                  width={48}
                  fontSize={10}
                  fontFamily="Inter, sans-serif"
                  fill={textColor}
                  align="center"
                  fontStyle="bold"
                />
              </Group>
            </Group>
          );
        })}

        {/* Indicador Visual do Snap de Quina de Parede */}
        {currentTool === 'dimension' && snappedWallPoint && (
          <Group>
            <Circle
              x={snappedWallPoint.x * ppm}
              y={snappedWallPoint.y * ppm}
              radius={6}
              fill="#0078d7"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <Circle
              x={snappedWallPoint.x * ppm}
              y={snappedWallPoint.y * ppm}
              radius={10}
              stroke="#0078d7"
              strokeWidth={1}
              dash={[2, 2]}
            />
          </Group>
        )}

        {/* Preview da Cota Ativa em Desenho (Fluxo de 3 cliques) */}
        {currentTool === 'dimension' && activeDimensionPoints && (
          activeDimensionPoints.length === 1 ? (() => {
            const p1 = activeDimensionPoints[0];
            const p2 = snappedMousePos;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const L = Math.sqrt(dx * dx + dy * dy);
            const midX = ((p1.x + p2.x) / 2) * ppm;
            const midY = ((p1.y + p2.y) / 2) * ppm;
            
            let textRot = Math.atan2(dy, dx) * (180 / Math.PI);
            if (textRot > 90 || textRot < -90) {
              textRot += 180;
            }

            return (
              <Group>
                <Line
                  points={[p1.x * ppm, p1.y * ppm, p2.x * ppm, p2.y * ppm]}
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  dash={[4, 4]}
                />
                <Circle x={p1.x * ppm} y={p1.y * ppm} radius={4} fill="#2563eb" />
                <Circle x={p2.x * ppm} y={p2.y * ppm} radius={4} fill="#2563eb" />
                {L > 0.01 && (
                  <Group x={midX} y={midY} rotation={textRot}>
                    <Rect
                      x={-24}
                      y={-8}
                      width={48}
                      height={16}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={1 / zoom}
                      cornerRadius={2}
                    />
                    <Text
                      text={`${L.toFixed(2)} m`}
                      x={-24}
                      y={-6}
                      width={48}
                      fontSize={10}
                      fontFamily="Inter, sans-serif"
                      fill="#2563eb"
                      align="center"
                      fontStyle="bold"
                    />
                  </Group>
                )}
              </Group>
            );
          })() : activeDimensionPoints.length === 2 ? (() => {
            const p1 = activeDimensionPoints[0];
            const p2 = activeDimensionPoints[1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const L = Math.sqrt(dx * dx + dy * dy);
            if (L === 0) return null;
            const nx = -dy / L;
            const ny = dx / L;
            const offset = (mousePos.x - p1.x) * nx + (mousePos.y - p1.y) * ny;
            const cp1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };
            const cp2 = { x: p2.x + nx * offset, y: p2.y + ny * offset };
            
            return (
              <Group>
                <Line points={[p1.x * ppm, p1.y * ppm, cp1.x * ppm, cp1.y * ppm]} stroke="#2563eb" strokeWidth={1} dash={[3, 3]} />
                <Line points={[p2.x * ppm, p2.y * ppm, cp2.x * ppm, cp2.y * ppm]} stroke="#2563eb" strokeWidth={1} dash={[3, 3]} />
                <Line
                  points={[cp1.x * ppm, cp1.y * ppm, cp2.x * ppm, cp2.y * ppm]}
                  stroke="#2563eb"
                  strokeWidth={1.5}
                />
                <Group x={((cp1.x + cp2.x) / 2) * ppm} y={((cp1.y + cp2.y) / 2) * ppm} rotation={Math.atan2(dy, dx) * (180 / Math.PI)}>
                  <Rect x={-24} y={-8} width={48} height={16} fill="#ffffff" stroke="#2563eb" strokeWidth={1} cornerRadius={2} />
                  <Text text={`${L.toFixed(2)} m`} x={-24} y={-6} width={48} fontSize={10} fill="#2563eb" align="center" fontStyle="bold" />
                </Group>
              </Group>
            );
          })() : null
        )}

        {/* Renderização das Anotações de Texto */}
        {texts && texts.map((t) => {
          const isSelected = selectedTextId === t.id;
          return (
            <Group
              key={t.id}
              x={t.x * ppm}
              y={t.y * ppm}
              draggable={currentTool === 'select'}
              onDragEnd={(e) => {
                const node = e.target;
                updateTextPosition(t.id, node.x() / ppm, node.y() / ppm);
                node.position({ x: 0, y: 0 });
              }}
              onClick={(e) => {
                e.cancelBubble = true;
                if (currentTool === 'select') {
                  setSelectedTextId(t.id);
                }
              }}
            >
              <Text
                text={t.text}
                fontSize={t.fontSize || 14}
                fontFamily="Inter, sans-serif"
                fill={isSelected ? '#0078d7' : '#1e293b'}
                fontStyle={isSelected ? 'bold' : 'normal'}
                align="center"
                verticalAlign="middle"
              />
              {isSelected && (
                <Rect
                  x={-4}
                  y={-4}
                  width={t.text.length * 8 + 8}
                  height={24}
                  stroke="#0078d7"
                  strokeWidth={1 / zoom}
                  dash={[3, 3]}
                  listening={false}
                />
              )}
            </Group>
          );
        })}

        {/* Passagem 1: Contornos de paredes por baixo com espessura duplicada */}
        {renderedWallsData.map((data) => {
          const { wall, strokeColor, sw, segmentsPoints, L } = data;
          return (
            <Group key={`wall-contours-${wall.id}`} listening={false}>
              {segmentsPoints.map((sp, idx) => {
                const { seg, p1Top, p1Bot, p2Top, p2Bot } = sp;
                return (
                  <Group key={`${wall.id}-contour-${idx}`}>
                    <Line
                      points={[p1Top.x * ppm, p1Top.y * ppm, p2Top.x * ppm, p2Top.y * ppm]}
                      stroke={strokeColor}
                      strokeWidth={sw * 2}
                      lineCap="square"
                    />
                    <Line
                      points={[p1Bot.x * ppm, p1Bot.y * ppm, p2Bot.x * ppm, p2Bot.y * ppm]}
                      stroke={strokeColor}
                      strokeWidth={sw * 2}
                      lineCap="square"
                    />
                    {(seg.s1 > 0 || !isPointConnected(wall.p1, wall.id)) && (
                      <Line
                        points={[p1Top.x * ppm, p1Top.y * ppm, p1Bot.x * ppm, p1Bot.y * ppm]}
                        stroke={strokeColor}
                        strokeWidth={sw * 2}
                        lineCap="square"
                      />
                    )}
                    {(seg.s2 < L || !isPointConnected(wall.p2, wall.id)) && (
                      <Line
                        points={[p2Top.x * ppm, p2Top.y * ppm, p2Bot.x * ppm, p2Bot.y * ppm]}
                        stroke={strokeColor}
                        strokeWidth={sw * 2}
                        lineCap="square"
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          );
        })}

        {/* Passagem 2: Preenchimentos sólidos por cima para fundir quinas divisórias */}
        {renderedWallsData.map((data) => {
          const { wall, fillColor, segmentsPoints } = data;

          const clickHandler = (e: any) => {
            e.cancelBubble = true;
            if (currentTool === 'select') setSelectedWallId(wall.id);
          };
          const enterHandler = (e: any) => {
            if (currentTool === 'select') e.target.getStage()!.container().style.cursor = 'pointer';
          };
          const leaveHandler = (e: any) => {
            e.target.getStage()!.container().style.cursor = cursorStyle;
          };

          return (
            <Group
              key={`wall-fills-${wall.id}`}
              draggable={currentTool === 'select'}
              onDragEnd={(e) => {
                const node = e.target;
                const dx = node.x() / ppm;
                const dy = node.y() / ppm;

                const targetP1 = { x: wall.p1.x + dx, y: wall.p1.y + dy };
                const targetP2 = { x: wall.p2.x + dx, y: wall.p2.y + dy };

                const snappedP1 = getWallDragSnap(targetP1, wall.id);
                const snapDx = snappedP1.x - targetP1.x;
                const snapDy = snappedP1.y - targetP1.y;

                const newP1 = snappedP1;
                const newP2 = { x: targetP2.x + snapDx, y: targetP2.y + snapDy };

                updateWall(wall.id, { p1: newP1, p2: newP2 });
                node.position({ x: 0, y: 0 });
                node.getLayer()?.batchDraw();
              }}
            >
              {segmentsPoints.map((sp, idx) => {
                return (
                  <Line
                    key={`${wall.id}-fill-${idx}`}
                    points={sp.vertices}
                    closed
                    fill={fillColor}
                    stroke={undefined}
                    onClick={clickHandler}
                    onMouseEnter={enterHandler}
                    onMouseLeave={leaveHandler}
                  />
                );
              })}
            </Group>
          );
        })}

        {/* Passagem 3: Highlight da parede selecionada desenhada por cima de tudo em azul */}
        {renderedWallsData.filter(d => d.isSelected).map((data) => {
          const { wall, sw, segmentsPoints, L } = data;
          return (
            <Group key={`wall-highlight-${wall.id}`} listening={false}>
              {segmentsPoints.map((sp, idx) => {
                const { seg, p1Top, p1Bot, p2Top, p2Bot } = sp;
                return (
                  <Group key={`${wall.id}-hl-${idx}`}>
                    <Line
                      points={[p1Top.x * ppm, p1Top.y * ppm, p2Top.x * ppm, p2Top.y * ppm]}
                      stroke="#0078d7"
                      strokeWidth={sw}
                      lineCap="square"
                    />
                    <Line
                      points={[p1Bot.x * ppm, p1Bot.y * ppm, p2Bot.x * ppm, p2Bot.y * ppm]}
                      stroke="#0078d7"
                      strokeWidth={sw}
                      lineCap="square"
                    />
                    {(seg.s1 > 0 || !isPointConnected(wall.p1, wall.id)) && (
                      <Line
                        points={[p1Top.x * ppm, p1Top.y * ppm, p1Bot.x * ppm, p1Bot.y * ppm]}
                        stroke="#0078d7"
                        strokeWidth={sw}
                        lineCap="square"
                      />
                    )}
                    {(seg.s2 < L || !isPointConnected(wall.p2, wall.id)) && (
                      <Line
                        points={[p2Top.x * ppm, p2Top.y * ppm, p2Bot.x * ppm, p2Bot.y * ppm]}
                        stroke="#0078d7"
                        strokeWidth={sw}
                        lineCap="square"
                      />
                    )}
                  </Group>
                );
              })}
            </Group>
          );
        })}

        {/* Passagem 4: Alças interativas circulares para esticar as extremidades de paredes selecionadas */}
        {renderedWallsData.filter(d => d.isSelected).map((data) => {
          const { wall } = data;
          return (
            <Group key={`wall-handles-${wall.id}`}>
              <Circle
                x={wall.p1.x * ppm}
                y={wall.p1.y * ppm}
                radius={7 / zoom}
                fill="#ffffff"
                stroke="#0078d7"
                strokeWidth={2 / zoom}
                draggable={false}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setActiveHandle({ wallId: wall.id, pointKey: 'p1' });
                }}
                onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'pointer'; }}
                onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
              />
              <Circle
                x={wall.p2.x * ppm}
                y={wall.p2.y * ppm}
                radius={7 / zoom}
                fill="#ffffff"
                stroke="#0078d7"
                strokeWidth={2 / zoom}
                draggable={false}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  setActiveHandle({ wallId: wall.id, pointKey: 'p2' });
                }}
                onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'pointer'; }}
                onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
              />
            </Group>
          );
        })}

        {conduits.map((conduit) => {
          const fromDev = devices.find(d => d.id === conduit.fromDeviceId);
          const toDev = devices.find(d => d.id === conduit.toDeviceId);
          if (!fromDev || !toDev) return null;
          const p1 = { x: fromDev.x * ppm, y: fromDev.y * ppm };
          const p2 = { x: toDev.x * ppm, y: toDev.y * ppm };
          const inWall = isConduitInWall(fromDev, toDev, walls);
          const curve = getConduitPoints(p1, p2, inWall);
          const wires = wiringRouting[conduit.id] || [];
          const isConduitSelected = selectedConduitId === conduit.id;
          const conduitColor = isConduitSelected ? "#0078d7" : "#6b7280";
          const conduitWidth = isConduitSelected ? 5.0 : 2.5;
          return (
            <Group key={conduit.id}>
               {/* Linha de highlight (glow) quando selecionado */}
               {isConduitSelected && (
                 <Line
                   points={curve.points}
                   stroke="rgba(0, 120, 215, 0.25)"
                   strokeWidth={14}
                   tension={inWall ? undefined : 0.4}
                   listening={false}
                 />
               )}
               <Line
                 points={curve.points}
                 stroke={conduitColor}
                 strokeWidth={conduitWidth}
                 tension={inWall ? undefined : 0.4}
                 opacity={0.85}
                 hitStrokeWidth={18}
                 dash={isConduitSelected ? [8, 4] : undefined}
                 onClick={(e) => {
                   e.cancelBubble = true;
                   if (currentTool === 'select') {
                     setSelectedConduitId(conduit.id);
                   }
                 }}
                 onTap={(e) => {
                   e.cancelBubble = true;
                   if (currentTool === 'select') {
                     setSelectedConduitId(conduit.id);
                   }
                 }}
                 onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'pointer'; }}
                 onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
               />
              {wires.length > 0 && (
                <Group x={curve.midPoint.x} y={curve.midPoint.y} rotation={curve.angle}>
                  <Circle radius={10 * Math.max(1, wires.length)} fill="rgba(240,240,240,0.9)" opacity={0.9} listening={false} />
                  {wires.map((wire, wIdx) => {
                    const elements: React.ReactNode[] = [];
                    const xOffset = (wIdx - (wires.length - 1) / 2) * 16;
                    let off = -((wire.phase + wire.neutral + wire.ground + wire.ret - 1) * 4) / 2;
                    for (let i = 0; i < wire.phase; i++) {
                      elements.push(<Line key={`f-${wIdx}-${i}`} points={[xOffset + off, -6, xOffset + off, 6]} stroke="#dc2626" strokeWidth={1.5} listening={false} />);
                      off += 4;
                    }
                    for (let i = 0; i < wire.neutral; i++) {
                      elements.push(<Line key={`n-${wIdx}-${i}`} points={[xOffset + off, 0, xOffset + off, -6, xOffset + off + 3, -6]} stroke="#2563eb" strokeWidth={1.5} listening={false} />);
                      off += 4;
                    }
                    for (let i = 0; i < wire.ground; i++) {
                      elements.push(<Group key={`g-${wIdx}-${i}`} x={xOffset + off} y={0} listening={false}><Line points={[0, 0, 0, -6]} stroke="#16a34a" strokeWidth={1.5} /><Line points={[-3, -6, 3, -6]} stroke="#16a34a" strokeWidth={1.5} /></Group>);
                      off += 4;
                    }
                    for (let i = 0; i < wire.ret; i++) {
                      elements.push(<Line key={`r-${wIdx}-${i}`} points={[xOffset + off, 0, xOffset + off, -4]} stroke="#ca8a04" strokeWidth={1.5} listening={false} />);
                      off += 4;
                    }
                    elements.push(<Text key={`lbl-${wIdx}`} text={wire.circuitNumber.toString()} x={xOffset - 4} y={8} fontSize={8} fill="#374151" fontStyle="bold" align="center" listening={false} />);
                    return elements;
                  })}
                </Group>
              )}
            </Group>
          );
        })}

        {currentTool === 'conduit' && conduitStartDeviceId && (() => {
          const startDev = devices.find(d => d.id === conduitStartDeviceId);
          if (!startDev) return null;
          const endX = conduitSnapDevice ? conduitSnapDevice.x : mousePos.x;
          const endY = conduitSnapDevice ? conduitSnapDevice.y : mousePos.y;
          return (
            <Line
              points={[startDev.x * ppm, startDev.y * ppm, endX * ppm, endY * ppm]}
              stroke="#eab308"
              strokeWidth={2}
              dash={[4, 4]}
              opacity={0.8}
            />
          );
        })()}

        {currentTool === 'conduit' && conduitSnapDevice && (
          <Circle
            x={conduitSnapDevice.x * ppm}
            y={conduitSnapDevice.y * ppm}
            radius={22 / zoom}
            stroke="#eab308"
            strokeWidth={1.5}
            dash={[4, 3]}
            listening={false}
          />
        )}

        {devices.map((dev) => (
          <DeviceSymbol
            key={dev.id}
            id={dev.id}
            type={dev.type}
            x={dev.x * ppm}
            y={dev.y * ppm}
            rotation={dev.rotation}
            ppm={ppm}
            zoom={zoom}
            isSelected={selectedDeviceId === dev.id}
            currentTool={currentTool}
            wallThickness={getDeviceWallThickness(dev)}
            draggable={currentTool === 'select'}
            width={dev.width}
            modules={dev.modules}
            power={dev.power}
            circuitNumber={(() => {
              if (!dev.circuitId) return '';
              const circ = circuits.find(c => c.id === dev.circuitId);
              return circ ? circ.number : '';
            })()}
            commandLetter={dev.commandLetter}
            onClick={(e) => {
              e.cancelBubble = true;
              if (currentTool === 'select') {
                setSelectedDeviceId(dev.id);
              } else if (currentTool === 'conduit') {
                if (!conduitStartDeviceId) {
                  setConduitStartDeviceId(dev.id);
                } else {
                  if (conduitStartDeviceId !== dev.id) {
                    addConduit(conduitStartDeviceId, dev.id);
                  }
                  setConduitStartDeviceId(null);
                }
              }
            }}
            onDragEnd={(e) => {
              const node = e.target;
              const newX = node.x() / ppm;
              const newY = node.y() / ppm;

              const freeTypes = ['lampada', 'ceiling_light', 'fluorescent', 'qdc', 'poste', 'medidor', 'box_octogonal'];
              let finalX = newX;
              let finalY = newY;
              let finalRotation = dev.rotation;

              if (!freeTypes.includes(dev.type)) {
                let minDistance = Infinity;
                let snapPos: Point2D = { x: newX, y: newY };
                let snapRotation = dev.rotation;
                const tolerance = (12 / (ppm * zoom)) * 2.5;

                walls.forEach(wall => {
                  const res = getClosestPointOnSegment({ x: newX, y: newY }, wall.p1, wall.p2);
                  if (res.distance < minDistance) {
                    minDistance = res.distance;
                    snapPos = res.point;
                    if (isEsquadria(dev.type)) {
                      // Preserva a rotação de abertura da porta (para dentro/fora)
                      const diffNormal = Math.abs((dev.rotation - res.angle) % 360);
                      const is180 = diffNormal > 90 && diffNormal < 270;
                      snapRotation = (res.angle + (is180 ? 180 : 0)) % 360;
                    } else {
                      const sideOffset = res.side > 0 ? 90 : -90;
                      snapRotation = res.angle + sideOffset;
                    }
                  }
                });

                if (isEsquadria(dev.type)) {
                  if (minDistance <= tolerance) {
                    finalX = snapPos.x;
                    finalY = snapPos.y;
                    finalRotation = snapRotation;
                  } else {
                    alert('Atenção: Portas e janelas não podem ser movidas para fora de uma parede!');
                    node.position({ x: dev.x * ppm, y: dev.y * ppm });
                    node.getLayer()?.batchDraw();
                    return;
                  }
                } else {
                  if (minDistance <= tolerance) {
                    finalX = snapPos.x;
                    finalY = snapPos.y;
                    finalRotation = snapRotation;
                  }
                }
              }

              updateDeviceProperties(dev.id, {
                x: finalX,
                y: finalY,
                rotation: finalRotation,
              });
            }}
          />
        ))}

        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          resizeEnabled={bgImageSelected}
          keepRatio={true}
          borderDash={[3, 3]}
          anchorStroke="#0078d7"
          anchorFill="#ffffff"
          anchorSize={6}
          borderStroke="#0078d7"
          onTransformEnd={(e) => {
            const node = e.target;
            if (selectedDeviceId) {
              updateDeviceProperties(selectedDeviceId, {
                rotation: node.rotation(),
              });
            } else if (bgImageSelected && node.id() === 'bg-image-node') {
              setBgImageScale(node.scaleX());
              setBgImageRotation(node.rotation());
              setBgImagePos({ x: node.x(), y: node.y() });
            }
          }}
        />

        {currentTool === 'wall' && activeWallPoints.length === 1 && (
          <Group>
            <Line
              points={[activeWallPoints[0].x * ppm, activeWallPoints[0].y * ppm, snappedMousePos.x * ppm, snappedMousePos.y * ppm]}
              stroke="#2563eb"
              strokeWidth={2}
              dash={[5, 5]}
            />
            <Line
              points={getWallVertices({
                id: 'preview', p1: activeWallPoints[0], p2: snappedMousePos,
                thickness: 0.15, height: 2.8, material: 'alvenaria',
              }).map(v => v * ppm)}
              closed
              fill="rgba(148,163,184,0.4)"
              stroke="#2563eb"
              strokeWidth={1.5}
              opacity={0.7}
            />
            <Circle x={snappedMousePos.x * ppm} y={snappedMousePos.y * ppm} radius={5} fill="#2563eb" />
            <Circle x={activeWallPoints[0].x * ppm} y={activeWallPoints[0].y * ppm} radius={5} fill="#2563eb" />
          </Group>
        )}

        {currentTool === 'device' && selectedDeviceType && deviceSnapInfo && (
          <Group opacity={0.65}>
            {isEsquadria(selectedDeviceType) && !deviceSnapInfo.isSnapped ? (
              // Desenha o círculo vermelho de proibido se for esquadria fora da parede
              <Group x={deviceSnapInfo.point.x * ppm} y={deviceSnapInfo.point.y * ppm}>
                <Circle radius={16} stroke="#ef4444" strokeWidth={3} fill="rgba(239, 68, 68, 0.1)" />
                <Line points={[-11, -11, 11, 11]} stroke="#ef4444" strokeWidth={3} />
              </Group>
            ) : (
              <>
                <DeviceSymbol
                  id="preview"
                  type={selectedDeviceType}
                  x={deviceSnapInfo.point.x * ppm}
                  y={deviceSnapInfo.point.y * ppm}
                  rotation={deviceSnapInfo.rotation}
                  ppm={ppm}
                  zoom={zoom}
                  isSelected={false}
                  flip={selectedDeviceType.startsWith('door') ? (doorCycle === 1 || doorCycle === 3) : false}
                />
                {deviceSnapInfo.isSnapped && (
                  <Circle
                    x={deviceSnapInfo.point.x * ppm}
                    y={deviceSnapInfo.point.y * ppm}
                    radius={8}
                    stroke="#16a34a"
                    strokeWidth={1.5}
                    dash={[2, 2]}
                  />
                )}
              </>
            )}
          </Group>
        )}

        {calibrationPoints.map((pt, idx) => (
          <React.Fragment key={`cal-${idx}`}>
            <Circle x={pt.x} y={pt.y} radius={6} fill="#eab308" stroke="#374151" strokeWidth={1.5} />
            {idx === 1 && (
              <Line points={[calibrationPoints[0].x, calibrationPoints[0].y, pt.x, pt.y]} stroke="#eab308" strokeWidth={2} dash={[5, 5]} />
            )}
          </React.Fragment>
        ))}
      </Layer>
    </Stage>
  );
};
