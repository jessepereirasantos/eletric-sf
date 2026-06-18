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
  | 'gerador' | 'nobreak';

