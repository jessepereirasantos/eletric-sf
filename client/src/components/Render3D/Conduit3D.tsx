import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCadStore } from '../../store/useCadStore';
import type { Device, Point2D, Wall } from '../../store/useCadStore';

interface Conduit3DProps {
  id: string;
  fromDevice: Device;
  toDevice: Device;
  diameter: string;
  waypoints?: Point2D[];
}

export const Conduit3D: React.FC<Conduit3DProps> = ({ fromDevice, toDevice, diameter, waypoints }) => {
  const { shadingMode, clippingState, walls } = useCadStore();

  const points = useMemo(() => {
    const getClosestPointOnSegmentLocal = (pt: Point2D, p1: Point2D, p2: Point2D) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const t2 = dx * dx + dy * dy;
      if (t2 === 0) {
        const dist = Math.sqrt((pt.x - p1.x) ** 2 + (pt.y - p1.y) ** 2);
        return { point: p1, distance: dist };
      }
      let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / t2;
      t = Math.max(0, Math.min(1, t));
      const proj = { x: p1.x + t * dx, y: p1.y + t * dy };
      const dist = Math.sqrt((pt.x - proj.x) ** 2 + (pt.y - proj.y) ** 2);
      return { point: proj, distance: dist };
    };

    const getWallRouteLocal = (ptA: Point2D, ptB: Point2D, wList: Wall[]): Point2D[] | null => {
      const findClosestWall = (pt: Point2D) => {
        let closestWall: Wall | null = null;
        let minDist = 0.5;
        for (const w of wList) {
          const res = getClosestPointOnSegmentLocal(pt, w.p1, w.p2);
          if (res.distance < minDist) {
            minDist = res.distance;
            closestWall = w;
          }
        }
        return closestWall;
      };

      const wallA = findClosestWall(ptA);
      const wallB = findClosestWall(ptB);

      if (!wallA || !wallB) return null;
      if (wallA.id === wallB.id) {
        return [ptA, ptB];
      }

      const adj: Record<string, string[]> = {};
      wList.forEach(w => { adj[w.id] = []; });

      const shareVertex = (w1: Wall, w2: Wall) => {
        const dist = (pA: Point2D, pB: Point2D) => Math.sqrt((pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2);
        const tol = 0.15;
        return dist(w1.p1, w2.p1) < tol || dist(w1.p1, w2.p2) < tol ||
               dist(w1.p2, w2.p1) < tol || dist(w1.p2, w2.p2) < tol;
      };

      for (let i = 0; i < wList.length; i++) {
        for (let j = i + 1; j < wList.length; j++) {
          if (shareVertex(wList[i], wList[j])) {
            adj[wList[i].id].push(wList[j].id);
            adj[wList[j].id].push(wList[i].id);
          }
        }
      }

      const queue: string[] = [wallA.id];
      const visited = new Set<string>([wallA.id]);
      const parent: Record<string, string> = {};
      let found = false;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr === wallB.id) {
          found = true;
          break;
        }
        const neighbors = adj[curr] || [];
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            parent[n] = curr;
            queue.push(n);
          }
        }
      }

      if (!found) return null;

      const wallPath: string[] = [];
      let temp = wallB.id;
      while (temp !== wallA.id) {
        wallPath.push(temp);
        temp = parent[temp];
      }
      wallPath.push(wallA.id);
      wallPath.reverse();

      const routePoints: Point2D[] = [ptA];
      for (let i = 0; i < wallPath.length - 1; i++) {
        const w1 = wList.find(w => w.id === wallPath[i])!;
        const w2 = wList.find(w => w.id === wallPath[i + 1])!;
        
        const dist = (pA: Point2D, pB: Point2D) => Math.sqrt((pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2);
        let bestPt = w1.p2;
        let minDist = Infinity;
        [w1.p1, w1.p2].forEach(pX => {
          [w2.p1, w2.p2].forEach(pY => {
            const d = dist(pX, pY);
            if (d < minDist) {
              minDist = d;
              bestPt = pX;
            }
          });
        });
        routePoints.push(bestPt);
      }
      routePoints.push(ptB);
      return routePoints;
    };

    const getZ = (d: Device) => {
      if (d.peitoril !== undefined) return d.peitoril;
      const type = d.type;
      if (type.includes('baixa') || type === 'tomada_10a_nbr') return 0.30;
      if (type.includes('alta') || type.includes('tue_') || type === 'sconce') return 2.20;
      if (type === 'ceiling_light' || type === 'lampada' || type === 'fluorescent' || type === 'box_octogonal') return 2.80;
      if (type === 'qdc' || type === 'qgbt') return 1.50;
      if (type === 'poste') return 1.60;
      return 1.10;
    };

    const zA = getZ(fromDevice);
    const zB = getZ(toDevice);

    const posA = new THREE.Vector3(fromDevice.x, -fromDevice.y, zA);
    const posB = new THREE.Vector3(toDevice.x, -toDevice.y, zB);

    const pathPoints: THREE.Vector3[] = [];

    if (waypoints && waypoints.length > 0) {
      pathPoints.push(posA);
      waypoints.forEach(wp => {
        const wpZ = zA === 2.80 || zB === 2.80 ? 2.80 : (zA + zB) / 2;
        pathPoints.push(new THREE.Vector3(wp.x, -wp.y, wpZ));
      });
      pathPoints.push(posB);
    } else {
      const isCeilingA = fromDevice.type === 'ceiling_light' || fromDevice.type === 'lampada' || fromDevice.type === 'box_octogonal' || fromDevice.type === 'fluorescent';
      const isCeilingB = toDevice.type === 'ceiling_light' || toDevice.type === 'lampada' || toDevice.type === 'box_octogonal' || toDevice.type === 'fluorescent';

      if (!isCeilingA && !isCeilingB) {
        const wallRoute = getWallRouteLocal({ x: fromDevice.x, y: fromDevice.y }, { x: toDevice.x, y: toDevice.y }, walls);
        if (wallRoute && wallRoute.length > 0) {
          pathPoints.push(posA);
          pathPoints.push(new THREE.Vector3(fromDevice.x, -fromDevice.y, 2.80));
          for (let i = 1; i < wallRoute.length - 1; i++) {
            pathPoints.push(new THREE.Vector3(wallRoute[i].x, -wallRoute[i].y, 2.80));
          }
          pathPoints.push(new THREE.Vector3(toDevice.x, -toDevice.y, 2.80));
          pathPoints.push(posB);
        } else {
          pathPoints.push(posA, new THREE.Vector3(fromDevice.x, -fromDevice.y, 2.80), new THREE.Vector3(toDevice.x, -toDevice.y, 2.80), posB);
        }
      } else if (isCeilingA && !isCeilingB) {
        pathPoints.push(posA, new THREE.Vector3(toDevice.x, -toDevice.y, 2.80), posB);
      } else if (!isCeilingA && isCeilingB) {
        pathPoints.push(posA, new THREE.Vector3(fromDevice.x, -fromDevice.y, 2.80), posB);
      } else {
        pathPoints.push(posA, posB);
      }
    }

    return pathPoints;
  }, [fromDevice, toDevice, waypoints, walls]);

  // Criar curva 100% reta para evitar barriga/overshoot de CatmullRom
  const curve = useMemo(() => {
    const curvePath = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length - 1; i++) {
      curvePath.add(new THREE.LineCurve3(points[i], points[i + 1]));
    }
    return curvePath;
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
