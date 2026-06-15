import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dimensionateCircuit } from '../utils/nbr5410';
import { calculateWiringRouting } from '../utils/pathfinding';
import type { ToolType } from '../types';

const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
  ? 'http://localhost:3001/api'
  : (import.meta.env.VITE_API_URL || '/api');


// ─────────────────────────────────────────────────────────────
// Tipos Base
// ─────────────────────────────────────────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  p1: Point2D;
  p2: Point2D;
  thickness: number;
  height: number;
  material: 'alvenaria' | 'drywall' | 'concreto' | 'vidro';
}

export interface Device {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  circuitId?: string;
  power: number;
  voltage: 127 | 220;
  modules?: string[];
  width?: number; // Largura paramétrica em metros
  flip?: boolean;  // Sentido de abertura (True = Esquerda, False/undefined = Direita)
  commandLetter?: string; // Letra do comando (acionamento de iluminação)
}

export interface Circuit {
  id: string;
  number: number;
  name: string;
  type: 'iluminacao' | 'tug' | 'tue';
  voltage: 127 | 220;
  groupedCircuits: number;
}

export interface ConduitWireManual {
  circuitId: string;
  phase: number;
  neutral: number;
  ground: number;
  ret: number;
}

export interface Conduit {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  diameter: '1/2' | '3/4' | '1' | '1 1/4';
  type: 'flexivel' | 'rigido';
  isManualWiring?: boolean;
  manualWires?: ConduitWireManual[];
}

export interface MaterialItem {
  name: string;
  qty: number;
  unit: string;
  price?: number;
  category?: 'fiacao_cabos' | 'protecao' | 'infraestrutura' | 'dispositivos';
}

export interface CircuitTableRow {
  number: number;
  name: string;
  type: string;
  voltage: number;
  totalPower: number;
  currentProject: number;
  fatorAgrupamento: number;
  currentCorrected: number;
  maxDist: number;
  selectedSection: number;
  voltageDropPercent: number;
  circuitBreaker: number;
}

export interface LegendItem {
  symbol: string;
  label: string;
  qty: number;
}

export interface GuideLine {
  id: string;
  type: 'vertical' | 'horizontal';
  value: number; // em metros
}

export interface CadText {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number; // padrão 14
}

export interface CadDimension {
  id: string;
  p1: Point2D;
  p2: Point2D;
  offset?: number; // Afastamento horizontal da cota em metros
}

// Snapshot para undo/redo
interface HistorySnapshot {
  walls: Wall[];
  devices: Device[];
  conduits: Conduit[];
  circuits: Circuit[];
  guideLines: GuideLine[];
  texts: CadText[];
  dimensions: CadDimension[];
}

// ─────────────────────────────────────────────────────────────
// Interface da Store
// ─────────────────────────────────────────────────────────────

interface CadState {
  ppm: number;
  bgImageSrc: string | null;
  bgImageLock: boolean;
  bgImageScale: number;
  bgImagePos: Point2D;
  isCalibrating: boolean;
  calibrationPoints: Point2D[];
  zoom: number;
  pan: Point2D;
  showGrid: boolean;

  projectName: string;
  materialsList: MaterialItem[];
  circuitTable: CircuitTableRow[];
  legend: LegendItem[];

  walls: Wall[];
  devices: Device[];
  circuits: Circuit[];
  conduits: Conduit[];
  guideLines: GuideLine[];
  texts: CadText[];
  dimensions: CadDimension[];

  history: HistorySnapshot[];
  future: HistorySnapshot[];

  currentTool: ToolType;
  selectedDeviceType: string | null;
  activeWallPoints: Point2D[];
  selectedDeviceId: string | null;
  selectedWallId: string | null;
  selectedGuideLineId: string | null;
  selectedGuideType: 'vertical' | 'horizontal';
  selectedTextId: string | null;
  selectedDimensionId: string | null;
  selectedConduitId: string | null;
  activeDimensionPoints: Point2D[];

