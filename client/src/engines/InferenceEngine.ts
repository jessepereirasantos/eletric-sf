export type InferenceType = 'endpoint' | 'midpoint' | 'intersection' | 'on_edge' | 'none';

export interface Point2D {
  x: number;
  y: number;
}

export interface InferenceResult {
  point: Point2D;
  type: InferenceType;
  entityId?: string;
}

export class InferenceEngine {
  private static readonly SNAP_RADIUS = 0.5; // raio de "puxada" em metros
  
  /**
   * Calcula a inferência mais próxima (snap) para o mouse dado.
   * Ordem de prioridade: Endpoint > Midpoint > Intersection > OnEdge.
   */
  public static calculateSnap(
    mousePoint: Point2D,
    walls: { id: string; startX: number; startY: number; endX: number; endY: number }[],
    devices: { id: string; x: number; y: number }[]
  ): InferenceResult {
    const { x, y } = mousePoint;
    let closestPoint: Point2D = { x, y };
    let bestType: InferenceType = 'none';
    let bestDist = this.SNAP_RADIUS;
    let bestEntityId: string | undefined = undefined;

    // 1. Checar Devices (Endpoints)
    for (const d of devices) {
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestType = 'endpoint';
        closestPoint = { x: d.x, y: d.y };
        bestEntityId = d.id;
      }
    }

    // 2. Checar Walls (Endpoints, Midpoints, OnEdge)
    for (const w of walls) {
      // Endpoints da parede
      const p1 = { x: w.startX, y: w.startY };
      const p2 = { x: w.endX, y: w.endY };
      
      const d1 = Math.hypot(p1.x - x, p1.y - y);
      if (d1 < bestDist && (bestType !== 'endpoint' || d1 < bestDist)) {
        bestDist = d1;
        bestType = 'endpoint';
        closestPoint = p1;
        bestEntityId = w.id;
      }

      const d2 = Math.hypot(p2.x - x, p2.y - y);
      if (d2 < bestDist && (bestType !== 'endpoint' || d2 < bestDist)) {
        bestDist = d2;
        bestType = 'endpoint';
        closestPoint = p2;
        bestEntityId = w.id;
      }

      // Midpoint
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const dMid = Math.hypot(mid.x - x, mid.y - y);
      if (dMid < bestDist && bestType !== 'endpoint') {
        bestDist = dMid;
        bestType = 'midpoint';
        closestPoint = mid;
        bestEntityId = w.id;
      }

      // On Edge (Ponto mais próximo na reta)
      if (bestType !== 'endpoint' && bestType !== 'midpoint') {
        const proj = this.projectPointOnSegment(mousePoint, p1, p2);
        const dProj = Math.hypot(proj.x - x, proj.y - y);
        if (dProj < bestDist) {
          bestDist = dProj;
          bestType = 'on_edge';
          closestPoint = proj;
          bestEntityId = w.id;
        }
      }
    }

    return { point: closestPoint, type: bestType, entityId: bestEntityId };
  }

  private static projectPointOnSegment(p: Point2D, v: Point2D, w: Point2D): Point2D {
    const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
    if (l2 === 0) return v;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return {
      x: v.x + t * (w.x - v.x),
      y: v.y + t * (w.y - v.y)
    };
  }

  public static getInferenceColor(type: InferenceType): string {
    switch (type) {
      case 'endpoint': return '#22c55e'; // Verde
      case 'midpoint': return '#06b6d4'; // Ciano
      case 'intersection': return '#eab308'; // Amarelo
      case 'on_edge': return '#ef4444'; // Vermelho
      default: return 'transparent';
    }
  }
}
