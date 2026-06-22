import { useState, useEffect, useRef } from 'react';
import { Cad2DView } from './views/Cad2DView';
import { UnifilarView } from './views/UnifilarView';
import { Render3DView } from './views/Render3DView';
import { SheetsView } from './views/SheetsView';
import { LoginView } from './views/LoginView';
import { useCadStore } from './store/useCadStore';
import { InstructorPanel } from './components/Render3D/UI/Panels/InstructorPanel';
import { BimLibraryPanel } from './components/Render3D/UI/Panels/BimLibraryPanel';
import { MaterialsPanel } from './components/Render3D/UI/Panels/MaterialsPanel';
import { EntityInfoPanel } from './components/Render3D/UI/Panels/EntityInfoPanel';
import { ScenesPanel } from './components/Render3D/UI/Panels/ScenesPanel';
import { CadIcon } from './components/CadIcons';
// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type ActiveTab = 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
type MenuId = 'arquivo' | 'editar' | 'visualizar' | 'camera' | 'desenhar' | 'ferramentas' | 'janela' | 'ajuda' | null;

// ─────────────────────────────────────────────────────────────────────────────
// DEFINIÇÃO DAS FERRAMENTAS DA BARRA LATERAL ESQUERDA
// ─────────────────────────────────────────────────────────────────────────────
const SIDEBAR_TOOLS = [
  { id: 'select',    icon: 'select',  tooltip: 'Selecionar (Space)',  group: 'select' },
  { id: 'eraser',   icon: 'eraser',  tooltip: 'Borracha (E)',        group: 'select' },
  { sep: true },
  { id: 'line',     icon: 'line',   tooltip: 'Linha (L)',            group: 'draw' },
  { id: 'arc',      icon: 'arc',    tooltip: 'Arco (A)',             group: 'draw' },
  { id: 'rectangle',icon: 'rectangle',tooltip: 'Retângulo (R)',        group: 'draw' },
  { id: 'circle',   icon: 'circle', tooltip: 'Círculo (C)',          group: 'draw' },
  { id: 'polygon',  icon: 'polygon',tooltip: 'Polígono',             group: 'draw' },
  { sep: true },
  { id: 'push_pull',icon: 'pushpull',tooltip: 'Push/Pull (P)',        group: 'modify' },
  { id: 'offset',   icon: 'offset', tooltip: 'Offset (F)',           group: 'modify' },
  { sep: true },
  { id: 'move',     icon: 'move',   tooltip: 'Mover (M)',            group: 'transform' },
  { id: 'rotate',   icon: 'rotate', tooltip: 'Rotacionar (Q)',       group: 'transform' },
  { id: 'scale',    icon: 'scale',  tooltip: 'Escalar (S)',          group: 'transform' },
  { sep: true },
  { id: 'measure',  icon: 'measure',tooltip: 'Fita Métrica (T)',     group: 'measure' },
  { id: 'dimension',icon: 'dimension',tooltip: 'Cota',                  group: 'measure' },
  { id: 'text',     icon: 'text',   tooltip: 'Texto',                group: 'measure' },
  { sep: true },
  { id: 'orbit',    icon: 'orbit',  tooltip: 'Orbitar (O)',          group: 'navigate' },
  { id: 'pan',      icon: 'pan',    tooltip: 'Panorâmico (H)',       group: 'navigate' },
  { id: 'zoom',     icon: 'zoom',   tooltip: 'Zoom (Z)',             group: 'navigate' },
  { id: 'zoom_ext', icon: 'zoom-extents',tooltip:'Zoom Extents (Shift+Z)', group: 'navigate' },
];

