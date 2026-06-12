import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  getClosestPointOnSegment,
  computeMiterJoints,
  miterToPoints,
  getWallVertices,
} from './geometry';
import type { Wall } from '../store/useCadStore';

// ─── snapToGrid ─────────────────────────────────────────────────
describe('snapToGrid', () => {
  it('snaps to nearest grid point', () => {
    expect(snapToGrid({ x: 1.07, y: 2.13 }, 0.1)).toEqual({ x: 1.1, y: 2.1 });
  });

  it('returns exact point if already on grid', () => {
    expect(snapToGrid({ x: 1.0, y: 2.0 }, 0.1)).toEqual({ x: 1.0, y: 2.0 });
  });

  it('handles zero spacing by returning original point', () => {
    expect(snapToGrid({ x: 1.5, y: 2.7 }, 0)).toEqual({ x: 1.5, y: 2.7 });
  });

  it('handles negative spacing by returning original point', () => {
    expect(snapToGrid({ x: 1.5, y: 2.7 }, -1)).toEqual({ x: 1.5, y: 2.7 });
  });

  it('snaps with large grid spacing', () => {
    expect(snapToGrid({ x: 4.3, y: 7.8 }, 1)).toEqual({ x: 4.0, y: 8.0 });
  });

  it('snaps negative coordinates correctly', () => {
    expect(snapToGrid({ x: -1.07, y: -2.13 }, 0.1)).toEqual({ x: -1.1, y: -2.1 });
  });
});

// ─── getClosestPointOnSegment ───────────────────────────────────
describe('getClosestPointOnSegment', () => {
  it('finds closest point in the middle of segment', () => {
    const result = getClosestPointOnSegment(
      { x: 2, y: 1 },
      { x: 0, y: 0 },
      { x: 4, y: 0 }
    );
    expect(result.point).toEqual({ x: 2, y: 0 });
    expect(result.distance).toBe(1);
    expect(result.t).toBe(0.5);
  });

  it('clamps to start of segment when before start', () => {
    const result = getClosestPointOnSegment(
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 4, y: 0 }
    );
    expect(result.point).toEqual({ x: 0, y: 0 });
    expect(result.t).toBe(0);
  });

  it('clamps to end of segment when after end', () => {
    const result = getClosestPointOnSegment(
      { x: 5, y: 0 },
      { x: 0, y: 0 },
      { x: 4, y: 0 }
    );
    expect(result.point).toEqual({ x: 4, y: 0 });
    expect(result.t).toBe(1);
  });

  it('handles zero-length segment (a === b)', () => {
    const result = getClosestPointOnSegment(
      { x: 3, y: 4 },
      { x: 1, y: 1 },
      { x: 1, y: 1 }
    );
    expect(result.point).toEqual({ x: 1, y: 1 });
    expect(result.distance).toBeCloseTo(Math.sqrt(13)); // sqrt(2²+3²)
  });

  it('returns correct angle for horizontal segment', () => {
    const result = getClosestPointOnSegment(
      { x: 2, y: 1 },
      { x: 0, y: 0 },
      { x: 4, y: 0 }
    );
    expect(result.angle).toBe(0);
  });

  it('returns correct angle for vertical segment', () => {
    const result = getClosestPointOnSegment(
      { x: 1, y: 2 },
      { x: 0, y: 0 },
      { x: 0, y: 4 }
    );
    expect(result.angle).toBeCloseTo(90);
  });

  it('detects left side (side = -1)', () => {
    const result = getClosestPointOnSegment(
      { x: 2, y: -1 }, // below
      { x: 0, y: 0 },
      { x: 4, y: 0 }
    );
    expect(result.side).toBe(-1);
  });

  it('detects right side (side = 1)', () => {
    const result = getClosestPointOnSegment(
      { x: 2, y: 1 }, // above
      { x: 0, y: 0 },
      { x: 4, y: 0 }
    );
    expect(result.side).toBe(1);
  });
});

