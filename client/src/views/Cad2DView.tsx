import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CadCanvas } from '../components/Cad2D/CadCanvas';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { Header } from '../components/Header';
import { Toolbar } from '../components/Toolbar';
import { useCadStore } from '../store/useCadStore';
import { dimensionateCircuit } from '../utils/nbr5410';
import type { ToolType, DeviceType } from '../types';

interface Cad2DViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar') => void;
}

// ─── Helpers para File System Access API ───────────────────────
const getProjectJsonData = () => {
  const state = useCadStore.getState();
  return JSON.stringify({
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
};

const FILE_PICKER_OPTIONS = {
  suggestedName: 'projeto_eletric_sf.json',
  types: [{
    description: 'Projeto Elétrico (JSON)',
    accept: { 'application/json': ['.json'] as `.${string}`[] },
  }],
};

export const Cad2DView: React.FC<Cad2DViewProps> = ({ activeTab, onTabChange }) => {
  const {
    bgImageSrc, bgImageLock, isCalibrating,
    devices, circuits,
    projectName, legend, materialsList,
    currentTool, selectedDeviceType,
    setBgImageSrc, setBgImageLock, setIsCalibrating,
    setProjectName,
    setCurrentTool, setSelectedDeviceType: setStoreDeviceType,
    addCircuit, removeCircuit, resetWorkspace,
    undo, redo,
    splitCircuitsLight, splitCircuitsTUG, splitCircuitsTUE, autoWire,
  } = useCadStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // File System Access API — guarda o file handle para sobrescrita silenciosa
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const [_saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [isDimensioningOpen, setIsDimensioningOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<'dimensioning' | 'budget'>('dimensioning');

  const [newCircuitNumber, setNewCircuitNumber] = useState(1);
  const [newCircuitName, setNewCircuitName] = useState('');
  const [newCircuitType, setNewCircuitType] = useState<'iluminacao' | 'tug' | 'tue'>('tug');
  const [newCircuitVoltage, setNewCircuitVoltage] = useState<127 | 220>(127);
  const [newCircuitGrouped, setNewCircuitGrouped] = useState(1);

  useEffect(() => {
    if (circuits.length > 0) {
      setNewCircuitNumber(Math.max(...circuits.map(c => c.number)) + 1);
    } else {
      setNewCircuitNumber(1);
    }
  }, [circuits]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setDimensions({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) setBgImageSrc(event.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) return;
        const projectData = JSON.parse(event.target.result as string);
        
        const {
          projectName, walls, devices, circuits, conduits, guideLines, texts, dimensions, ppm
        } = projectData;

        useCadStore.setState({
          projectName: projectName || 'Projeto sem título',
          walls: walls || [],
          devices: devices || [],
          circuits: circuits || [],
          conduits: conduits || [],
          guideLines: guideLines || [],
          texts: texts || [],
          dimensions: dimensions || [],
          ppm: ppm || 100,
        });

        useCadStore.getState().recomputeDerivedState();
        // Limpa o fileHandle anterior ao importar um novo projeto
        fileHandleRef.current = null;
        alert('Projeto importado com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao carregar arquivo de projeto JSON. Verifique a estrutura do arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateCircuit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircuitName.trim()) return;
    addCircuit({
      number: newCircuitNumber,
      name: newCircuitName,
      type: newCircuitType,
      voltage: newCircuitVoltage,
      groupedCircuits: newCircuitGrouped,
    });
    setNewCircuitName('');
    setNewCircuitGrouped(1);
  };

  const handleToolChange = (tool: ToolType) => {
    setCurrentTool(tool);
  };

  const handleDeviceTypeChange = (type: DeviceType | null) => {
    if (type) {
      setCurrentTool('device');
      setStoreDeviceType(type);
    } else {
      setStoreDeviceType(null);
    }
  };

  const handleAutomationAction = (action: string) => {
    if (action === 'auto_wire') {
      autoWire();
    } else if (action === 'split_circuits_light') {
      splitCircuitsLight();
    } else if (action === 'split_circuits_tug') {
      splitCircuitsTUG();
    } else if (action === 'split_circuits_tue') {
      splitCircuitsTUE();
    } else if (action === 'split_circuits_all') {
      splitCircuitsLight();
      splitCircuitsTUG();
      splitCircuitsTUE();
    } else if (action === 'dimensioning') {
      setModalActiveTab('dimensioning');
      setIsDimensioningOpen(true);
    } else if (action === 'budget') {
      setModalActiveTab('budget');
      setIsDimensioningOpen(true);
    } else if (action === 'toggle_paperspace') {
      const active = useCadStore.getState().paperSpaceActive;
      useCadStore.getState().setPaperSpaceActive(!active);
    }
  };

  // ─── File System Access API — Salvar Nativo ──────────────────
  const handleSave = useCallback(async () => {
    const jsonData = getProjectJsonData();

    // Tenta usar a File System Access API (Chrome, Edge, Opera)
    if ('showSaveFilePicker' in window) {
      try {
        // Se já temos um fileHandle, sobrescreve silenciosamente
        if (fileHandleRef.current) {
          setSaveStatus('saving');
          const writable = await fileHandleRef.current.createWritable();
          await writable.write(jsonData);
          await writable.close();
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
          return;
        }

        // Primeiro salvamento — abre o file picker
        const safeName = useCadStore.getState().projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const handle = await (window as any).showSaveFilePicker({
          ...FILE_PICKER_OPTIONS,
          suggestedName: `${safeName || 'projeto'}_cad.json`,
        });
        fileHandleRef.current = handle;
        setSaveStatus('saving');
        const writable = await handle.createWritable();
        await writable.write(jsonData);
        await writable.close();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      } catch (err: any) {
        // Usuário cancelou o file picker (AbortError) — não faz nada
        if (err?.name === 'AbortError') return;
        console.error('File System Access API error, falling back to download:', err);
      }
    }

    // Fallback: download tradicional para navegadores sem suporte (Firefox, Safari)
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = useCadStore.getState().projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.href = url;
    a.download = `${safeName || 'projeto'}_cad.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  // ─── Atalho Ctrl+S para salvar ──────────────────────────────
  useEffect(() => {
    const handleCtrlS = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleCtrlS);
    return () => window.removeEventListener('keydown', handleCtrlS);
  }, [handleSave]);

  const handleToggleLegend = () => {
    alert(`Legenda — ${legend.length} tipos de símbolos no canvas.`);
  };

  const handleTrash = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o projeto?')) {
      resetWorkspace();
    }
  };

  // Estado local para itens manuais adicionados pelo usuário e overrides de preço/nome/quantidade
  const [manualBudgetItems, setManualBudgetItems] = useState<Array<{ name: string; qty: string; unit: string; price: number }>>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>({});
  const [nameOverrides, setNameOverrides] = useState<Record<number, string>>({});
  const [qtyOverrides, setQtyOverrides] = useState<Record<number, string>>({});

  const autoBudgetItems = (materialsList || []).map(item => ({
    name: item.name,
    qty: item.qty.toString(),
    unit: item.unit,
    price: item.price ?? 12.00,
    total: item.qty * (item.price ?? 12.00)
  }));

  // Combina itens automáticos (com overrides) + itens manuais
  const budgetItems = [
    ...autoBudgetItems.map((item, idx) => ({
      ...item,
      name: nameOverrides[idx] !== undefined ? nameOverrides[idx] : item.name,
      qty: qtyOverrides[idx] !== undefined ? qtyOverrides[idx] : item.qty,
      price: priceOverrides[idx] !== undefined ? priceOverrides[idx] : item.price,
      total: parseFloat(qtyOverrides[idx] !== undefined ? qtyOverrides[idx] : item.qty) * (priceOverrides[idx] !== undefined ? priceOverrides[idx] : item.price),
      isAuto: true,
      originalIdx: idx,
    })),
    ...manualBudgetItems.map((item, idx) => ({
      ...item,
      total: parseFloat(item.qty) * item.price,
      isAuto: false,
      originalIdx: autoBudgetItems.length + idx,
    })),
  ];

  const grandTotal = budgetItems.reduce((sum, item) => sum + item.total, 0);

  const handleExportPDF = () => {
    const pw = window.open('', '_blank');
    if (!pw) { alert('Habilite pop-ups para gerar o PDF.'); return; }

    let drawingPage = '';
    if ((window as any).cadStage) {
      try {
        const dataUrl = (window as any).cadStage.toDataURL({ pixelRatio: 2 });
        drawingPage = `
        <div class="page" style="page-break-after:always; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; padding:0; background:#ffffff;">
          <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; box-sizing:border-box; padding:20px;">
            <img src="${dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
          </div>
        </div>`;
      } catch (err) {
        console.error('Erro ao capturar imagem do canvas:', err);
      }
    }

    const html = `<!DOCTYPE html><html><head><title>Projeto Elétrico – Eletric SF</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body{font-family:'Inter',sans-serif;color:#0f172a;margin:0;padding:0;line-height:1.4}
      .page{padding:30px;page-break-after:always;box-sizing:border-box;min-height:100vh;display:flex;flex-direction:column}
      .page:last-child{page-break-after:avoid}
      h1{font-size:1.5rem;font-weight:700;color:#2563eb;margin:0}
      h3{font-size:1.1rem;border-bottom:2px solid #2563eb;padding-bottom:6px;color:#1e3a8a;margin-top:0}
      table{width:100%;border-collapse:collapse;font-size:0.75rem;margin-top:10px}
      th{background:#f1f5f9;color:#475569;font-weight:600;text-transform:uppercase;font-size:0.65rem;padding:8px 10px;border:1px solid #cbd5e1}
      td{padding:8px 10px;border:1px solid #cbd5e1}
      .tr{text-align:right}.mono{font-family:monospace;font-weight:600}
      .sig{margin-top:auto;display:flex;justify-content:space-between;padding-top:40px}
      .sigline{width:45%;border-top:1px solid #64748b;text-align:center;padding-top:8px;font-size:0.75rem;color:#475569}
    </style></head><body>
    ${drawingPage}
    <div class="page">
      <h1>${projectName}</h1><p style="color:#475569;font-size:0.75rem">CAD/BIM Residencial Normativo — Data: ${new Date().toLocaleDateString('pt-BR')}</p>
      <h3>Memorial de Dimensionamento (NBR 5410)</h3>
      <table><thead><tr><th>Circuito</th><th>Tipo</th><th>Tensão</th><th>Carga (W)</th><th>Ip (A)</th><th>Agrup.</th><th>Ip' (A)</th><th>Dist. (m)</th><th>Cabo Mín.</th><th>Queda V</th><th>Cabo Final</th><th>Disjuntor</th></tr></thead><tbody>
      ${circuits.length === 0 ? '<tr><td colspan="12" style="text-align:center;padding:12px">Sem circuitos.</td></tr>' : circuits.map(c => {
        const cd = devices.filter(d => d.circuitId === c.id);
        const tp = cd.reduce((s, d) => s + d.power, 0);
        const qdc = devices.find(d => d.type === 'qdc');
        let dist = 10;
        if (qdc && cd.length > 0) dist = Math.max(...cd.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2));
        const r = dimensionateCircuit(c.type, tp || 100, c.voltage, dist, c.groupedCircuits);
        return `<tr><td><strong>C${c.number}</strong> – ${c.name}</td><td>${c.type}</td><td class="mono">${c.voltage}V</td><td class="mono">${tp}W</td><td class="mono">${r.currentProject.toFixed(2)}A</td><td class="mono">${c.groupedCircuits}</td><td class="mono">${r.currentCorrected.toFixed(2)}A</td><td class="mono">${dist.toFixed(1)}m</td><td class="mono">${r.sectionByAmpacity.toFixed(1)}mm²</td><td class="mono" style="color:${r.voltageDropPercent > 4 ? '#dc2626' : '#16a34a'}">${r.voltageDropPercent.toFixed(2)}%</td><td class="mono" style="color:#16a34a;font-weight:bold">${r.selectedSection.toFixed(1)}mm²</td><td class="mono" style="color:#2563eb;font-weight:bold">${r.circuitBreaker}A</td></tr>`;
      }).join('')}
      </tbody></table>
    </div>
    <div class="page">
      <h1>${projectName}</h1>
      <h3>Orçamento & Lista de Materiais</h3>
      <table><thead><tr><th>Item</th><th>Qtd</th><th>Unid</th><th class="tr">Unitário (R$)</th><th class="tr">Total (R$)</th></tr></thead><tbody>
      ${budgetItems.map(i => `<tr><td>${i.name}</td><td class="mono">${i.qty}</td><td>${i.unit}</td><td class="mono tr">R$ ${i.price.toFixed(2)}</td><td class="mono tr" style="font-weight:bold">R$ ${i.total.toFixed(2)}</td></tr>`).join('')}
      <tr style="font-size:0.9rem;font-weight:bold"><td colspan="4" style="text-align:right;border-top:2px solid #2563eb;padding:12px">TOTAL ESTIMADO:</td><td class="mono tr" style="color:#2563eb;border-top:2px solid #2563eb;padding:12px">R$ ${grandTotal.toFixed(2)}</td></tr>
      </tbody></table>
      <div class="sig"><div class="sigline">Responsável Técnico Elétrico<br><span style="font-size:0.65rem;color:#64748b">CREA/CFT</span></div><div class="sigline">Cliente Final<br><span style="font-size:0.65rem;color:#64748b">Aprovação</span></div></div>
    </div></body></html>`;
    pw.document.write(html);
    pw.document.close();
    pw.onload = () => setTimeout(() => pw.print(), 500);
  };

  return (
    <div className="cad2d-layout">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={handleJsonUpload}
        accept=".json"
        style={{ display: 'none' }}
      />

      <Header
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onSave={handleSave}
        onImportProject={() => jsonFileInputRef.current?.click()}
        onExportPDF={handleExportPDF}
        onImportPlant={() => fileInputRef.current?.click()}
        onSwitchTo3D={() => onTabChange('render3d')}
        onToggleLegend={handleToggleLegend}
        onTrash={handleTrash}
        onUndo={undo}
        onRedo={redo}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <Toolbar
        currentTool={currentTool}
        selectedDeviceType={selectedDeviceType as any}
        onToolChange={handleToolChange}
        onDeviceTypeChange={handleDeviceTypeChange}
        onAutomationAction={handleAutomationAction}
      />

      <div className="cad2d-workspace">
        <div className="cad2d-canvas-wrapper" ref={containerRef}>
          <CadCanvas width={dimensions.width} height={dimensions.height} />

          {bgImageSrc && (
            <div className="canvas-statusbar">
              <span className="status-pill status-green">📐 Planta Base Ativa</span>
              <button
                className={`status-btn ${bgImageLock ? '' : 'status-btn-warn'}`}
                onClick={() => setBgImageLock(!bgImageLock)}
              >
                {bgImageLock ? '🔓 Desbloquear' : '🔒 Travar'}
              </button>
              <button
                className={`status-btn ${isCalibrating ? 'status-btn-danger' : ''}`}
                onClick={() => setIsCalibrating(!isCalibrating)}
              >
                {isCalibrating ? '❌ Cancelar Calibração' : '📏 Calibrar Escala'}
              </button>
              <button className="status-btn status-btn-danger" onClick={() => setBgImageSrc(null)}>
                Remover
              </button>
            </div>
          )}
        </div>

        <PropertiesPanel />
      </div>

      {isDimensioningOpen && (
        <div className="modal-overlay" onClick={() => setIsDimensioningOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e3a8a' }}>Painel de Engenharia & Orçamentos</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className={`modal-tab ${modalActiveTab === 'dimensioning' ? 'active' : ''}`}
                    onClick={() => setModalActiveTab('dimensioning')}
                  >
                    📊 Dimensionamento NBR 5410
                  </button>
                  <button
                    className={`modal-tab ${modalActiveTab === 'budget' ? 'active' : ''}`}
                    onClick={() => setModalActiveTab('budget')}
                  >
                    💰 Orçamento & Materiais
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="modal-action-btn" onClick={handleExportPDF}>📄 Gerar PDF</button>
                <button className="modal-close-btn" onClick={() => setIsDimensioningOpen(false)}>✕</button>
              </div>
            </div>

            <div className="modal-body">
              {modalActiveTab === 'dimensioning' && (
                <>
                  <div className="circuit-form-bar">
                    <form onSubmit={handleCreateCircuit} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="form-group-inline">
                        <label>Nº</label>
                        <input type="number" className="form-input-sm" value={newCircuitNumber} min={1}
                          onChange={e => setNewCircuitNumber(parseInt(e.target.value) || 1)} required />
                      </div>
                      <div className="form-group-inline" style={{ flex: 2 }}>
                        <label>Nome do Circuito</label>
                        <input type="text" className="form-input-sm" placeholder="Ex: Tomadas Cozinha"
                          value={newCircuitName} onChange={e => setNewCircuitName(e.target.value)} required />
                      </div>
                      <div className="form-group-inline">
                        <label>Tipo</label>
                        <select className="form-input-sm" value={newCircuitType} onChange={e => setNewCircuitType(e.target.value as any)}>
                          <option value="tug">TUG</option>
                          <option value="tue">TUE</option>
                          <option value="iluminacao">Iluminação</option>
                        </select>
                      </div>
                      <div className="form-group-inline">
                        <label>Tensão</label>
                        <select className="form-input-sm" value={newCircuitVoltage} onChange={e => setNewCircuitVoltage(parseInt(e.target.value) as any)}>
                          <option value={127}>127V</option>
                          <option value={220}>220V</option>
                        </select>
                      </div>
                      <div className="form-group-inline">
                        <label>Agrup.</label>
                        <input type="number" className="form-input-sm" value={newCircuitGrouped} min={1} max={9}
                          onChange={e => setNewCircuitGrouped(parseInt(e.target.value) || 1)} />
                      </div>
                      <button type="submit" className="modal-action-btn">➕ Criar</button>
                    </form>
                  </div>

                  {/* Sumário BIM de Carga e Padrão de Entrada Concessionária */}
                  {(() => {
                    const totalPowerAll = devices.reduce((sum, d) => sum + (d.power || 0), 0);
                    let padrao = 'Monofásico';
                    let padraoCor = '#16a34a'; // verde
                    let desc = 'Recomendado para cargas instaladas de até 8 kW. Utiliza disjuntor geral de 1 polo.';
                    if (totalPowerAll > 15000) {
                      padrao = 'Trifásico (Carga > 15 kW)';
                      padraoCor = '#dc2626'; // vermelho
                      desc = 'Exigido para cargas instaladas acima de 15 kW. Utiliza disjuntor geral tripolar e 3 fases + neutro + terra.';
                    } else if (totalPowerAll > 8000) {
                      padrao = 'Bifásico (Carga > 8 kW e ≤ 15 kW)';
                      padraoCor = '#ca8a04'; // amarelo/laranja
                      desc = 'Exigido para cargas instaladas entre 8 kW e 15 kW. Utiliza disjuntor geral bipolar e 2 fases + neutro + terra.';
                    }

                    return (
                      <div className="bim-summary-card" style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem'
                      }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Contabilidade BIM - Entrada de Concessionária</div>
                          <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '1rem', marginTop: '4px' }}>
                            Carga Instalada Total: <span style={{ color: '#2563eb' }}>{(totalPowerAll / 1000).toFixed(2)} kW</span> ({totalPowerAll} W)
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>{desc}</div>
                        </div>
                        <div style={{
                          background: padraoCor + '15',
                          color: padraoCor,
                          border: `1.5px solid ${padraoCor}`,
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          textTransform: 'uppercase'
                        }}>
                          {padrao}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="dimensioning-table-wrapper">
                    <table className="dimensioning-table">
                      <thead>
                        <tr>
                          <th>Circuito</th>
                          <th>Tipo</th>
                          <th>Tensão (V)</th>
                          <th>Carga (W)</th>
                          <th>Ip (A)</th>
                          <th>Agrup. (Fg)</th>
                          <th>Ip' (A)</th>
                          <th>Dist. QDC (m)</th>
                          <th>Cabo Mín. (mm²)</th>
                          <th>Queda V (%)</th>
                          <th>Cabo Final (mm²)</th>
                          <th>Disjuntor (A)</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {circuits.length === 0 ? (
                          <tr>
                            <td colSpan={13} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                              Nenhum circuito cadastrado. Use o formulário acima para adicionar.
                            </td>
                          </tr>
                        ) : (
                          circuits.map(c => {
                            const cd = devices.filter(d => d.circuitId === c.id);
                            const totalPower = cd.reduce((s, d) => s + d.power, 0);
                            const qdc = devices.find(d => d.type === 'qdc');
                            let maxDist = 10.0;
                            if (qdc && cd.length > 0) maxDist = Math.max(...cd.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
                            const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, maxDist, c.groupedCircuits);
                            return (
                              <tr key={c.id}>
                                <td><strong style={{ color: '#2563eb' }}>C{c.number}</strong><br /><small style={{ color: '#94a3b8' }}>{c.name}</small></td>
                                <td>{c.type === 'iluminacao' ? 'Iluminação' : c.type.toUpperCase()}</td>
                                <td className="mono">{c.voltage}V</td>
                                <td className="mono">{totalPower} W</td>
                                <td className="mono">{res.currentProject.toFixed(2)}A</td>
                                <td className="mono">{c.groupedCircuits} ({res.fatorAgrupamento.toFixed(2)})</td>
                                <td className="mono">{res.currentCorrected.toFixed(2)}A</td>
                                <td className="mono">{maxDist.toFixed(1)}m</td>
                                <td className="mono">{res.sectionByAmpacity.toFixed(1)} mm²</td>
                                <td className="mono" style={{ color: res.voltageDropPercent > 4 ? '#dc2626' : '#16a34a' }}>
                                  {res.voltageDropPercent.toFixed(2)}%
                                </td>
                                <td className="mono" style={{ color: '#16a34a', fontWeight: 'bold' }}>{res.selectedSection.toFixed(1)} mm²</td>
                                <td><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontFamily: 'monospace' }}>{res.circuitBreaker} A</span></td>
                                <td><button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }} title="Remover circuito" onClick={() => removeCircuit(c.id)}>✕</button></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {modalActiveTab === 'budget' && (
                <div className="dimensioning-table-wrapper">
                  <table className="dimensioning-table">
                    <thead>
                      <tr>
                        <th>Descrição do Material</th>
                        <th>Quant.</th>
                        <th>Unid.</th>
                        <th style={{ textAlign: 'right' }}>Unitário (R$)</th>
                        <th style={{ textAlign: 'right' }}>Total (R$)</th>
                        <th style={{ width: '36px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                            Sem materiais. Desenhe paredes, adicione pontos elétricos e conduítes.
                          </td>
                        </tr>
                      ) : (
                        budgetItems.map((item, idx) => (
                          <tr key={idx} style={{ background: !item.isAuto ? '#fefce8' : undefined }}>
                            {/* Nome editável */}
                            <td>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  if (item.isAuto) {
                                    setNameOverrides(prev => ({ ...prev, [item.originalIdx]: e.target.value }));
                                  } else {
                                    const manualIdx = item.originalIdx - autoBudgetItems.length;
                                    setManualBudgetItems(prev => prev.map((m, i) => i === manualIdx ? { ...m, name: e.target.value } : m));
                                  }
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  color: '#0f172a',
                                  width: '100%',
                                  padding: '4px 2px',
                                  outline: 'none',
                                  borderBottom: '1px dashed #cbd5e1',
                                }}
                                title="Clique para editar o nome"
                              />
                            </td>
                            {/* Quantidade editável */}
                            <td className="mono">
                              <input
                                type="text"
                                value={item.qty}
                                onChange={(e) => {
                                  if (item.isAuto) {
                                    setQtyOverrides(prev => ({ ...prev, [item.originalIdx]: e.target.value }));
                                  } else {
                                    const manualIdx = item.originalIdx - autoBudgetItems.length;
                                    setManualBudgetItems(prev => prev.map((m, i) => i === manualIdx ? { ...m, qty: e.target.value } : m));
                                  }
                                }}
                                style={{
                                  border: 'none', background: 'transparent', fontFamily: 'monospace',
                                  fontSize: '0.8rem', color: '#0f172a', width: '60px', padding: '4px 2px',
                                  outline: 'none', borderBottom: '1px dashed #cbd5e1', textAlign: 'center',
                                }}
                              />
                            </td>
                            <td>{item.unit}</td>
                            {/* Preço editável */}
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price.toFixed(2)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (item.isAuto) {
                                      setPriceOverrides(prev => ({ ...prev, [item.originalIdx]: val }));
                                    } else {
                                      const manualIdx = item.originalIdx - autoBudgetItems.length;
                                      setManualBudgetItems(prev => prev.map((m, i) => i === manualIdx ? { ...m, price: val } : m));
                                    }
                                  }}
                                  style={{
                                    border: 'none', background: 'transparent', fontFamily: 'monospace',
                                    fontSize: '0.8rem', color: '#0f172a', width: '70px', padding: '4px 2px',
                                    outline: 'none', borderBottom: '1px dashed #cbd5e1', textAlign: 'right',
                                  }}
                                  title="Clique para editar o preço unitário"
                                />
                              </div>
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 'bold' }}>R$ {item.total.toFixed(2)}</td>
                            {/* Botão Excluir */}
                            <td style={{ textAlign: 'center', padding: '2px' }}>
                              {item.isAuto ? (
                                <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }} title="Item gerado automaticamente">🔒</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    const manualIdx = item.originalIdx - autoBudgetItems.length;
                                    setManualBudgetItems(prev => prev.filter((_, i) => i !== manualIdx));
                                  }}
                                  style={{
                                    border: 'none', background: 'none', color: '#ef4444',
                                    cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold',
                                    padding: '2px 4px', lineHeight: 1,
                                  }}
                                  title="Excluir item manual"
                                >
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                      {/* Linha de Total */}
                      {budgetItems.length > 0 && (
                        <tr style={{ fontWeight: 'bold', fontSize: '0.9rem', background: '#f0f9ff' }}>
                          <td colSpan={5} style={{ textAlign: 'right', color: '#1e3a8a', borderTop: '2px solid #2563eb' }}>
                            VALOR TOTAL ESTIMADO DO PROJETO:
                          </td>
                          <td className="mono" style={{ textAlign: 'right', color: '#2563eb', borderTop: '2px solid #2563eb', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                            R$ {grandTotal.toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Botão adicionar item manual */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0', gap: '8px' }}>
                    <button
                      className="modal-action-btn"
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                      onClick={() => {
                        setManualBudgetItems(prev => [
                          ...prev,
                          { name: 'Novo Material', qty: '1', unit: 'un', price: 0.00 }
                        ]);
                      }}
                    >
                      ➕ Adicionar Item Manual
                    </button>
                    <button
                      className="modal-action-btn"
                      style={{ fontSize: '0.8rem', padding: '6px 14px', background: '#64748b', color: '#fff' }}
                      onClick={() => { setPriceOverrides({}); setNameOverrides({}); setQtyOverrides({}); }}
                      title="Restaura nomes e preços automáticos"
                    >
                      🔄 Resetar Edições
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
