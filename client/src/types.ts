export type ToolType = 'select' | 'wall' | 'device' | 'conduit'
  | 'dimension' | 'text'
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
  | 'sofa' | 'geladeira' | 'fogao' | 'cama' | 'mesa_jantar';

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


