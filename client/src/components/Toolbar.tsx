import React, { useState, useRef, useEffect } from 'react';
import type { ToolType, DeviceType } from '../types';
import { useCadStore } from '../store/useCadStore';

interface ToolbarProps {
  currentTool: ToolType;
  selectedDeviceType: DeviceType | null;
  onToolChange: (tool: ToolType) => void;
  onDeviceTypeChange: (type: DeviceType | null) => void;
  onAutomationAction: (action: string) => void;
}

// ─── Ícones SVG para a Toolbar (Estilo técnico WOCA) ───────────────────

const IconSelect = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polygon points="5 3 20 12 12 14 5 21 5 3" fill="currentColor" />
  </svg>
);

const IconWall = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="1" strokeDasharray="3 3" />
    <path d="M7 3v18M17 3v18" strokeWidth="2.5" />
  </svg>
);

const IconDoor = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12h18M3 6h18M3 18h18" opacity="0.3" />
    <path d="M5 21V3h8v18" strokeWidth="2" />
    <path d="M13 3c4 0 7 3 7 7v11" strokeDasharray="3 3" />
  </svg>
);

const IconWindow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="5" x2="12" y2="19" />
  </svg>
);

const IconText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const IconLight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="6" />
    <line x1="7.75" y1="7.75" x2="16.25" y2="16.25" />
    <line x1="7.75" y1="16.25" x2="16.25" y2="7.75" />
  </svg>
);

const IconOutlet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="7" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const IconSwitch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="12" y1="12" x2="12" y2="2" />
    <path d="M12 2c2.5 0 4.5 2 4.5 4.5" />
  </svg>
);

const IconInfra = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="1" fill="none" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <line x1="15" y1="4" x2="15" y2="20" />
  </svg>
);

const IconBoxes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polygon points="12,2 18,5 18,11 12,14 6,11 6,5" />
    <rect x="4" y="14" width="16" height="8" rx="1" />
  </svg>
);

const IconConduit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12c6-5 12 5 18 0" strokeWidth="2.5" />
  </svg>
);

const IconAutoWire = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12c6-5 12 5 18 0" strokeWidth="2" strokeDasharray="2 2" />
    <polygon points="12 4 4 15 11 15 9 22 19 11 12 11 12 4" fill="currentColor" stroke="none" />
  </svg>
);

const IconSplit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="2" width="6" height="6" rx="1" />
    <rect x="16" y="7" width="6" height="6" rx="1" />
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <path d="M8 5h4v11h4M12 9h4" />
  </svg>
);

const IconMoney = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const IconDimensioning = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

const IconPaperSpace = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <rect x="8" y="12" width="8" height="6" rx="0.5" strokeDasharray="2 2" />
  </svg>
);

const IconTelecom = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2L2 22h20L12 2z" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <circle cx="12" cy="9" r="1.5" fill="currentColor" />
  </svg>
);

const IconSecurity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
);

const IconGuide = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="12" y1="1" x2="12" y2="23" strokeDasharray="3 3" />
    <line x1="1" y1="12" x2="23" y2="12" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

const IconFurniture = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 18v3M20 18v3M4 10h16M4 14h16M8 10V6a2 2 0 012-2h4a2 2 0 012 2v4" />
  </svg>
);

// ─── Definição das Categorias/Ferramentas ─────────────────────────────────

interface ToolbarItem {
  type: ToolType | DeviceType | string;
  label: string;
  isDevice?: boolean;
  symbolDesc?: string;
}

