import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dimensionateCircuit } from '../utils/nbr5410';
import { calculateWiringRouting } from '../utils/pathfinding';
import type { ToolType, Sheet, SheetViewport, Snapshot3D } from '../types';
import { RenderMode, ToolMode } from '../types';

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
  cutouts?: { deviceId: string; start: number; end: number }[];
  color?: string;
  texture?: string;
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
  height3d?: number; // Altura paramétrica em metros
  peitoril?: number; // Altura do peitoril para janelas
  flip?: boolean;  // Sentido de abertura (True = Esquerda, False/undefined = Direita)
  commandLetter?: string; // Letra do comando (acionamento de iluminação)
  phases?: 'mono' | 'bi' | 'tri'; // Fases para motores/cargas
  qdcGeralBreaker?: number; // Proteção Geral QDC (A)
  qdcDRType?: 'none' | 'geral' | 'grupos'; // Tipo de DR
  qdcHasDPS?: boolean; // Presença de DPS
  qdcBusbarType?: 'none' | 'monofasico' | 'bifasico' | 'trifasico'; // Tipo de barramento
  color?: string;
  texture?: string;
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
  waypoints?: Point2D[];
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
  labelOverride?: string; // Texto personalizado da cota (ex: '3.50')
}

export interface Area3D {
  id: string;
  points: Point2D[];
  type: 'piso' | 'teto' | 'piscina' | 'grama' | 'calcada' | 'deck' | 'asfalto';
  height?: number; // Para lajes e tetos ou profundidade da piscina
  color?: string;
  texture?: string;
}

// Snapshot para undo/redo
interface HistorySnapshot {
  walls: Wall[];
  areas: Area3D[];
  devices: Device[];
  conduits: Conduit[];
  circuits: Circuit[];
  guideLines: GuideLine[];
  texts: CadText[];
  dimensions: CadDimension[];
  bgImageSrc: string | null;
  bgImageLock: boolean;
  bgImageScaleX: number;
  bgImageScaleY: number;
  bgImagePos: Point2D;
  bgImageRotation: number;
  sheetsList: Sheet[];
  activeSheetId: string;
  snapshots3D: Snapshot3D[];
  wallColor: string;
  floorTextureType: 'madeira' | 'porcelanato' | 'ceramica' | 'pintura';
  doorColor: string;
  windowColor: string;
  customColors: { name: string; value: string }[];
}

// ─────────────────────────────────────────────────────────────
// Interface da Store
// ─────────────────────────────────────────────────────────────

interface CadState {
  ppm: number;
  bgImageSrc: string | null;
  bgImageLock: boolean;
  bgImageScaleX: number;
  bgImageScaleY: number;
  bgImagePos: Point2D;
  bgImageRotation: number;
  bgImageSelected: boolean;
  isCalibrating: boolean;
  calibrationPoints: Point2D[];
  zoom: number;
  pan: Point2D;
  showGrid: boolean;
  showOriginAxes: boolean;

  projectName: string;
  materialsList: MaterialItem[];
  circuitTable: CircuitTableRow[];
  legend: LegendItem[];

  walls: Wall[];
  areas: Area3D[];
  devices: Device[];
  circuits: Circuit[];
  conduits: Conduit[];
  guideLines: GuideLine[];
  texts: CadText[];
  dimensions: CadDimension[];

  history: HistorySnapshot[];
  future: HistorySnapshot[];

  currentTool: ToolType;
  activeTool: ToolMode;
  snapsEnabled: boolean;
  cameraTransition: boolean;
  targetCameraPos: [number, number, number] | null;
  targetCameraLookAt: [number, number, number] | null;
  currentSnapPoint: Point2D | null;
  
