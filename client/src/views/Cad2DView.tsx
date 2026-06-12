import React, { useEffect, useRef, useState } from 'react';
import { CadCanvas } from '../components/Cad2D/CadCanvas';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { Header } from '../components/Header';
import { Toolbar } from '../components/Toolbar';
import { useCadStore } from '../store/useCadStore';
import { dimensionateCircuit } from '../utils/nbr5410';
import { calculateWiringRouting } from '../utils/pathfinding';
import type { ToolType, DeviceType } from '../types';

interface Cad2DViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar') => void;
}

export const Cad2DView: React.FC<Cad2DViewProps> = ({ activeTab, onTabChange }) => {
  const {
    bgImageSrc, bgImageLock, isCalibrating,
    walls, devices, circuits, conduits,
    projectName, legend,
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

  const handleSave = () => {
    const state = useCadStore.getState();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      projectName: state.projectName,
      walls: state.walls,
      devices: state.devices,
      circuits: state.circuits,
      conduits: state.conduits,
      guideLines: state.guideLines || [],
      texts: state.texts || [],
      dimensions: state.dimensions || [],
      ppm: state.ppm,
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const safeName = state.projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadAnchor.setAttribute("download", `${safeName || 'projeto'}_cad.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleToggleLegend = () => {
    alert(`Legenda — ${legend.length} tipos de símbolos no canvas.`);
  };

  const handleTrash = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o projeto?')) {
      resetWorkspace();
    }
  };

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

  const budgetItems: Array<{ name: string; qty: string; unit: string; price: number; total: number }> = [];

  let totalWallLength = 0;
  walls.forEach(w => {
    totalWallLength += Math.sqrt(Math.pow(w.p2.x - w.p1.x, 2) + Math.pow(w.p2.y - w.p1.y, 2));
  });
  if (totalWallLength > 0) {
    budgetItems.push({ name: 'Alvenaria (Paredes)', qty: totalWallLength.toFixed(1), unit: 'm', price: 150.00, total: totalWallLength * 150.00 });
  }

  const deviceCounts: Record<string, { qty: number; price: number }> = {};
  devices.forEach(d => {
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
      door: 320.00,
      door_correr: 450.00,
      door_pivotante: 650.00,
      window: 290.00,
      stairs: 800.00,
      switch_simple: 15.00,
      switch_parallel: 20.00,
      switch_intermediate: 25.00,
      tug_baixa: 15.00,
      tug_media: 16.00,
      tug_alta: 18.00,
      tue_chuveiro: 35.00,
      tue_ar: 40.00,
    };
    const price = priceMap[d.type] ?? 12.00;
    deviceCounts[d.name] = { qty: (deviceCounts[d.name]?.qty || 0) + 1, price };
  });
  Object.entries(deviceCounts).forEach(([name, data]) => {
    budgetItems.push({ name, qty: data.qty.toString(), unit: 'un', price: data.price, total: data.qty * data.price });
  });

  circuits.forEach(c => {
    budgetItems.push({ name: `Disjuntor Termomagnético (Circ. ${c.number})`, qty: '1', unit: 'un', price: 18.00, total: 18.00 });
  });

  if (totalConduitLength > 0) {
    budgetItems.push({ name: 'Eletroduto Corrugado Flexível 3/4"', qty: totalConduitLength.toFixed(1), unit: 'm', price: 3.50, total: totalConduitLength * 3.50 });
  }

  Object.entries(cableLengths).forEach(([bitola, length]) => {
    const b = parseFloat(bitola);
    const price = b <= 1.5 ? 2.20 : b === 2.5 ? 3.80 : b === 4.0 ? 5.50 : b === 6.0 ? 8.20 : 15.50;
    budgetItems.push({ name: `Cabo de Cobre Flexível ${bitola} mm²`, qty: length.toFixed(1), unit: 'm', price, total: length * price });
  });

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
                      </tr>
                    </thead>
                    <tbody>
                      {budgetItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                            Sem materiais. Desenhe paredes, adicione pontos elétricos e conduítes.
                          </td>
                        </tr>
                      ) : (
                        budgetItems.map((item, idx) => (
                          <tr key={idx}>
                            <td><strong>{item.name}</strong></td>
                            <td className="mono">{item.qty}</td>
                            <td>{item.unit}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>R$ {item.price.toFixed(2)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 'bold' }}>R$ {item.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                      {budgetItems.length > 0 && (
                        <tr style={{ fontWeight: 'bold', fontSize: '0.9rem', background: '#f0f9ff' }}>
                          <td colSpan={4} style={{ textAlign: 'right', color: '#1e3a8a', borderTop: '2px solid #2563eb' }}>
                            VALOR TOTAL ESTIMADO DO PROJETO:
                          </td>
                          <td className="mono" style={{ textAlign: 'right', color: '#2563eb', borderTop: '2px solid #2563eb', fontSize: '1rem' }}>
                            R$ {grandTotal.toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
