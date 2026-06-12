import type { Point2D, Wall } from '../store/useCadStore';

/**
 * Snap de ponto para o grid de engenharia
 */
export const snapToGrid = (pt: Point2D, spacingMeters: number): Point2D => {
  if (spacingMeters <= 0) return pt;
  return {
    x: Math.round(pt.x / spacingMeters) * spacingMeters,
    y: Math.round(pt.y / spacingMeters) * spacingMeters,
  };
};

/**
 * Ponto mais próximo no segmento AB a partir de P
 */
export const getClosestPointOnSegment = (
  p: Point2D,
  a: Point2D,
  b: Point2D
): { point: Point2D; distance: number; t: number; angle: number; side: number } => {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const apX = p.x - a.x;
  const apY = p.y - a.y;
  const abLen2 = abX * abX + abY * abY;

  if (abLen2 === 0) {
    const dist = Math.sqrt(apX * apX + apY * apY);
    return { point: a, distance: dist, t: 0, angle: 0, side: 0 };
  }

  let t = (apX * abX + apY * abY) / abLen2;
  t = Math.max(0, Math.min(1, t));

  const closestPoint = { x: a.x + t * abX, y: a.y + t * abY };
  const dx = p.x - closestPoint.x;
  const dy = p.y - closestPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(abY, abX) * (180 / Math.PI);
  const side = abX * (p.y - closestPoint.y) - abY * (p.x - closestPoint.x);

  return { point: closestPoint, distance, t, angle, side: side >= 0 ? 1 : -1 };
};

/**
 * Interseção entre duas retas definidas por ponto + direção.
 * Retorna null se as retas forem paralelas.
 */
const lineIntersect = (
  p1: Point2D, d1: Point2D,
  p2: Point2D, d2: Point2D
): Point2D | null => {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-10) return null; // paralelas

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * d2.y - dy * d2.x) / denom;

  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
};

/**
 * Dados 4 vértices de uma parede (retângulo), calcula as retas das duas bordas longas.
 */
interface WallBorders {
  topLeft: Point2D;
  topRight: Point2D;
  botRight: Point2D;
  botLeft: Point2D;
  dirX: number; // componente X do vetor unitário da direção da parede
  dirY: number;
  normX: number; // normal
  normY: number;
  halfT: number;
}

const getWallBorders = (wall: Wall): WallBorders => {
  const { p1, p2, thickness } = wall;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 1e-6) {
    return {
      topLeft: p1, topRight: p1, botRight: p1, botLeft: p1,
      dirX: 1, dirY: 0, normX: 0, normY: -1, halfT: thickness / 2,
    };
  }

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const halfT = thickness / 2;

  return {
    topLeft:  { x: p1.x + halfT * nx, y: p1.y + halfT * ny },
    topRight: { x: p2.x + halfT * nx, y: p2.y + halfT * ny },
    botRight: { x: p2.x - halfT * nx, y: p2.y - halfT * ny },
    botLeft:  { x: p1.x - halfT * nx, y: p1.y - halfT * ny },
    dirX: ux, dirY: uy, normX: nx, normY: ny, halfT,
  };
};

/**
 * Verifica se dois pontos são "coincidentes" (dentro de tolerância em metros)
 */
const pointsNear = (a: Point2D, b: Point2D, tol = 0.10): boolean => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= tol * tol;
};

export interface MiterResult {
  // Vértices corrigidos: p1Side e p2Side são os lados "início" e "fim" da parede
  p1Top: Point2D;
  p1Bot: Point2D;
  p2Top: Point2D;
  p2Bot: Point2D;
}

/**
 * Calcula os vértices de cada parede com miter joints (cantos vivos).
 * Para cada extremidade de parede que coincide com outra parede,
 * calcula a interseção das bordas para criar uma junção limpa.
 *
 * @returns Map de wallId → MiterResult (vértices corrigidos)
 */
