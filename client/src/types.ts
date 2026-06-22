// ============================================================
// ENTITY SYSTEM — Base genérica para todos os objetos do projeto
// Regra: Nenhum objeto nasce fora do Entity System (Fase 1 → Regra 07)
// ============================================================

export type EntityType =
  | 'wall' | 'door' | 'window'
  | 'device' | 'conduit' | 'area'
  | 'text' | 'dimension' | 'guideline'
  | 'outlet' | 'panel' | 'pipe' | 'beam' | 'column' | 'slab'
  | 'fixture' | 'furniture' | 'annotation';

/** Interface base que TODOS os objetos do projeto devem derivar */
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  visible: boolean;
  locked: boolean;
  materialId?: string;
  tags: string[];
}

// ============================================================
// MATERIAL SYSTEM — Propriedades PBR (Physically Based Rendering)
// Regra: Materiais são entidades próprias, não texturas soltas (Regra 08)
// ============================================================

export interface Material {
  id: string;
  name: string;
  color?: string;          // ex: '#ffffff'
  texture?: string;        // URL da imagem (tileable)
  roughness?: number;      // 0.0 (espelhado) a 1.0 (mate)
  metalness?: number;      // 0.0 (dielétrico) a 1.0 (metálico)
  opacity?: number;        // 0.0 (transparente) a 1.0 (opaco)
  category?: string;       // 'Cores' | 'Madeira' | 'Concreto' | 'Piso' | 'Azulejo' | 'Metal' | 'Vidro' | 'Elétrico'
  thumbnail?: string;      // URL da miniatura para o painel de materiais
}

// ============================================================
// SCENE MANAGER — Registro de cenas (câmera + visibilidade)
// Análogo às Cenas do SketchUp Pro
// ============================================================

export interface Scene {
  id: string;
  name: string;
  cameraPosition: [number, number, number] | null;
  cameraTarget: [number, number, number] | null;
  zoom2D: number | null;
  pan2D: { x: number; y: number } | null;
  activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
  viewFilter: 'completa' | 'infraestrutura' | 'fiacao_dispositivos';
  renderMode?: string;
}

// ============================================================
// TOOL MANAGER — Definição centralizada de cada ferramenta
// Regra: activeTool, cursor e instructor gerenciados aqui (Regra 01)
// ============================================================

export interface ToolDefinition {
  id: string;
  name: string;
  icon: string;           // nome do ícone (Lucide ou SVG inline)
  cursor: string;         // classe CSS: 'su-cursor-pencil', 'su-cursor-move', etc.
  shortcut?: string;      // tecla do SketchUp (ex: 'L', 'R', 'C', 'Space')
  instructor: string;     // texto de instrução passo a passo
  group: 'select' | 'draw' | 'modify' | 'view' | 'electric' | 'measure';
  available3D?: boolean;  // ferramenta disponível na viewport 3D?
  available2D?: boolean;  // ferramenta disponível no editor CAD 2D?
}

// ============================================================
// SHORTCUT MAP — Mapa de atalhos de teclado estilo SketchUp
// ============================================================

export interface ShortcutMap {
  key: string;            // tecla ou combinação (ex: 'l', 'ctrl+z', 'shift+c')
  toolId?: string;        // ID da ferramenta a ativar
  commandId?: string;     // ID do comando a executar
  description: string;
}

// ============================================================
// COMMAND SYSTEM — Registro de comandos do histórico
// ============================================================

export interface CommandHistoryEntry {
  id: string;
  commandId: string;
  label: string;          // ex: 'Mover parede', 'Adicionar tomada'
  timestamp: number;
  payload?: unknown;
}

// ============================================================
// SELECTION STATE — Arquitetura de seleção profissional
// Prepara: clique único, Shift+click, janela esq/dir (Regra 06)
// ============================================================

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  mode: 'window' | 'crossing'; // window = esq→dir; crossing = dir→esq
}

// ============================================================
// IMPORT MANAGER — Esqueleto para importadores futuros
// Suportará: SKP, DWG, DXF, IFC, OBJ, GLTF
// ============================================================

export interface ImportConfig {
  format: 'skp' | 'dwg' | 'dxf' | 'ifc' | 'obj' | 'gltf';
  filePath?: string;
  options?: Record<string, unknown>;
}

// ============================================================
// VIEWPORT MANAGER — Estados da câmera e renderização
// ============================================================