const TOOLBAR_GROUPS = [
  {
    label: 'Arquivo',
    tools: [
      { id: 'new',    icon: 'new', tooltip: 'Novo Projeto (Ctrl+N)' },
      { id: 'open',   icon: 'open', tooltip: 'Abrir (Ctrl+O)' },
      { id: 'save',   icon: 'save', tooltip: 'Salvar (Ctrl+S)' },
    ],
  },
  {
    label: 'Histórico',
    tools: [
      { id: 'undo',   icon: 'undo', tooltip: 'Desfazer (Ctrl+Z)' },
      { id: 'redo',   icon: 'redo', tooltip: 'Refazer (Ctrl+Y)' },
    ],
  },
  {
    label: 'Estilo',
    tools: [
      { id: 'solid',      icon: 'solid',   tooltip: 'Sólido' },
      { id: 'wireframe',  icon: 'wireframe', tooltip: 'Arame' },
      { id: 'xray',       icon: 'xray',    tooltip: 'Raio-X' },
      { id: 'monochrome', icon: 'monochrome', tooltip: 'Monocromático' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEFINIÇÃO DOS MENUS DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
const MENUS = {
  arquivo: [
    { label: 'Novo', shortcut: 'Ctrl+N', cmd: 'new' },
    { label: 'Abrir...', shortcut: 'Ctrl+O', cmd: 'open' },
    { sep: true },
    { label: 'Salvar', shortcut: 'Ctrl+S', cmd: 'save' },
    { label: 'Salvar Como...', shortcut: 'Ctrl+Shift+S', cmd: 'save_as' },
    { sep: true },
    { label: 'Salvar na Nuvem', cmd: 'save_cloud' },
    { label: 'Meus Projetos', cmd: 'my_projects' },
    { sep: true },
    { label: 'Exportar PDF', cmd: 'export_pdf' },
    { label: 'Exportar DXF', cmd: 'export_dxf' },
    { sep: true },
    { label: 'Sair', cmd: 'logout' },
  ],
  editar: [
    { label: 'Desfazer', shortcut: 'Ctrl+Z', cmd: 'undo' },
    { label: 'Refazer', shortcut: 'Ctrl+Y', cmd: 'redo' },
    { sep: true },
    { label: 'Cortar', shortcut: 'Ctrl+X', cmd: 'cut' },
    { label: 'Copiar', shortcut: 'Ctrl+C', cmd: 'copy' },
    { label: 'Colar', shortcut: 'Ctrl+V', cmd: 'paste' },
    { label: 'Deletar', shortcut: 'Delete', cmd: 'delete' },
    { sep: true },
    { label: 'Selecionar Tudo', shortcut: 'Ctrl+A', cmd: 'select_all' },
    { label: 'Inverter Seleção', cmd: 'invert_selection' },
  ],
  visualizar: [
    { label: 'Sólido', cmd: 'mode_solid' },
    { label: 'Arame', cmd: 'mode_wireframe' },
    { label: 'Raio-X', cmd: 'mode_xray' },
    { label: 'Com Textura', cmd: 'mode_textured' },
    { sep: true },
    { label: 'Grade', shortcut: 'G', cmd: 'toggle_grid' },
    { label: 'Eixos de Origem', cmd: 'toggle_axes' },
    { label: 'Guias', cmd: 'toggle_guides' },
    { sep: true },
    { label: 'Vista Superior', cmd: 'view_top' },
    { label: 'Vista Frontal', cmd: 'view_front' },
    { label: 'Vista Lateral', cmd: 'view_side' },
    { label: 'Perspectiva', cmd: 'view_perspective' },
    { label: 'Isométrica', cmd: 'view_iso' },
  ],
  camera: [
    { label: 'Orbitar', shortcut: 'O', cmd: 'cam_orbit' },
    { label: 'Panorâmico', shortcut: 'H', cmd: 'cam_pan' },
    { label: 'Zoom', shortcut: 'Z', cmd: 'cam_zoom' },
    { sep: true },
    { label: 'Enquadrar Seleção', shortcut: 'Shift+Z', cmd: 'cam_frame' },
    { label: 'Zoom a Extensão', cmd: 'cam_extents' },
    { sep: true },
    { label: 'Perspectiva', cmd: 'cam_perspective' },
    { label: 'Isométrica', cmd: 'cam_isometric' },
  ],
  desenhar: [
    { label: 'Linha', shortcut: 'L', cmd: 'tool_line' },
    { label: 'Retângulo', shortcut: 'R', cmd: 'tool_rectangle' },
    { label: 'Círculo', shortcut: 'C', cmd: 'tool_circle' },
    { label: 'Polígono', cmd: 'tool_polygon' },
    { sep: true },
    { label: 'Parede', cmd: 'tool_wall' },
    { label: 'Área', cmd: 'tool_area' },
    { sep: true },
    { label: 'Texto', cmd: 'tool_text' },
    { label: 'Cota', cmd: 'tool_dimension' },
    { label: 'Linha de Guia', cmd: 'tool_guide' },
  ],
  ferramentas: [
    { label: 'Selecionar', shortcut: 'Space', cmd: 'tool_select' },
    { label: 'Mover', shortcut: 'M', cmd: 'tool_move' },
    { label: 'Rotacionar', shortcut: 'Q', cmd: 'tool_rotate' },
    { label: 'Escalar', shortcut: 'S', cmd: 'tool_scale' },
    { label: 'Borracha', shortcut: 'E', cmd: 'tool_eraser' },
    { sep: true },
    { label: 'Push/Pull', shortcut: 'P', cmd: 'tool_pushpull' },
    { label: 'Offset', shortcut: 'F', cmd: 'tool_offset' },
    { sep: true },
    { label: 'Fita Métrica', shortcut: 'T', cmd: 'tool_measure' },
    { label: 'Transferidor', cmd: 'tool_protractor' },
    { sep: true },
    { label: 'Dimensionar NBR 5410', cmd: 'calc_nbr' },
    { label: 'Auto-fiação', cmd: 'auto_wire' },
  ],
  janela: [
    { label: 'Informações da Entidade', cmd: 'tray_entity' },
    { label: 'Materiais', cmd: 'tray_materials' },
    { label: 'Biblioteca BIM', cmd: 'tray_bim' },
    { label: 'Cenas', cmd: 'tray_scenes' },
    { label: 'Instructor', cmd: 'tray_instructor' },
    { sep: true },
    { label: 'Propriedades', cmd: 'tray_properties' },
    { sep: true },
    { label: 'Meus Projetos', cmd: 'my_projects' },
  ],
  ajuda: [
    { label: 'Atalhos de Teclado', cmd: 'help_shortcuts' },
    { label: 'Manual do SketchUp', cmd: 'help_manual' },
    { sep: true },
    { label: 'Sobre o ElectricSF', cmd: 'help_about' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TRAY PANEL ACCORDION
// ─────────────────────────────────────────────────────────────────────────────
function TrayPanel({ id, title, children, defaultOpen = true }: {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="su-tray-panel">
      <div
        className={`su-tray-panel-header ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        id={`tray-panel-${id}`}
      >
        <span>{title}</span>
        <span className="su-tray-arrow">▶</span>
      </div>
      {open && (
        <div className="su-tray-panel-body">
          {children}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cad2d');
  const [activeMenu, setActiveMenu] = useState<MenuId>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    isAuthenticated, authLoading, loadUserSession,
    activeToolId, activeToolCursor, viewportState,
    setActiveToolId, setViewportTab,
    scenesList, activeSceneId, addScene, activateScene,
    dispatchCommand, initShortcutManager,
    setMeasurementsValue,
    undo, redo,
    toggleGrid, setRenderMode,
    logout,
    setCurrentTool,
  } = useCadStore();

  const { measurementsValue = '', statusText = 'Pronto' } = viewportState ?? {};

  // ── Inicialização ──
  useEffect(() => {
    loadUserSession();
  }, []);

  // ── Inicializar ShortcutManager ──
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = initShortcutManager();
    return cleanup;
  }, [isAuthenticated]);

  // ── Fechar menu ao clicar fora ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Sincronizar tab ──
  useEffect(() => {
    setViewportTab(activeTab);
  }, [activeTab]);

  // ── Loading ──
  if (authLoading && !isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f0f0', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #c0c0c0', borderTopColor: '#0070cc', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <span style={{ fontSize: 12, color: '#555' }}>Carregando sessão...</span>
        </div>
      </div>
    );
  }

  // ── Login ──
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // ── Despachar comando do menu ──
  const handleMenuCommand = (cmd: string) => {
    setActiveMenu(null);
    switch (cmd) {
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'copy': dispatchCommand('copy'); break;
      case 'paste': dispatchCommand('paste'); break;
      case 'delete': dispatchCommand('delete'); break;
      case 'toggle_grid': toggleGrid(); break;
      case 'logout': logout(); break;
      case 'mode_solid': setRenderMode('SOLID' as any); break;
      case 'mode_wireframe': setRenderMode('WIREFRAME' as any); break;
      case 'mode_xray': setRenderMode('XRAY' as any); break;
      case 'mode_textured': setRenderMode('TEXTURED' as any); break;
      case 'tool_select': setActiveToolId('select'); break;
      case 'tool_line': setActiveToolId('line'); break;
      case 'tool_wall': setActiveToolId('wall'); setCurrentTool('wall'); break;
      case 'tool_rectangle': setActiveToolId('rectangle'); break;
      case 'tool_circle': setActiveToolId('circle'); break;
      case 'tool_eraser': setActiveToolId('eraser'); break;
      case 'tool_move': setActiveToolId('move'); break;
      case 'tool_rotate': setActiveToolId('rotate'); break;
      case 'tool_scale': setActiveToolId('scale'); break;
      case 'tool_pushpull': setActiveToolId('push_pull'); break;
      case 'tool_offset': setActiveToolId('offset'); break;
      case 'tool_measure': setActiveToolId('measure'); break;
      case 'tool_text': setActiveToolId('text'); setCurrentTool('text'); break;
      case 'tool_dimension': setActiveToolId('dimension'); setCurrentTool('dimension'); break;
      case 'tool_guide': setCurrentTool('guide_line'); break;
      case 'auto_wire': setCurrentTool('auto_wire'); break;
      default:
        console.log('[Menu Command]', cmd);
    }
  };

  // ── Ação dos botões da toolbar ──
  const handleToolbarAction = (toolId: string) => {
    switch (toolId) {
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'solid': setRenderMode('SOLID' as any); break;
      case 'wireframe': setRenderMode('WIREFRAME' as any); break;
      case 'xray': setRenderMode('XRAY' as any); break;
      case 'textured': setRenderMode('TEXTURED' as any); break;
      case 'orbit': case 'pan': case 'zoom':
        setActiveToolId(toolId);
        break;
      default:
        console.log('[Toolbar]', toolId);
    }
  };

  // ── Ação das ferramentas da sidebar ──
  const handleSidebarTool = (toolId: string) => {
    setActiveToolId(toolId);
    const legacyMap: Record<string, string> = {
      select: 'select', eraser: 'select',
      wall: 'wall', line: 'wall',
      device: 'device', conduit: 'conduit',
      area: 'area', dimension: 'dimension',
      text: 'text',
    };
    if (legacyMap[toolId]) {
      setCurrentTool(legacyMap[toolId] as any);
    }
  };

  const viewTabs: Array<{ key: ActiveTab; label: string }> = [
    { key: 'cad2d',    label: '📐 CAD 2D' },
    { key: 'render3d', label: '🧊 3D' },
    { key: 'unifilar', label: '⚡ Unifilar' },
    { key: 'sheets',   label: '📋 Pranchas' },
  ];

  return (
    <div className={`su-shell ${activeToolCursor}`}>

      {/* ═══════════════════════════════════════════════
          BARRA DE MENU SUPERIOR
      ═══════════════════════════════════════════════ */}
      <div className="su-menu-bar" ref={menuRef}>
        {/* Logo */}
        <span style={{ fontWeight: 700, fontSize: 12, color: '#0070cc', marginRight: 8, paddingRight: 8, borderRight: '1px solid var(--su-divider)' }}>
          ⚡ ElectricSF
        </span>

        {(Object.keys(MENUS) as MenuId[]).map(menuId => (
          <div
            key={menuId as string}
            className={`su-menu-item ${activeMenu === menuId ? 'active' : ''}`}
            onClick={() => setActiveMenu(activeMenu === menuId ? null : menuId)}
            id={`menu-${menuId}`}
          >
            {menuId === 'arquivo' ? 'Arquivo' :
             menuId === 'editar' ? 'Editar' :
             menuId === 'visualizar' ? 'Visualizar' :
             menuId === 'camera' ? 'Câmera' :
             menuId === 'desenhar' ? 'Desenhar' :
             menuId === 'ferramentas' ? 'Ferramentas' :
             menuId === 'janela' ? 'Janela' : 'Ajuda'}

            {activeMenu === menuId && (
              <div className="su-dropdown" onClick={e => e.stopPropagation()}>
                {(MENUS[menuId as keyof typeof MENUS] as any[]).map((item, i) =>
                  item.sep ? (
                    <div key={`sep-${i}`} className="su-dropdown-separator" />
                  ) : (
                    <div
                      key={item.cmd}
                      className="su-dropdown-item"
                      onClick={() => handleMenuCommand(item.cmd)}
                      id={`menu-item-${item.cmd}`}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="su-dropdown-shortcut">{item.shortcut}</span>}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          BARRA PRINCIPAL DE FERRAMENTAS
      ═══════════════════════════════════════════════ */}
      <div className="su-toolbar">
        {TOOLBAR_GROUPS.map((group) => (
          <div key={group.label} className="su-toolbar-group">
            {group.tools.map(tool => (
              <button
                key={tool.id}
                className="su-tool-btn"
                data-tooltip={tool.tooltip}
                onClick={() => handleToolbarAction(tool.id)}
                id={`toolbar-${tool.id}`}
                title={tool.tooltip}
              >
                <CadIcon name={tool.icon} />
              </button>
            ))}
          </div>
        ))}

        {/* Separador + Abas de módulo na toolbar */}
        <div className="su-sep" style={{ margin: '0 8px' }} />
        {viewTabs.map(tab => (
          <button
            key={tab.key}
            className={`su-tool-btn ${activeTab === tab.key ? 'active' : ''}`}
            style={{ width: 'auto', padding: '0 10px', fontSize: 11 }}
            onClick={() => setActiveTab(tab.key)}
            id={`tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          BARRA LATERAL ESQUERDA
      ═══════════════════════════════════════════════ */}
      <div className="su-sidebar">
        {SIDEBAR_TOOLS.map((tool, i) =>
          'sep' in tool ? (
            <div key={`sep-${i}`} className="su-sidebar-separator" />
          ) : (
            <button
              key={tool.id}
              className={`su-tool-btn ${activeToolId === tool.id ? 'active' : ''}`}
              data-tooltip={tool.tooltip}
              onClick={() => handleSidebarTool(tool.id)}
              id={`sidebar-${tool.id}`}
              title={tool.tooltip}
            >
              <CadIcon name={tool.icon as string} />
            </button>
          )
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          VIEWPORT CENTRAL
      ═══════════════════════════════════════════════ */}
      <div className="su-viewport-area">
        {/* Barra de Cenas */}
        <div className="su-scenes-bar">
          {scenesList.map(scene => (
            <div
              key={scene.id}
              className={`su-scene-tab ${activeSceneId === scene.id ? 'active' : ''}`}
              onClick={() => activateScene(scene.id)}
              id={`scene-tab-${scene.id}`}
            >
              {scene.name}
            </div>
          ))}
          <div
            className="su-scene-tab-add"
            onClick={() => addScene(`Cena ${scenesList.length + 1}`)}
            title="Adicionar cena"
          >
            +
          </div>
        </div>

        {/* Canvas */}
        <div className="su-canvas">
          {activeTab === 'cad2d' && (
            <Cad2DView activeTab={activeTab} onTabChange={setActiveTab} />
          )}
          {activeTab === 'render3d' && (
            <Render3DView activeTab={activeTab} onTabChange={setActiveTab} />
          )}
          {activeTab === 'unifilar' && (
            <UnifilarView activeTab={activeTab} onTabChange={setActiveTab} />
          )}
          {activeTab === 'sheets' && (
            <SheetsView activeTab={activeTab} onTabChange={setActiveTab} />
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          DEFAULT TRAY DIREITO
      ═══════════════════════════════════════════════ */}
      <div className="su-tray">
        <div className="su-tray-title">Default Tray</div>
        <div className="su-tray-panels-scroll">
          <TrayPanel id="entity" title="Informações da Entidade" defaultOpen>
            <EntityInfoPanel />
          </TrayPanel>
          <TrayPanel id="materials" title="Materiais" defaultOpen={false}>
            <MaterialsPanel />
          </TrayPanel>
          <TrayPanel id="bim" title="Biblioteca BIM" defaultOpen={false}>
            <BimLibraryPanel />
          </TrayPanel>
          <TrayPanel id="scenes" title="Cenas" defaultOpen={false}>
            <ScenesPanel />
          </TrayPanel>
          <TrayPanel id="instructor" title="Instructor" defaultOpen>
            <InstructorPanel />
          </TrayPanel>
          <TrayPanel id="outliner" title="Estrutura (Outliner)" defaultOpen={false}>
            <OutlinerPanel />
          </TrayPanel>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          BARRA DE STATUS E MEASUREMENTS BOX
      ═══════════════════════════════════════════════ */}
      <div className="su-status-bar">
        <div className="su-status-text">
          {statusText || 'Pronto'}
        </div>
        <div className="su-measurements-box">
          <span className="su-measurements-label">Medidas:</span>
          <input
            id="measurements-box"
            type="text"
            className="su-measurements-input"
            value={measurementsValue}
            placeholder="0,00"
            onChange={e => setMeasurementsValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                dispatchCommand('apply_measurement', measurementsValue);
              }
            }}
          />
        </div>
      </div>

      {/* Keyframe de spin para loading */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTLINER PANEL (inline simples)
// ─────────────────────────────────────────────────────────────────────────────
function OutlinerPanel() {
  const { walls, devices, areas, conduits, texts } = useCadStore();
  const groups = [
    { label: 'Paredes', icon: '▊', items: walls, color: '#94a3b8' },
    { label: 'Dispositivos', icon: '⚡', items: devices, color: '#fbbf24' },
    { label: 'Áreas', icon: '⬛', items: areas, color: '#86efac' },
    { label: 'Eletrodutos', icon: '〰', items: conduits, color: '#f87171' },
    { label: 'Textos', icon: 'T', items: texts, color: '#a78bfa' },
  ];

  return (
    <div>
      {groups.map(group => (
        <div key={group.label}>
          <div className="su-tag-row" style={{ marginBottom: 2 }}>
            <div className="su-tag-color" style={{ backgroundColor: group.color }} />
            <span style={{ fontWeight: 700, fontSize: 11 }}>{group.icon} {group.label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--su-text-muted)', fontSize: 10 }}>{group.items.length}</span>
          </div>
          {(group.items as any[]).slice(0, 5).map((item: any) => (
            <div key={item.id} className="su-outliner-item su-outliner-indent">
              <span className="su-outliner-icon">{group.icon}</span>
              <span>{item.name ?? item.type ?? item.id.slice(0, 8)}</span>
            </div>
          ))}
          {group.items.length > 5 && (
            <div className="su-outliner-indent" style={{ color: 'var(--su-text-muted)', fontSize: 10, paddingLeft: 24 }}>
              + {group.items.length - 5} mais...
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