export const computeMiterJoints = (walls: Wall[]): Map<string, MiterResult> => {
  const result = new Map<string, MiterResult>();

  // Inicializa com os vértices originais
  const borders = new Map<string, WallBorders>();
  walls.forEach(w => {
    borders.set(w.id, getWallBorders(w));
  });

  // Para cada parede, começa com os vértices simples
  walls.forEach(w => {
    const b = borders.get(w.id)!;
    result.set(w.id, {
      p1Top: { ...b.topLeft },
      p1Bot: { ...b.botLeft },
      p2Top: { ...b.topRight },
      p2Bot: { ...b.botRight },
    });
  });

  // Detecta junções e calcula miter
  for (let i = 0; i < walls.length; i++) {
    const wa = walls[i];
    const ba = borders.get(wa.id)!;
    const ra = result.get(wa.id)!;

    for (let j = i + 1; j < walls.length; j++) {
      const wb = walls[j];
      const bb = borders.get(wb.id)!;
      const rb = result.get(wb.id)!;

      // Verifica os 4 pares de extremidades (p1a–p1b, p1a–p2b, p2a–p1b, p2a–p2b)
      const pairs: Array<{
        ptA: 'p1' | 'p2'; ptB: 'p1' | 'p2'
      }> = [
        { ptA: 'p1', ptB: 'p1' },
        { ptA: 'p1', ptB: 'p2' },
        { ptA: 'p2', ptB: 'p1' },
        { ptA: 'p2', ptB: 'p2' },
      ];

      for (const { ptA, ptB } of pairs) {
        const pA = ptA === 'p1' ? wa.p1 : wa.p2;
        const pB = ptB === 'p1' ? wb.p1 : wb.p2;

        if (!pointsNear(pA, pB)) continue;

        // Encontrou junção — calcula miter para as duas bordas (top e bot)

        // Borda "top" (lado +normal) da parede A no extremo ptA
        const aTopOrigin = ptA === 'p1' ? ba.topLeft : ba.topRight;
        // Borda "bot" (lado -normal) da parede A no extremo ptA
        const aBotOrigin = ptA === 'p1' ? ba.botLeft : ba.botRight;
        // Direção longitudinal de A (no extremo ptA, sentido para dentro)
        const aDirX = ptA === 'p1' ? ba.dirX : -ba.dirX;
        const aDirY = ptA === 'p1' ? ba.dirY : -ba.dirY;

        // Borda "top" e "bot" da parede B no extremo ptB
        const bTopOrigin = ptB === 'p1' ? bb.topLeft : bb.topRight;
        const bBotOrigin = ptB === 'p1' ? bb.botLeft : bb.botRight;
        const bDirX = ptB === 'p1' ? bb.dirX : -bb.dirX;
        const bDirY = ptB === 'p1' ? bb.dirY : -bb.dirY;

        // Interseção das bordas top
        const miterTop = lineIntersect(
          aTopOrigin, { x: aDirX, y: aDirY },
          bTopOrigin, { x: bDirX, y: bDirY }
        );

        // Interseção das bordas bot
        const miterBot = lineIntersect(
          aBotOrigin, { x: aDirX, y: aDirY },
          bBotOrigin, { x: bDirX, y: bDirY }
        );

        if (miterTop) {
          if (ptA === 'p1') ra.p1Top = miterTop; else ra.p2Top = miterTop;
          if (ptB === 'p1') rb.p1Top = miterTop; else rb.p2Top = miterTop;
        }

        if (miterBot) {
          if (ptA === 'p1') ra.p1Bot = miterBot; else ra.p2Bot = miterBot;
          if (ptB === 'p1') rb.p1Bot = miterBot; else rb.p2Bot = miterBot;
        }
      }
    }
  }

  return result;
};

/**
 * Converte MiterResult em array plano de pontos [x,y,...] para Konva Line/Polygon
 */
export const miterToPoints = (m: MiterResult): number[] => [
  m.p1Top.x, m.p1Top.y,
  m.p2Top.x, m.p2Top.y,
  m.p2Bot.x, m.p2Bot.y,
  m.p1Bot.x, m.p1Bot.y,
];

/**
 * Versão simples sem miter (compatibilidade legada)
 */
export const getWallVertices = (wall: Wall): number[] => {
  const { p1, p2, thickness } = wall;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [p1.x, p1.y, p1.x, p1.y, p1.x, p1.y, p1.x, p1.y];
  const ux = dx / len; const uy = dy / len;
  const nx = -uy; const ny = ux;
  const halfT = thickness / 2;
  return [
    p1.x + halfT * nx, p1.y + halfT * ny,
    p2.x + halfT * nx, p2.y + halfT * ny,
    p2.x - halfT * nx, p2.y - halfT * ny,
    p1.x - halfT * nx, p1.y - halfT * ny,
  ];
};
