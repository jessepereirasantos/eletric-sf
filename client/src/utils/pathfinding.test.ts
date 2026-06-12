import { describe, it, expect } from 'vitest';
import { calculateWiringRouting } from './pathfinding';
import type { Device, Conduit, Circuit } from '../store/useCadStore';

const makeDevice = (overrides: Partial<Device> & { id: string; type: string }): Device => ({
  name: overrides.id,
  x: 0,
  y: 0,
  rotation: 0,
  power: 100,
  voltage: 127,
  ...overrides,
});

const makeConduit = (id: string, from: string, to: string): Conduit => ({
  id,
  fromDeviceId: from,
  toDeviceId: to,
  diameter: '3/4',
  type: 'flexivel',
});

const makeCircuit = (overrides: Partial<Circuit> & { id: string; number: number }): Circuit => ({
  name: `Circuit ${overrides.number}`,
  type: 'iluminacao',
  voltage: 127,
  groupedCircuits: 1,
  ...overrides,
});

describe('calculateWiringRouting', () => {
  // ─── Empty inputs ──────────────────────────────────────────
  it('returns empty result for empty conduits', () => {
    const result = calculateWiringRouting([], [], []);
    expect(result).toEqual({});
  });

  it('returns empty result when no QDC exists', () => {
    const devices = [
      makeDevice({ id: 'dev1', type: 'tomada_baixa' }),
    ];
    const result = calculateWiringRouting(devices, [], []);
    expect(result).toEqual({});
  });

  // ─── Simple monophasic circuit (127V) ─────────────────────
  describe('monophasic 127V circuit', () => {
    it('routes phase + neutral + ground for iluminacao', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const lamp = makeDevice({ id: 'lamp1', type: 'lampada', circuitId: 'c1' });
      const conduit = makeConduit('cndt1', 'qdc', 'lamp1');
      const circuit = makeCircuit({ id: 'c1', number: 1, type: 'iluminacao', voltage: 127 });

      const result = calculateWiringRouting([qdc, lamp], [conduit], [circuit]);

      expect(result['cndt1']).toHaveLength(1);
      const wires = result['cndt1'][0];
      expect(wires.phase).toBe(1);
      expect(wires.neutral).toBe(1);
      expect(wires.ground).toBe(1);
      expect(wires.ret).toBe(0);
    });

    it('routes phase + neutral + ground for tomada 127V', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const tomada = makeDevice({ id: 't1', type: 'tomada_baixa', circuitId: 'c1', voltage: 127 });
      const conduit = makeConduit('cndt1', 'qdc', 't1');
      const circuit = makeCircuit({ id: 'c1', number: 1, type: 'tug', voltage: 127 });

      const result = calculateWiringRouting([qdc, tomada], [conduit], [circuit]);

      expect(result['cndt1'][0].phase).toBe(1);
      expect(result['cndt1'][0].neutral).toBe(1);
      expect(result['cndt1'][0].ground).toBe(1);
    });
  });

  // ─── Biphasic 220V circuit ────────────────────────────────
  describe('biphasic 220V circuit', () => {
    it('routes phase + phase + ground for tug 220V', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const tomada = makeDevice({ id: 't1', type: 'tomada_alta', circuitId: 'c1', voltage: 220 });
      const conduit = makeConduit('cndt1', 'qdc', 't1');
      const circuit = makeCircuit({ id: 'c1', number: 2, type: 'tug', voltage: 220 });

      const result = calculateWiringRouting([qdc, tomada], [conduit], [circuit]);

      expect(result['cndt1'][0].phase).toBe(2);
      expect(result['cndt1'][0].neutral).toBe(0);
      expect(result['cndt1'][0].ground).toBe(1);
    });
  });

  // ─── Switch + lamp routing ────────────────────────────────
  describe('switch (interruptor) routing', () => {
    it('routes phase to switch and return to closest lamp', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const sw = makeDevice({ id: 'sw1', type: 'interruptor', circuitId: 'c1' });
      const lamp = makeDevice({ id: 'lamp1', type: 'lampada', circuitId: 'c1' });
      const c1 = makeConduit('cndt1', 'qdc', 'sw1');
      const c2 = makeConduit('cndt2', 'sw1', 'lamp1');
      const circuit = makeCircuit({ id: 'c1', number: 1, type: 'iluminacao', voltage: 127 });

      const result = calculateWiringRouting([qdc, sw, lamp], [c1, c2], [circuit]);

      // QDC → switch → lamp: conduit cndt1 is on both paths (QDC→SW and SW→lamp)
      // so it carries 2 phase (1 to switch + 1 return from switch to lamp is routed through cndt1)
      const qdcToSw = result['cndt1'];
      expect(qdcToSw.length).toBe(1);
      expect(qdcToSw[0].phase).toBe(2); // 1 (to switch) + 1 (return to lamp) routed through same conduit

      // switch → lamp: cndt2 also carries the return
      const swToLamp = result['cndt2'];
      expect(swToLamp.length).toBe(1);
      expect(swToLamp[0].ret).toBe(1);
    });
  });

  // ─── Multi-conduit path ───────────────────────────────────
  describe('multi-hop routing', () => {
    it('wires all conduits along the path', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const mid = makeDevice({ id: 'mid', type: 'tomada_baixa' }); // intermediate node
      const end = makeDevice({ id: 'end', type: 'tomada_baixa', circuitId: 'c1' });
      const c1 = makeConduit('cndt1', 'qdc', 'mid');
      const c2 = makeConduit('cndt2', 'mid', 'end');
      const circuit = makeCircuit({ id: 'c1', number: 1, type: 'tug', voltage: 127 });

      const result = calculateWiringRouting([qdc, mid, end], [c1, c2], [circuit]);

      // Both conduits should carry the wires
      expect(result['cndt1'].length).toBeGreaterThan(0);
      expect(result['cndt2'].length).toBeGreaterThan(0);
    });
  });

  // ─── Isolated device ──────────────────────────────────────
  it('skips devices not connected to QDC', () => {
    const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
    const orphan = makeDevice({ id: 'orphan', type: 'tomada_baixa', circuitId: 'c1' });
    // No conduit connecting orphan to QDC
    const circuit = makeCircuit({ id: 'c1', number: 1, type: 'tug', voltage: 127 });

    const result = calculateWiringRouting([qdc, orphan], [], [circuit]);
    // orphan has no conduit, so nothing should be wired
    expect(Object.values(result).flat()).toHaveLength(0);
  });

  // ─── Physical limits ─────────────────────────────────────
  describe('physical wire limits', () => {
    it('caps phase at 2', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const t1 = makeDevice({ id: 't1', type: 'tomada_alta', circuitId: 'c1', voltage: 220 });
      const t2 = makeDevice({ id: 't2', type: 'tomada_alta', circuitId: 'c1', voltage: 220 });
      const conduit = makeConduit('cndt1', 'qdc', 't1');
      const circuit = makeCircuit({ id: 'c1', number: 1, type: 'tug', voltage: 220 });

      // Even if we call it twice conceptually, the per-circuit cap applies
      const result = calculateWiringRouting([qdc, t1, t2], [conduit], [circuit]);
      const wires = result['cndt1'][0];
      expect(wires.phase).toBeLessThanOrEqual(2);
    });

    it('caps neutral at 1', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const lamp = makeDevice({ id: 'lamp1', type: 'lampada', circuitId: 'c1' });
      const conduit = makeConduit('cndt1', 'qdc', 'lamp1');
      const circuit = makeCircuit({ id: 'c1', number: 1, type: 'iluminacao', voltage: 127 });

      const result = calculateWiringRouting([qdc, lamp], [conduit], [circuit]);
      expect(result['cndt1'][0].neutral).toBeLessThanOrEqual(1);
    });

    it('caps ground at 1', () => {
      const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
      const lamp = makeDevice({ id: 'lamp1', type: 'lampada', circuitId: 'c1' });
      const conduit = makeConduit('cndt1', 'qdc', 'lamp1');
      const circuit = makeCircuit({ id: 'c1', number: 1, type: 'iluminacao', voltage: 127 });

      const result = calculateWiringRouting([qdc, lamp], [conduit], [circuit]);
      expect(result['cndt1'][0].ground).toBeLessThanOrEqual(1);
    });
  });

  // ─── Circuit without devices ─────────────────────────────
  it('skips circuits with no assigned devices', () => {
    const qdc = makeDevice({ id: 'qdc', type: 'qdc' });
    const circuit = makeCircuit({ id: 'c1', number: 1, type: 'iluminacao', voltage: 127 });

    const result = calculateWiringRouting([qdc], [], [circuit]);
    expect(Object.values(result).flat()).toHaveLength(0);
  });
});