export interface ViewportState {
  activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
  renderMode: string;
  zoom: number;
  panX: number;
  panY: number;
  snapsEnabled: boolean;
  snapTypes: Array<'endpoint' | 'midpoint' | 'center' | 'on_edge' | 'on_face' | 'intersection'>;
  axisLock: 'none' | 'x' | 'y' | 'z';
}

// ============================================================
// TOOL TYPES (legacy — preservados para compatibilidade elétrica)
// ============================================================

export type ToolType = 'select' | 'wall' | 'device' | 'conduit' | 'area'
  | 'dimension' | 'text' | 'line' | 'rectangle' | 'circle'
  | 'eraser' | 'move' | 'rotate' | 'scale' | 'push_pull' | 'offset'
  | 'orbit' | 'pan' | 'zoom'
  | 'auto_wire' | 'auto_conduit'
  | 'split_circuits_tug' | 'split_circuits_light' | 'split_circuits_tue'
  | 'guide_line';

export type DeviceType =
  | 'door' | 'door_correr' | 'door_pivotante' | 'open_van' | 'window' | 'stairs'
  | 'ceiling_light' | 'sconce' | 'fluorescent' | 'luminaria_emergencia'
  | 'tug_baixa' | 'tug_media' | 'tug_alta' | 'tomada_20a' | 'tomada_10a_nbr'
  | 'tue_chuveiro' | 'tue_ar'
  | 'switch_simple' | 'switch_parallel' | 'switch_intermediate' | 'dimmer'
  | 'qdc' | 'qgbt' | 'meter' | 'poste'
  | 'disjuntor' | 'dr' | 'idr' | 'dps' | 'aterramento' | 'spda'
  | 'caixa_passagem'
  | 'tele_rj45' | 'tele_rj11' | 'tele_coaxial'
  | 'cftv_camera' | 'sensor_presenca' | 'central_alarme' | 'sensor_fumaca'
  | 'box_octogonal' | 'box_4x2' | 'box_4x4'
  | 'motor' | 'bomba_agua' | 'torneira_eletrica' | 'fotocelula' | 'campainha'
  | 'gerador' | 'nobreak' | 'maquina_lavar'
  | 'sofa' | 'geladeira' | 'fogao' | 'cama' | 'mesa_jantar'
  | 'ground_rod' | 'device_dr'
  | 'carro_hatch' | 'caminhonete' | 'vaso_sanitario' | 'pia_esculpida' | 'arvore_palmeira' | 'arbusto' | 'guarda_sol' | 'mesa_piscina';

export interface SheetViewport {
  id: string;
  type: 'planta' | 'cargas' | 'materiais' | 'unifilar' | 'legenda' | 'corte_3d';
  x: number;          // percentual (0 a 100) da largura da prancha
  y: number;          // percentual (0 a 100) da altura da prancha
  w: number;          // percentual (0 a 100) da largura da prancha
  h: number;          // percentual (0 a 100) da altura da prancha
  scale?: number;     // escala opcional da planta baixa (ex: 50 para 1:50)
  snapshotId?: string; // id do snapshot para 'corte_3d'
}

export interface Sheet {
  id: string;
  code: string;
  title: string;
  size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
  orientation: 'landscape' | 'portrait';
  viewports: SheetViewport[];
}

export interface Snapshot3D {
  id: string;
  title: string;
  dataUrl: string; // base64 do canvas
  createdAt: string;
}
export const RenderMode = {
  SOLID: 'SOLID',
  TEXTURED: 'TEXTURED',
  XRAY: 'XRAY',
  WIREFRAME: 'WIREFRAME',
  HIDDEN_LINE: 'HIDDEN_LINE',
  MONOCHROME: 'MONOCHROME',
  ARCHITECTURAL: 'ARCHITECTURAL'
} as const;
export type RenderMode = typeof RenderMode[keyof typeof RenderMode];

export interface BIMObject {
  id: string;
  category: string;
  metadata: Record<string, any>;
}

export const ToolMode = {
  SELECT: 'SELECT',
  LINE: 'LINE',
  RECTANGLE: 'RECTANGLE',
  POLYGON: 'POLYGON',
  PUSH_PULL: 'PUSH_PULL',
  MOVE: 'MOVE',
  ROTATE: 'ROTATE',
  SCALE: 'SCALE'
} as const;
export type ToolMode = typeof ToolMode[keyof typeof ToolMode];

export interface BIMNode {
  id: string;
  name: string;
  type: "group" | "object";
  children?: BIMNode[];
  visible?: boolean;
  locked?: boolean;
}