  selectedDeviceType: string | null;
  activeWallPoints: Point2D[];
  activeAreaPoints: Point2D[];
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
  setBgImageScaleX: (scale: number) => void;
  setBgImageScaleY: (scale: number) => void;
  setBgImagePos: (pos: Point2D) => void;
  setBgImageRotation: (rotation: number) => void;
  setBgImageSelected: (selected: boolean) => void;
  setIsCalibrating: (active: boolean) => void;
  addCalibrationPoint: (point: Point2D) => void;
  clearCalibrationPoints: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point2D) => void;
  toggleGrid: () => void;

  setProjectName: (name: string) => void;
  recomputeDerivedState: () => void;

  setCurrentTool: (tool: ToolType) => void;
  setActiveTool: (tool: ToolMode) => void;
  setSnapsEnabled: (enabled: boolean) => void;
  setCameraTransition: (enabled: boolean) => void;
  setCameraTarget: (pos: [number, number, number] | null, lookAt: [number, number, number] | null) => void;
  setCurrentSnapPoint: (pt: Point2D | null) => void;
  
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
  updateWallCutouts: (wallId: string) => void;
  addActiveWallPoint: (pt: Point2D) => void;
  clearActiveWallPoints: () => void;

  addArea: (points: Point2D[], type?: Area3D['type']) => void;
  removeArea: (id: string) => void;
  updateArea: (id: string, props: Partial<Omit<Area3D, 'id'>>) => void;
  addActiveAreaPoint: (pt: Point2D) => void;
  clearActiveAreaPoints: () => void;

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
  updateDimensionOffset: (id: string, offset: number) => void;
  updateDimensionLabel: (id: string, label: string) => void;
  addActiveDimensionPoint: (pt: Point2D) => void;
  clearActiveDimensionPoints: () => void;
  lastDimensionOffset: number | null;

  // Guias Paramétricas
  updateGuideLine: (id: string, value: number) => void;
  setShowOriginAxes: (show: boolean) => void;

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
  paperLogo: string;

  setPaperSpaceActive: (active: boolean) => void;
  setPaperSize: (size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4') => void;
  setPaperScale: (scale: number) => void;
  setPaperPos: (pos: Point2D) => void;
  updatePaperStamp: (fields: Partial<{ title: string; owner: string; designer: string; date: string; sheetNum: string; logo: string }>) => void;

  // Estado de Visualizações e Barra MEP (Revit-Like)
  activeViewFilter: 'completa' | 'infraestrutura' | 'fiacao_dispositivos';
  shadingMode: 'shaded' | 'transparent' | 'wireframe' | 'realistic';
  clippingState: { enabled: boolean; axis: 'X' | 'Y' | 'Z' | '-X' | '-Y' | '-Z'; value: number };
  projectScale: number; // Ex: 50 para 1:50, 100 para 1:100
  utilityGridType: 'monofasico' | 'bifasico' | 'trifasico';

  setViewFilter: (filter: 'completa' | 'infraestrutura' | 'fiacao_dispositivos') => void;
  setShadingMode: (mode: 'shaded' | 'transparent' | 'wireframe' | 'realistic') => void;
  setClippingState: (clipping: Partial<{ enabled: boolean; axis: 'X' | 'Y' | 'Z' | '-X' | '-Y' | '-Z'; value: number }>) => void;
  setProjectScale: (scale: number) => void;
  setUtilityGridType: (type: 'monofasico' | 'bifasico' | 'trifasico') => void;
  updateConduitWaypoints: (id: string, waypoints: Point2D[]) => void;

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

  // Estado de Pranchas (Paper Space) Multi-folhas Flexíveis
  sheetsList: Sheet[];
  activeSheetId: string;
  snapshots3D: Snapshot3D[];

  // Propriedades Estéticas 3D
  wallColor: string;
  floorTextureType: 'madeira' | 'porcelanato' | 'ceramica' | 'pintura';
  doorColor: string;
  windowColor: string;
  customColors: { name: string; value: string }[];

  // Mutadoras Estéticas
  setWallColor: (color: string) => void;
  setFloorTextureType: (type: 'madeira' | 'porcelanato' | 'ceramica' | 'pintura') => void;
  setDoorColor: (color: string) => void;
  setWindowColor: (color: string) => void;
  setCustomColors: (colors: { name: string; value: string }[]) => void;
  addCustomColor: (color: { name: string; value: string }) => void;
  removeCustomColor: (value: string) => void;
  updateCustomColor: (oldValue: string, newValue: string, newName: string) => void;

  orbitControlsEnabled: boolean;
  setOrbitControlsEnabled: (enabled: boolean) => void;
  showLaje3D: boolean;
  setShowLaje3D: (show: boolean) => void;
  addSheet: (sheet: Omit<Sheet, 'id' | 'viewports'>) => void;
  removeSheet: (id: string) => void;
  updateSheet: (id: string, props: Partial<Sheet>) => void;
  setActiveSheetId: (id: string) => void;
  updateViewportGeometry: (sheetId: string, viewportId: string, geometry: Partial<SheetViewport>) => void;
  addViewportToSheet: (sheetId: string, type: 'planta' | 'legenda' | 'unifilar' | 'cargas' | 'materiais' | 'corte_3d', snapshotId?: string) => void;
  removeViewportFromSheet: (sheetId: string, viewportId: string) => void;
  addSnapshot3D: (title: string, dataUrl: string) => void;
  removeSnapshot3D: (id: string) => void;

  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;
  solarAzimuth: number;
  solarElevation: number;
  setSolarSettings: (azimuth: number, elevation: number) => void;
  shadowsEnabled: boolean;
  setShadowsEnabled: (enabled: boolean) => void;

  // ═══════════════════════════════════════════════════════════
  // TOOL MANAGER — Gerenciador centralizado de ferramentas
  // Tudo que era scattered (activeTool, cursor, instructor)
  // agora é coordenado por aqui.
  // ═══════════════════════════════════════════════════════════
  activeToolId: string;             // ex: 'select', 'line', 'wall', 'tug_baixa'
  activeToolCursor: string;         // classe CSS do cursor: 'su-cursor-pencil'
  activeToolInstructor: string;     // texto de instrução passo a passo
  activeToolGroup: string;          // 'select' | 'draw' | 'modify' | 'electric' | 'measure'
  setActiveTool3D: (toolId: string) => void;
  setActiveToolId: (toolId: string, cursor?: string, instructor?: string, group?: string) => void;

  // ═══════════════════════════════════════════════════════════
  // COMMAND MANAGER — Histórico e despacho de comandos
  // Undo/Redo já existe; aqui adicionamos o sistema de comandos
  // para Copy, Paste, Delete, Move, Rotate, PushPull, etc.
  // ═══════════════════════════════════════════════════════════
  commandHistory: Array<{ id: string; label: string; timestamp: number }>;
  clipboard: unknown | null;                     // conteúdo copiado
  dispatchCommand: (commandId: string, payload?: unknown) => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  deleteSelection: () => void;

  // ═══════════════════════════════════════════════════════════
  // SHORTCUT MANAGER — Listener global de teclado
  // Atalhos do SketchUp: Space, L, R, C, M, Q, S, P, E, etc.
  // ═══════════════════════════════════════════════════════════
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;
  initShortcutManager: () => () => void;   // retorna função de cleanup

  // ═══════════════════════════════════════════════════════════
  // VIEWPORT MANAGER — Estado da câmera e modo de renderização
  // Controla: modo ativo, snaps, lock de eixo, pan, zoom
  // ═══════════════════════════════════════════════════════════
  viewportState: {
    activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
    snapsEnabled: boolean;
    snapTypes: string[];
    axisLock: 'none' | 'x' | 'y' | 'z';
    measurementsValue: string;    // Caixa de Medidas (Measurements Box)
    statusText: string;           // Texto de status da barra inferior
  };
  setViewportTab: (tab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets') => void;
  setAxisLock: (axis: 'none' | 'x' | 'y' | 'z') => void;
  setMeasurementsValue: (value: string) => void;
  setStatusText: (text: string) => void;

  // ═══════════════════════════════════════════════════════════
  // IMPORT MANAGER — Esqueleto vazio para importadores futuros
  // Suportará: SKP, DWG, DXF, IFC, OBJ, GLTF
  // ═══════════════════════════════════════════════════════════
  importManager: {
    supportedFormats: string[];
    isImporting: boolean;
    lastImportError: string | null;
  };
  importFile: (format: string, file: File) => Promise<void>;   // implementação futura

  // ═══════════════════════════════════════════════════════════
  // SELECTION MANAGER — Seleção profissional estilo SketchUp
  // Clique único, Shift+click, janela e cruzamento
  // ═══════════════════════════════════════════════════════════
  selectedEntityIds: string[];
  selectionBox: { startX: number; startY: number; endX: number; endY: number; mode: 'window' | 'crossing' } | null;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearEntitySelection: () => void;
  setSelectionBox: (box: { startX: number; startY: number; endX: number; endY: number; mode: 'window' | 'crossing' } | null) => void;

  // ═══════════════════════════════════════════════════════════
  // SCENE MANAGER — Cenas do projeto (estilo SketchUp)
  // ═══════════════════════════════════════════════════════════
  scenesList: Array<{
    id: string;
    name: string;
    activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
    renderMode?: string;
  }>;
  activeSceneId: string | null;
  addScene: (name: string) => void;
  removeScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  activateScene: (id: string) => void;

  // ═══════════════════════════════════════════════════════════
  // MATERIAL DATABASE — Biblioteca de materiais PBR
  // ═══════════════════════════════════════════════════════════
  pbrMaterials: Array<{
    id: string;
    name: string;
    color?: string;
    texture?: string;
    roughness?: number;
    metalness?: number;
    opacity?: number;
    category?: string;
    thumbnail?: string;
  }>;
  applyMaterial: (entityId: string, materialId: string) => void;
}


const MAX_HISTORY = 50;

const takeSnapshot = (state: CadState): HistorySnapshot => ({
  walls: JSON.parse(JSON.stringify(state.walls || [])),
  areas: JSON.parse(JSON.stringify(state.areas || [])),
  devices: JSON.parse(JSON.stringify(state.devices || [])),
  conduits: JSON.parse(JSON.stringify(state.conduits || [])),
  circuits: JSON.parse(JSON.stringify(state.circuits || [])),
  guideLines: JSON.parse(JSON.stringify(state.guideLines || [])),
  texts: JSON.parse(JSON.stringify(state.texts || [])),
  dimensions: JSON.parse(JSON.stringify(state.dimensions || [])),
  bgImageSrc: state.bgImageSrc,
  bgImageLock: state.bgImageLock,
  bgImageScaleX: state.bgImageScaleX,
  bgImageScaleY: state.bgImageScaleY,
  bgImagePos: JSON.parse(JSON.stringify(state.bgImagePos || { x: 0, y: 0 })),
  bgImageRotation: state.bgImageRotation,
  sheetsList: JSON.parse(JSON.stringify(state.sheetsList || [])),
  activeSheetId: state.activeSheetId || '',
  snapshots3D: JSON.parse(JSON.stringify(state.snapshots3D || [])),
  wallColor: state.wallColor || '#ffffff',
  floorTextureType: state.floorTextureType || 'pintura',
  doorColor: state.doorColor || '#b45309',
  windowColor: state.windowColor || '#38bdf8',
  customColors: JSON.parse(JSON.stringify(state.customColors || [])),
});

export const useCadStore = create<CadState>()(
  persist(
    (set, get) => ({
      activeTool: 'SELECT',
      snapsEnabled: true,
      cameraTransition: false,
      targetCameraPos: null,
      targetCameraLookAt: null,
      currentSnapPoint: null,
      
      ppm: 100,
      activeViewFilter: 'completa',
      shadingMode: 'shaded',
      renderMode: 'ARCHITECTURAL',
      solarAzimuth: 180,
      solarElevation: 45,
      shadowsEnabled: true,
      clippingState: { enabled: false, axis: 'Z', value: 1.5 },
      projectScale: 50,
      utilityGridType: 'trifasico',
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
      paperLogo: '',

      sheetsList: [
        {
          id: 'sheet_1',
          code: 'PR-01/02',
          title: 'Planta de Distribuição Elétrica',
          size: 'A1',
          orientation: 'landscape',
          viewports: [
            { id: 'vp_planta', type: 'planta', x: 5, y: 5, w: 60, h: 80 },
            { id: 'vp_legenda', type: 'legenda', x: 68, y: 5, w: 27, h: 80 }
          ]
        },
        {
          id: 'sheet_2',
          code: 'PR-02/02',
          title: 'Diagrama Unifilar e Tabelas',
          size: 'A1',
          orientation: 'landscape',
          viewports: [
            { id: 'vp_unifilar', type: 'unifilar', x: 5, y: 5, w: 55, h: 80 },
            { id: 'vp_cargas', type: 'cargas', x: 63, y: 5, w: 32, h: 38 },
            { id: 'vp_materiais', type: 'materiais', x: 63, y: 46, w: 32, h: 39 }
          ]
        }
      ],
      activeSheetId: 'sheet_1',
      snapshots3D: [],
      wallColor: '#e2e8f0',
      floorTextureType: 'porcelanato',
      doorColor: '#b45309',
      windowColor: '#38bdf8',
      customColors: [
        { name: 'Branco Neve', value: '#ffffff' },
        { name: 'Palha Clássico', value: '#fef08a' },
        { name: 'Cinza Crômio', value: '#94a3b8' },
        { name: 'Azul Colonial', value: '#1e3a8a' },
        { name: 'Verde Alecrim', value: '#2f5233' },
        { name: 'Vermelho Terracota', value: '#b91c1c' },
        { name: 'Preto Absoluto', value: '#0f172a' }
      ],
      orbitControlsEnabled: true,
      showLaje3D: true,

      setPaperSpaceActive: (active) => set({ paperSpaceActive: active }),
      setPaperSize: (size) => set({ paperSize: size }),
      setPaperScale: (scale) => set({ paperScale: scale }),
      setPaperPos: (pos) => set({ paperPos: pos }),
      setOrbitControlsEnabled: (enabled) => set({ orbitControlsEnabled: enabled }),
      setShowLaje3D: (show) => set({ showLaje3D: show }),

      setWallColor: (color) => set({ wallColor: color }),
      setFloorTextureType: (type) => set({ floorTextureType: type }),
      setDoorColor: (color) => set({ doorColor: color }),
      setWindowColor: (color) => set({ windowColor: color }),
      setCustomColors: (colors) => set({ customColors: colors }),
      addCustomColor: (color) => {
        get().pushHistory();
        set((s) => ({
          customColors: [...s.customColors, color]
        }));
      },
      removeCustomColor: (value) => {
        get().pushHistory();
        set((s) => ({
          customColors: s.customColors.filter(c => c.value !== value)
        }));
      },
      updateCustomColor: (oldValue, newValue, newName) => {
        get().pushHistory();
        set((s) => ({
          customColors: s.customColors.map(c => 
            c.value === oldValue ? { name: newName, value: newValue } : c
          )
        }));
      },

      addSheet: (sheet: Omit<Sheet, 'id' | 'viewports'>) => {
        get().pushHistory();
        const newId = `sheet_${Date.now()}`;
        set((s) => ({
          sheetsList: [...s.sheetsList, { ...sheet, id: newId, viewports: [] } as Sheet],
          activeSheetId: newId
        }));
      },
      removeSheet: (id: string) => {
        get().pushHistory();
        set((s) => {
          const filtered = s.sheetsList.filter(sheet => sheet.id !== id);
          const nextActiveId = filtered.length > 0 ? filtered[0].id : '';
          return {
            sheetsList: filtered,
            activeSheetId: nextActiveId
          };
        });
      },
      updateSheet: (id: string, props: Partial<Sheet>) => {
        get().pushHistory();
        set((s) => ({
          sheetsList: s.sheetsList.map(sheet => sheet.id === id ? { ...sheet, ...props } : sheet)
        }));
      },
      setActiveSheetId: (id: string) => set({ activeSheetId: id }),
      updateViewportGeometry: (sheetId: string, viewportId: string, geometry: Partial<SheetViewport>) => {
        set((s) => ({
          sheetsList: s.sheetsList.map(sheet => {
            if (sheet.id !== sheetId) return sheet;
            return {
              ...sheet,
              viewports: sheet.viewports.map(vp => {
                if (vp.id !== viewportId) return vp;
                return { ...vp, ...geometry };
              })
            };
          })
        }));
      },
      addViewportToSheet: (sheetId: string, type: 'planta' | 'legenda' | 'unifilar' | 'cargas' | 'materiais' | 'corte_3d', snapshotId?: string) => {
        get().pushHistory();
        set((s) => {
          const newVp: SheetViewport = {
            id: `vp_${type}_${Date.now()}`,
            type,
            x: 10,
            y: 10,
            w: type === 'planta' || type === 'unifilar' ? 50 : 30,
            h: type === 'planta' || type === 'unifilar' ? 50 : 30,
            snapshotId
          };
          return {
            sheetsList: s.sheetsList.map(sheet => {
              if (sheet.id !== sheetId) return sheet;
              if (type !== 'corte_3d' && sheet.viewports.some(vp => vp.type === type)) {
                return sheet;
              }
              return {
                ...sheet,
                viewports: [...sheet.viewports, newVp]
              };
            })
          };
        });
      },
      removeViewportFromSheet: (sheetId: string, viewportId: string) => {
        get().pushHistory();
        set((s) => ({
          sheetsList: s.sheetsList.map(sheet => {
            if (sheet.id !== sheetId) return sheet;
            return {
              ...sheet,
              viewports: sheet.viewports.filter(vp => vp.id !== viewportId)
            };
          })
        }));
      },
      addSnapshot3D: (title: string, dataUrl: string) => {
        set((s) => ({
          snapshots3D: [...s.snapshots3D, {
            id: `snap_${Date.now()}`,
            title,
            dataUrl,
            createdAt: new Date().toLocaleDateString('pt-BR')
          }]
        }));
      },
      removeSnapshot3D: (id: string) => {
        set((s) => ({
          snapshots3D: s.snapshots3D.filter(snap => snap.id !== id)
        }));
      },
      setViewFilter: (filter) => {
        set({ activeViewFilter: filter });
        get().recomputeDerivedState();
      },
      setShadingMode: (mode) => set({ shadingMode: mode }),
      setClippingState: (clipping) => set((s) => ({
        clippingState: { ...s.clippingState, ...clipping }
      })),
      setProjectScale: (scale) => {
        set({ projectScale: scale });
        get().recomputeDerivedState();
      },
      setUtilityGridType: (type) => {
        set({ utilityGridType: type });
        get().recomputeDerivedState();
      },
      updateConduitWaypoints: (id, waypoints) => {
        get().pushHistory();
        set((s) => ({
          conduits: s.conduits.map(c => c.id === id ? { ...c, waypoints } : c)
        }));
        get().recomputeDerivedState();
      },
      updatePaperStamp: (fields) => set((s) => ({
        cameraTransition: false,
        targetCameraPos: null,
        targetCameraLookAt: null,
        currentSnapPoint: null,
        selectedDeviceType: null,
        paperTitle: fields.title !== undefined ? fields.title : s.paperTitle,
        paperOwner: fields.owner !== undefined ? fields.owner : s.paperOwner,
        paperDesigner: fields.designer !== undefined ? fields.designer : s.paperDesigner,
        paperDate: fields.date !== undefined ? fields.date : s.paperDate,
        paperSheetNum: fields.sheetNum !== undefined ? fields.sheetNum : s.paperSheetNum,
        paperLogo: fields.logo !== undefined ? fields.logo : s.paperLogo,
      })),
      bgImageLock: true,
      bgImageScaleX: 1.0,
      bgImageScaleY: 1.0,
      bgImagePos: { x: 0, y: 0 },
      bgImageRotation: 0,
      bgImageSelected: false,
      lastDimensionOffset: null,
      showOriginAxes: true,
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
      areas: [],
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
      activeAreaPoints: [],
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
      setBgImageScale: (scale) => set({ bgImageScaleX: scale, bgImageScaleY: scale }),
      setBgImageScaleX: (scale) => set({ bgImageScaleX: scale }),
      setBgImageScaleY: (scale) => set({ bgImageScaleY: scale }),
      setBgImagePos: (pos) => set({ bgImagePos: pos }),
      setBgImageRotation: (rotation) => set({ bgImageRotation: rotation }),
      setBgImageSelected: (selected) => set((s) => ({
        bgImageSelected: selected,
        selectedDeviceId: selected ? null : s.selectedDeviceId,
        selectedWallId: selected ? null : s.selectedWallId,
        selectedGuideLineId: selected ? null : s.selectedGuideLineId,
        selectedTextId: selected ? null : s.selectedTextId,
        selectedDimensionId: selected ? null : s.selectedDimensionId,
        selectedConduitId: selected ? null : s.selectedConduitId,
      })),
// removed dup
      setActiveTool: (tool) => set({ activeTool: tool }),
      setSnapsEnabled: (enabled) => set({ snapsEnabled: enabled }),
      setCameraTransition: (enabled) => set({ cameraTransition: enabled }),
      setCameraTarget: (pos, lookAt) => set({ targetCameraPos: pos, targetCameraLookAt: lookAt, cameraTransition: true }),
      setCurrentSnapPoint: (pt) => set({ currentSnapPoint: pt }),
// removed dup
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

    // 0. Recalcular os cutouts de todas as paredes com base nas esquadrias
    const updatedWalls = walls.map(wall => {
      const vans: { deviceId: string; start: number; end: number }[] = [];
      const L = Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(wall.p2.y - wall.p1.y, 2));
      if (L === 0) return { ...wall, cutouts: [] };
      const dx = (wall.p2.x - wall.p1.x) / L;
      const dy = (wall.p2.y - wall.p1.y) / L;
      const wallAngle = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x) * (180 / Math.PI);

      devices.forEach(dev => {
        if (!dev.type.startsWith('door') && dev.type !== 'window' && dev.type !== 'open_van') return;

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
            const diffAng = Math.abs((dev.rotation - wallAngle) % 360);
            const isReversed = diffAng > 90 && diffAng < 270;
            const effectiveFlip = isReversed ? !dev.flip : dev.flip;
            if (effectiveFlip) {
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
            vans.push({ deviceId: dev.id, start, end });
          }
        }
      });

      // Ordenar e mesclar os recortes que se sobrepõem
      vans.sort((a, b) => a.start - b.start);
      const mergedVans: { deviceId: string; start: number; end: number }[] = [];
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

      return {
        ...wall,
        cutouts: mergedVans
      };
    });

    // Se as paredes mudaram em termos de cutouts, atualiza na store
    let hasChanges = false;
    for (let i = 0; i < walls.length; i++) {
      const wOld = walls[i];
      const wNew = updatedWalls[i];
      if (!wOld.cutouts || wOld.cutouts.length !== wNew.cutouts.length || 
          JSON.stringify(wOld.cutouts) !== JSON.stringify(wNew.cutouts)) {
        hasChanges = true;
        break;
      }
    }
    if (hasChanges) {
      set({ walls: updatedWalls });
    }

    // Helper para categorização de dispositivos
    const getDeviceCategory = (type: string): 'fiacao_cabos' | 'protecao' | 'infraestrutura' | 'dispositivos' => {
      if (type.startsWith('box_') || type === 'qdc' || type === 'qgbt' || type === 'poste' || type === 'medidor' || type === 'caixa_passagem') {
        return 'infraestrutura';
      }
      if (type === 'disjuntor' || type === 'dr' || type === 'idr' || type === 'device_dr' || type === 'dps' || type === 'aterramento' || type === 'ground_rod' || type === 'spda') {
        return 'protecao';
      }
      return 'dispositivos';
    };

    // 1. Paredes
    let totalWallLength = 0;
    try {
      updatedWalls.forEach(w => {
        if (w && w.p1 && w.p2) {
          let length = Math.sqrt(Math.pow(w.p2.x - w.p1.x, 2) + Math.pow(w.p2.y - w.p1.y, 2));
          if (w.cutouts && w.cutouts.length > 0) {
            w.cutouts.forEach(c => {
              length -= (c.end - c.start);
            });
          }
          totalWallLength += Math.max(0, length);
        }
      });
    } catch (e) {
      console.error('Erro ao calcular comprimento das paredes:', e);
    }
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
    const electricalDevices = devices.filter(d => d && !ARCHITECTURE_TYPES.has(d.type));

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
      motor: 450.00,
      bomba_agua: 320.00,
      torneira_eletrica: 150.00,
      maquina_lavar: 600.00,
      fotocelula: 38.00,
      campainha: 25.00,
      // Novos dispositivos NBR 5410
      disjuntor: 18.00,
      dr: 120.00,
      idr: 135.00,
      device_dr: 125.00,
      dps: 55.00,
      aterramento: 45.00,
      ground_rod: 45.00,
      spda: 350.00,
      caixa_passagem: 8.00,
      qgbt: 250.00,
      luminaria_emergencia: 65.00,
      dimmer: 35.00,
      sensor_fumaca: 55.00,
      gerador: 3500.00,
      nobreak: 800.00,
      tomada_20a: 22.00,
      tomada_10a_nbr: 16.00,
    };

    // Nomes amigáveis para módulos internos das caixas
    const moduleNames: Record<string, string> = {
      tug_baixa: 'Tomada TUG Baixa 10A',
      tug_media: 'Tomada TUG Média 10A',
      tug_alta: 'Tomada TUG Alta 10A',
      tue_chuveiro: 'Tomada TUE Chuveiro',
      tue_ar: 'Tomada TUE Ar Condicionado',
      switch_simple: 'Interruptor Simples',
      switch_parallel: 'Interruptor Paralelo',
      switch_intermediate: 'Interruptor Intermediário',
      tele_rj45: 'Tomada RJ45 (Rede)',
      tele_rj11: 'Tomada RJ11 (Telefone)',
      tele_coaxial: 'Tomada Coaxial (TV)',
      ceiling_light: 'Ponto de Luz (Teto)',
      sconce: 'Arandela (Parede)',
      fluorescent: 'Lâmpada Fluorescente',
      sensor_presenca: 'Sensor de Presença',
      fotocelula: 'Fotocélula',
      campainha: 'Campainha / Cigarra',
      cftv_camera: 'Câmera CFTV',
      maquina_lavar: 'Máquina de Lavar',
      central_alarme: 'Central de Alarme',
      // Novos módulos NBR 5410
      disjuntor: 'Disjuntor Termomagnético',
      dr: 'Interruptor Diferencial Residual (DR)',
      idr: 'IDR (DR + Disjuntor Combinado)',
      device_dr: 'Dispositivo DR Local 30mA',
      dps: 'DPS Proteção Surtos Class II',
      aterramento: 'Haste de Aterramento',
      ground_rod: 'Haste de Aterramento PE',
      spda: 'SPDA (Para-Raios)',
      caixa_passagem: 'Caixa de Passagem',
      qgbt: 'Quadro Geral de Baixa Tensão (QGBT)',
      luminaria_emergencia: 'Luminária de Emergência',
      dimmer: 'Interruptor Dimmer',
      sensor_fumaca: 'Sensor de Fumaça',
      gerador: 'Gerador Elétrico',
      nobreak: 'Nobreak / UPS',
      tomada_20a: 'Tomada 20A NBR 14136',
      tomada_10a_nbr: 'Tomada 10A NBR 14136',
    };

    const deviceCounts: Record<string, { qty: number; price: number; type: string }> = {};
    electricalDevices.forEach(d => {
      const isBox = d.type.startsWith('box_');

      // Conta a caixa em si
      const price = priceMap[d.type] ?? 12.00;
      const deviceName = d.name || 'Dispositivo Elétrico';
      deviceCounts[deviceName] = {
        qty: (deviceCounts[deviceName]?.qty || 0) + 1,
        price,
        type: d.type
      };

      // Se for caixa com módulos internos, conta cada módulo separadamente
      if (isBox && d.modules && d.modules.length > 0) {
        d.modules.forEach(mod => {
          const modName = moduleNames[mod] || mod;
          const modPrice = priceMap[mod] ?? 12.00;
          deviceCounts[modName] = {
            qty: (deviceCounts[modName]?.qty || 0) + 1,
            price: modPrice,
            type: mod
          };
        });
      }
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

    // 2.1. QDC Inteligente - Componentes de Proteção Internos
    try {
      const qdcs = devices.filter(d => d.type === 'qdc');
      qdcs.forEach(q => {
        // Disjuntor Geral
        if (q.qdcGeralBreaker && q.qdcGeralBreaker > 0) {
          const barType = q.qdcBusbarType || 'monofasico';
          const isTri = barType === 'trifasico';
          const isBi = barType === 'bifasico';
          const desc = isTri ? 'Tripolar' : isBi ? 'Bipolar' : 'Monopolar';
          const price = isTri ? 85.00 : isBi ? 55.00 : 35.00;
          materialsList.push({
            name: `Disjuntor Geral Termomagnético ${desc} Din ${q.qdcGeralBreaker}A (QDC)`,
            qty: 1,
            unit: 'un',
            price,
            category: 'protecao'
          });
        }
        
        // Interruptor DR (Diferencial Residual)
        if (q.qdcDRType === 'geral') {
          materialsList.push({
            name: 'Interruptor Diferencial Residual (DR) Geral 30mA (QDC)',
            qty: 1,
            unit: 'un',
            price: 120.00,
            category: 'protecao'
          });
        } else if (q.qdcDRType === 'grupos') {
          materialsList.push({
            name: 'Interruptor Diferencial Residual (DR) 30mA (Grupo - QDC)',
            qty: 2,
            unit: 'un',
            price: 95.00,
            category: 'protecao'
          });
        }

        // DPS (Dispositivo de Proteção contra Surtos)
        if (q.qdcHasDPS) {
          const dpsQty = q.qdcBusbarType === 'trifasico' ? 3 : q.qdcBusbarType === 'bifasico' ? 2 : 1;
          materialsList.push({
            name: 'Dispositivo de Proteção contra Surtos (DPS) Class II 275V 45kA (QDC)',
            qty: dpsQty,
            unit: 'un',
            price: 55.00,
            category: 'protecao'
          });
        }

        // Barramentos
        if (q.qdcBusbarType && q.qdcBusbarType !== 'none') {
          const barDesc = q.qdcBusbarType === 'monofasico' ? 'Monofásico' : q.qdcBusbarType === 'bifasico' ? 'Bifásico' : 'Trifásico';
          materialsList.push({
            name: `Barramento de Fase Tipo Pente ${barDesc} (QDC)`,
            qty: 1,
            unit: 'un',
            price: 35.00,
            category: 'protecao'
          });
          materialsList.push({
            name: 'Kit de Barramentos de Neutro e Terra para QDC',
            qty: 1,
            unit: 'un',
            price: 22.00,
            category: 'protecao'
          });
        }
      });
    } catch (errQdc) {
      console.error('Erro ao calcular componentes internos do QDC:', errQdc);
    }

    // 3. Disjuntores (Agrupados por corrente de dimensionamento e polos, categorizados como Proteção)
    const breakerCounts: Record<string, { count: number; price: number; amp: number; poles: string }> = {};
    if (circuits && circuits.length > 0) {
      circuits.forEach(c => {
        try {
          const cd = devices.filter(d => d && d.circuitId === c.id);
          const totalPower = cd.reduce((sum, d) => sum + (d.power || 0), 0);
          const qdc = devices.find(d => d.type === 'qdc');
          let maxDist = 10.0;
          if (qdc && cd.length > 0) {
            maxDist = Math.max(...cd.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
          }
          const cType = c.type || 'tug';
          const cVoltage = c.voltage || 127;
          const cGrouped = c.groupedCircuits || 1;

          const res = dimensionateCircuit(cType, totalPower || 100, cVoltage, maxDist, cGrouped);
          const rating = res.circuitBreaker;
          
          // NBR 5410: Determina número de polos com base na tensão do circuito
          const isBipolar = cVoltage === 220; // 220V residencial é bifásico
          const polesText = isBipolar ? 'Bipolar' : 'Monopolar';
          const breakerKey = `${polesText}_${rating}`;
          const price = isBipolar ? 28.00 : 18.00;

          if (!breakerCounts[breakerKey]) {
            breakerCounts[breakerKey] = { count: 0, price, amp: rating, poles: polesText };
          }
          breakerCounts[breakerKey].count++;
        } catch (err) {
          console.error("Erro no dimensionamento do disjuntor do circuito", c.id, err);
          const fallbackBreaker = c.type === 'iluminacao' ? 10 : 20;
          const polesText = c.voltage === 220 ? 'Bipolar' : 'Monopolar';
          const breakerKey = `${polesText}_${fallbackBreaker}`;
          const price = c.voltage === 220 ? 28.00 : 18.00;
          if (!breakerCounts[breakerKey]) {
            breakerCounts[breakerKey] = { count: 0, price, amp: fallbackBreaker, poles: polesText };
          }
          breakerCounts[breakerKey].count++;
        }
      });
    }

    Object.values(breakerCounts).forEach(({ poles, amp, count, price }) => {
      materialsList.push({
        name: `Disjuntor Termomagnético ${poles} Din ${amp}A`,
        qty: count,
        unit: 'un',
        price,
        category: 'protecao'
      });
    });

    // 4. Conduítes (Eletrodutos - categorizados como Infraestrutura)
    let wiringRouting: Record<string, any[]> = {};
    try {
      wiringRouting = calculateWiringRouting(devices, conduits, circuits) || {};
    } catch (eRouting) {
      console.error("Erro ao calcular roteamento da fiação:", eRouting);
    }

    let totalConduitLength = 0;
    const cableLengths: Record<number, number> = {};

    if (conduits && conduits.length > 0) {
      conduits.forEach(c => {
        try {
          const fromDev = devices.find(d => d.id === c.fromDeviceId);
          const toDev = devices.find(d => d.id === c.toDeviceId);
          if (!fromDev || !toDev) return;
          const distance = Math.sqrt(Math.pow(fromDev.x - toDev.x, 2) + Math.pow(fromDev.y - toDev.y, 2)) + 2.0;
          totalConduitLength += distance;

          const wires = wiringRouting[c.id] || [];
          wires.forEach(w => {
            try {
              const circuit = circuits.find(circ => circ.number === w.circuitNumber);
              if (!circuit) return;
              const circDevices = devices.filter(d => d.circuitId === circuit.id);
              const totalPower = circDevices.reduce((sum, d) => sum + (d.power || 0), 0);
              const qdc = devices.find(d => d.type === 'qdc');
              let maxDist = 10.0;
              if (qdc && circDevices.length > 0) {
                maxDist = Math.max(...circDevices.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
              }
              const cType = circuit.type || 'tug';
              const cVoltage = circuit.voltage || 127;
              const cGrouped = circuit.groupedCircuits || 1;

              const res = dimensionateCircuit(cType, totalPower || 100, cVoltage, maxDist, cGrouped);
              
              // Bitola do condutor de fase e neutro
              const phaseSection = res.selectedSection;
              
              // Bitola do condutor de proteção (Terra - PE) conforme Tabela 58 da NBR 5410
              let groundSection = phaseSection;
              if (phaseSection > 16 && phaseSection <= 35) {
                groundSection = 16.0;
              } else if (phaseSection > 35) {
                groundSection = phaseSection / 2;
                // Arredonda para a seção comercial de cobre mais próxima maior ou igual
                const commercialSections = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0];
                const found = commercialSections.find(s => s >= groundSection);
                if (found) {
                  groundSection = found;
                }
              }

              // Quantidade de condutores de fase, neutro e retorno
              const qtyPhaseNeutralRet = (w.phase || 0) + (w.neutral || 0) + (w.ret || 0);
              // Quantidade de condutores de terra
              const qtyGround = w.ground || 0;

              // Acumula os comprimentos de cabo por bitola
              if (qtyPhaseNeutralRet > 0) {
                cableLengths[phaseSection] = (cableLengths[phaseSection] || 0) + (distance * qtyPhaseNeutralRet);
              }
              if (qtyGround > 0) {
                cableLengths[groundSection] = (cableLengths[groundSection] || 0) + (distance * qtyGround);
              }
            } catch (errInner) {
              console.error("Erro ao dimensionar bitola para conduíte", c.id, errInner);
              const fallbackSection = 2.5;
              const qtyWires = (w.phase || 0) + (w.neutral || 0) + (w.ground || 0) + (w.ret || 0);
              cableLengths[fallbackSection] = (cableLengths[fallbackSection] || 0) + (distance * qtyWires);
            }
          });
        } catch (errConduit) {
          console.error("Erro ao processar conduíte", c.id, errConduit);
        }
      });
    }

    if (totalConduitLength > 0) {
      materialsList.push({
        name: 'Eletroduto Corrugado Flexível Amarelo 3/4"',
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
        name: `Cabo de Cobre Flexível ${bitola} mm² (70°C, 750V)`,
        qty: Math.round(length * 10) / 10,
        unit: 'm',
        price,
        category: 'fiacao_cabos'
      });
    });

    // 6. Legenda e Circuitos
    const legendMap: Record<string, { label: string; qty: number }> = {};
    devices.forEach(d => {
      if (d && d.type) {
        if (!legendMap[d.type]) {
          legendMap[d.type] = { label: d.name || d.type, qty: 0 };
        }
        legendMap[d.type].qty++;
      }
    });
    const legend = Object.entries(legendMap).map(([type, info]) => ({
      symbol: type,
      label: info.label,
      qty: info.qty,
    }));

    const circuitTable: CircuitTableRow[] = circuits.map(c => {
      try {
        const cd = devices.filter(d => d.circuitId === c.id);
        const totalPower = cd.reduce((s, d) => s + (d.power || 0), 0);
        const { devices: devs } = get();
        const qdc = devs.find(d => d.type === 'qdc');
        let maxDist = 10.0;
        if (qdc && cd.length > 0) {
          maxDist = Math.max(...cd.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
        }
        const cType = c.type || 'tug';
        const cVoltage = c.voltage || 127;
        const cGrouped = c.groupedCircuits || 1;

        const res = dimensionateCircuit(cType, totalPower || 100, cVoltage, maxDist, cGrouped);
        return {
          number: c.number,
          name: c.name || `Circuito ${c.number}`,
          type: cType,
          voltage: cVoltage,
          totalPower,
          currentProject: res.currentProject,
          fatorAgrupamento: res.fatorAgrupamento,
          currentCorrected: res.currentCorrected,
          maxDist,
          selectedSection: res.selectedSection,
          voltageDropPercent: res.voltageDropPercent,
          circuitBreaker: res.circuitBreaker,
        };
      } catch (errTable) {
        console.error("Erro ao recalcular tabela de circuito", c.id, errTable);
        return {
          number: c.number,
          name: c.name || `Circuito ${c.number}`,
          type: c.type || 'tug',
          voltage: c.voltage || 127,
          totalPower: 0,
          currentProject: 0,
          fatorAgrupamento: 1.0,
          currentCorrected: 0,
          maxDist: 10.0,
          selectedSection: 2.5,
          voltageDropPercent: 0,
          circuitBreaker: 20,
        };
      }
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
    lastDimensionOffset: null,
  }),
  setSelectedDeviceType: (type) => set({ selectedDeviceType: type }),
  setSelectedDeviceId: (id) => set({ selectedDeviceId: id, selectedWallId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null, bgImageSelected: false }),
  setSelectedWallId: (id) => set({ selectedWallId: id, selectedDeviceId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null, bgImageSelected: false }),
  setSelectedGuideLineId: (id) => set({ selectedGuideLineId: id, selectedWallId: null, selectedDeviceId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null, bgImageSelected: false }),
  setSelectedGuideType: (type) => set({ selectedGuideType: type }),
  setSelectedTextId: (id) => set({ selectedTextId: id, selectedWallId: null, selectedDeviceId: null, selectedGuideLineId: null, selectedDimensionId: null, selectedConduitId: null, bgImageSelected: false }),
  setSelectedDimensionId: (id) => set({ selectedDimensionId: id, selectedWallId: null, selectedDeviceId: null, selectedGuideLineId: null, selectedTextId: null, selectedConduitId: null, bgImageSelected: false }),
  setSelectedConduitId: (id) => set({ selectedConduitId: id, selectedDeviceId: null, selectedWallId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null, bgImageSelected: false }),
  clearSelection: () => set({ selectedDeviceId: null, selectedWallId: null, selectedGuideLineId: null, selectedTextId: null, selectedDimensionId: null, selectedConduitId: null, bgImageSelected: false }),

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
      areas: prev.areas || [],
      devices: prev.devices,
      conduits: prev.conduits,
      circuits: prev.circuits,
      guideLines: prev.guideLines || [],
      texts: prev.texts || [],
      dimensions: prev.dimensions || [],
      bgImageSrc: prev.bgImageSrc,
      bgImageLock: prev.bgImageLock,
      bgImageScaleX: prev.bgImageScaleX,
      bgImageScaleY: prev.bgImageScaleY,
      bgImagePos: prev.bgImagePos,
      bgImageRotation: prev.bgImageRotation,
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
      areas: next.areas || [],
      devices: next.devices,
      conduits: next.conduits,
      circuits: next.circuits,
      guideLines: next.guideLines || [],
      texts: next.texts || [],
      dimensions: next.dimensions || [],
      bgImageSrc: next.bgImageSrc,
      bgImageLock: next.bgImageLock,
      bgImageScaleX: next.bgImageScaleX,
      bgImageScaleY: next.bgImageScaleY,
      bgImagePos: next.bgImagePos,
      bgImageRotation: next.bgImageRotation,
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

  updateWallCutouts: (_wallId) => {
    get().recomputeDerivedState();
  },

  addActiveWallPoint: (pt) => set((s) => ({ activeWallPoints: [...s.activeWallPoints, pt] })),
  clearActiveWallPoints: () => set({ activeWallPoints: [] }),

  addArea: (points, type = 'grama') => {
    get().pushHistory();
    set((s) => ({
      areas: [...s.areas, { id: `area_${Date.now()}`, type, points, height: type === 'piscina' ? -1.5 : type === 'teto' ? 2.8 : 0 }]
    }));
  },

  removeArea: (id) => {
    get().pushHistory();
    set((s) => ({ areas: s.areas.filter(a => a.id !== id) }));
  },

  updateArea: (id, props) => {
    get().pushHistory();
    set((s) => ({
      areas: s.areas.map(a => a.id === id ? { ...a, ...props } : a)
    }));
  },

  addActiveAreaPoint: (pt) => set((s) => ({ activeAreaPoints: [...s.activeAreaPoints, pt] })),
  clearActiveAreaPoints: () => set({ activeAreaPoints: [] }),

  addDevice: (dev) => {
    get().pushHistory();
    set((s) => {
      const isBox = dev.type.startsWith('box_');
      const isLampada = dev.type.includes('light') || dev.type === 'lampada' || dev.type === 'fluorescent' || dev.type === 'sconce' || dev.type === 'lampada_parede';
      const isInterruptor = dev.type.includes('switch') || dev.type.includes('interruptor') || dev.type === 'sensor_presenca';
      
      let nextCircuits = s.circuits;
      let circuitId = dev.circuitId;
      let power = dev.power;
      let commandLetter = dev.commandLetter;

      if (isLampada || isInterruptor) {
        if (!commandLetter) {
          commandLetter = 'a';
        }
        if (isLampada && (power === undefined || power === 60 || power === 40)) {
          power = 100;
        }
        
        let circ1 = s.circuits.find(c => c.number === 1);
        if (!circ1) {
          circ1 = {
            id: `circ_1_${Date.now()}`,
            number: 1,
            name: 'Iluminação Geral',
            type: 'iluminacao',
            voltage: 127,
            groupedCircuits: 1
          };
          nextCircuits = [...s.circuits, circ1];
        }
        if (!circuitId) {
          circuitId = circ1.id;
        }
      }

      const newDevice: Device = {
        ...dev,
        id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modules: isBox ? [] : [dev.type],
        circuitId,
        power: power ?? dev.power,
        commandLetter,
      };
      return {
        circuits: nextCircuits,
        devices: [...s.devices, newDevice]
      };
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
    const tueTypes = ['tomada_220', 'tue_chuveiro', 'tue_ar', 'torneira_eletrica', 'maquina_lavar'];
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
    const tugTypes: string[] = ['tomada_baixa', 'tomada_media', 'tomada_alta', 'tug_baixa', 'tug_media', 'tug_alta', 'tomada_220', 'tue_chuveiro', 'tue_ar', 'torneira_eletrica', 'maquina_lavar'];
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
  updateGuideLine: (id, value) => {
    set((s) => ({
      guideLines: (s.guideLines || []).map(g => g.id === id ? { ...g, value } : g)
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
  updateDimensionOffset: (id, offset) => {
    set((s) => ({
      dimensions: (s.dimensions || []).map(d => d.id === id ? { ...d, offset } : d)
    }));
  },
  updateDimensionLabel: (id, label) => {
    set((s) => ({
      dimensions: (s.dimensions || []).map(d => d.id === id ? { ...d, labelOverride: label } : d)
    }));
  },
  addActiveDimensionPoint: (pt) => set((s) => ({ activeDimensionPoints: [...(s.activeDimensionPoints || []), pt] })),
  clearActiveDimensionPoints: () => set({ activeDimensionPoints: [], lastDimensionOffset: null }),
  setShowOriginAxes: (show) => set({ showOriginAxes: show }),
  setRenderMode: (mode) => set({ renderMode: mode }),
  setSolarSettings: (azimuth, elevation) => set({ solarAzimuth: azimuth, solarElevation: elevation }),
  setShadowsEnabled: (enabled) => set({ shadowsEnabled: enabled }),

  resetWorkspace: () => set({
    ppm: 100,
    bgImageSrc: null,
    bgImageLock: true,
    bgImageScaleX: 1.0,
    bgImageScaleY: 1.0,
    bgImagePos: { x: 0, y: 0 },
    bgImageRotation: 0,
    bgImageSelected: false,
    lastDimensionOffset: null,
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
    areas: [],
    devices: [],
    circuits: [],
    conduits: [],
    guideLines: [],
    texts: [],
    dimensions: [],
    history: [],
    future: [],
    cameraTransition: false,
    targetCameraPos: null,
    targetCameraLookAt: null,
    currentSnapPoint: null,
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
    paperLogo: '',
    showLaje3D: true,
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
        areas: data.areas || [],
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
            areas: projectData.areas || [],
            devices: projectData.devices || [],
            conduits: projectData.conduits || [],
            circuits: projectData.circuits || [],
            guideLines: projectData.guideLines || [],
            texts: projectData.texts || [],
            dimensions: projectData.dimensions || [],
            projectName: data.project.name,
            currentDbProjectId: data.project.id,
            bgImageSrc: projectData.bgImageSrc || null,
            bgImageLock: projectData.bgImageLock !== undefined ? projectData.bgImageLock : true,
            bgImageScaleX: projectData.bgImageScaleX || projectData.bgImageScale || 1.0,
            bgImageScaleY: projectData.bgImageScaleY || projectData.bgImageScale || 1.0,
            bgImagePos: projectData.bgImagePos || { x: 0, y: 0 },
            bgImageRotation: projectData.bgImageRotation || 0,
            sheetsList: projectData.sheetsList || [],
            activeSheetId: projectData.activeSheetId || '',
            snapshots3D: projectData.snapshots3D || [],
            wallColor: projectData.wallColor || '#ffffff',
            floorTextureType: projectData.floorTextureType || 'pintura',
            doorColor: projectData.doorColor || '#b45309',
            windowColor: projectData.windowColor || '#38bdf8',
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

    // ═══════════════════════════════════════════════════════════
    // TOOL MANAGER — Implementações
    // ═══════════════════════════════════════════════════════════
    activeToolId: 'select',
    activeToolCursor: 'su-cursor-select',
    activeToolInstructor: 'Clique para selecionar entidades. Shift+Clique para seleção múltipla.',
    activeToolGroup: 'select',

    setActiveToolId: (toolId, cursor, instructor, group) => {
      const cursorMap: Record<string, string> = {
        select: 'su-cursor-select',
        line: 'su-cursor-pencil',
        wall: 'su-cursor-pencil',
        rectangle: 'su-cursor-pencil',
        circle: 'su-cursor-pencil',
        eraser: 'su-cursor-eraser',
        move: 'su-cursor-move',
        rotate: 'su-cursor-rotate',
        scale: 'su-cursor-scale',
        push_pull: 'su-cursor-pushpull',
        offset: 'su-cursor-pencil',
        measure: 'su-cursor-select',
        device: 'su-cursor-pencil',
        conduit: 'su-cursor-pencil',
        area: 'su-cursor-pencil',
        dimension: 'su-cursor-pencil',
        text: 'su-cursor-pencil',
      };
      const instructorMap: Record<string, string> = {
        select: 'Clique para selecionar. Shift+Clique para seleção múltipla. Arraste para janela de seleção.',
        line: 'Clique para definir o ponto inicial da linha. Clique novamente para o ponto final. ESC para cancelar.',
        wall: 'Clique para definir o início da parede. Clique novamente para o final. ESC para finalizar.',
        rectangle: 'Clique para o primeiro canto. Mova e clique para o canto oposto.',
        circle: 'Clique para o centro do círculo. Mova e clique para definir o raio.',
        eraser: 'Clique em uma entidade para deletá-la. Shift+Clique para suavizar/esconder arestas.',
        move: 'Clique em uma entidade para mover. Clique novamente para posicionar.',
        rotate: 'Clique para definir o centro. Clique novamente para o ângulo de início e fim.',
        scale: 'Clique em um ponto de controle e arraste para escalar. Shift para escala uniforme.',
        push_pull: 'Clique em uma face e arraste para extrudar. Clique duplo para repetir a última extrusão.',
        device: 'Clique na planta para posicionar o dispositivo elétrico.',
        conduit: 'Clique no dispositivo de origem e depois no destino para criar o eletroduto.',
      };
      set({
        activeToolId: toolId,
        activeToolCursor: cursor ?? cursorMap[toolId] ?? 'su-cursor-select',
        activeToolInstructor: instructor ?? instructorMap[toolId] ?? '',
        activeToolGroup: group ?? 'select',
      });
    },

    setActiveTool3D: (toolId) => {
      get().setActiveToolId(toolId);
    },

    // ═══════════════════════════════════════════════════════════
    // COMMAND MANAGER — Implementações
    // ═══════════════════════════════════════════════════════════
    commandHistory: [],
    clipboard: null,

    dispatchCommand: (commandId, payload) => {
      set((s) => ({
        commandHistory: [
          ...s.commandHistory.slice(-49),
          { id: `cmd_${Date.now()}`, label: commandId, timestamp: Date.now() }
        ]
      }));
      // Roteamento de comandos built-in
      const store = get();
      switch (commandId) {
        case 'undo': store.undo(); break;
        case 'redo': store.redo(); break;
        case 'copy': store.copySelection(); break;
        case 'paste': store.pasteClipboard(); break;
        case 'delete': store.deleteSelection(); break;
        default:
          console.log(`[CommandManager] Comando despachado: ${commandId}`, payload);
      }
    },

    copySelection: () => {
      const { selectedDeviceId, selectedWallId, devices, walls } = get();
      if (selectedDeviceId) {
        const device = devices.find(d => d.id === selectedDeviceId);
        if (device) set({ clipboard: { type: 'device', data: { ...device } } });
      } else if (selectedWallId) {
        const wall = walls.find(w => w.id === selectedWallId);
        if (wall) set({ clipboard: { type: 'wall', data: { ...wall } } });
      }
    },

    pasteClipboard: () => {
      const { clipboard } = get();
      if (!clipboard) return;
      const cb = clipboard as { type: string; data: Record<string, unknown> };
      if (cb.type === 'device' && cb.data) {
        get().pushHistory();
        const srcData = cb.data as Record<string, unknown>;
        get().addDevice({
          type: (srcData.type as string) ?? 'tug_baixa',
          name: (srcData.name as string) ?? 'Cópia',
          x: ((srcData.x as number) ?? 0) + 0.3,
          y: ((srcData.y as number) ?? 0) + 0.3,
          rotation: (srcData.rotation as number) ?? 0,
          power: (srcData.power as number) ?? 100,
          voltage: (srcData.voltage as 127 | 220) ?? 127,
          circuitId: srcData.circuitId as string | undefined,
          height3d: srcData.height3d as number | undefined,
          width: srcData.width as number | undefined,
        });
      }
    },


    deleteSelection: () => {
      const { selectedDeviceId, selectedWallId, selectedConduitId, selectedTextId, selectedDimensionId } = get();
      get().pushHistory();
      if (selectedDeviceId) get().removeDevice(selectedDeviceId);
      if (selectedWallId) get().removeWall(selectedWallId);
      if (selectedConduitId) get().removeConduit(selectedConduitId);
      if (selectedTextId) get().removeText(selectedTextId);
      if (selectedDimensionId) get().removeDimension(selectedDimensionId);
      get().clearSelection();
    },

    // ═══════════════════════════════════════════════════════════
    // SHORTCUT MANAGER — Implementações
    // ═══════════════════════════════════════════════════════════
    shortcutsEnabled: true,

    setShortcutsEnabled: (enabled) => set({ shortcutsEnabled: enabled }),

    initShortcutManager: () => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const { shortcutsEnabled, setActiveToolId, setCurrentTool, dispatchCommand } = get();
        if (!shortcutsEnabled) return;
        // Ignora quando está em um input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && key === 'z') { e.preventDefault(); dispatchCommand('undo'); return; }
        if (ctrl && key === 'y') { e.preventDefault(); dispatchCommand('redo'); return; }
        if (ctrl && key === 'c') { e.preventDefault(); dispatchCommand('copy'); return; }
        if (ctrl && key === 'v') { e.preventDefault(); dispatchCommand('paste'); return; }
        if (key === 'delete' || key === 'backspace') { dispatchCommand('delete'); return; }

        // Atalhos de ferramentas do SketchUp
        const toolMap: Record<string, string> = {
          ' ': 'select',    // Space
          'escape': 'select',
          'l': 'line',
          'r': 'rectangle',
          'c': 'circle',
          'm': 'move',
          'q': 'rotate',
          's': 'scale',
          'p': 'push_pull',
          'e': 'eraser',
          'f': 'offset',
          't': 'measure',
        };

        if (toolMap[key] && !ctrl) {
          e.preventDefault();
          const toolId = toolMap[key];
          setActiveToolId(toolId);
          // Mapear também para o currentTool legacy
          const legacyMap: Record<string, string> = {
            select: 'select', eraser: 'select',
            line: 'wall', wall: 'wall',
            device: 'device', conduit: 'conduit',
            area: 'area',
          };
          if (legacyMap[toolId]) {
            setCurrentTool(legacyMap[toolId] as Parameters<typeof setCurrentTool>[0]);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    },

    // ═══════════════════════════════════════════════════════════
    // VIEWPORT MANAGER — Implementações
    // ═══════════════════════════════════════════════════════════
    viewportState: {
      activeTab: 'cad2d',
      snapsEnabled: true,
      snapTypes: ['endpoint', 'midpoint', 'center', 'on_edge'],
      axisLock: 'none',
      measurementsValue: '',
      statusText: 'Pronto',
    },

    setViewportTab: (tab) => set((s) => ({
      viewportState: { ...s.viewportState, activeTab: tab }
    })),

    setAxisLock: (axis) => set((s) => ({
      viewportState: { ...s.viewportState, axisLock: axis }
    })),

    setMeasurementsValue: (value) => set((s) => ({
      viewportState: { ...s.viewportState, measurementsValue: value }
    })),

    setStatusText: (text) => set((s) => ({
      viewportState: { ...s.viewportState, statusText: text }
    })),

    // ═══════════════════════════════════════════════════════════
    // IMPORT MANAGER — Implementações (esqueleto vazio)
    // ═══════════════════════════════════════════════════════════
    importManager: {
      supportedFormats: ['skp', 'dwg', 'dxf', 'ifc', 'obj', 'gltf'],
      isImporting: false,
      lastImportError: null,
    },

    importFile: async (format, _file) => {
      set((s) => ({ importManager: { ...s.importManager, isImporting: true, lastImportError: null } }));
      try {
        // TODO Fase 3+: Implementar parsers para cada formato
        console.warn(`[ImportManager] Importação de ${format} ainda não implementada.`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        set((s) => ({ importManager: { ...s.importManager, lastImportError: msg } }));
      } finally {
        set((s) => ({ importManager: { ...s.importManager, isImporting: false } }));
      }
    },

    // ═══════════════════════════════════════════════════════════
    // SELECTION MANAGER — Implementações
    // ═══════════════════════════════════════════════════════════
    selectedEntityIds: [],
    selectionBox: null,

    addToSelection: (id) => set((s) => ({
      selectedEntityIds: s.selectedEntityIds.includes(id) ? s.selectedEntityIds : [...s.selectedEntityIds, id]
    })),

    removeFromSelection: (id) => set((s) => ({
      selectedEntityIds: s.selectedEntityIds.filter(eid => eid !== id)
    })),

    setSelection: (ids) => set({ selectedEntityIds: ids }),

    clearEntitySelection: () => set({ selectedEntityIds: [], selectionBox: null }),

    setSelectionBox: (box) => set({ selectionBox: box }),

    // ═══════════════════════════════════════════════════════════
    // SCENE MANAGER — Implementações
    // ═══════════════════════════════════════════════════════════
    scenesList: [
      { id: 'scene_default', name: 'Cena 1', activeTab: 'cad2d', renderMode: 'ARCHITECTURAL' }
    ],
    activeSceneId: 'scene_default',

    addScene: (name) => {
      const id = `scene_${Date.now()}`;
      const { viewportState, renderMode } = get();
      set((s) => ({
        scenesList: [...s.scenesList, {
          id,
          name,
          activeTab: viewportState.activeTab,
          renderMode: renderMode,
        }],
        activeSceneId: id,
      }));
    },

    removeScene: (id) => set((s) => {
      const filtered = s.scenesList.filter(sc => sc.id !== id);
      return {
        scenesList: filtered,
        activeSceneId: filtered.length > 0 ? filtered[filtered.length - 1].id : null,
      };
    }),

    renameScene: (id, name) => set((s) => ({
      scenesList: s.scenesList.map(sc => sc.id === id ? { ...sc, name } : sc)
    })),

    activateScene: (id) => {
      const { scenesList } = get();
      const scene = scenesList.find(sc => sc.id === id);
      if (!scene) return;
      set({ activeSceneId: id });
      get().setViewportTab(scene.activeTab);
    },

    // ═══════════════════════════════════════════════════════════
    // MATERIAL DATABASE — Biblioteca PBR inicial
    // ═══════════════════════════════════════════════════════════
    pbrMaterials: [
      // Cores
      { id: 'mat_white', name: 'Branco Neve', color: '#ffffff', roughness: 0.8, metalness: 0.0, opacity: 1.0, category: 'Cores' },
      { id: 'mat_offwhite', name: 'Off-White', color: '#f5f0e8', roughness: 0.85, metalness: 0.0, opacity: 1.0, category: 'Cores' },
      { id: 'mat_gray', name: 'Cinza Concreto', color: '#9ca3af', roughness: 0.9, metalness: 0.0, opacity: 1.0, category: 'Concreto' },
      { id: 'mat_concrete', name: 'Concreto Aparente', color: '#6b7280', roughness: 0.95, metalness: 0.0, opacity: 1.0, category: 'Concreto' },
      // Madeiras
      { id: 'mat_wood_light', name: 'Madeira Clara', color: '#d4a76a', roughness: 0.7, metalness: 0.0, opacity: 1.0, category: 'Madeira' },
      { id: 'mat_wood_dark', name: 'Madeira Escura', color: '#7c4d1e', roughness: 0.75, metalness: 0.0, opacity: 1.0, category: 'Madeira' },
      { id: 'mat_wood_pine', name: 'Pinus Natural', color: '#c89b5f', roughness: 0.65, metalness: 0.0, opacity: 1.0, category: 'Madeira' },
      // Pisos e Azulejos
      { id: 'mat_porcelain_white', name: 'Porcelanato Branco', color: '#f8f8f8', roughness: 0.1, metalness: 0.0, opacity: 1.0, category: 'Piso' },
      { id: 'mat_porcelain_gray', name: 'Porcelanato Cinza', color: '#d1d5db', roughness: 0.12, metalness: 0.0, opacity: 1.0, category: 'Piso' },
      { id: 'mat_tile_white', name: 'Azulejo Branco', color: '#f9fafb', roughness: 0.15, metalness: 0.0, opacity: 1.0, category: 'Azulejo' },
      { id: 'mat_tile_subway', name: 'Subway Tile', color: '#e5e7eb', roughness: 0.2, metalness: 0.0, opacity: 1.0, category: 'Azulejo' },
      // Metais
      { id: 'mat_steel', name: 'Aço Inox', color: '#d1d5db', roughness: 0.3, metalness: 0.9, opacity: 1.0, category: 'Metal' },
      { id: 'mat_aluminum', name: 'Alumínio', color: '#e5e7eb', roughness: 0.4, metalness: 0.8, opacity: 1.0, category: 'Metal' },
      { id: 'mat_copper', name: 'Cobre', color: '#b87333', roughness: 0.5, metalness: 0.95, opacity: 1.0, category: 'Metal' },
      // Vidros
      { id: 'mat_glass_clear', name: 'Vidro Transparente', color: '#bfdbfe', roughness: 0.05, metalness: 0.1, opacity: 0.25, category: 'Vidro' },
      { id: 'mat_glass_frosted', name: 'Vidro Fosco', color: '#e0f2fe', roughness: 0.6, metalness: 0.0, opacity: 0.6, category: 'Vidro' },
      // Elétrico
      { id: 'mat_electric_conduit', name: 'Eletroduto PVC', color: '#fbbf24', roughness: 0.7, metalness: 0.0, opacity: 1.0, category: 'Elétrico' },
      { id: 'mat_electric_wire', name: 'Cabo Elétrico', color: '#dc2626', roughness: 0.8, metalness: 0.0, opacity: 1.0, category: 'Elétrico' },
    ],

    applyMaterial: (entityId, materialId) => {
      set((s) => ({
        devices: s.devices.map(d => d.id === entityId ? { ...d, materialId } : d),
        walls: s.walls.map(w => w.id === entityId ? { ...w, materialId } : w),
        areas: s.areas.map(a => a.id === entityId ? { ...a, materialId } : a),
      }));
    },
  }),

  {
    name: 'eletric-sf-cad-store',
    partialize: (state) => ({
      walls: state.walls,
      areas: state.areas,
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
      bgImageSrc: state.bgImageSrc,
      bgImageLock: state.bgImageLock,
      bgImageScaleX: state.bgImageScaleX,
      bgImageScaleY: state.bgImageScaleY,
      bgImagePos: state.bgImagePos,
      bgImageRotation: state.bgImageRotation,
      sheetsList: state.sheetsList || [],
      activeSheetId: state.activeSheetId || '',
      snapshots3D: state.snapshots3D || [],
      wallColor: state.wallColor || '#ffffff',
      floorTextureType: state.floorTextureType || 'pintura',
      doorColor: state.doorColor || '#b45309',
      windowColor: state.windowColor || '#38bdf8',
      showLaje3D: state.showLaje3D,
    }),
    onRehydrateStorage: () => (state) => {
      if (state && typeof state.recomputeDerivedState === 'function') {
        state.recomputeDerivedState();
      }
    }
  }
)
);
