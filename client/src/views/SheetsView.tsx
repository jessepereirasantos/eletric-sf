import React, { useState, useRef, useEffect } from 'react';
import { useCadStore } from '../store/useCadStore';
import { BottomBar } from '../components/BottomBar';
import { dimensionateCircuit } from '../utils/nbr5410';

interface SheetsViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets') => void;
}

interface Sheet {
  id: string;
  code: string;
  title: string;
  size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
  orientation: 'landscape' | 'portrait';
  contentTypes: ('planta' | 'cargas' | 'materiais' | 'unifilar' | 'legenda')[];
}

export const SheetsView: React.FC<SheetsViewProps> = ({ activeTab, onTabChange }) => {
  const {
    projectName,
    walls,
    devices,
    circuits,
    materialsList,
    paperOwner,
    paperDesigner,
    paperLogo
  } = useCadStore();

  // Gerenciamento de múltiplas folhas
  const [sheets, setSheets] = useState<Sheet[]>([
    {
      id: 'sheet_1',
      code: 'PR-01/02',
      title: 'Planta de Distribuição Elétrica',
      size: 'A1',
      orientation: 'landscape',
      contentTypes: ['planta', 'legenda']
    },
    {
      id: 'sheet_2',
      code: 'PR-02/02',
      title: 'Diagrama Unifilar e Tabelas',
      size: 'A1',
      orientation: 'landscape',
      contentTypes: ['unifilar', 'cargas', 'materiais']
    }
  ]);

  const [activeSheetId, setActiveSheetId] = useState<string>('sheet_1');
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Observador de tamanho do contêiner para aplicar transform: scale automática
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerSize({
          w: entry.contentRect.width - 60, // margem de segurança de 30px nas laterais
          h: entry.contentRect.height - 60
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Adicionar uma nova folha técnica
  const handleAddSheet = () => {
    const nextNum = sheets.length + 1;
    const newSheet: Sheet = {
      id: `sheet_${Date.now()}`,
      code: `PR-0${nextNum}/0${nextNum}`,
      title: `Nova Prancha Técnica ${nextNum}`,
      size: 'A1',
      orientation: 'landscape',
      contentTypes: ['planta']
    };
    setSheets([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  // Remover folha técnica
  const handleRemoveSheet = (id: string) => {
    if (sheets.length <= 1) {
      alert('É necessário ter ao menos uma folha técnica no projeto.');
      return;
    }
    const filtered = sheets.filter(s => s.id !== id);
    setSheets(filtered);
    setActiveSheetId(filtered[0].id);
  };

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  // Configurações de tamanho real de folha ABNT (em milímetros)
  const getSheetDimensionsMM = (size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4', orientation: 'landscape' | 'portrait') => {
    const sizes = {
      A0: { w: 1189, h: 841 },
      A1: { w: 841, h: 594 },
      A2: { w: 594, h: 420 },
      A3: { w: 420, h: 297 },
      A4: { w: 297, h: 210 },
    };
    const dim = sizes[size];
    return orientation === 'landscape' ? { w: dim.w, h: dim.h } : { w: dim.h, h: dim.w };
  };

  const dimMM = getSheetDimensionsMM(activeSheet.size, activeSheet.orientation);
  
  // Fator de escala dinâmico de alta resolução
  const scaleMultiplier = 3.2;
  const sheetPixelW = dimMM.w * scaleMultiplier;
  const sheetPixelH = dimMM.h * scaleMultiplier;

  // Escala final de exibição para caber no contêiner do monitor
  const fitScale = Math.min(containerSize.w / sheetPixelW, containerSize.h / sheetPixelH);

  // Alterar tipos de conteúdo alocados na folha técnica
  const toggleContent = (type: 'planta' | 'cargas' | 'materiais' | 'unifilar' | 'legenda') => {
    const exists = activeSheet.contentTypes.includes(type);
    let updated: ('planta' | 'cargas' | 'materiais' | 'unifilar' | 'legenda')[];
    if (exists) {
      updated = activeSheet.contentTypes.filter(t => t !== type);
    } else {
      updated = [...activeSheet.contentTypes, type];
    }
    setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, contentTypes: updated } : s));
  };

  // Função para imprimir todas as pranchas em tamanho real
  const handlePrintAll = () => {
    const pw = window.open('', '_blank');
    if (!pw) {
      alert('Por favor, ative os pop-ups do navegador para gerar as pranchas de impressão.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pranchas Técnicas — ${projectName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: #fff; }
          .sheet-print-page {
            position: relative;
            background: #ffffff;
            box-sizing: border-box;
            border: 2px solid #000;
            page-break-after: always;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 10px;
          }
          .sheet-print-page:last-child { page-break-after: avoid; }
          .inner-border {
            border: 1.5px solid #000;
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
            padding: 20px;
          }
          .stamp-box {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 240px;
            height: 95px;
            border-top: 1.5px solid #000;
            border-left: 1.5px solid #000;
            background: #fafafa;
            padding: 8px;
            display: flex;
            gap: 8px;
            font-size: 8px;
            line-height: 1.3;
          }
          .stamp-logo-col {
            width: 65px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px dotted #000;
            padding-right: 6px;
          }
          .stamp-info-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .stamp-title { font-weight: bold; font-size: 9.5px; margin-bottom: 2px; text-transform: uppercase; }
          .grid-container {
            display: grid;
            gap: 16px;
            height: 100%;
          }
          .block {
            border: 1px dashed #cbd5e1;
            padding: 10px;
            border-radius: 4px;
            background: #fdfdfd;
            overflow: auto;
          }
          h3 { font-size: 11px; border-bottom: 2.0px solid #000; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; color: #334155; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; }
          th { background: #f1f5f9; }
          .mono { font-family: monospace; font-weight: bold; }
          @media print {
            body { background: #fff; }
            .sheet-print-page { border: none; }
          }
        </style>
      </head>
      <body>
        ${sheets.map(s => {
          const sDim = getSheetDimensionsMM(s.size, s.orientation);
          const isPrintSmall = s.size === 'A3' || s.size === 'A4';
          const printGridCols = isPrintSmall || s.contentTypes.length === 1 ? '1fr' : '1fr 1fr';
          const printPaddingBot = isPrintSmall ? '140px' : '120px';

          return `
            <div class="sheet-print-page" style="width: ${sDim.w}mm; height: ${sDim.h}mm;">
              <div class="inner-border" style="padding-bottom: ${printPaddingBot};">
                <div style="font-size: 13px; font-weight: bold; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 5px; display: flex; justify-content: space-between;">
                  <span>${s.code} — ${s.title}</span>
                  <span style="font-size: 9px; font-weight: normal; color: #64748b;">Escala de Impressão (${s.size})</span>
                </div>

                <div class="grid-container" style="grid-template-columns: ${printGridCols}; flex: 1;">
                  ${s.contentTypes.includes('planta') ? `
                    <div class="block" style="display: flex; flex-direction: column;">
                      <h3>Planta de Distribuição Elétrica</h3>
                      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; font-size: 11px; padding: 25px 0;">
                        <strong>[ Planta Baixa 2D Renderizada em Escala 1:${useCadStore.getState().projectScale} ]</strong>
                        <div style="margin-top: 6px; font-size: 9px;">Paredes e Eletrodutos Conforme NBR 5410</div>
                      </div>
                    </div>
                  ` : ''}

                  ${s.contentTypes.includes('unifilar') ? `
                    <div class="block" style="display: flex; flex-direction: column;">
                      <h3>Esquema Unifilar do Quadro</h3>
                      <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 11px; padding: 25px 0;">
                        <strong>[ Diagrama Unifilar de Circuitos ]</strong>
                      </div>
                    </div>
                  ` : ''}

                  ${s.contentTypes.includes('cargas') ? `
                    <div class="block">
                      <h3>Quadro de Cargas (NBR 5410)</h3>
                      <table>
                        <thead>
                          <tr>
                            <th>Circuit</th>
                            <th>Tipo</th>
                            <th>Tensão</th>
                            <th>Potência</th>
                            <th>Cabo Mín.</th>
                            <th>Disjuntor</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${circuits.map(c => `
                            <tr>
                              <td><strong>Circ.${c.number}</strong></td>
                              <td>${c.type.toUpperCase()}</td>
                              <td class="mono">${c.voltage}V</td>
                              <td class="mono">${devices.filter(d => d.circuitId === c.id).reduce((sum, d) => sum + (d.power || 0), 0)}W</td>
                              <td class="mono">${dimensionateCircuit(c.type, devices.filter(d => d.circuitId === c.id).reduce((sum, d) => sum + (d.power || 0), 0) || 100, c.voltage, 10, c.groupedCircuits).selectedSection} mm²</td>
                              <td class="mono" style="color: #2563eb">${dimensionateCircuit(c.type, devices.filter(d => d.circuitId === c.id).reduce((sum, d) => sum + (d.power || 0), 0) || 100, c.voltage, 10, c.groupedCircuits).circuitBreaker}A</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : ''}

                  ${s.contentTypes.includes('materiais') ? `
                    <div class="block">
                      <h3>Lista de Materiais e Componentes</h3>
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qtde</th>
                            <th>Unid.</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${materialsList.map(item => `
                            <tr>
                              <td>${item.name}</td>
                              <td class="mono">${item.qty}</td>
                              <td>${item.unit}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : ''}
                </div>

                <!-- Carimbo Selo Técnico ABNT NBR 6492 -->
                <div class="stamp-box">
                  <div class="stamp-logo-col">
                    ${paperLogo ? `
                      <img src="${paperLogo}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                    ` : `
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    `}
                  </div>
                  <div class="stamp-info-col">
                    <div>
                      <div class="stamp-title" style="font-size: 8.5px; font-weight: bold;">PROJ.: ${projectName}</div>
                      <div>Prop.: ${paperOwner}</div>
                      <div>Resp.: ${paperDesigner}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 2px; font-size: 7px; color: #475569;">
                      <span>Esc.: 1:${useCadStore.getState().projectScale}</span>
                      <strong style="color: #000;">Folha: ${s.code}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;

    pw.document.write(htmlContent);
    pw.document.close();
    pw.onload = () => setTimeout(() => pw.print(), 500);
  };

  const isSmallSheet = activeSheet.size === 'A3' || activeSheet.size === 'A4';
  const gridColumns = isSmallSheet || activeSheet.contentTypes.length === 1 ? '1fr' : '1fr 1fr';
  const paddingBottom = isSmallSheet ? '140px' : '120px';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* Header Superior */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>
              Gerenciamento de Pranchas e Folhas
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Crie folhas, organize layouts e imprima em escala real (ABNT)
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="tab-buttons" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onTabChange('cad2d')} className="tab-btn" style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#cbd5e1' }}>
            📐 Editor CAD 2D
          </button>
          <button onClick={() => onTabChange('render3d')} className="tab-btn" style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#cbd5e1' }}>
            🧊 Visualizador 3D
          </button>
          <button onClick={() => onTabChange('unifilar')} className="tab-btn" style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#cbd5e1' }}>
            ⚡ Diagrama Unifilar
          </button>
          <button className="tab-btn active" style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            📋 Pranchas / Folhas
          </button>
        </div>
      </header>

      {/* Área de Trabalho */}
      <div style={{ flex: 1, display: 'flex', padding: '20px', gap: '20px', overflow: 'hidden' }}>
        
        {/* Painel de Controle de Folhas com Rolagem Própria */}
        <div style={{ width: '280px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0 }}>Suas Pranchas</h3>
            <button onClick={handleAddSheet} style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
              + Nova
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '120px' }}>
            {sheets.map(s => (
              <div key={s.id} onClick={() => setActiveSheetId(s.id)} style={{
                padding: '10px', borderRadius: '6px', cursor: 'pointer',
                border: activeSheetId === s.id ? '1px solid #3b82f6' : '1px solid #334155',
                backgroundColor: activeSheetId === s.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{s.code}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.title}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleRemoveSheet(s.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Configurações da Folha Selecionada */}
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>Configurar Folha</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Título da Prancha</span>
              <input
                type="text"
                value={activeSheet.title}
                onChange={(e) => setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, title: e.target.value } : s))}
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Tamanho do Papel</span>
              <select
                value={activeSheet.size}
                onChange={(e) => setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, size: e.target.value as any } : s))}
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="A0">A0 (1189x841 mm)</option>
                <option value="A1">A1 (841x594 mm)</option>
                <option value="A2">A2 (594x420 mm)</option>
                <option value="A3">A3 (420x297 mm)</option>
                <option value="A4">A4 (297x210 mm)</option>
              </select>
            </div>

            {/* Conteúdos Habilitados na Prancha */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Adicionar no Layout</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={activeSheet.contentTypes.includes('planta')} onChange={() => toggleContent('planta')} />
                Planta Baixa 2D
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={activeSheet.contentTypes.includes('unifilar')} onChange={() => toggleContent('unifilar')} />
                Diagrama Unifilar
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={activeSheet.contentTypes.includes('cargas')} onChange={() => toggleContent('cargas')} />
                Quadro de Cargas
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={activeSheet.contentTypes.includes('materiais')} onChange={() => toggleContent('materiais')} />
                Lista de Materiais
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={activeSheet.contentTypes.includes('legenda')} onChange={() => toggleContent('legenda')} />
                Legenda de Símbolos
              </label>
            </div>
          </div>

          <button onClick={handlePrintAll} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            🖨️ Imprimir Todas as Folhas
          </button>
        </div>

        {/* Simulador da Folha ABNT (Paper Space) com Redimensionamento e Escalonamento Dinâmico */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            backgroundColor: '#0b0f19',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            position: 'relative',
            padding: '20px'
          }}
        >
          
          {/* Div Wrapper que consome exatamente o tamanho da folha escalada */}
          <div style={{
            width: `${sheetPixelW * fitScale}px`,
            height: `${sheetPixelH * fitScale}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {/* Folha Física Simulada (W3C ABNT) */}
            <div style={{
              width: `${sheetPixelW}px`,
              height: `${sheetPixelH}px`,
              transform: `scale(${fitScale})`,
              transformOrigin: 'center center',
              backgroundColor: '#ffffff',
              border: '2.5px solid #0f172a',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              color: '#0f172a',
              padding: '25px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}>
            {/* Margens de Borda da Folha */}
            <div style={{
              border: '1.5px solid #0f172a',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              position: 'relative',
              paddingBottom: paddingBottom
            }}>
              
              {/* Título de Prancha */}
              <div style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1.5px solid #000', paddingBottom: '6px', marginBottom: '14px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>{activeSheet.code} — {activeSheet.title}</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Escala Real de Prancha ({activeSheet.size})</span>
              </div>

              {/* Elementos Ativos no Layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: '16px',
                height: '100%',
                overflow: 'auto'
              }}>
                {activeSheet.contentTypes.map((type) => {
                  if (type === 'planta') {
                    // Calcular limites reais do projeto
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    walls.forEach(w => {
                      minX = Math.min(minX, w.p1.x, w.p2.x);
                      maxX = Math.max(maxX, w.p1.x, w.p2.x);
                      minY = Math.min(minY, w.p1.y, w.p2.y);
                      maxY = Math.max(maxY, w.p1.y, w.p2.y);
                    });
                    devices.forEach(d => {
                      minX = Math.min(minX, d.x);
                      maxX = Math.max(maxX, d.x);
                      minY = Math.min(minY, d.y);
                      maxY = Math.max(maxY, d.y);
                    });

                    const hasElements = walls.length > 0 || devices.length > 0;
                    if (!hasElements) {
                      minX = 0; maxX = 10; minY = 0; maxY = 10;
                    }

                    const margin = 1;
                    const wSVG = (maxX - minX) + margin * 2;
                    const hSVG = (maxY - minY) + margin * 2;
                    const vb = `${minX - margin} ${minY - margin} ${wSVG} ${hSVG}`;

                    const { conduits } = useCadStore.getState();

                    return (
                      <div key={type} style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '4px', backgroundColor: '#fcfcfc', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '8px', display: 'block' }}>PLANTA BAIXA DE DISTRIBUIÇÃO</span>
                        {hasElements ? (
                          <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg viewBox={vb} style={{ width: '100%', height: '100%', maxHeight: '100%', objectFit: 'contain' }}>
                              {/* Desenhar paredes */}
                              {walls.map(w => (
                                <line
                                  key={w.id}
                                  x1={w.p1.x}
                                  y1={w.p1.y}
                                  x2={w.p2.x}
                                  y2={w.p2.y}
                                  stroke="#334155"
                                  strokeWidth={w.thickness || 0.15}
                                  strokeLinecap="round"
                                />
                              ))}
                              
                              {/* Desenhar conduítes */}
                              {conduits.map(c => {
                                const from = devices.find(d => d.id === c.fromDeviceId);
                                const to = devices.find(d => d.id === c.toDeviceId);
                                if (!from || !to) return null;
                                if (c.waypoints && c.waypoints.length > 0) {
                                  const pts = [from, ...c.waypoints, to].map(p => `${p.x},${p.y}`).join(' ');
                                  return <polyline key={c.id} points={pts} fill="none" stroke="#94a3b8" strokeWidth="0.04" strokeDasharray="0.1, 0.08" />;
                                }
                                return <line key={c.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#94a3b8" strokeWidth="0.04" strokeDasharray="0.1, 0.08" />;
                              })}

                              {/* Desenhar esquadrias (portas e janelas) */}
                              {devices.filter(d => d.type.startsWith('door') || d.type === 'window' || d.type === 'open_van').map(d => {
                                const isDoor = d.type.startsWith('door');
                                const isGiro = d.type === 'door' || d.type === 'door_pivotante';
                                const color = isDoor ? '#b45309' : '#38bdf8';
                                const w = d.width ?? 0.8;
                                return (
                                  <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                                    <g transform={isGiro && d.flip ? 'scale(-1, 1)' : undefined}>
                                      {isGiro ? (
                                        <>
                                          <rect x={0} y={-0.06} width={w} height={0.12} fill={color} stroke="#1e293b" strokeWidth="0.02" opacity={0.8} />
                                          <line x1={0} y1={0} x2={0} y2={-w} stroke="#b45309" strokeWidth="0.03" />
                                          <path d={`M 0,${-w} A ${w},${w} 0 0,1 ${w},0`} fill="none" stroke="#b45309" strokeWidth="0.015" strokeDasharray="0.05, 0.05" />
                                        </>
                                      ) : (
                                        <rect x={-w / 2} y={-0.06} width={w} height={0.12} fill={color} stroke="#1e293b" strokeWidth="0.02" opacity={0.8} />
                                      )}
                                    </g>
                                  </g>
                                );
                              })}

                              {/* Desenhar dispositivos elétricos */}
                              {devices.filter(d => !d.type.startsWith('door') && d.type !== 'window' && d.type !== 'open_van').map(d => {
                                let color = '#3b82f6';
                                let r = 0.12;
                                if (d.type.includes('box')) { color = '#fbbf24'; r = 0.10; }
                                else if (d.type.includes('tomada') || d.type.includes('tue')) { color = '#ef4444'; r = 0.09; }
                                else if (d.type.includes('interruptor')) { color = '#a855f7'; r = 0.08; }
                                else if (d.type.includes('light') || d.type === 'lampada' || d.type === 'fluorescent') { color = '#f59e0b'; r = 0.15; }
                                
                                return (
                                  <g key={d.id}>
                                    <circle cx={d.x} cy={d.y} r={r} fill={color} stroke="#0f172a" strokeWidth="0.02" />
                                    <text x={d.x} y={d.y - r - 0.06} fontSize="0.16" fill="#475569" textAnchor="middle" fontWeight="bold">
                                      {d.name}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                            <span>Nenhum elemento no projeto</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (type === 'unifilar') {
                    const hasCircuits = circuits.length > 0;
                    const hSVG = Math.max(160, circuits.length * 35 + 50);

                    return (
                      <div key={type} style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '4px', backgroundColor: '#fcfcfc', overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '8px', display: 'block' }}>DIAGRAMA UNIFILAR DE DISTRIBUIÇÃO</span>
                        {hasCircuits ? (
                          <div style={{ flex: 1, position: 'relative', width: '100%' }}>
                            <svg viewBox={`0 0 450 ${hSVG}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                              {/* Disjuntor Geral / Origem */}
                              <rect x="10" y="15" width="60" height="25" rx="3" fill="#3b4252" stroke="#2e3440" strokeWidth="1.5" />
                              <text x="40" y="31" fontSize="8" fill="#ffffff" textAnchor="middle" fontWeight="bold">QDC GERAL</text>
                              
                              {/* Barramento Principal Vertical */}
                              <line x1="70" y1="27" x2="90" y2="27" stroke="#2e3440" strokeWidth="2" />
                              <line x1="90" y1="27" x2="90" y2={`${hSVG - 25}`} stroke="#2e3440" strokeWidth="2" />
                              
                              {/* Desenhar cada circuito */}
                              {circuits.map((c, idx) => {
                                const y = 45 + idx * 35;
                                const cd = devices.filter(d => d.circuitId === c.id);
                                const totalPower = cd.reduce((sum, d) => sum + (d.power || 0), 0);
                                const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, 10, c.groupedCircuits);
                                
                                return (
                                  <g key={c.id}>
                                    <line x1="90" y1={y} x2="110" y2={y} stroke="#4c566a" strokeWidth="1.5" />
                                    
                                    <rect x="110" y={y - 8} width="35" height="16" rx="2" fill="#e5e9f0" stroke="#4c566a" strokeWidth="1.2" />
                                    <text x="127.5" y={y + 3} fontSize="8" fill="#2e3440" textAnchor="middle" fontWeight="bold">{res.circuitBreaker}A</text>
                                    
                                    <line x1="145" y1={y} x2="230" y2={y} stroke="#4c566a" strokeWidth="1.5" />
                                    
                                    <text x="150" y={y - 12} fontSize="9" fill="#2e3440" fontWeight="bold">Circuito {c.number} ({c.type.toUpperCase()})</text>
                                    
                                    {/* Simbologia Unifilar (Fase, Neutro, Terra) */}
                                    <line x1="165" y1={y - 6} x2="165" y2={y + 6} stroke="#4c566a" strokeWidth="1.2" />
                                    <line x1="175" y1={y} x2="175" y2={y - 6} stroke="#4c566a" strokeWidth="1.2" />
                                    <line x1="175" y1={y - 6} x2="179" y2={y - 6} stroke="#4c566a" strokeWidth="1.2" />
                                    <line x1="185" y1={y} x2="185" y2={y - 6} stroke="#4c566a" strokeWidth="1.2" />
                                    <line x1="181" y1={y - 6} x2="189" y2={y - 6} stroke="#4c566a" strokeWidth="1.2" />
                                    
                                    <text x="200" y={y + 11} fontSize="7.5" fill="#4c566a" fontWeight="bold">{res.selectedSection} mm²</text>
                                    
                                    <line x1="230" y1={y} x2="250" y2={y} stroke="#4c566a" strokeWidth="1.5" />
                                    <text x="255" y={y + 3} fontSize="8" fill="#3b4252" fontWeight="bold">{c.name} ({totalPower}W)</text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                            <span>Nenhum circuito cadastrado para gerar o diagrama</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (type === 'cargas') {
                    return (
                      <div key={type} style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '4px', backgroundColor: '#fcfcfc', overflow: 'auto' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>TABELA DE DIMENSIONAMENTO NBR 5410</span>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th>Circ.</th>
                              <th>Tipo</th>
                              <th>Cabo Mín</th>
                              <th>Disjuntor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {circuits.map(c => {
                              const cd = devices.filter(d => d.circuitId === c.id);
                              const totalPower = cd.reduce((sum, d) => sum + (d.power || 0), 0);
                              const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, 10, c.groupedCircuits);
                              return (
                                <tr key={c.id}>
                                  <td><strong>C{c.number}</strong></td>
                                  <td>{c.type.toUpperCase()}</td>
                                  <td className="mono">{res.selectedSection} mm²</td>
                                  <td className="mono" style={{ color: '#2563eb' }}>{res.circuitBreaker}A</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (type === 'materiais') {
                    return (
                      <div key={type} style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '4px', backgroundColor: '#fcfcfc', overflow: 'auto' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>LISTA QUANTITATIVA</span>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th>Material</th>
                              <th>Qtde</th>
                              <th>Unid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {materialsList.slice(0, 8).map((item, i) => (
                              <tr key={i}>
                                <td>{item.name}</td>
                                <td className="mono">{item.qty}</td>
                                <td>{item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (type === 'legenda') {
                    const isSmall = activeSheet.size === 'A4' || activeSheet.size === 'A3';
                    const fontSize = isSmall ? '7.5px' : '8.5px';
                    const padding = isSmall ? '2px 4px' : '4px';

                    const legendItems = [
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <circle cx="8" cy="8" r="6" fill="#f59e0b" stroke="#000" strokeWidth="1" />
                            <line x1="8" y1="2" x2="8" y2="14" stroke="#000" strokeWidth="1" />
                            <line x1="2" y1="8" x2="14" y2="8" stroke="#000" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Ponto de Luz no Teto (Luminária)',
                        install: 'Teto (2.80m)'
                      },
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <path d="M 8,14 L 3,6 L 13,6 Z" fill="none" stroke="#000" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Tomada Baixa 10A (NBR 14136)',
                        install: 'Parede (0.30m)'
                      },
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <path d="M 8,14 L 3,6 L 13,6 Z" fill="#94a3b8" stroke="#000" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Tomada Média 10A (NBR 14136)',
                        install: 'Parede (1.10m)'
                      },
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <path d="M 8,14 L 3,6 L 13,6 Z" fill="#000" stroke="#000" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Tomada Alta TUE (Chuveiro/Ar)',
                        install: 'Parede (2.20m)'
                      },
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <circle cx="8" cy="8" r="4" fill="#a855f7" stroke="#000" strokeWidth="1" />
                            <line x1="8" y1="8" x2="12" y2="4" stroke="#000" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Interruptor Simples (Acionamento)',
                        install: 'Parede (1.10m)'
                      },
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <circle cx="8" cy="8" r="6" fill="#fbbf24" stroke="#000" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Caixa de Passagem Octogonal',
                        install: 'Teto (2.80m)'
                      },
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <rect x="4" y="2" width="8" height="12" fill="#fbbf24" stroke="#000" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Caixa de Embutir 4x2 (Parede)',
                        install: 'Variável'
                      },
                      {
                        symbol: (
                          <svg width="14" height="14" viewBox="0 0 16 16" style={{ display: 'block', margin: 'auto' }}>
                            <circle cx="8" cy="8" r="5" fill="#1e293b" stroke="#000" strokeWidth="1" />
                            <path d="M 5,8 L 8,5 L 11,8" fill="none" stroke="#fff" strokeWidth="1" />
                          </svg>
                        ),
                        desc: 'Câmera Dome CFTV',
                        install: 'Parede (2.50m)'
                      }
                    ];

                    if (isSmall) {
                      const col1 = legendItems.slice(0, 4);
                      const col2 = legendItems.slice(4);
                      return (
                        <div key={type} style={{ border: '1px dashed #cbd5e1', padding: '8px', borderRadius: '4px', backgroundColor: '#fcfcfc', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#475569', marginBottom: '4px', display: 'block' }}>LEGENDA DE SIMBOLOGIA ELÉTRICA</span>
                          <div style={{ display: 'flex', gap: '12px', width: '100%', height: '100%' }}>
                            <div style={{ flex: 1 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize, textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: padding, width: '30px' }}>Símb.</th>
                                    <th style={{ padding: padding }}>Descrição</th>
                                    <th style={{ padding: padding, width: '45px' }}>Instal.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {col1.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                                      <td style={{ padding: padding, textAlign: 'center' }}>{item.symbol}</td>
                                      <td style={{ padding: padding }}>{item.desc}</td>
                                      <td style={{ padding: padding, color: '#475569' }}>{item.install}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ flex: 1 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize, textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: padding, width: '30px' }}>Símb.</th>
                                    <th style={{ padding: padding }}>Descrição</th>
                                    <th style={{ padding: padding, width: '45px' }}>Instal.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {col2.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                                      <td style={{ padding: padding, textAlign: 'center' }}>{item.symbol}</td>
                                      <td style={{ padding: padding }}>{item.desc}</td>
                                      <td style={{ padding: padding, color: '#475569' }}>{item.install}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={type} style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '4px', backgroundColor: '#fcfcfc', overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '8px', display: 'block' }}>LEGENDA DE SIMBOLOGIA ELÉTRICA</span>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize, textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: padding, width: '40px' }}>Símbolo</th>
                              <th style={{ padding: padding }}>Descrição</th>
                              <th style={{ padding: padding, width: '60px' }}>Instalação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {legendItems.map((item, i) => (
                              <tr key={i} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                                <td style={{ padding: padding, textAlign: 'center' }}>{item.symbol}</td>
                                <td style={{ padding: padding }}>{item.desc}</td>
                                <td style={{ padding: padding, color: '#475569' }}>{item.install}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Carimbo / Selo ABNT da Prancha no Canto Inferior Direito */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: isSmallSheet ? '240px' : '280px',
                height: isSmallSheet ? '95px' : '110px',
                borderTop: '1.5px solid #000',
                borderLeft: '1.5px solid #000',
                backgroundColor: '#fafafa',
                padding: '8px',
                display: 'flex',
                gap: '8px',
                fontSize: isSmallSheet ? '8px' : '9px',
                lineHeight: '1.3'
              }}>
                {/* Coluna 1: Logotipo */}
                <div style={{
                  width: isSmallSheet ? '65px' : '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid #ddd',
                  paddingRight: '6px'
                }}>
                  {paperLogo ? (
                    <img src={paperLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" width={isSmallSheet ? "24" : "28"} height={isSmallSheet ? "24" : "28"} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  )}
                </div>

                {/* Coluna 2: Informações */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: isSmallSheet ? '8.5px' : '10px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      PROJ.: {projectName}
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Prop.: {paperOwner}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Resp.: {paperDesigner}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '2px', fontSize: isSmallSheet ? '7px' : '8px', color: '#475569' }}>
                    <span>Esc.: 1:{useCadStore.getState().projectScale}</span>
                    <strong style={{ color: '#000' }}>Folha: {activeSheet.code}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>

      </div>

      <BottomBar activeTab={activeTab} />
    </div>
  );
};
