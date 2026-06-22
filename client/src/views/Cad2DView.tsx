import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CadCanvas } from '../components/Cad2D/CadCanvas';
import { PropertiesPanel } from '../components/PropertiesPanel';

import { useCadStore } from '../store/useCadStore';
import { dimensionateCircuit } from '../utils/nbr5410';
import type { ToolType, DeviceType } from '../types';

interface Cad2DViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets') => void;
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
    projectName, materialsList,
    setBgImageSrc, setBgImageLock, setIsCalibrating,
    setBgImageSelected,
    addCircuit, removeCircuit,
    walls, ppm, texts, dimensions: cadDimensions,
  } = useCadStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // File System Access API — guarda o file handle para sobrescrita silenciosa
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const [_saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [isDimensioningOpen, setIsDimensioningOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<'dimensioning' | 'quantitative' | 'budget'>('dimensioning');

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

    // Exportar função de snapshot para as Pranchas (SheetsView) acessarem
    (window as any).captureCad2DSnapshot = () => {
      const stage = (window as any).cadStage;
      if (!stage) return null;

      try {
        const stageW = stage.width();
        const stageH = stage.height();
        
        let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
        const addPoint = (x: number, y: number) => {
          const px = x * useCadStore.getState().ppm;
          const py = y * useCadStore.getState().ppm;
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
        };
        
        useCadStore.getState().walls.forEach(w => { addPoint(w.p1.x, w.p1.y); addPoint(w.p2.x, w.p2.y); });
        useCadStore.getState().devices.forEach(d => addPoint(d.x, d.y));
        useCadStore.getState().texts.forEach(t => addPoint(t.x, t.y));
        
        if (minX === Infinity) { minX = 0; minY = 0; maxX = stageW; maxY = stageH; }
        const safetyMargin = 40;
        minX -= safetyMargin; minY -= safetyMargin; maxX += safetyMargin; maxY += safetyMargin;
        const boxW = maxX - minX; const boxH = maxY - minY;
        
        const scaleX = stageW / boxW; const scaleY = stageH / boxH;
        const fitScale = Math.min(scaleX, scaleY);
        const centerX = minX + boxW / 2; const centerY = minY + boxH / 2;
        const panX = stageW / 2 - centerX * fitScale;
        const panY = stageH / 2 - centerY * fitScale;

        const oldZoom = stage.scaleX(); const oldX = stage.x(); const oldY = stage.y();
        
        let transformerNode: any = null; const transformerNodes: any[] = [];
        try {
          transformerNode = stage.findOne('Transformer');
          if (transformerNode) { transformerNodes.push(...transformerNode.nodes()); transformerNode.nodes([]); }
        } catch (e) {}

        stage.scale({ x: fitScale, y: fitScale });
        stage.position({ x: panX, y: panY });
        stage.batchDraw();

        const dataUrl = stage.toDataURL({ x: 0, y: 0, width: stageW, height: stageH, pixelRatio: 2 });

        stage.scale({ x: oldZoom, y: oldZoom });
        stage.position({ x: oldX, y: oldY });
        if (transformerNode && transformerNodes.length > 0) transformerNode.nodes(transformerNodes);
        stage.batchDraw();

        return dataUrl;
      } catch (err) {
        return null;
      }
    };

    return () => {
      ro.disconnect();
      delete (window as any).captureCad2DSnapshot;
    };
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
          projectName, walls, devices, circuits, conduits, guideLines, texts, dimensions, ppm,
          bgImageSrc, bgImageLock, bgImageScale, bgImageScaleX, bgImageScaleY, bgImagePos, bgImageRotation
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
          bgImageSrc: bgImageSrc || null,
          bgImageLock: bgImageLock !== undefined ? bgImageLock : true,
          bgImageScaleX: bgImageScaleX || bgImageScale || 1.0,
          bgImageScaleY: bgImageScaleY || bgImageScale || 1.0,
          bgImagePos: bgImagePos || { x: 0, y: 0 },
          bgImageRotation: bgImageRotation || 0,
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



  // Estado local para itens manuais adicionados pelo usuário e overrides de preço/nome/quantidade
  const [manualBudgetItems, setManualBudgetItems] = useState<Array<{
    id: string;
    name: string;
    qty: string;
    unit: string;
    price: number;
    category: 'fiacao_cabos' | 'protecao' | 'infraestrutura' | 'dispositivos';
  }>>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, string>>({});

  const autoBudgetItems = (materialsList || []).map(item => {
    const originalName = item.name;
    const name = nameOverrides[originalName] !== undefined ? nameOverrides[originalName] : item.name;
    const qty = qtyOverrides[originalName] !== undefined ? qtyOverrides[originalName] : item.qty.toString();
    const price = priceOverrides[originalName] !== undefined ? priceOverrides[originalName] : (item.price ?? 12.00);
    const qtyFloat = parseFloat(qty) || 0;
    return {
      originalName,
      name,
      qty,
      unit: item.unit,
      price,
      total: qtyFloat * price,
      category: item.category || 'dispositivos',
      isAuto: true,
    };
  });

  // Combina itens automáticos (com overrides) + itens manuais
  const budgetItems = [
    ...autoBudgetItems,
    ...manualBudgetItems.map(item => {
      const qtyFloat = parseFloat(item.qty) || 0;
      return {
        originalName: item.id,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        price: item.price,
        total: qtyFloat * item.price,
        category: item.category,
        isAuto: false,
      };
    })
  ];

  const grandTotal = budgetItems.reduce((sum, item) => sum + item.total, 0);

  const categoriesList: Array<{
    key: 'fiacao_cabos' | 'protecao' | 'infraestrutura' | 'dispositivos';
    title: string;
    icon: string;
  }> = [
    { key: 'fiacao_cabos', title: 'Fiação / Cabos', icon: '🔌' },
    { key: 'protecao', title: 'Proteção (Disjuntores/DR)', icon: '🛡️' },
    { key: 'infraestrutura', title: 'Infraestrutura (Eletrodutos/Caixas)', icon: '🧱' },
    { key: 'dispositivos', title: 'Dispositivos (Tomadas/Interruptores)', icon: '💡' },
  ];

  const renderCategoryTable = (isBudgetTab: boolean) => {
    if (budgetItems.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
          Sem materiais. Desenhe paredes, adicione pontos elétricos e conduítes.
        </div>
      );
    }

    return (
      <div className="dimensioning-table-wrapper">
        <table className="dimensioning-table">
          <thead>
            <tr>
              <th>Descrição do Material</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Quant.</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Unid.</th>
              {isBudgetTab && <th style={{ width: '110px', textAlign: 'right' }}>Unitário (R$)</th>}
              {isBudgetTab && <th style={{ width: '110px', textAlign: 'right' }}>Total (R$)</th>}
              <th style={{ width: '180px' }}>Seção / Categoria</th>
              <th style={{ width: '50px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categoriesList.map(cat => {
              const itemsInCat = budgetItems.filter(item => item.category === cat.key);

              return (
                <React.Fragment key={cat.key}>
                  {/* Cabeçalho da Seção */}
                  <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                    <td colSpan={isBudgetTab ? 7 : 5} style={{ padding: '10px 12px', color: '#1e3a8a', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                      <span style={{ marginRight: '6px' }}>{cat.icon}</span> {cat.title}
                    </td>
                  </tr>

                  {itemsInCat.length === 0 ? (
                    <tr>
                      <td colSpan={isBudgetTab ? 7 : 5} style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        Nenhum material nesta categoria.
                      </td>
                    </tr>
                  ) : (
                    itemsInCat.map((item, idx) => (
                      <tr key={`${item.isAuto ? 'a' : 'm'}-${item.originalName}-${idx}`} style={{ background: !item.isAuto ? '#fefce8' : undefined }}>
                        {/* Nome editável */}
                        <td>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              if (item.isAuto) {
                                setNameOverrides(prev => ({ ...prev, [item.originalName]: e.target.value }));
                              } else {
                                setManualBudgetItems(prev => prev.map(m => m.id === item.originalName ? { ...m, name: e.target.value } : m));
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
                        <td className="mono" style={{ textAlign: 'center' }}>
                          <input
                            type="text"
                            value={item.qty}
                            onChange={(e) => {
                              if (item.isAuto) {
                                setQtyOverrides(prev => ({ ...prev, [item.originalName]: e.target.value }));
                              } else {
                                setManualBudgetItems(prev => prev.map(m => m.id === item.originalName ? { ...m, qty: e.target.value } : m));
                              }
                            }}
                            style={{
                              border: 'none', background: 'transparent', fontFamily: 'monospace',
                              fontSize: '0.8rem', color: '#0f172a', width: '60px', padding: '4px 2px',
                              outline: 'none', borderBottom: '1px dashed #cbd5e1', textAlign: 'center',
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.unit}</td>
                        {/* Preço editável (apenas se for aba de orçamento) */}
                        {isBudgetTab && (
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
                                    setPriceOverrides(prev => ({ ...prev, [item.originalName]: val }));
                                  } else {
                                    setManualBudgetItems(prev => prev.map(m => m.id === item.originalName ? { ...m, price: val } : m));
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
                        )}
                        {/* Total calculado (apenas se for aba de orçamento) */}
                        {isBudgetTab && (
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            R$ {item.total.toFixed(2)}
                          </td>
                        )}
                        {/* Select de Categoria */}
                        <td>
                          {item.isAuto ? (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                              {categoriesList.find(c => c.key === item.category)?.title}
                            </span>
                          ) : (
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const catVal = e.target.value as any;
                                setManualBudgetItems(prev => prev.map(m => m.id === item.originalName ? { ...m, category: catVal } : m));
                              }}
                              style={{
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                padding: '2px 4px',
                                color: '#334155',
                                background: '#fff',
                                outline: 'none',
                                width: '100%'
                              }}
                            >
                              {categoriesList.map(c => (
                                <option key={c.key} value={c.key}>{c.title}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        {/* Botão de Excluir */}
                        <td style={{ textAlign: 'center' }}>
                          {item.isAuto ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }} title="Item automático do canvas">🔒</span>
                          ) : (
                            <button
                              onClick={() => {
                                setManualBudgetItems(prev => prev.filter(m => m.id !== item.originalName));
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
                </React.Fragment>
              );
            })}

            {/* Linha de Total Geral de Orçamento */}
            {isBudgetTab && budgetItems.length > 0 && (
              <tr style={{ fontWeight: 'bold', fontSize: '0.9rem', background: '#f0f9ff' }}>
                <td colSpan={4} style={{ textAlign: 'right', color: '#1e3a8a', borderTop: '2px solid #2563eb', padding: '12px' }}>
                  VALOR TOTAL ESTIMADO DO PROJETO:
                </td>
                <td className="mono" style={{ textAlign: 'right', color: '#2563eb', borderTop: '2px solid #2563eb', fontSize: '1rem', whiteSpace: 'nowrap', padding: '12px' }}>
                  R$ {grandTotal.toFixed(2)}
                </td>
                <td colSpan={2} style={{ borderTop: '2px solid #2563eb' }}></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Botão adicionar item manual */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0', gap: '8px' }}>
          <button
            className="modal-action-btn"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            onClick={() => {
              setManualBudgetItems(prev => [
                ...prev,
                {
                  id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: 'Novo Material',
                  qty: '1',
                  unit: 'un',
                  price: 0.00,
                  category: 'dispositivos'
                }
              ]);
            }}
          >
            ➕ Adicionar Item Manual
          </button>
          <button
            className="modal-action-btn"
            style={{ fontSize: '0.8rem', padding: '6px 14px', background: '#64748b', color: '#fff' }}
            onClick={() => {
              if (window.confirm('Deseja resetar todas as edições manuais e itens adicionados?')) {
                setPriceOverrides({});
                setNameOverrides({});
                setQtyOverrides({});
                setManualBudgetItems([]);
              }
            }}
            title="Restaura nomes e preços originais e remove itens manuais"
          >
            🔄 Resetar Edições
          </button>
        </div>
      </div>
    );
  };

  const handleExportPDF = () => {
    const pw = window.open('', '_blank');
    if (!pw) { alert('Habilite pop-ups para gerar o PDF.'); return; }

    let drawingPage = '';
    const stage = (window as any).cadStage;
    if (stage) {
      try {
        const stageW = stage.width();
        const stageH = stage.height();

        // Calcular Bounding Box real em pixels com base na posição em metros dos elementos e ppm
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const addPoint = (x: number, y: number) => {
          const px = x * ppm;
          const py = y * ppm;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        };

        walls.forEach(w => {
          addPoint(w.p1.x, w.p1.y);
          addPoint(w.p2.x, w.p2.y);
        });

        devices.forEach(d => {
          addPoint(d.x, d.y);
        });

        if (texts) {
          texts.forEach(t => {
            addPoint(t.x, t.y);
          });
        }

        if (cadDimensions) {
          cadDimensions.forEach(d => {
            addPoint(d.p1.x, d.p1.y);
            addPoint(d.p2.x, d.p2.y);
          });
        }

        // Fallback para stage inteiro se o canvas estiver vazio
        if (minX === Infinity) {
          minX = 0;
          minY = 0;
          maxX = stageW;
          maxY = stageH;
        }

        // Adicionar margem de segurança
        const safetyMargin = 40;
        minX -= safetyMargin;
        minY -= safetyMargin;
        maxX += safetyMargin;
        maxY += safetyMargin;

        const boxW = maxX - minX;
        const boxH = maxY - minY;

        // Calcular escala de Fit
        const scaleX = stageW / boxW;
        const scaleY = stageH / boxH;
        const fitScale = Math.min(scaleX, scaleY);

        // Calcular centralização
        const centerX = minX + boxW / 2;
        const centerY = minY + boxH / 2;
        const panX = stageW / 2 - centerX * fitScale;
        const panY = stageH / 2 - centerY * fitScale;

        // Guardar transformações originais do Stage
        const oldZoom = stage.scaleX();
        const oldX = stage.x();
        const oldY = stage.y();

        // Ocultar temporariamente contornos do Transformer para que não saiam na foto
        let transformerNode: any = null;
        const transformerNodes: any[] = [];
        try {
          transformerNode = stage.findOne('Transformer');
          if (transformerNode) {
            transformerNodes.push(...transformerNode.nodes());
            transformerNode.nodes([]);
          }
        } catch (e) {
          console.error(e);
        }

        // Aplicar escala e posição de ajuste temporárias
        stage.scale({ x: fitScale, y: fitScale });
        stage.position({ x: panX, y: panY });
        stage.batchDraw();

        // Capturar a viewport inteira (do pixel 0,0 até width,height)
        const dataUrl = stage.toDataURL({
          x: 0,
          y: 0,
          width: stageW,
          height: stageH,
          pixelRatio: 2
        });

        // Restaurar estado do Stage e do Transformer
        stage.scale({ x: oldZoom, y: oldZoom });
        stage.position({ x: oldX, y: oldY });
        if (transformerNode && transformerNodes.length > 0) {
          transformerNode.nodes(transformerNodes);
        }
        stage.batchDraw();

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

    // Gerar as páginas categorizadas e limpas para o PDF
    const renderPdfSection = (isBudget: boolean) => {
      return categoriesList.map(cat => {
        const items = budgetItems.filter(item => item.category === cat.key);
        if (items.length === 0) return '';
        return `
        <tr style="background:#f1f5f9;font-weight:bold"><td colspan="${isBudget ? 5 : 3}">${cat.icon} ${cat.title}</td></tr>
        ${items.map(i => {
          if (isBudget) {
            return `<tr><td>${i.name}</td><td class="mono" style="text-align:center">${i.qty}</td><td style="text-align:center">${i.unit}</td><td class="mono tr">R$ ${i.price.toFixed(2)}</td><td class="mono tr" style="font-weight:bold">R$ ${i.total.toFixed(2)}</td></tr>`;
          } else {
            return `<tr><td>${i.name}</td><td class="mono" style="text-align:center">${i.qty}</td><td style="text-align:center">${i.unit}</td></tr>`;
          }
        }).join('')}
        `;
      }).join('');
    };

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
        const tp = cd.reduce((s, d) => s + (d.power || 0), 0);
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
      <h3>Lista Quantitativa de Materiais (Lista de Compra)</h3>
      <table><thead><tr><th>Descrição do Material</th><th style="width:100px;text-align:center">Quantidade</th><th style="width:80px;text-align:center">Unidade</th></tr></thead><tbody>
      ${renderPdfSection(false)}
      </tbody></table>
    </div>

    <div class="page">
      <h1>${projectName}</h1>
      <h3>Orçamento Estimado do Projeto</h3>
      <table><thead><tr><th>Descrição do Material</th><th style="width:100px;text-align:center">Quantidade</th><th style="width:80px;text-align:center">Unidade</th><th class="tr" style="width:120px">Unitário (R$)</th><th class="tr" style="width:120px">Total (R$)</th></tr></thead><tbody>
      ${renderPdfSection(true)}
      <tr style="font-size:0.9rem;font-weight:bold"><td colspan="4" style="text-align:right;border-top:2px solid #2563eb;padding:12px">VALOR TOTAL ESTIMADO:</td><td class="mono tr" style="color:#2563eb;border-top:2px solid #2563eb;padding:12px">R$ ${grandTotal.toFixed(2)}</td></tr>
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



      <div className="cad2d-workspace">
        <div className="cad2d-canvas-wrapper" ref={containerRef}>
          <CadCanvas width={dimensions.width} height={dimensions.height} />

          {bgImageSrc && (
            <div className="canvas-statusbar">
              <span className="status-pill status-green">📐 Planta Base Ativa</span>
              <button
                className={`status-btn ${bgImageLock ? '' : 'status-btn-warn'}`}
                onClick={() => {
                  const nextLock = !bgImageLock;
                  setBgImageLock(nextLock);
                  setBgImageSelected(!nextLock);
                }}
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
                    📊 Quadro de Cargas / Dimensionamento
                  </button>
                  <button
                    className={`modal-tab ${modalActiveTab === 'quantitative' ? 'active' : ''}`}
                    onClick={() => setModalActiveTab('quantitative')}
                  >
                    📋 Lista Quantitativa
                  </button>
                  <button
                    className={`modal-tab ${modalActiveTab === 'budget' ? 'active' : ''}`}
                    onClick={() => setModalActiveTab('budget')}
                  >
                    💰 Orçamento Final
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

                  {(() => {
                    // Lógica de Validação NBR 5410
                    const mixedAlerts = (() => {
                      const list: string[] = [];
                      circuits.forEach(c => {
                        const cd = devices.filter(d => d.circuitId === c.id);
                        const hasLight = cd.some(d => ['ceiling_light', 'sconce', 'fluorescent', 'lampada'].includes(d.type));
                        const hasSocket = cd.some(d => d.type.startsWith('tug_') || d.type.startsWith('tue_') || d.type === 'tomada_220');
                        if (hasLight && hasSocket) {
                          list.push(`Circuito ${c.number} (${c.name}): Misto. A NBR 5410 (Art. 9.5.3) exige circuitos separados para iluminação e tomadas.`);
                        }
                      });
                      return list;
                    })();

                    const drAlerts = (() => {
                      const list: string[] = [];
                      const qdc = devices.find(d => d.type === 'qdc');
                      const hasDRInQDC = qdc && qdc.qdcDRType && qdc.qdcDRType !== 'none';
                      
                      circuits.forEach(c => {
                        const cd = devices.filter(d => d.circuitId === c.id);
                        const isWetArea = cd.some(d => {
                          const nameLower = (d.name || '').toLowerCase();
                          return nameLower.includes('cozinha') ||
                                 nameLower.includes('banheiro') ||
                                 nameLower.includes('serviço') ||
                                 nameLower.includes('lavanderia') ||
                                 nameLower.includes('copa') ||
                                 nameLower.includes('molhada') ||
                                 nameLower.includes('wc');
                        });
                        
                        if (isWetArea && !hasDRInQDC) {
                          const hasLocalDR = cd.some(d => ['device_dr', 'dr', 'idr'].includes(d.type));
                          if (!hasLocalDR) {
                            list.push(`Circuito ${c.number} (${c.name}): Falta DR. Áreas molhadas exigem obrigatoriamente dispositivo DR de 30mA (Art. 5.1.3.2.2).`);
                          }
                        }
                      });
                      return list;
                    })();

                    const dpsAlerts = (() => {
                      const list: string[] = [];
                      const qdc = devices.find(d => d.type === 'qdc');
                      if (!qdc || !qdc.qdcHasDPS) {
                        list.push("Aterramento / Entrada: Falta proteção contra surtos elétricos (DPS) no Quadro de Distribuição (Art. 5.4.2.1).");
                      }
                      return list;
                    })();

                    const groundAlerts = (() => {
                      const list: string[] = [];
                      const hasGround = devices.some(d => d.type === 'ground_rod' || d.type === 'aterramento');
                      if (!hasGround) {
                        list.push("Aterramento: Haste de Aterramento (PE) não localizada. Toda instalação deve dispor de aterramento normativo (Art. 6.4.1).");
                      }
                      return list;
                    })();

                    const overloadAlerts = (() => {
                      const list: string[] = [];
                      circuits.forEach(c => {
                        const cd = devices.filter(d => d.circuitId === c.id);
                        const totalPower = cd.reduce((sum, d) => sum + (d.power || 0), 0);
                        const qdc = devices.find(d => d.type === 'qdc');
                        let maxDist = 10.0;
                        if (qdc && cd.length > 0) {
                          maxDist = Math.max(...cd.map(d => Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0));
                        }
                        const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, maxDist, c.groupedCircuits);
                        if (res.currentProject > 16 && c.type === 'tug') {
                          list.push(`Circuito ${c.number} (${c.name}): Corrente de projeto (${res.currentProject.toFixed(1)}A) excede 16A. Risco de sobrecarga.`);
                        }
                        if (res.voltageDropPercent > 4.0) {
                          list.push(`Circuito ${c.number} (${c.name}): Queda de tensão elevada (${res.voltageDropPercent.toFixed(1)}%). Máximo normativo é 4.0%.`);
                        }
                      });
                      return list;
                    })();

                    const allAlerts = [...mixedAlerts, ...drAlerts, ...dpsAlerts, ...groundAlerts, ...overloadAlerts];

                    return (
                      <div className="nbr-diagnosis-card" style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px',
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          paddingBottom: '8px',
                          marginBottom: '12px'
                        }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🛡️ Diagnóstico Técnico & Validações NBR 5410
                          </h4>
                          <span style={{
                            background: allAlerts.length === 0 ? '#dcfce7' : '#fee2e2',
                            color: allAlerts.length === 0 ? '#15803d' : '#b91c1c',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}>
                            {allAlerts.length === 0 ? '✓ CONFORME' : `✗ ${allAlerts.length} ALERTA(S)`}
                          </span>
                        </div>

                        {allAlerts.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '0.8rem' }}>
                            <span>🎉</span>
                            <span><strong>Conformidade Total:</strong> Todos os testes normativos básicos da NBR 5410 passaram com sucesso neste projeto!</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {allAlerts.map((alert, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                background: '#fff1f1',
                                border: '1px solid #fecaca',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                color: '#991b1b'
                              }}>
                                <span style={{ marginTop: '1px' }}>⚠️</span>
                                <span>{alert}</span>
                              </div>
                            ))}
                          </div>
                        )}
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
                            const totalPower = cd.reduce((s, d) => s + (d.power || 0), 0);
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

              {modalActiveTab === 'quantitative' && renderCategoryTable(false)}
              {modalActiveTab === 'budget' && renderCategoryTable(true)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
