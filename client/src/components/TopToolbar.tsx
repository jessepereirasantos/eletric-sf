import React, { useRef, useState } from 'react';
import { useCadStore } from '../store/useCadStore';

// ─── Tipos internos ───────────────────────────────────────────

interface DeviceOption {
  type: string;
  label: string;
  icon: string;
  power: number;
  voltage: 127 | 220;
}

interface DropdownGroup {
  label: string;
  icon: string;
  devices: DeviceOption[];
}

// ─── Catálogo de dispositivos para dropdowns ──────────────────

const DEVICE_GROUPS: DropdownGroup[] = [
  {
    label: 'Padrão de Entrada',
    icon: '⚡',
    devices: [
      { type: 'poste', label: 'Poste de Entrada', icon: '🔴', power: 0, voltage: 220 },
      { type: 'medidor', label: 'Caixa de Medição', icon: '📦', power: 0, voltage: 220 },
    ],
  },
  {
    label: 'Iluminação',
    icon: '💡',
    devices: [
      { type: 'lampada', label: 'Ponto de Luz', icon: '⚪', power: 60, voltage: 127 },
      { type: 'interruptor', label: 'Interruptor Simples', icon: '▣', power: 0, voltage: 127 },
      { type: 'interruptor_duplo', label: 'Interruptor Duplo', icon: '▣▣', power: 0, voltage: 127 },
    ],
  },
  {
    label: 'Tomadas (NBR 14136)',
    icon: '🔌',
    devices: [
      { type: 'tomada_baixa', label: 'Tomada Baixa (10A) h≤1,0m', icon: '▽', power: 100, voltage: 127 },
      { type: 'tomada_media', label: 'Tomada Média (10A) 1,0m–1,5m', icon: '◁', power: 100, voltage: 127 },
      { type: 'tomada_alta', label: 'Tomada Alta (10A) h>1,5m', icon: '△', power: 100, voltage: 127 },
      { type: 'tomada_220', label: 'Tomada Específica (20A / 220V)', icon: '◈', power: 1500, voltage: 220 },
    ],
  },
  {
    label: 'Quadros e Proteção',
    icon: '📋',
    devices: [
      { type: 'qdc', label: 'QDC — Quadro Distribuição', icon: '◪', power: 0, voltage: 220 },
    ],
  },
  {
    label: 'Caixas/Infra',
    icon: '📦',
    devices: [
      { type: 'box_octogonal', label: 'Caixa Octogonal (Teto)', icon: '⬡', power: 0, voltage: 127 },
      { type: 'box_4x2', label: 'Caixa 4x2 (Parede)', icon: '▭', power: 0, voltage: 127 },
      { type: 'box_4x4', label: 'Caixa 4x4 (Parede)', icon: '□', power: 0, voltage: 127 },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────

interface TopToolbarProps {
  onImportPlant: () => void;
  onOpenDimensioning: () => void;
}

// ─── Componente Dropdown ──────────────────────────────────────

interface DropdownMenuProps {
  group: DropdownGroup;
  onSelect: (device: DeviceOption) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ group, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleBlur = () => setTimeout(() => setOpen(false), 150);

  return (
    <div className="tb-dropdown-wrapper" ref={ref} onBlur={handleBlur} tabIndex={-1}>
      <button
        className="tb-btn tb-btn-group"
        onClick={() => setOpen(o => !o)}
        title={`Inserir ${group.label}`}
      >
        <span className="tb-icon">{group.icon}</span>
        <span className="tb-label">{group.label}</span>
        <span className="tb-caret">▾</span>
      </button>
      {open && (
        <div className="tb-dropdown-menu">
          <div className="tb-dropdown-title">{group.label}</div>
          {group.devices.map(d => (
            <button
              key={d.type}
              className="tb-dropdown-item"
              onClick={() => { onSelect(d); setOpen(false); }}
            >
              <span className="tb-dd-icon">{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Toolbar Principal ────────────────────────────────────────

export const TopToolbar: React.FC<TopToolbarProps> = ({ onImportPlant, onOpenDimensioning }) => {
  const {
    currentTool,
    showGrid,
    history,
    future,
    selectedDeviceId,
    selectedWallId,
    setCurrentTool,
    setSelectedDeviceType,
    toggleGrid,
    undo,
    redo,
    removeDevice,
    removeWall,
    resetWorkspace,
    zoom,
    setZoom,
    setPan,
  } = useCadStore();

  // Selecionar ferramenta de inserção de dispositivo
  const handleSelectDevice = (device: DeviceOption) => {
    setCurrentTool('device');
    setSelectedDeviceType(device.type);
  };

  // Excluir elemento selecionado
  const handleDelete = () => {
    if (selectedDeviceId) removeDevice(selectedDeviceId);
    if (selectedWallId) removeWall(selectedWallId);
  };

  // Encaixar view (reset zoom/pan)
  const handleFitView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;
  const hasSelection = !!(selectedDeviceId || selectedWallId);

  return (
    <div className="top-toolbar">
      {/* ── LOGO ──────────────────────────────────────────── */}
      <div className="tb-logo">
        <span className="tb-logo-text">Eletric<strong>SF</strong></span>
        <span className="tb-logo-badge">CAD/BIM</span>
      </div>

      <div className="tb-separator" />

      {/* ── ARQUIVO ───────────────────────────────────────── */}
      <div className="tb-group">
        <span className="tb-group-label">Arquivo</span>
        <div className="tb-group-buttons">
          <button className="tb-btn" title="Novo Projeto" onClick={resetWorkspace}>
            <span className="tb-icon">📄</span>
            <span className="tb-label">Novo</span>
          </button>
          <button className="tb-btn" title="Importar Planta Baixa" onClick={onImportPlant}>
            <span className="tb-icon">📥</span>
            <span className="tb-label">Importar</span>
          </button>
          <button className="tb-btn" title="Salvar Projeto (Ctrl+S)" onClick={async () => {
            const state = useCadStore.getState();
            const jsonData = JSON.stringify({
              projectName: state.projectName,
              walls: state.walls,
              devices: state.devices,
              circuits: state.circuits,
              conduits: state.conduits,
              guideLines: state.guideLines || [],
              texts: state.texts || [],
              dimensions: state.dimensions || [],
              ppm: state.ppm,
            }, null, 2);

            if ('showSaveFilePicker' in window) {
              try {
                const safeName = state.projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const handle = await (window as any).showSaveFilePicker({
                  suggestedName: `${safeName || 'projeto'}_cad.json`,
                  types: [{ description: 'Projeto Elétrico (JSON)', accept: { 'application/json': ['.json'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonData);
                await writable.close();
                return;
              } catch (err: any) {
                if (err?.name === 'AbortError') return;
              }
            }
            // Fallback
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'projeto-eletric-sf.json'; a.click();
            URL.revokeObjectURL(url);
          }}>
            <span className="tb-icon">💾</span>
            <span className="tb-label">Salvar</span>
          </button>
          <button className="tb-btn" title="Exportar PDF" onClick={onOpenDimensioning}>
            <span className="tb-icon">📋</span>
            <span className="tb-label">Exportar</span>
          </button>
        </div>
      </div>

      <div className="tb-separator" />

      {/* ── EDIÇÃO ────────────────────────────────────────── */}
      <div className="tb-group">
        <span className="tb-group-label">Edição</span>
        <div className="tb-group-buttons">
          <button
            className="tb-btn"
            title="Desfazer (Ctrl+Z)"
            onClick={undo}
            disabled={!canUndo}
          >
            <span className="tb-icon">↩</span>
            <span className="tb-label">Desfazer</span>
          </button>
          <button
            className="tb-btn"
            title="Refazer (Ctrl+Y)"
            onClick={redo}
            disabled={!canRedo}
          >
            <span className="tb-icon">↪</span>
            <span className="tb-label">Refazer</span>
          </button>
          <button
            className={`tb-btn tb-btn-danger`}
            title="Excluir Selecionado (Del)"
            onClick={handleDelete}
            disabled={!hasSelection}
          >
            <span className="tb-icon">🗑</span>
            <span className="tb-label">Excluir</span>
          </button>
        </div>
      </div>

      <div className="tb-separator" />

      {/* ── FERRAMENTAS CAD ───────────────────────────────── */}
      <div className="tb-group">
        <span className="tb-group-label">Ferramentas</span>
        <div className="tb-group-buttons">
          <button
            className={`tb-btn ${currentTool === 'select' ? 'tb-btn-active' : ''}`}
            title="Seleção (S)"
            onClick={() => setCurrentTool('select')}
          >
            <span className="tb-icon">↖</span>
            <span className="tb-label">Selecionar</span>
          </button>
          <button
            className={`tb-btn ${currentTool === 'wall' ? 'tb-btn-active' : ''}`}
            title="Desenhar Parede (W)"
            onClick={() => setCurrentTool('wall')}
          >
            <span className="tb-icon">▬</span>
            <span className="tb-label">Parede</span>
          </button>
          <button
            className={`tb-btn ${currentTool === 'conduit' ? 'tb-btn-active' : ''}`}
            title="Traçar Eletroduto (E)"
            onClick={() => setCurrentTool('conduit')}
          >
            <span className="tb-icon">〰</span>
            <span className="tb-label">Eletroduto</span>
          </button>
        </div>
      </div>

      <div className="tb-separator" />

      {/* ── INSERIR ───────────────────────────────────────── */}
      <div className="tb-group">
        <span className="tb-group-label">Inserir Componente</span>
        <div className="tb-group-buttons">
          {DEVICE_GROUPS.map(group => (
            <DropdownMenu
              key={group.label}
              group={group}
              onSelect={handleSelectDevice}
            />
          ))}
        </div>
      </div>

      <div className="tb-separator" />

      {/* ── VISUALIZAÇÃO ──────────────────────────────────── */}
      <div className="tb-group">
        <span className="tb-group-label">Visualização</span>
        <div className="tb-group-buttons">
          <button
            className={`tb-btn ${showGrid ? 'tb-btn-active' : ''}`}
            title="Ativar/Desativar Grid"
            onClick={toggleGrid}
          >
            <span className="tb-icon">⊞</span>
            <span className="tb-label">Grid</span>
          </button>
          <button className="tb-btn" title="Zoom +" onClick={() => setZoom(Math.min(zoom * 1.25, 10))}>
            <span className="tb-icon">🔍+</span>
          </button>
          <button className="tb-btn" title="Zoom -" onClick={() => setZoom(Math.max(zoom / 1.25, 0.1))}>
            <span className="tb-icon">🔍-</span>
          </button>
          <button className="tb-btn" title="Encaixar na Tela" onClick={handleFitView}>
            <span className="tb-icon">⊡</span>
            <span className="tb-label">Encaixar</span>
          </button>
        </div>
      </div>

      <div className="tb-separator" />

      {/* ── ANÁLISE ───────────────────────────────────────── */}
      <div className="tb-group">
        <span className="tb-group-label">Análise</span>
        <div className="tb-group-buttons">
          <button className="tb-btn tb-btn-accent" title="Dimensionamento e Orçamento" onClick={onOpenDimensioning}>
            <span className="tb-icon">📊</span>
            <span className="tb-label">Dimensionamento</span>
          </button>
        </div>
      </div>

      {/* ── STATUS BAR direita ─────────────────────────────── */}
      <div className="tb-status">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>{currentTool === 'select' ? 'Seleção' : currentTool === 'wall' ? 'Parede' : currentTool === 'conduit' ? 'Eletroduto' : 'Dispositivo'}</span>
      </div>
    </div>
  );
};