interface GroupDef {
  key: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  hasDropdown: boolean;
  defaultTool: ToolType;
  defaultDevice?: DeviceType;
  items: ToolbarItem[];
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool, selectedDeviceType, onToolChange, onDeviceTypeChange, onAutomationAction,
}) => {
  const paperSpaceActive = useCadStore(s => s.paperSpaceActive);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const groups: GroupDef[] = [
    {
      key: 'select',
      label: 'Seleção',
      icon: <IconSelect />,
      hasDropdown: false,
      defaultTool: 'select',
      items: [{ type: 'select', label: 'Ferramenta de Seleção (S)' }],
    },
    {
      key: 'wall',
      label: 'Parede',
      icon: <IconWall />,
      hasDropdown: true,
      defaultTool: 'wall',
      items: [
        { type: 'wall', label: 'Parede Alvenaria (15cm)' },
      ],
    },
    {
      key: 'guide_line',
      label: 'Guias de Referência',
      icon: <IconGuide />,
      hasDropdown: true,
      defaultTool: 'guide_line',
      items: [
        { type: 'guide_line_v', label: 'Guia Vertical', symbolDesc: '┋' },
        { type: 'guide_line_h', label: 'Guia Horizontal', symbolDesc: '╍' },
      ],
    },
    {
      key: 'door',
      label: 'Porta',
      icon: <IconDoor />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'door',
      items: [
        { type: 'door', label: 'Porta de Giro 80cm', isDevice: true, symbolDesc: '🚪' },
        { type: 'door_correr', label: 'Porta de Correr', isDevice: true, symbolDesc: '🚪' },
        { type: 'door_pivotante', label: 'Porta Pivotante', isDevice: true, symbolDesc: '🚪' },
        { type: 'open_van', label: 'Vão Livre', isDevice: true, symbolDesc: '🚪' },
      ],
    },
    {
      key: 'window',
      label: 'Janela',
      icon: <IconWindow />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'window',
      items: [
        { type: 'window', label: 'Janela de Correr', isDevice: true, symbolDesc: '🖼️' },
      ],
    },
    {
      key: 'text',
      label: 'Texto / Cotas',
      icon: <IconText />,
      hasDropdown: true,
      defaultTool: 'text',
      items: [
        { type: 'text', label: 'Anotação de Texto' },
        { type: 'dimension', label: 'Cotas Métricas' },
      ],
    },
    {
      key: 'iluminacao',
      label: 'Iluminação',
      badge: 'A',
      icon: <IconLight />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'ceiling_light',
      items: [
        { type: 'ceiling_light', label: 'Ponto de Luz no Teto', isDevice: true, symbolDesc: '⚪' },
        { type: 'sconce', label: 'Arandela (Parede)', isDevice: true, symbolDesc: '🌙' },
        { type: 'fluorescent', label: 'Luz Fluorescente', isDevice: true, symbolDesc: '▭' },
        { type: 'luminaria_emergencia', label: 'Luminária de Emergência', isDevice: true, symbolDesc: '🚨' },
      ],
    },
    {
      key: 'tomadas',
      label: 'Tomadas',
      badge: 'A',
      icon: <IconOutlet />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'tug_baixa',
      items: [
        { type: 'tug_baixa', label: 'TUG Baixa (10A)', isDevice: true, symbolDesc: '▽' },
        { type: 'tug_media', label: 'TUG Média (10A)', isDevice: true, symbolDesc: '◁' },
        { type: 'tug_alta', label: 'TUG Alta (10A)', isDevice: true, symbolDesc: '△' },
        { type: 'tomada_10a_nbr', label: 'Tomada 10A NBR 14136', isDevice: true, symbolDesc: '▽' },
        { type: 'tomada_20a', label: 'Tomada 20A NBR 14136', isDevice: true, symbolDesc: '△' },
        { type: 'tue_chuveiro', label: 'TUE Chuveiro', isDevice: true, symbolDesc: '♨' },
        { type: 'tue_ar', label: 'TUE Ar Condic.', isDevice: true, symbolDesc: '❄' },
      ],
    },
    {
      key: 'cargas_motor',
      label: 'Motores e Cargas',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v12M8 10h8M8 14h8" />
        </svg>
      ),
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'motor',
      items: [
        { type: 'motor', label: 'Motor Elétrico', isDevice: true, symbolDesc: 'Ⓜ️' },
        { type: 'bomba_agua', label: 'Bomba d\'Água', isDevice: true, symbolDesc: '⛲' },
        { type: 'torneira_eletrica', label: 'Torneira Elétrica', isDevice: true, symbolDesc: '🚰' },
      ],
    },
    {
      key: 'eletroeletronicos',
      label: 'Eletroeletrônicos',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <line x1="5" y1="9" x2="19" y2="9" />
          <circle cx="12" cy="15" r="3" />
        </svg>
      ),
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'maquina_lavar',
      items: [
        { type: 'maquina_lavar', label: 'Máquina de Lavar', isDevice: true, symbolDesc: '🧺' },
        { type: 'tue_chuveiro', label: 'Chuveiro Elétrico', isDevice: true, symbolDesc: '♨' },
        { type: 'torneira_eletrica', label: 'Torneira Elétrica', isDevice: true, symbolDesc: '🚰' },
        { type: 'tue_ar', label: 'Ar Condicionado', isDevice: true, symbolDesc: '❄' },
      ],
    },
    {
      key: 'mobiliario',
      label: 'Mobiliário',
      icon: <IconFurniture />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'sofa',
      items: [
        { type: 'sofa', label: 'Sofá Residencial', isDevice: true, symbolDesc: '🛋️' },
        { type: 'geladeira', label: 'Geladeira', isDevice: true, symbolDesc: '❄️' },
        { type: 'fogao', label: 'Fogão', isDevice: true, symbolDesc: '🔥' },
        { type: 'cama', label: 'Cama de Casal', isDevice: true, symbolDesc: '🛏️' },
        { type: 'mesa_jantar', label: 'Mesa de Jantar', isDevice: true, symbolDesc: '🪑' },
      ],
    },
    {
      key: 'interruptores',
      label: 'Interruptores',
      icon: <IconSwitch />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'switch_simple',
      items: [
        { type: 'switch_simple', label: 'Simples', isDevice: true, symbolDesc: '▣' },
        { type: 'switch_parallel', label: 'Paralelo (3-Way)', isDevice: true, symbolDesc: '⬛' },
        { type: 'switch_intermediate', label: 'Intermediário (4-Way)', isDevice: true, symbolDesc: '◪' },
        { type: 'dimmer', label: 'Dimmer (Intensidade)', isDevice: true, symbolDesc: '◐' },
      ],
    },
    {
      key: 'telecom',
      label: 'Telecom / Redes',
      icon: <IconTelecom />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'tele_rj45',
      items: [
        { type: 'tele_rj45', label: 'Tomada RJ45 (Rede)', isDevice: true, symbolDesc: '▲' },
        { type: 'tele_rj11', label: 'Tomada RJ11 (Telefone)', isDevice: true, symbolDesc: '▲' },
        { type: 'tele_coaxial', label: 'Tomada Coaxial (TV)', isDevice: true, symbolDesc: '▲' },
      ],
    },
    {
      key: 'seguranca',
      label: 'Segurança / Sensores',
      icon: <IconSecurity />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'cftv_camera',
      items: [
        { type: 'cftv_camera', label: 'Câmera CFTV', isDevice: true, symbolDesc: '📹' },
        { type: 'sensor_presenca', label: 'Sensor de Presença', isDevice: true, symbolDesc: '🚨' },
        { type: 'sensor_fumaca', label: 'Sensor de Fumaça', isDevice: true, symbolDesc: '🔥' },
        { type: 'fotocelula', label: 'Fotocélula (Sensor)', isDevice: true, symbolDesc: '👁️' },
        { type: 'campainha', label: 'Campainha / Cigarra', isDevice: true, symbolDesc: '🔔' },
        { type: 'central_alarme', label: 'Central de Alarme', isDevice: true, symbolDesc: '📟' },
      ],
    },
    {
      key: 'infraestrutura',
      label: 'Infraestrutura',
      badge: 'A',
      icon: <IconInfra />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'qdc',
      items: [
        { type: 'qdc', label: 'Quadro de Distribuição (QDC)', isDevice: true, symbolDesc: '◪' },
        { type: 'qgbt', label: 'Quadro Geral BT (QGBT)', isDevice: true, symbolDesc: '◪' },
        { type: 'meter', label: 'Medidor de Entrada', isDevice: true, symbolDesc: '⚡' },
        { type: 'poste', label: 'Poste de Entrada', isDevice: true, symbolDesc: '⚡' },
        { type: 'caixa_passagem', label: 'Caixa de Passagem', isDevice: true, symbolDesc: '⊞' },
      ],
    },
    {
      key: 'caixas_infra',
      label: 'Caixas/Infra',
      icon: <IconBoxes />,
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'box_octogonal',
      items: [
        { type: 'box_octogonal', label: 'Caixa Octogonal (Teto)', isDevice: true, symbolDesc: '⬡' },
        { type: 'box_4x2', label: 'Caixa 4x2 (Parede)', isDevice: true, symbolDesc: '▭' },
        { type: 'box_4x4', label: 'Caixa 4x4 (Parede)', isDevice: true, symbolDesc: '□' },
      ],
    },
    {
      key: 'protecao',
      label: 'Proteção Elétrica',
      badge: 'NBR',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'disjuntor',
      items: [
        { type: 'disjuntor', label: 'Disjuntor Termomagnético', isDevice: true, symbolDesc: '🛡️' },
        { type: 'dr', label: 'DR (Dif. Residual 30mA)', isDevice: true, symbolDesc: '🔴' },
        { type: 'idr', label: 'IDR (DR + Disjuntor)', isDevice: true, symbolDesc: '🔴' },
        { type: 'device_dr', label: 'IDR Local (Tomada/Ponto)', isDevice: true, symbolDesc: '🔌🔴' },
        { type: 'dps', label: 'DPS (Proteção Surtos)', isDevice: true, symbolDesc: '⚡' },
        { type: 'aterramento', label: 'Aterramento (Haste Terra)', isDevice: true, symbolDesc: '⏚' },
        { type: 'ground_rod', label: 'Haste de Aterramento PE', isDevice: true, symbolDesc: '🪵' },
        { type: 'spda', label: 'SPDA (Para-Raios)', isDevice: true, symbolDesc: '⚡' },
      ],
    },
    {
      key: 'cargas_especiais',
      label: 'Cargas Especiais',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 6V4M17 6V4M7 18v2M17 18v2" />
          <path d="M10 12h4M12 10v4" />
        </svg>
      ),
      hasDropdown: true,
      defaultTool: 'device',
      defaultDevice: 'gerador',
      items: [
        { type: 'gerador', label: 'Gerador Elétrico', isDevice: true, symbolDesc: '⚙️' },
        { type: 'nobreak', label: 'Nobreak / UPS', isDevice: true, symbolDesc: '🔋' },
      ],
    },
    {
      key: 'conduit',
      label: 'Eletroduto Manual',
      icon: <IconConduit />,
      hasDropdown: true,
      defaultTool: 'conduit',
      items: [
        { type: 'conduit', label: 'Traçar Conduíte Manual (E)' },
      ],
    },
    {
      key: 'auto_wire',
      label: 'Fiação Automática',
      badge: 'A',
      icon: <IconAutoWire />,
      hasDropdown: true,
      defaultTool: 'auto_wire',
      items: [
        { type: 'auto_wire_run', label: 'Lançar Fiação Automática' },
      ],
    },
    {
      key: 'split_circuits',
      label: 'Dividir Circuitos',
      badge: 'A',
      icon: <IconSplit />,
      hasDropdown: true,
      defaultTool: 'select', // Apenas automação
      items: [
        { type: 'split_circuits_light', label: 'Dividir Iluminação (Exclusivo)' },
        { type: 'split_circuits_tug', label: 'Dividir TUGs (Max 1.2kW por Circ)' },
        { type: 'split_circuits_tue', label: 'Dividir TUEs (Carga Exclusiva)' },
        { type: 'split_circuits_all', label: 'Executar Todas as Divisões' },
      ],
    },
  ];

  const handleItemClick = (_group: GroupDef, item: ToolbarItem) => {
    setOpenDropdown(null);
    if (item.type.startsWith('split_circuits_') || item.type === 'auto_wire_run') {
      const action = item.type === 'auto_wire_run' ? 'auto_wire' : item.type;
      onAutomationAction(action);
    } else if (item.type.startsWith('guide_line_')) {
      const type = item.type === 'guide_line_v' ? 'vertical' : 'horizontal';
      useCadStore.getState().setSelectedGuideType(type);
      onToolChange('guide_line');
      onDeviceTypeChange(null);
    } else if (item.isDevice) {
      onToolChange('device');
      onDeviceTypeChange(item.type as DeviceType);
    } else {
      onToolChange(item.type as ToolType);
      onDeviceTypeChange(null);
    }
  };

  const handleGroupClick = (group: GroupDef) => {
    if (group.hasDropdown) {
      setOpenDropdown(openDropdown === group.key ? null : group.key);
    } else {
      setOpenDropdown(null);
      onToolChange(group.defaultTool);
      onDeviceTypeChange(group.defaultDevice || null);
    }
  };

  const isGroupActive = (group: GroupDef): boolean => {
    if (group.key === 'select' && currentTool === 'select') return true;
    if (group.key === 'wall' && currentTool === 'wall') return true;
    if (group.key === 'guide_line' && currentTool === 'guide_line') return true;
    if (group.key === 'conduit' && currentTool === 'conduit') return true;
    if (group.key === 'text' && (currentTool === 'text' || currentTool === 'dimension')) return true;

    if (group.defaultTool === 'device' && currentTool === 'device' && selectedDeviceType) {
      return group.items.some(item => item.isDevice && item.type === selectedDeviceType);
    }
    return false;
  };

  return (
    <div className="toolbar-bar" ref={dropdownRef}>
      {groups.map(group => {
        const active = isGroupActive(group);
        return (
          <div key={group.key} className="toolbar-group">
            <button
              className={`toolbar-btn ${active ? 'active' : ''} ${openDropdown === group.key ? 'open' : ''}`}
              onClick={() => handleGroupClick(group)}
              title={group.label}
            >
              <span className="toolbar-btn-icon">{group.icon}</span>
              {group.badge && <span className="toolbar-badge">{group.badge}</span>}
              {group.hasDropdown && <span className="tb-caret">▾</span>}
            </button>

            {openDropdown === group.key && (
              <div className="toolbar-dropdown-vertical">
                <div className="toolbar-dropdown-header">{group.label}</div>
                {group.items.map(item => (
                  <button
                    key={item.type}
                    className={`toolbar-dropdown-item-vertical ${
                      (item.isDevice && item.type === selectedDeviceType && currentTool === 'device') ||
                      (!item.isDevice && item.type === currentTool)
                        ? 'active' : ''
                    }`}
                    onClick={() => handleItemClick(group, item)}
                  >
                    <span className="item-symbol-desc">{item.symbolDesc || '✏️'}</span>
                    <span className="item-label-text">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="toolbar-divider" />

      {/* ── Modo Prancha / Paper Space ── */}
      <button
        className={`toolbar-btn btn-paperspace ${paperSpaceActive ? 'active' : ''}`}
        onClick={() => onAutomationAction('toggle_paperspace')}
        title="Modo Prancha de Impressão (Paper Space)"
      >
        <span className="toolbar-btn-icon"><IconPaperSpace /></span>
        <span className="toolbar-badge">BIM</span>
      </button>

      {/* ── Dimensionamento NBR 5410 ── */}
      <button
        className="toolbar-btn btn-dimensioning"
        onClick={() => onAutomationAction('dimensioning')}
        title="Tabela de Dimensionamento dos Condutores e Disjuntores"
      >
        <span className="toolbar-btn-icon"><IconDimensioning /></span>
        <span className="toolbar-badge">A</span>
      </button>

      {/* ── Orçamento & Materiais ($) ── */}
      <button
        className="toolbar-btn btn-budget"
        onClick={() => onAutomationAction('budget')}
        title="Lista de Materiais e Orçamento Estimado ($)"
      >
        <span className="toolbar-btn-icon"><IconMoney /></span>
      </button>
    </div>
  );
};
