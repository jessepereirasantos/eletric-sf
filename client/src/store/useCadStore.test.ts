import { describe, it, expect, beforeEach } from 'vitest';
import { useCadStore } from './useCadStore';

// Reset store before each test
beforeEach(() => {
  useCadStore.getState().resetWorkspace();
});

describe('useCadStore', () => {
  // ─── Initial state ──────────────────────────────────────────
  describe('initial state', () => {
    it('has empty walls, devices, circuits, conduits', () => {
      const state = useCadStore.getState();
      expect(state.walls).toEqual([]);
      expect(state.devices).toEqual([]);
      expect(state.circuits).toEqual([]);
      expect(state.conduits).toEqual([]);
    });

    it('has default viewport settings', () => {
      const state = useCadStore.getState();
      expect(state.ppm).toBe(100);
      expect(state.zoom).toBe(1.0);
      expect(state.showGrid).toBe(false);
    });
  });

  // ─── Walls ──────────────────────────────────────────────────
  describe('walls', () => {
    it('adds a wall with default properties', () => {
      const { addWall } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 3, y: 0 });

      const walls = useCadStore.getState().walls;
      expect(walls).toHaveLength(1);
      expect(walls[0].p1).toEqual({ x: 0, y: 0 });
      expect(walls[0].p2).toEqual({ x: 3, y: 0 });
      expect(walls[0].thickness).toBe(0.15);
      expect(walls[0].height).toBe(2.80);
      expect(walls[0].material).toBe('alvenaria');
    });

    it('adds a wall with custom thickness', () => {
      const { addWall } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 2, y: 0 }, 0.10);

      const walls = useCadStore.getState().walls;
      expect(walls[0].thickness).toBe(0.10);
    });

    it('removes a wall by id', () => {
      const { addWall, removeWall } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 3, y: 0 });

      const wallId = useCadStore.getState().walls[0].id;
      removeWall(wallId);

      expect(useCadStore.getState().walls).toHaveLength(0);
    });

    it('updates wall properties', () => {
      const { addWall, updateWall } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 3, y: 0 });

      const wallId = useCadStore.getState().walls[0].id;
      updateWall(wallId, { material: 'drywall', thickness: 0.10 });

      const wall = useCadStore.getState().walls[0];
      expect(wall.material).toBe('drywall');
      expect(wall.thickness).toBe(0.10);
    });
  });

  // ─── Devices ────────────────────────────────────────────────
  describe('devices', () => {
    it('adds a device with generated id', () => {
      const { addDevice } = useCadStore.getState();
      addDevice({
        type: 'tomada_baixa',
        name: 'Tomada Sala',
        x: 1.5,
        y: 2.0,
        rotation: 0,
        power: 100,
        voltage: 127,
      });

      const devices = useCadStore.getState().devices;
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toMatch(/^dev_/);
      expect(devices[0].type).toBe('tomada_baixa');
    });

    it('removes a device and its connected conduits', () => {
      const { addDevice, addConduit, removeDevice } = useCadStore.getState();
      addDevice({ type: 'qdc', name: 'QDC', x: 0, y: 0, rotation: 0, power: 0, voltage: 220 });
      addDevice({ type: 'tomada_baixa', name: 'T1', x: 2, y: 0, rotation: 0, power: 100, voltage: 127 });

      const [qdc, t1] = useCadStore.getState().devices;
      addConduit(qdc.id, t1.id);
      expect(useCadStore.getState().conduits).toHaveLength(1);

      removeDevice(qdc.id);
      const state = useCadStore.getState();
      expect(state.devices).toHaveLength(1);
      expect(state.conduits).toHaveLength(0); // conduit should be removed
    });

    it('updates device properties', () => {
      const { addDevice, updateDeviceProperties } = useCadStore.getState();
      addDevice({ type: 'tomada_baixa', name: 'T1', x: 1, y: 1, rotation: 0, power: 100, voltage: 127 });

      const devId = useCadStore.getState().devices[0].id;
      updateDeviceProperties(devId, { power: 200, voltage: 220 });

      const dev = useCadStore.getState().devices[0];
      expect(dev.power).toBe(200);
      expect(dev.voltage).toBe(220);
    });
  });

  // ─── Circuits ───────────────────────────────────────────────
  describe('circuits', () => {
    it('adds a circuit with generated id', () => {
      const { addCircuit } = useCadStore.getState();
      addCircuit({
        number: 1,
        name: 'Iluminação Sala',
        type: 'iluminacao',
        voltage: 127,
        groupedCircuits: 1,
      });

      const circuits = useCadStore.getState().circuits;
      expect(circuits).toHaveLength(1);
      expect(circuits[0].id).toMatch(/^circ_/);
    });

    it('removes circuit and unlinks devices', () => {
      const { addCircuit, addDevice, removeCircuit } = useCadStore.getState();
      addCircuit({ number: 1, name: 'C1', type: 'iluminacao', voltage: 127, groupedCircuits: 1 });

      const circId = useCadStore.getState().circuits[0].id;
      addDevice({ type: 'lampada', name: 'L1', x: 0, y: 0, rotation: 0, power: 100, voltage: 127, circuitId: circId });

      removeCircuit(circId);
      const state = useCadStore.getState();
      expect(state.circuits).toHaveLength(0);
      expect(state.devices[0].circuitId).toBeUndefined();
    });
  });

  // ─── Conduits ───────────────────────────────────────────────
  describe('conduits', () => {
    it('adds a conduit between two devices', () => {
      const { addDevice, addConduit } = useCadStore.getState();
      addDevice({ type: 'qdc', name: 'QDC', x: 0, y: 0, rotation: 0, power: 0, voltage: 220 });
      addDevice({ type: 'tomada_baixa', name: 'T1', x: 2, y: 0, rotation: 0, power: 100, voltage: 127 });

      const [qdc, t1] = useCadStore.getState().devices;
      addConduit(qdc.id, t1.id);

      const conduits = useCadStore.getState().conduits;
      expect(conduits).toHaveLength(1);
      expect(conduits[0].fromDeviceId).toBe(qdc.id);
      expect(conduits[0].toDeviceId).toBe(t1.id);
      expect(conduits[0].diameter).toBe('3/4');
    });

    it('does not add duplicate conduit', () => {
      const { addDevice, addConduit } = useCadStore.getState();
      addDevice({ type: 'qdc', name: 'QDC', x: 0, y: 0, rotation: 0, power: 0, voltage: 220 });
      addDevice({ type: 'tomada_baixa', name: 'T1', x: 2, y: 0, rotation: 0, power: 100, voltage: 127 });

      const [qdc, t1] = useCadStore.getState().devices;
      addConduit(qdc.id, t1.id);
      addConduit(t1.id, qdc.id); // reverse duplicate

      expect(useCadStore.getState().conduits).toHaveLength(1);
    });

    it('does not add self-loop conduit', () => {
      const { addDevice, addConduit } = useCadStore.getState();
      addDevice({ type: 'qdc', name: 'QDC', x: 0, y: 0, rotation: 0, power: 0, voltage: 220 });

      const qdc = useCadStore.getState().devices[0];
      addConduit(qdc.id, qdc.id);

      expect(useCadStore.getState().conduits).toHaveLength(0);
    });
  });

  // ─── Undo / Redo ────────────────────────────────────────────
  describe('undo/redo', () => {
    it('undoes the last wall addition', () => {
      const { addWall, undo } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 3, y: 0 });
      expect(useCadStore.getState().walls).toHaveLength(1);

      undo();
      expect(useCadStore.getState().walls).toHaveLength(0);
    });

    it('redoes after undo', () => {
      const { addWall, undo, redo } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 3, y: 0 });
      undo();
      expect(useCadStore.getState().walls).toHaveLength(0);

      redo();
      expect(useCadStore.getState().walls).toHaveLength(1);
    });

    it('clears future on new action after undo', () => {
      const { addWall, undo } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 3, y: 0 });
      undo();

      // New action should clear future
      useCadStore.getState().addWall({ x: 5, y: 0 }, { x: 8, y: 0 });
      expect(useCadStore.getState().future).toHaveLength(0);
    });

    it('does nothing when undoing with empty history', () => {
      const { undo } = useCadStore.getState();
      undo(); // should not throw
      expect(useCadStore.getState().walls).toHaveLength(0);
    });

    it('does nothing when redoing with empty future', () => {
      const { redo } = useCadStore.getState();
      redo(); // should not throw
      expect(useCadStore.getState().walls).toHaveLength(0);
    });
  });

  // ─── Selection ──────────────────────────────────────────────
  describe('selection', () => {
    it('selects and deselects a device', () => {
      const { addDevice, setSelectedDeviceId, clearSelection } = useCadStore.getState();
      addDevice({ type: 'lampada', name: 'L1', x: 0, y: 0, rotation: 0, power: 100, voltage: 127 });

      const devId = useCadStore.getState().devices[0].id;
      setSelectedDeviceId(devId);
      expect(useCadStore.getState().selectedDeviceId).toBe(devId);

      clearSelection();
      expect(useCadStore.getState().selectedDeviceId).toBeNull();
    });

    it('clears device selection when switching tool', () => {
      const { addDevice, setSelectedDeviceId, setCurrentTool } = useCadStore.getState();
      addDevice({ type: 'lampada', name: 'L1', x: 0, y: 0, rotation: 0, power: 100, voltage: 127 });

      setSelectedDeviceId(useCadStore.getState().devices[0].id);
      setCurrentTool('wall');

      expect(useCadStore.getState().selectedDeviceId).toBeNull();
    });
  });

  // ─── Reset ─────────────────────────────────────────────────
  describe('resetWorkspace', () => {
    it('clears all elements', () => {
      const { addWall, addDevice, addCircuit, resetWorkspace } = useCadStore.getState();
      addWall({ x: 0, y: 0 }, { x: 3, y: 0 });
      addDevice({ type: 'lampada', name: 'L1', x: 0, y: 0, rotation: 0, power: 100, voltage: 127 });
      addCircuit({ number: 1, name: 'C1', type: 'iluminacao', voltage: 127, groupedCircuits: 1 });

      resetWorkspace();

      const state = useCadStore.getState();
      expect(state.walls).toHaveLength(0);
      expect(state.devices).toHaveLength(0);
      expect(state.circuits).toHaveLength(0);
      expect(state.conduits).toHaveLength(0);
      expect(state.history).toHaveLength(0);
      expect(state.future).toHaveLength(0);
    });
  });
});