// ─── getWallVertices ────────────────────────────────────────────
describe('getWallVertices', () => {
  const makeWall = (overrides?: Partial<Wall>): Wall => ({
    id: 'w1',
    p1: { x: 0, y: 0 },
    p2: { x: 4, y: 0 },
    thickness: 0.15,
    height: 2.8,
    material: 'alvenaria',
    ...overrides,
  });

  it('returns 8 numbers (4 vertices)', () => {
    const verts = getWallVertices(makeWall());
    expect(verts).toHaveLength(8);
  });

  it('returns correct vertices for horizontal wall', () => {
    const wall = makeWall({ thickness: 0.2 });
    const verts = getWallVertices(wall);
    // Wall along x-axis, thickness 0.2 → normal = (0,1), so top = +0.1, bot = -0.1
    expect(verts[0]).toBeCloseTo(0);   // p1 top x
    expect(verts[1]).toBeCloseTo(0.1);   // p1 top y
    expect(verts[2]).toBeCloseTo(4);   // p2 top x
    expect(verts[3]).toBeCloseTo(0.1);   // p2 top y
    expect(verts[4]).toBeCloseTo(4);   // p2 bot x
    expect(verts[5]).toBeCloseTo(-0.1);  // p2 bot y
    expect(verts[6]).toBeCloseTo(0);   // p1 bot x
    expect(verts[7]).toBeCloseTo(-0.1);  // p1 bot y
  });

  it('returns degenerate points for zero-length wall', () => {
    const wall = makeWall({ p1: { x: 1, y: 1 }, p2: { x: 1, y: 1 } });
    const verts = getWallVertices(wall);
    // All vertices should be at (1, 1)
    expect(verts[0]).toBeCloseTo(1);
    expect(verts[1]).toBeCloseTo(1);
  });
});

// ─── computeMiterJoints ────────────────────────────────────────
describe('computeMiterJoints', () => {
  const makeWall = (id: string, p1: { x: number; y: number }, p2: { x: number; y: number }): Wall => ({
    id,
    p1,
    p2,
    thickness: 0.15,
    height: 2.8,
    material: 'alvenaria',
  });

  it('returns one entry per wall', () => {
    const walls = [
      makeWall('w1', { x: 0, y: 0 }, { x: 3, y: 0 }),
      makeWall('w2', { x: 3, y: 0 }, { x: 3, y: 3 }),
    ];
    const result = computeMiterJoints(walls);
    expect(result.size).toBe(2);
    expect(result.has('w1')).toBe(true);
    expect(result.has('w2')).toBe(true);
  });

  it('computes miter at T-junction', () => {
    const walls = [
      makeWall('w1', { x: 0, y: 0 }, { x: 4, y: 0 }),
      makeWall('w2', { x: 2, y: 0 }, { x: 2, y: 3 }),
    ];
    const result = computeMiterJoints(walls);
    const r1 = result.get('w1')!;
    const r2 = result.get('w2')!;
    // Both walls should have modified vertices at the junction point (2,0)
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
  });

  it('does not modify walls with no junctions', () => {
    const walls = [
      makeWall('w1', { x: 0, y: 0 }, { x: 2, y: 0 }),
      makeWall('w2', { x: 5, y: 0 }, { x: 7, y: 0 }),
    ];
    const result = computeMiterJoints(walls);
    const r1 = result.get('w1')!;
    // No junction → vertices should remain as simple wall vertices
    expect(r1.p1Top.x).toBeCloseTo(0);
    expect(r1.p1Top.y).toBeCloseTo(0.075);
  });
});

// ─── miterToPoints ─────────────────────────────────────────────
describe('miterToPoints', () => {
  it('converts MiterResult to flat array of 8 numbers', () => {
    const m = {
      p1Top: { x: 0, y: -1 },
      p1Bot: { x: 0, y: 1 },
      p2Top: { x: 4, y: -1 },
      p2Bot: { x: 4, y: 1 },
    };
    const pts = miterToPoints(m);
    expect(pts).toEqual([0, -1, 4, -1, 4, 1, 0, 1]);
  });
});