  setPpm: (ppm: number) => void;
  setBgImageSrc: (src: string | null) => void;
  setBgImageLock: (lock: boolean) => void;
  setBgImageScale: (scale: number) => void;
  setBgImagePos: (pos: Point2D) => void;
  setIsCalibrating: (active: boolean) => void;
  addCalibrationPoint: (point: Point2D) => void;
  clearCalibrationPoints: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point2D) => void;
  toggleGrid: () => void;

  setProjectName: (name: string) => void;
  recomputeDerivedState: () => void;

  setCurrentTool: (tool: ToolType) => void;
  setSelectedDeviceType: (type: string | null) => void;
  setSelectedDeviceId: (id: string | null) => void;
  setSelectedWallId: (id: string | null) => void;
  setSelectedGuideLineId: (id: string | null) => void;
  setSelectedGuideType: (type: 'vertical' | 'horizontal') => void;
  setSelectedTextId: (id: string | null) => void;
  setSelectedDimensionId: (id: string | null) => void;
  setSelectedConduitId: (id: string | null) => void;
  clearSelection: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  addWall: (p1: Point2D, p2: Point2D, thickness?: number) => void;
  removeWall: (id: string) => void;
  updateWall: (id: string, props: Partial<Omit<Wall, 'id'>>) => void;
  addActiveWallPoint: (pt: Point2D) => void;
  clearActiveWallPoints: () => void;

  addDevice: (device: Omit<Device, 'id'>) => void;
  removeDevice: (id: string) => void;
  updateDeviceProperties: (id: string, properties: Partial<Device>) => void;
  addDeviceModule: (id: string, moduleType: string) => void;
  removeDeviceModule: (id: string, index: number) => void;

  addCircuit: (circuit: Omit<Circuit, 'id'>) => void;
  removeCircuit: (id: string) => void;
  updateCircuit: (id: string, properties: Partial<Circuit>) => void;

  addConduit: (fromDeviceId: string, toDeviceId: string) => void;
  removeConduit: (id: string) => void;
  updateConduitProperties: (id: string, properties: Partial<Conduit>) => void;

  splitCircuitsLight: () => void;
  splitCircuitsTUG: () => void;
  splitCircuitsTUE: () => void;
  autoWire: () => void;

  // Linhas de Guia
  addGuideLine: (type: 'vertical' | 'horizontal', value: number) => void;
  removeGuideLine: (id: string) => void;

  // Anotações de Texto
  addText: (text: Omit<CadText, 'id'>) => void;
  removeText: (id: string) => void;
  updateText: (id: string, text: string, fontSize?: number) => void;
  updateTextPosition: (id: string, x: number, y: number) => void;

  // Cotas (Medidas)
  addDimension: (p1: Point2D, p2: Point2D, offset?: number) => void;
  removeDimension: (id: string) => void;
  updateDimensionPoints: (id: string, p1: Point2D, p2: Point2D) => void;
  addActiveDimensionPoint: (pt: Point2D) => void;
  clearActiveDimensionPoints: () => void;

  // Estado de Pranchas (Paper Space)
  paperSpaceActive: boolean;
  paperSize: 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
  paperScale: number;
  paperPos: Point2D;
  paperTitle: string;
  paperOwner: string;
  paperDesigner: string;
  paperDate: string;
  paperSheetNum: string;

  setPaperSpaceActive: (active: boolean) => void;
  setPaperSize: (size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4') => void;
  setPaperScale: (scale: number) => void;
  setPaperPos: (pos: Point2D) => void;
  updatePaperStamp: (fields: Partial<{ title: string; owner: string; designer: string; date: string; sheetNum: string }>) => void;

  resetWorkspace: () => void;

  // Autenticação
  user: { id: number; name: string; email: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadUserSession: () => Promise<void>;
  
  // Projetos na Nuvem (Banco de Dados)
  dbProjects: { id: number; name: string; created_at: string; updated_at: string }[];
  currentDbProjectId: number | null;
  loadProjectsFromDb: () => Promise<void>;
  saveProjectToDb: (projectId?: number) => Promise<number | null>;
  loadProjectByIdFromDb: (id: number) => Promise<void>;
  deleteProjectFromDb: (id: number) => Promise<void>;
  setWorkspaceData: (data: any) => void;
}

const MAX_HISTORY = 50;

const takeSnapshot = (state: CadState): HistorySnapshot => ({
  walls: JSON.parse(JSON.stringify(state.walls || [])),
  devices: JSON.parse(JSON.stringify(state.devices || [])),
  conduits: JSON.parse(JSON.stringify(state.conduits || [])),
  circuits: JSON.parse(JSON.stringify(state.circuits || [])),
  guideLines: JSON.parse(JSON.stringify(state.guideLines || [])),
  texts: JSON.parse(JSON.stringify(state.texts || [])),
  dimensions: JSON.parse(JSON.stringify(state.dimensions || [])),
});

export const useCadStore = create<CadState>()(
  persist(
    (set, get) => ({
      ppm: 100,
      bgImageSrc: null,
      paperSpaceActive: false,
      paperSize: 'A3',
      paperScale: 50,
      paperPos: { x: -5, y: -5 },
      paperTitle: 'Instalação Elétrica Residencial',
      paperOwner: 'Silvana Barbosa',
      paperDesigner: 'Eng. Antigravity',
      paperDate: new Date().toLocaleDateString('pt-BR'),
      paperSheetNum: 'PR-01/01',

      setPaperSpaceActive: (active) => set({ paperSpaceActive: active }),
      setPaperSize: (size) => set({ paperSize: size }),
      setPaperScale: (scale) => set({ paperScale: scale }),
      setPaperPos: (pos) => set({ paperPos: pos }),
      updatePaperStamp: (fields) => set((s) => ({
        paperTitle: fields.title !== undefined ? fields.title : s.paperTitle,
        paperOwner: fields.owner !== undefined ? fields.owner : s.paperOwner,
        paperDesigner: fields.designer !== undefined ? fields.designer : s.paperDesigner,
        paperDate: fields.date !== undefined ? fields.date : s.paperDate,
        paperSheetNum: fields.sheetNum !== undefined ? fields.sheetNum : s.paperSheetNum,
      })),
      bgImageLock: true,
      bgImageScale: 1.0,
      bgImagePos: { x: 0, y: 0 },
      isCalibrating: false,
      calibrationPoints: [],
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      showGrid: false,

      projectName: 'Projeto sem título',
      materialsList: [],
      circuitTable: [],
      legend: [],

      walls: [],
      devices: [],
      circuits: [],
      conduits: [],
      guideLines: [],
      texts: [],
      dimensions: [],

      history: [],
      future: [],

      currentTool: 'select',
      selectedDeviceType: null,
      activeWallPoints: [],
      selectedDeviceId: null,
      selectedWallId: null,
      selectedGuideLineId: null,
      selectedGuideType: 'vertical',
      selectedTextId: null,
      selectedDimensionId: null,
      selectedConduitId: null,
      activeDimensionPoints: [],

      setPpm: (ppm) => set({ ppm }),
      setBgImageSrc: (src) => set({ bgImageSrc: src, calibrationPoints: [] }),
      setBgImageLock: (lock) => set({ bgImageLock: lock }),
      setBgImageScale: (scale) => set({ bgImageScale: scale }),
      setBgImagePos: (pos) => set({ bgImagePos: pos }),
      setIsCalibrating: (active) => set({ isCalibrating: active, calibrationPoints: [] }),
      addCalibrationPoint: (point) => set((s) => ({ calibrationPoints: [...s.calibrationPoints, point] })),
      clearCalibrationPoints: () => set({ calibrationPoints: [] }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  setProjectName: (name) => set({ projectName: name }),

  recomputeDerivedState: () => {
    const { walls, devices, circuits, conduits } = get();
    const materialsList: MaterialItem[] = [];

    // Helper para categorização de dispositivos
    const getDeviceCategory = (type: string): 'fiacao_cabos' | 'protecao' | 'infraestrutura' | 'dispositivos' => {
      if (type.startsWith('box_') || type === 'qdc' || type === 'poste' || type === 'medidor') {
        return 'infraestrutura';
      }
      return 'dispositivos';
    };

    // 1. Paredes
    let totalWallLength = 0;
    walls.forEach(w => {
      totalWallLength += Math.sqrt(Math.pow(w.p2.x - w.p1.x, 2) + Math.pow(w.p2.y - w.p1.y, 2));
    });
    if (totalWallLength > 0) {
      materialsList.push({
        name: 'Alvenaria (Paredes)',
        qty: Math.round(totalWallLength * 10) / 10,
        unit: 'm',
        price: 150.00,
        category: 'infraestrutura'
      });
    }

    // 2. Dispositivos (filtrando arquitetura)
    const ARCHITECTURE_TYPES = new Set([
      'door', 'door_correr', 'door_pivotante', 'open_van', 'window', 'stairs',
    ]);
    const electricalDevices = devices.filter(d => !ARCHITECTURE_TYPES.has(d.type));

    const deviceCounts: Record<string, { qty: number; price: number; type: string }> = {};
    electricalDevices.forEach(d => {
      const priceMap: Record<string, number> = {
        qdc: 85.00,
        poste: 850.00,
        medidor: 180.00,
        interruptor: 15.00,
        lampada: 18.00,
        tele_rj45: 22.00,
        tele_rj11: 18.00,
        tele_coaxial: 16.00,
        cftv_camera: 280.00,
        sensor_presenca: 45.00,
        central_alarme: 350.00,
        switch_simple: 15.00,
        switch_parallel: 20.00,
        switch_intermediate: 25.00,
        tug_baixa: 15.00,
        tug_media: 16.00,
        tug_alta: 18.00,
        tue_chuveiro: 35.00,
        tue_ar: 40.00,
        ceiling_light: 18.00,
        sconce: 22.00,
        fluorescent: 25.00,
        box_octogonal: 12.00,
        box_4x2: 10.00,
        box_4x4: 15.00,
      };
      const price = priceMap[d.type] ?? 12.00;
      deviceCounts[d.name] = {
        qty: (deviceCounts[d.name]?.qty || 0) + 1,
        price,
        type: d.type
      };
    });

    Object.entries(deviceCounts).forEach(([name, data]) => {
      materialsList.push({
        name,
        qty: data.qty,
        unit: 'un',
        price: data.price,
        category: getDeviceCategory(data.type)
      });
    });

    // 3. Disjuntores (Agrupados por corrente de dimensionamento e categorizados como Proteção)
    const breakerCounts: Record<number, number> = {};
    circuits.forEach(c => {
      const cd = devices.filter(d => d.circuitId === c.id);
      const totalPower = cd.reduce((sum, d) => sum + (d.power || 0), 0);
      const qdc = devices.find(d => d.type === 'qdc');
      let maxDist = 10.0;
      if (qdc && cd.length > 0) {
        maxDist = Math.max(...cd.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
      }
      const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, maxDist, c.groupedCircuits);
      const rating = res.circuitBreaker;
      breakerCounts[rating] = (breakerCounts[rating] || 0) + 1;
    });

    Object.entries(breakerCounts).forEach(([amp, count]) => {
      materialsList.push({
        name: `Disjuntor Termomagnético ${amp}A`,
        qty: count,
        unit: 'un',
        price: 18.00,
        category: 'protecao'
      });
    });

    // 4. Conduítes (Eletrodutos - categorizados como Infraestrutura)
    const wiringRouting = calculateWiringRouting(devices, conduits, circuits);
    let totalConduitLength = 0;
    const cableLengths: Record<number, number> = {};

    conduits.forEach(c => {
      const fromDev = devices.find(d => d.id === c.fromDeviceId);
      const toDev = devices.find(d => d.id === c.toDeviceId);
      if (!fromDev || !toDev) return;
      const distance = Math.sqrt(Math.pow(fromDev.x - toDev.x, 2) + Math.pow(fromDev.y - toDev.y, 2)) + 2.0;
      totalConduitLength += distance;

      const wires = wiringRouting[c.id] || [];
      wires.forEach(w => {
        const circuit = circuits.find(circ => circ.number === w.circuitNumber);
        if (!circuit) return;
        const circDevices = devices.filter(d => d.circuitId === circuit.id);
        const totalPower = circDevices.reduce((sum, d) => sum + d.power, 0);
        const qdc = devices.find(d => d.type === 'qdc');
        let maxDist = 10.0;
        if (qdc && circDevices.length > 0) {
          maxDist = Math.max(...circDevices.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
        }
        const res = dimensionateCircuit(circuit.type, totalPower || 100, circuit.voltage, maxDist, circuit.groupedCircuits);
        const qtyWires = w.phase + w.neutral + w.ground + w.ret;
        cableLengths[res.selectedSection] = (cableLengths[res.selectedSection] || 0) + (distance * qtyWires);
      });
    });

    if (totalConduitLength > 0) {
      materialsList.push({
        name: 'Eletroduto Corrugado Flexível 3/4"',
        qty: Math.round(totalConduitLength * 10) / 10,
        unit: 'm',
        price: 3.50,
        category: 'infraestrutura'
      });
    }

    // 5. Cabos (categorizados como Fiação/Cabos)
    Object.entries(cableLengths).forEach(([bitola, length]) => {
      const b = parseFloat(bitola);
      const price = b <= 1.5 ? 2.20 : b === 2.5 ? 3.80 : b === 4.0 ? 5.50 : b === 6.0 ? 8.20 : 15.50;
      materialsList.push({
        name: `Cabo de Cobre Flexível ${bitola} mm²`,
        qty: Math.round(length * 10) / 10,
        unit: 'm',
        price,
        category: 'fiacao_cabos'
      });
    });

    // 6. Legenda e Circuitos
    const legendMap: Record<string, { label: string; qty: number }> = {};
    devices.forEach(d => {
      if (!legendMap[d.type]) {
        legendMap[d.type] = { label: d.name, qty: 0 };
      }
      legendMap[d.type].qty++;
    });
    const legend = Object.entries(legendMap).map(([type, info]) => ({
      symbol: type,
      label: info.label,
      qty: info.qty,
    }));

    const circuitTable: CircuitTableRow[] = circuits.map(c => {
      const cd = devices.filter(d => d.circuitId === c.id);
      const totalPower = cd.reduce((s, d) => s + d.power, 0);
      const { devices: devs } = get();
      const qdc = devs.find(d => d.type === 'qdc');
      let maxDist = 10.0;
      if (qdc && cd.length > 0) {
        maxDist = Math.max(...cd.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
      }
      const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, maxDist, c.groupedCircuits);
      return {
        number: c.number,
        name: c.name,
        type: c.type,
        voltage: c.voltage,
        totalPower,
        currentProject: res.currentProject,
        fatorAgrupamento: res.fatorAgrupamento,
        currentCorrected: res.currentCorrected,
        maxDist,
        selectedSection: res.selectedSection,
        voltageDropPercent: res.voltageDropPercent,
        circuitBreaker: res.circuitBreaker,
      };
    });

    set({ materialsList, legend, circuitTable });
  },

  setCurrentTool: (tool) => set({
    currentTool: tool,
    activeWallPoints: [],
    selectedDeviceType: null,
    selectedDeviceId: null,
    selectedWallId: null,
    selectedGuideLineId: null,
    selectedTextId: null,
    selectedDimensionId: null,
    selectedConduitId: null,
    activeDimensionPoints: [],
  }),
  setSelectedDeviceType: (type) => set({ selectedDeviceType: type }),
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id, selectedWallId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null }),
  setSelectedWallId: (id) => set({ selectedWallId: id, selectedDeviceId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null }),
  setSelectedGuideLineId: (id) => set({ selectedGuideLineId: id, selectedWallId: null, selectedDeviceId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null }),
  setSelectedGuideType: (type) => set({ selectedGuideType: type }),
  setSelectedTextId: (id) => set({ selectedTextId: id, selectedWallId: null, selectedDeviceId: null, selectedGuideLineId: null, selectedDimensionId: null, selectedConduitId: null }),
  setSelectedDimensionId: (id) => set({ selectedDimensionId: id, selectedWallId: null, selectedDeviceId: null, selectedGuideLineId: null, selectedTextId: null, selectedConduitId: null }),
  setSelectedConduitId: (id) => set({ selectedConduitId: id, selectedDeviceId: null, selectedWallId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null }),
  clearSelection: () => set({ selectedDeviceId: null, selectedWallId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null }),

  pushHistory: () => set((s) => {
    const snap = takeSnapshot(s);
    const newHistory = [...s.history, snap].slice(-MAX_HISTORY);
    return { history: newHistory, future: [] };
  }),

  undo: () => set((s) => {
    if (s.history.length === 0) return {};
    const snap = takeSnapshot(s);
    const prev = s.history[s.history.length - 1];
    return {
      walls: prev.walls,
      devices: prev.devices,
      conduits: prev.conduits,
      circuits: prev.circuits,
      guideLines: prev.guideLines || [],
      texts: prev.texts || [],
      dimensions: prev.dimensions || [],
      history: s.history.slice(0, -1),
      future: [...s.future, snap].slice(-MAX_HISTORY),
      selectedDeviceId: null,
      selectedWallId: null,
      selectedGuideLineId: null,
      selectedTextId: null,
      selectedDimensionId: null,
      selectedConduitId: null,
    };
  }),

  redo: () => set((s) => {
    if (s.future.length === 0) return {};
    const snap = takeSnapshot(s);
    const next = s.future[s.future.length - 1];
    return {
      walls: next.walls,
      devices: next.devices,
      conduits: next.conduits,
      circuits: next.circuits,
      guideLines: next.guideLines || [],
      texts: next.texts || [],
      dimensions: next.dimensions || [],
      future: s.future.slice(0, -1),
      history: [...s.history, snap].slice(-MAX_HISTORY),
      selectedDeviceId: null,
      selectedWallId: null,
      selectedGuideLineId: null,
      selectedTextId: null,
      selectedDimensionId: null,
      selectedConduitId: null,
    };
  }),

  addWall: (p1, p2, thickness = 0.15) => {
    get().pushHistory();
    set((s) => {
      const newWall: Wall = {
        id: `wall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        p1, p2, thickness,
        height: 2.80,
        material: 'alvenaria',
      };
      return { walls: [...s.walls, newWall] };
    });
    get().recomputeDerivedState();
  },

  removeWall: (id) => {
    get().pushHistory();
    set((s) => ({
      walls: s.walls.filter(w => w.id !== id),
      selectedWallId: s.selectedWallId === id ? null : s.selectedWallId,
    }));
    get().recomputeDerivedState();
  },

  updateWall: (id, props) => {
    get().pushHistory();
    set((s) => ({
      walls: s.walls.map(w => w.id === id ? { ...w, ...props } : w),
    }));
    get().recomputeDerivedState();
  },

  addActiveWallPoint: (pt) => set((s) => ({ activeWallPoints: [...s.activeWallPoints, pt] })),
  clearActiveWallPoints: () => set({ activeWallPoints: [] }),

  addDevice: (dev) => {
    get().pushHistory();
    set((s) => {
      const newDevice: Device = {
        ...dev,
        id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modules: [dev.type], // Inicializa o array de módulos com o tipo base
      };
      return { devices: [...s.devices, newDevice] };
    });
    get().recomputeDerivedState();
  },

  removeDevice: (id) => {
    get().pushHistory();
    set((s) => ({
      devices: s.devices.filter(d => d.id !== id),
      selectedDeviceId: s.selectedDeviceId === id ? null : s.selectedDeviceId,
      conduits: s.conduits.filter(c => c.fromDeviceId !== id && c.toDeviceId !== id),
    }));
    get().recomputeDerivedState();
  },

  updateDeviceProperties: (id, properties) => {
    get().pushHistory();
    set((s) => ({
      devices: s.devices.map(d => d.id === id ? { ...d, ...properties } : d),
    }));
    get().recomputeDerivedState();
  },

  addDeviceModule: (id, moduleType) => {
    get().pushHistory();
    set((s) => ({
      devices: s.devices.map(d => {
        if (d.id === id) {
          const currentModules = d.modules || [d.type];
          return { ...d, modules: [...currentModules, moduleType] };
        }
        return d;
      })
    }));
    get().recomputeDerivedState();
  },

  removeDeviceModule: (id, index) => {
    get().pushHistory();
    set((s) => ({
      devices: s.devices.map(d => {
        if (d.id === id && d.modules) {
          const newModules = d.modules.filter((_, idx) => idx !== index);
          return { ...d, modules: newModules.length > 0 ? newModules : undefined };
        }
        return d;
      })
    }));
    get().recomputeDerivedState();
  },

  addCircuit: (circ) => {
    set((s) => {
      const newCircuit: Circuit = {
        ...circ,
        id: `circ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      return { circuits: [...s.circuits, newCircuit] };
    });
    get().recomputeDerivedState();
  },

  removeCircuit: (id) => {
    set((s) => ({
      circuits: s.circuits.filter(c => c.id !== id),
      devices: s.devices.map(d => d.circuitId === id ? { ...d, circuitId: undefined } : d),
    }));
    get().recomputeDerivedState();
  },

  updateCircuit: (id, properties) => set((s) => ({
    circuits: s.circuits.map(c => c.id === id ? { ...c, ...properties } : c),
  })),

  addConduit: (from, to) => {
    get().pushHistory();
    set((s) => {
      if (from === to) return {};
      const exists = s.conduits.some(c =>
        (c.fromDeviceId === from && c.toDeviceId === to) ||
        (c.fromDeviceId === to && c.toDeviceId === from)
      );
      if (exists) return {};
      const newConduit: Conduit = {
        id: `cndt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromDeviceId: from,
        toDeviceId: to,
        diameter: '3/4',
        type: 'flexivel',
      };
      return { conduits: [...s.conduits, newConduit] };
    });
    get().recomputeDerivedState();
  },

  removeConduit: (id) => {
    get().pushHistory();
    set((s) => ({
      conduits: s.conduits.filter(c => c.id !== id),
      selectedConduitId: s.selectedConduitId === id ? null : s.selectedConduitId,
    }));
    get().recomputeDerivedState();
  },

  updateConduitProperties: (id, properties) => {
    get().pushHistory();
    set((s) => ({
      conduits: s.conduits.map(c => c.id === id ? { ...c, ...properties } : c),
    }));
    get().recomputeDerivedState();
  },

  splitCircuitsLight: () => {
    get().pushHistory();
    // 1. Cria ou reutiliza o circuito de iluminação
    let circ = get().circuits.find(c => c.type === 'iluminacao');
    let circId = circ?.id;
    if (!circ) {
      const newId = `circ_${Date.now()}_light`;
      const newCircuit: Circuit = {
        id: newId,
        number: get().circuits.length > 0 ? Math.max(...get().circuits.map(c => c.number)) + 1 : 1,
        name: 'Iluminação Geral',
        type: 'iluminacao',
        voltage: 127,
        groupedCircuits: 1,
      };
      set((s) => ({ circuits: [...s.circuits, newCircuit] }));
      circId = newId;
    }

    // 2. Associa lâmpadas e interruptores
    const lightTypes = ['lampada', 'lampada_parede', 'ceiling_light', 'sconce', 'fluorescent'];
    const switchTypes = ['interruptor', 'interruptor_duplo', 'interruptor_triplo', 'interruptor_teleruptora', 'switch_simple', 'switch_parallel', 'switch_intermediate'];
    
    set((s) => ({
      devices: s.devices.map(d => {
        if (lightTypes.includes(d.type) || switchTypes.includes(d.type)) {
          return { ...d, circuitId: circId };
        }
        return d;
      })
    }));

    get().recomputeDerivedState();
  },

  splitCircuitsTUG: () => {
    get().pushHistory();
    const tugTypes = ['tomada_baixa', 'tomada_media', 'tomada_alta', 'tug_baixa', 'tug_media', 'tug_alta'];
    const tugDevices = get().devices.filter(d => tugTypes.includes(d.type));
    if (tugDevices.length === 0) return;

    // Desassocia de circuitos TUG antigos para reorganizar
    let cleanDevices = get().devices.map(d => {
      if (tugTypes.includes(d.type)) {
        return { ...d, circuitId: undefined };
      }
      return d;
    });

    // Separar em Seca vs Molhada com base no nome ou potência
    const isWet = (d: Device) => {
      const nameLower = d.name.toLowerCase();
      return d.power === 600 || 
             nameLower.includes('cozinha') || 
             nameLower.includes('banheiro') || 
             nameLower.includes('serviço') || 
             nameLower.includes('copa') || 
             nameLower.includes('molhada') ||
             nameLower.includes('servi');
    };

    const wetTugs = tugDevices.filter(isWet);
    const dryTugs = tugDevices.filter(d => !isWet(d));

    // Remove circuitos de TUG vazios que existirem na lista para reconstruir limpo
    const otherCircuits = get().circuits.filter(c => c.type !== 'tug');
    const newCircuitsList: Circuit[] = [...otherCircuits];
    let nextNum = newCircuitsList.length > 0 ? Math.max(...newCircuitsList.map(c => c.number)) + 1 : 1;

    // Função auxiliar para agrupar em circuitos de no máximo 1200W
    const groupTugs = (tugs: Device[], prefixName: string) => {
      let currentPower = 0;
      let currentCircId: string | null = null;

      tugs.forEach((d, idx) => {
        const p = d.power || 100;
        if (!currentCircId || currentPower + p > 1200) {
          const cid = `circ_${Date.now()}_tug_${prefixName.replace(/\s+/g, '')}_${idx}`;
          const circNum = nextNum++;
          const newCirc: Circuit = {
            id: cid,
            number: circNum,
            name: `${prefixName} ${circNum}`,
            type: 'tug',
            voltage: 127,
            groupedCircuits: 1,
          };
          newCircuitsList.push(newCirc);
          currentCircId = cid;
          currentPower = 0;
        }
        
        cleanDevices = cleanDevices.map(dev => dev.id === d.id ? { ...dev, circuitId: currentCircId! } : dev);
        currentPower += p;
      });
    };

    groupTugs(dryTugs, 'TUG Geral (Seca)');
    groupTugs(wetTugs, 'TUG Área Molhada');

    set({ circuits: newCircuitsList, devices: cleanDevices });
    get().recomputeDerivedState();
  },

  splitCircuitsTUE: () => {
    get().pushHistory();
    const tueTypes = ['tomada_220', 'tue_chuveiro', 'tue_ar'];
    const tueDevices = get().devices.filter(d => 
      tueTypes.includes(d.type) || (d.power && d.power > 1200 && !d.type.startsWith('lampada') && d.type !== 'qdc')
    );

    if (tueDevices.length === 0) return;

    let cleanDevices = [...get().devices];
    const otherCircuits = get().circuits.filter(c => c.type !== 'tue');
    const newCircuitsList: Circuit[] = [...otherCircuits];
    let nextNum = newCircuitsList.length > 0 ? Math.max(...newCircuitsList.map(c => c.number)) + 1 : 1;

    tueDevices.forEach(d => {
      const cid = `circ_${Date.now()}_tue_${d.id}`;
      const newCirc: Circuit = {
        id: cid,
        number: nextNum++,
        name: `TUE ${d.name.split(' ')[0]} (${d.power}W)`,
        type: 'tue',
        voltage: d.voltage || 220,
        groupedCircuits: 1,
      };
      newCircuitsList.push(newCirc);
      cleanDevices = cleanDevices.map(dev => dev.id === d.id ? { ...dev, circuitId: cid } : dev);
    });

    set({ circuits: newCircuitsList, devices: cleanDevices });
    get().recomputeDerivedState();
  },

  autoWire: () => {
    get().pushHistory();
    let devs = [...get().devices];
    let qdc = devs.find(d => d.type === 'qdc');

    // 1. Se não houver QDC, insere um automaticamente
    if (!qdc) {
      let qdcX = 5, qdcY = 5;
      if (devs.length > 0) {
        qdcX = devs.reduce((sum, d) => sum + d.x, 0) / devs.length;
        qdcY = devs.reduce((sum, d) => sum + d.y, 0) / devs.length;
      }
      const newQdc: Device = {
        id: `dev_${Date.now()}_qdc`,
        type: 'qdc',
        name: 'Quadro de Distribuição (QDC)',
        x: Math.round(qdcX * 2) / 2,
        y: Math.round(qdcY * 2) / 2,
        rotation: 0,
        power: 0,
        voltage: 220,
      };
      devs.push(newQdc);
      qdc = newQdc;
      set({ devices: devs });
    }

    // 2. Encontra lâmpadas
    const lightTypes: string[] = ['lampada', 'lampada_parede', 'ceiling_light', 'sconce', 'fluorescent'];
    const lamps = devs.filter(d => lightTypes.includes(d.type)) as Device[];

    // 3. Conecta o QDC à lâmpada mais próxima
    const newConduits = [...get().conduits];
    const conduitExists = (id1: string, id2: string) => {
      return newConduits.some(c => 
        (c.fromDeviceId === id1 && c.toDeviceId === id2) || 
        (c.fromDeviceId === id2 && c.toDeviceId === id1)
      );
    };

    const addConduitIfMissing = (id1: string, id2: string) => {
      if (id1 === id2 || conduitExists(id1, id2)) return;
      const c: Conduit = {
        id: `cndt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        fromDeviceId: id1,
        toDeviceId: id2,
        diameter: '3/4',
        type: 'flexivel',
      };
      newConduits.push(c);
    };

    if (lamps.length > 0 && qdc) {
      let minD = Infinity;
      let closestLamp: Device | null = null;
      for (const l of lamps) {
        const dist = Math.sqrt(Math.pow(l.x - qdc!.x, 2) + Math.pow(l.y - qdc!.y, 2));
        if (dist < minD) {
          minD = dist;
          closestLamp = l;
        }
      }

      if (closestLamp) {
        addConduitIfMissing(qdc.id, (closestLamp as Device).id);
      }

      // 4. Conecta todas as lâmpadas entre si formando um caminho/espinha dorsal
      const connectedLamps = new Set<string>();
      if (closestLamp) connectedLamps.add((closestLamp as Device).id);

      while (connectedLamps.size < lamps.length) {
        let minLD = Infinity;
        let bestFrom: string | null = null;
        let bestTo: string | null = null;

        lamps.forEach(l1 => {
          if (connectedLamps.has(l1.id)) {
            lamps.forEach(l2 => {
              if (!connectedLamps.has(l2.id)) {
                const dist = Math.sqrt(Math.pow(l1.x - l2.x, 2) + Math.pow(l1.y - l2.y, 2));
                if (dist < minLD) {
                  minLD = dist;
                  bestFrom = l1.id;
                  bestTo = l2.id;
                }
              }
            });
          }
        });

        if (bestFrom && bestTo) {
          addConduitIfMissing(bestFrom, bestTo);
          connectedLamps.add(bestTo);
        } else {
          break;
        }
      }
    }

    // 5. Conecta cada interruptor à lâmpada mais próxima
    const switchTypes: string[] = ['interruptor', 'interruptor_duplo', 'interruptor_triplo', 'interruptor_teleruptora', 'switch_simple', 'switch_parallel', 'switch_intermediate'];
    const switches = devs.filter(d => switchTypes.includes(d.type)) as Device[];

    switches.forEach(sw => {
      if (lamps.length > 0) {
        let minD = Infinity;
        let closestL: Device | null = null;
        for (const l of lamps) {
          const dist = Math.sqrt(Math.pow(l.x - sw.x, 2) + Math.pow(l.y - sw.y, 2));
          if (dist < minD) {
            minD = dist;
            closestL = l;
          }
        }
        if (closestL) {
          addConduitIfMissing(sw.id, closestL.id);
        }
      } else if (qdc) {
        addConduitIfMissing(sw.id, qdc.id);
      }
    });

    // 6. Conecta cada tomada à lâmpada mais próxima ou ao QDC
    const tugTypes: string[] = ['tomada_baixa', 'tomada_media', 'tomada_alta', 'tug_baixa', 'tug_media', 'tug_alta', 'tomada_220', 'tue_chuveiro', 'tue_ar'];
    const tugs = devs.filter(d => tugTypes.includes(d.type)) as Device[];

    tugs.forEach(tg => {
      if (lamps.length > 0) {
        let minD = Infinity;
        let closestL: Device | null = null;
        for (const l of lamps) {
          const dist = Math.sqrt(Math.pow(l.x - tg.x, 2) + Math.pow(l.y - tg.y, 2));
          if (dist < minD) {
            minD = dist;
            closestL = l;
          }
        }
        if (closestL) {
          addConduitIfMissing(tg.id, closestL.id);
        }
      } else if (qdc) {
        addConduitIfMissing(tg.id, qdc.id);
      }
    });

    set({ conduits: newConduits });
    get().recomputeDerivedState();
  },

  // ─── Linhas de Guia (Construction Lines) ──────────────────────
  addGuideLine: (type, value) => {
    get().pushHistory();
    set((s) => ({
      guideLines: [...(s.guideLines || []), {
        id: `guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        value,
      }]
    }));
  },
  removeGuideLine: (id) => {
    get().pushHistory();
    set((s) => ({
      guideLines: (s.guideLines || []).filter(g => g.id !== id),
      selectedGuideLineId: s.selectedGuideLineId === id ? null : s.selectedGuideLineId,
    }));
  },

  // ─── Anotações de Texto ───────────────────────────────────────
  addText: (txt) => {
    get().pushHistory();
    set((s) => ({
      texts: [...(s.texts || []), {
        ...txt,
        id: `txt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }]
    }));
    get().recomputeDerivedState();
  },
  removeText: (id) => {
    get().pushHistory();
    set((s) => ({
      texts: (s.texts || []).filter(t => t.id !== id),
      selectedTextId: s.selectedTextId === id ? null : s.selectedTextId,
    }));
    get().recomputeDerivedState();
  },
  updateText: (id, text, fontSize) => {
    get().pushHistory();
    set((s) => ({
      texts: (s.texts || []).map(t => t.id === id ? { ...t, text, fontSize: fontSize !== undefined ? fontSize : t.fontSize } : t)
    }));
    get().recomputeDerivedState();
  },
  updateTextPosition: (id, x, y) => {
    get().pushHistory();
    set((s) => ({
      texts: (s.texts || []).map(t => t.id === id ? { ...t, x, y } : t)
    }));
  },

  // ─── Cotas Técnicas (Medidas) ─────────────────────────────────
  addDimension: (p1, p2, offset) => {
    get().pushHistory();
    set((s) => ({
      dimensions: [...(s.dimensions || []), {
        id: `dim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        p1,
        p2,
        offset,
      }]
    }));
    get().recomputeDerivedState();
  },
  removeDimension: (id) => {
    get().pushHistory();
    set((s) => ({
      dimensions: (s.dimensions || []).filter(d => d.id !== id),
      selectedDimensionId: s.selectedDimensionId === id ? null : s.selectedDimensionId,
    }));
    get().recomputeDerivedState();
  },
  updateDimensionPoints: (id, p1, p2) => {
    get().pushHistory();
    set((s) => ({
      dimensions: (s.dimensions || []).map(d => d.id === id ? { ...d, p1, p2 } : d)
    }));
  },
  addActiveDimensionPoint: (pt) => set((s) => ({ activeDimensionPoints: [...(s.activeDimensionPoints || []), pt] })),
  clearActiveDimensionPoints: () => set({ activeDimensionPoints: [] }),

  resetWorkspace: () => set({
    ppm: 100,
    bgImageSrc: null,
    bgImageLock: true,
    bgImageScale: 1.0,
    bgImagePos: { x: 0, y: 0 },
    isCalibrating: false,
    calibrationPoints: [],
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    showGrid: false,
    projectName: 'Projeto sem título',
    materialsList: [],
    circuitTable: [],
    legend: [],
    walls: [],
    devices: [],
    circuits: [],
    conduits: [],
    guideLines: [],
    texts: [],
    dimensions: [],
    history: [],
    future: [],
    currentTool: 'select',
    selectedDeviceType: null,
    activeWallPoints: [],
    selectedDeviceId: null,
    selectedWallId: null,
    selectedGuideLineId: null,
    selectedTextId: null,
    selectedDimensionId: null,
    activeDimensionPoints: [],
    paperSpaceActive: false,
    paperSize: 'A3',
    paperScale: 50,
    paperPos: { x: -5, y: -5 },
    paperTitle: 'Instalação Elétrica Residencial',
    paperOwner: 'Silvana Barbosa',
    paperDesigner: 'Eng. Antigravity',
    paperSheetNum: 'PR-01/01',
  }),

  // Estado Inicial de Autenticação
    user: null,
    token: null,
    isAuthenticated: false,
    authLoading: false,
    authError: null,
    dbProjects: [],
    currentDbProjectId: null,

    setWorkspaceData: (data: any) => {
      set({
        walls: data.walls || [],
        devices: data.devices || [],
        conduits: data.conduits || [],
        circuits: data.circuits || [],
        guideLines: data.guideLines || [],
        texts: data.texts || [],
        dimensions: data.dimensions || [],
        projectName: data.projectName || get().projectName,
        ppm: data.ppm || get().ppm,
      });
      get().recomputeDerivedState();
    },

    login: async (email, password) => {
      set({ authLoading: true, authError: null });
      try {
        const res = await fetch(API_URL + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success) {
          set({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            authLoading: false,
          });
          get().loadProjectsFromDb();
          return true;
        } else {
          set({ authError: data.message || 'Falha no login', authLoading: false });
          return false;
        }
      } catch (err: any) {
        set({ authError: 'Erro de conexão com o servidor', authLoading: false });
        return false;
      }
    },

    register: async (name, email, password) => {
      set({ authLoading: true, authError: null });
      try {
        const res = await fetch(API_URL + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (data.success) {
          set({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            authLoading: false,
          });
          get().loadProjectsFromDb();
          return true;
        } else {
          set({ authError: data.message || 'Falha no registro', authLoading: false });
          return false;
        }
      } catch (err: any) {
        set({ authError: 'Erro de conexão com o servidor', authLoading: false });
        return false;
      }
    },

    logout: () => {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        currentDbProjectId: null,
        dbProjects: [],
      });
      get().resetWorkspace();
    },

    loadUserSession: async () => {
      const token = get().token;
      if (!token) return;
      set({ authLoading: true });
      try {
        const res = await fetch(API_URL + '/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          set({ user: data.user, isAuthenticated: true, authLoading: false });
          get().loadProjectsFromDb();
        } else {
          get().logout();
          set({ authLoading: false });
        }
      } catch (err) {
        set({ authLoading: false });
      }
    },

    loadProjectsFromDb: async () => {
      const token = get().token;
      if (!token) return;
      try {
        const res = await fetch(API_URL + '/projects', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          set({ dbProjects: data.projects });
        }
      } catch (err) {
        console.error('Erro ao carregar projetos do banco', err);
      }
    },

    saveProjectToDb: async (projectId) => {
      const token = get().token;
      if (!token) return null;
      
      const idToSave = projectId || get().currentDbProjectId;
      const payload = {
        id: idToSave,
        name: get().projectName,
        data: takeSnapshot(get())
      };

      try {
        const res = await fetch(API_URL + '/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          const newId = data.project.id;
          set({ currentDbProjectId: newId });
          get().loadProjectsFromDb();
          return newId;
        }
      } catch (err) {
        console.error('Erro ao salvar projeto no banco', err);
      }
      return null;
    },

    loadProjectByIdFromDb: async (id) => {
      const token = get().token;
      if (!token) return;
      try {
        const res = await fetch(API_URL + `/projects/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          const projectData = typeof data.project.data === 'string' 
            ? JSON.parse(data.project.data) 
            : data.project.data;
          
          set({
            walls: projectData.walls || [],
            devices: projectData.devices || [],
            conduits: projectData.conduits || [],
            circuits: projectData.circuits || [],
            guideLines: projectData.guideLines || [],
            texts: projectData.texts || [],
            dimensions: projectData.dimensions || [],
            projectName: data.project.name,
            currentDbProjectId: data.project.id,
            history: [],
            future: []
          });
          get().recomputeDerivedState();
        }
      } catch (err) {
        console.error('Erro ao abrir projeto do banco', err);
      }
    },

    deleteProjectFromDb: async (id) => {
      const token = get().token;
      if (!token) return;
      try {
        const res = await fetch(API_URL + `/projects/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          if (get().currentDbProjectId === id) {
            set({ currentDbProjectId: null });
          }
          get().loadProjectsFromDb();
        }
      } catch (err) {
        console.error('Erro ao deletar projeto do banco', err);
      }
    },
  }),
  {
    name: 'eletric-sf-cad-store',
    partialize: (state) => ({
      walls: state.walls,
      devices: state.devices,
      circuits: state.circuits,
      conduits: state.conduits,
      guideLines: state.guideLines || [],
      texts: state.texts || [],
      dimensions: state.dimensions || [],
      projectName: state.projectName,
      ppm: state.ppm,
      token: state.token,
      user: state.user,
      currentDbProjectId: state.currentDbProjectId,
    }),
  }
)
);
