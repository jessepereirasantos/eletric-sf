import React, { useState, useRef, useEffect } from 'react';
import { useCadStore } from '../store/useCadStore';
import { BottomBar } from '../components/BottomBar';
import { dimensionateCircuit } from '../utils/nbr5410';
import { calculateWiringRouting } from '../utils/pathfinding';
import type { Sheet } from '../types';

interface SheetsViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets') => void;
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
    paperLogo,
    sheetsList,
    activeSheetId,
    addSheet,
    removeSheet,
    updateSheet,
    setActiveSheetId,
    updateViewportGeometry,
    addViewportToSheet,
    removeViewportFromSheet,
    snapshots3D
  } = useCadStore();

  const [selectedViewportId, setSelectedViewportId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; vpX: number; vpY: number; vpW: number; vpH: number; isResize: boolean } | null>(null);

  // Observador de tamanho do contêiner para aplicar transform: scale automática
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerSize({
          w: entry.contentRect.width - 60, // margem de segurança
          h: entry.contentRect.height - 60
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const activeSheet = sheetsList.find(s => s.id === activeSheetId) || sheetsList[0] || {
    id: 'sheet_1',
    code: 'PR-01/01',
    title: 'Planta de Distribuição Elétrica',
    size: 'A1',
    orientation: 'landscape',
    viewports: []
  };

  // Configurações de tamanho real de folha ABNT (em milímetros)
  const getSheetDimensionsMM = (size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4', orientation: 'landscape' | 'portrait') => {
    const sizes = {
      A0: { w: 1189, h: 841 },
      A1: { w: 841, h: 594 },
      A2: { w: 594, h: 420 },
      A3: { w: 420, h: 297 },
      A4: { w: 297, h: 210 },
    };
    const dim = sizes[size] || sizes.A1;
    return orientation === 'landscape' ? { w: dim.w, h: dim.h } : { w: dim.h, h: dim.w };
  };

  const dimMM = getSheetDimensionsMM(activeSheet.size, activeSheet.orientation);
  
  // Fator de escala dinâmico de alta resolução
  const scaleMultiplier = 3.2;
  const sheetPixelW = dimMM.w * scaleMultiplier;
  const sheetPixelH = dimMM.h * scaleMultiplier;

  // Escala final de exibição para caber no contêiner do monitor
  const fitScale = Math.min(containerSize.w / sheetPixelW, containerSize.h / sheetPixelH);

  // Adicionar uma nova folha técnica
  const handleCreateSheet = () => {
    const nextNum = sheetsList.length + 1;
    const newSheet: Omit<Sheet, 'id'> = {
      code: `PR-0${nextNum}/0${nextNum}`,
      title: `Nova Prancha Técnica ${nextNum}`,
      size: 'A1',
      orientation: 'landscape',
      viewports: [
        { id: `vp_planta_${Date.now()}`, type: 'planta', x: 5, y: 5, w: 60, h: 80 }
      ]
    };
    addSheet(newSheet as Sheet);
  };

  const handleRemoveSheet = (id: string) => {
    if (sheetsList.length <= 1) {
      alert('É necessário ter ao menos uma folha técnica no projeto.');
      return;
    }
    removeSheet(id);
  };

  // Alterar tipos de conteúdo alocados na folha técnica (Zustand)
  const handleToggleViewport = (type: 'planta' | 'cargas' | 'materiais' | 'unifilar' | 'legenda') => {
    const exists = activeSheet.viewports.find(vp => vp.type === type);
    if (exists) {
      removeViewportFromSheet(activeSheet.id, exists.id);
      if (selectedViewportId === exists.id) setSelectedViewportId(null);
    } else {
      addViewportToSheet(activeSheet.id, type);
    }
  };

  // Mouse handlers para arrastar e redimensionar viewports absolutas
  const handleViewportMouseDown = (e: React.MouseEvent, viewportId: string, isResize: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedViewportId(viewportId);

    const vp = activeSheet.viewports.find(v => v.id === viewportId);
    if (!vp) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vpX: vp.x,
      vpY: vp.y,
      vpW: vp.w,
      vpH: vp.h,
      isResize
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const drag = dragStartRef.current;
      const dx = moveEvent.clientX - drag.x;
      const dy = moveEvent.clientY - drag.y;

      const sheetElement = document.getElementById('sheet-inner-border');
      if (!sheetElement) return;
      const rect = sheetElement.getBoundingClientRect();
      
      const dxPercent = (dx / rect.width) * 100;
      const dyPercent = (dy / rect.height) * 100;

      if (drag.isResize) {
        const newW = Math.max(10, Math.min(100 - drag.vpX, drag.vpW + dxPercent));
        const newH = Math.max(10, Math.min(100 - drag.vpY, drag.vpH + dyPercent));
        updateViewportGeometry(activeSheet.id, viewportId, {
          w: Number(newW.toFixed(1)),
          h: Number(newH.toFixed(1))
        });
      } else {
        const newX = Math.max(0, Math.min(100 - drag.vpW, drag.vpX + dxPercent));
        const newY = Math.max(0, Math.min(100 - drag.vpH, drag.vpY + dyPercent));
        updateViewportGeometry(activeSheet.id, viewportId, {
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1))
        });
      }
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ─────────────────────────────────────────────────────────────
  // Funções de Geração de SVG real para Impressão e Tela
  // ─────────────────────────────────────────────────────────────
  const getPlantaSVGContent = () => {
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
    const wiringRouting = calculateWiringRouting(devices, conduits, circuits) || {};

    return (
      <svg viewBox={vb} style={{ width: '100%', height: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}>
        <style>
          {`
            text {
              font-family: Arial, Helvetica, sans-serif;
              font-weight: bold;
            }
            line, polyline, path, rect, circle, polygon {
              vector-effect: non-scaling-stroke;
            }
          `}
        </style>

        {/* Paredes - Polígonos Fechados com Preenchimento Branco para Ocultar Fiação */}
        {walls.map(w => {
          const dx = w.p2.x - w.p1.x;
          const dy = w.p2.y - w.p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return null;
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;
          const t = w.thickness || 0.15;
          const halfT = t / 2;

          const p1a_x = w.p1.x + halfT * nx;
          const p1a_y = w.p1.y + halfT * ny;
          const p2a_x = w.p2.x + halfT * nx;
          const p2a_y = w.p2.y + halfT * ny;

          const p1b_x = w.p1.x - halfT * nx;
          const p1b_y = w.p1.y - halfT * ny;
          const p2b_x = w.p2.x - halfT * nx;
          const p2b_y = w.p2.y - halfT * ny;

          const pts = `${p1a_x},${p1a_y} ${p2a_x},${p2a_y} ${p2b_x},${p2b_y} ${p1b_x},${p1b_y}`;
          return (
            <polygon
              key={w.id}
              points={pts}
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="0.015"
            />
          );
        })}
        
        {/* Conduítes e Anotações de Fiações Reais */}
        {conduits.map(c => {
          const from = devices.find(d => d.id === c.fromDeviceId);
          const to = devices.find(d => d.id === c.toDeviceId);
          if (!from || !to) return null;
          
          let conduitMarkup = null;
          let ptsList: { x: number; y: number }[] = [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
          if (c.waypoints && c.waypoints.length > 0) {
            ptsList = [{ x: from.x, y: from.y }, ...c.waypoints, { x: to.x, y: to.y }];
            const ptsStr = ptsList.map(p => `${p.x},${p.y}`).join(' ');
            conduitMarkup = <polyline points={ptsStr} fill="none" stroke="#64748b" strokeWidth="0.03" strokeDasharray="0.1, 0.08" />;
          } else {
            conduitMarkup = <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#64748b" strokeWidth="0.03" strokeDasharray="0.1, 0.08" />;
          }

          // Ponto médio e ângulo do segmento central
          const midIdx = Math.floor(ptsList.length / 2);
          const P1 = ptsList[midIdx - 1];
          const P2 = ptsList[midIdx];
          const midX = (P1.x + P2.x) / 2;
          const midY = (P1.y + P2.y) / 2;
          const dx = P2.x - P1.x;
          const dy = P2.y - P1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          let angleDeg = 0;
          if (len > 0) {
            angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
          }

          const wires = wiringRouting[c.id] || [];
          if (wires.length === 0) {
            return <g key={c.id}>{conduitMarkup}</g>;
          }

          return (
            <g key={c.id}>
              {conduitMarkup}
              <g transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}>
                <circle cx={0} cy={0} r={0.12 * Math.max(1, wires.length)} fill="#ffffff" opacity={0.95} stroke="#cbd5e1" strokeWidth="0.01" />
                {wires.map((wire: any, wIdx: number) => {
                  const elements: React.ReactNode[] = [];
                  const xOffset = (wIdx - (wires.length - 1) / 2) * 0.14;
                  
                  const totalWires = wire.phase + wire.neutral + wire.ground + wire.ret;
                  const traceSpacing = 0.03;
                  let off = -((totalWires - 1) * traceSpacing) / 2;

                  // Fase
                  for (let i = 0; i < wire.phase; i++) {
                    elements.push(<line key={`f-${wIdx}-${i}`} x1={xOffset + off} y1={-0.06} x2={xOffset + off} y2={0.06} stroke="#dc2626" strokeWidth="0.012" />);
                    off += traceSpacing;
                  }
                  // Neutro
                  for (let i = 0; i < wire.neutral; i++) {
                    elements.push(
                      <g key={`n-${wIdx}-${i}`}>
                        <line x1={xOffset + off} y1={0} x2={xOffset + off} y2={-0.06} stroke="#2563eb" strokeWidth="0.012" />
                        <line x1={xOffset + off} y1={-0.06} x2={xOffset + off + 0.02} y2={-0.06} stroke="#2563eb" strokeWidth="0.012" />
                      </g>
                    );
                    off += traceSpacing;
                  }
                  // Terra
                  for (let i = 0; i < wire.ground; i++) {
                    elements.push(
                      <g key={`g-${wIdx}-${i}`}>
                        <line x1={xOffset + off} y1={0} x2={xOffset + off} y2={-0.06} stroke="#16a34a" strokeWidth="0.012" />
                        <line x1={xOffset + off - 0.015} y1={-0.06} x2={xOffset + off + 0.015} y2={-0.06} stroke="#16a34a" strokeWidth="0.012" />
                      </g>
                    );
                    off += traceSpacing;
                  }
                  // Retorno
                  for (let i = 0; i < wire.ret; i++) {
                    elements.push(<line key={`r-${wIdx}-${i}`} x1={xOffset + off} y1={0} x2={xOffset + off} y2={-0.04} stroke="#ca8a04" strokeWidth="0.012" />);
                    off += traceSpacing;
                  }

                  // Número de circuito horizontalizado
                  elements.push(
                    <text
                      key={`lbl-${wIdx}`}
                      x={xOffset}
                      y={0.13}
                      fontSize="0.08"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="#374151"
                      transform={`rotate(${-angleDeg})`}
                    >
                      {wire.circuitNumber.toString()}
                    </text>
                  );
                  return elements;
                })}
              </g>
            </g>
          );
        })}

        {/* Portas e Janelas */}
        {devices.filter(d => d.type.startsWith('door') || d.type === 'window' || d.type === 'open_van').map(d => {
          const isDoor = d.type.startsWith('door');
          const isGiro = d.type === 'door' || d.type === 'door_pivotante';
          const color = isDoor ? '#78350f' : '#0ea5e9';
          const w = d.width ?? 0.8;
          return (
            <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
              <g transform={isGiro && d.flip ? 'scale(-1, 1)' : undefined}>
                {isGiro ? (
                  <>
                    <rect x={0} y={-0.03} width={w} height={0.06} fill={color} stroke="#000000" strokeWidth="0.015" opacity={0.85} />
                    <line x1={0} y1={0} x2={0} y2={-w} stroke="#000000" strokeWidth="0.015" />
                    <path d={`M 0,${-w} A ${w},${w} 0 0,1 ${w},0`} fill="none" stroke="#000000" strokeWidth="0.01" strokeDasharray="0.04, 0.04" />
                  </>
                ) : (
                  <rect x={-w / 2} y={-0.03} width={w} height={0.06} fill={color} stroke="#000000" strokeWidth="0.015" opacity={0.85} />
                )}
              </g>
            </g>
          );
        })}

        {/* Dispositivos Técnicos (NBR 5444 / NBR 5410) */}
        {devices.filter(d => !d.type.startsWith('door') && d.type !== 'window' && d.type !== 'open_van').map(d => {
          const S = 0.20;
          const H = S / 2;
          const thickness = 0.15;
          const wallOffset = -thickness / 2;
          
          const circ = circuits.find(c => c.id === d.circuitId);
          const circNum = circ ? circ.number : '1';
          
          if (['sofa', 'geladeira', 'fogao', 'cama', 'mesa_jantar'].includes(d.type)) {
            let boxW = 1.0, boxD = 1.0;
            let fillColor = '#ffffff';
            if (d.type === 'sofa') { boxW = d.width ?? 1.8; boxD = 0.85; fillColor = '#f8fafc'; }
            else if (d.type === 'geladeira') { boxW = d.width ?? 0.7; boxD = 0.7; fillColor = '#f8fafc'; }
            else if (d.type === 'fogao') { boxW = d.width ?? 0.7; boxD = 0.6; fillColor = '#f8fafc'; }
            else if (d.type === 'cama') { boxW = d.width ?? 1.6; boxD = 2.0; fillColor = '#f8fafc'; }
            else if (d.type === 'mesa_jantar') { boxW = d.width ?? 1.2; boxD = 0.8; fillColor = '#f8fafc'; }
            
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <rect x={-boxW / 2} y={-boxD / 2} width={boxW} height={boxD} rx="0.04" ry="0.04" fill={fillColor} stroke="#475569" strokeWidth="0.015" />
              </g>
            );
          }

          // Tomadas
          const isTomadaBaixa = d.type === 'tomada_baixa' || d.type === 'tug_baixa' || d.type === 'tomada_10a_nbr' || d.type === 'tomada_20a';
          const isTomadaMedia = d.type === 'tomada_media' || d.type === 'tug_media';
          const isTomadaAlta = d.type === 'tomada_alta' || d.type === 'tug_alta' || d.type === 'tue_chuveiro' || d.type === 'tue_ar' || d.type === 'tomada_220';

          if (isTomadaBaixa || isTomadaMedia || isTomadaAlta) {
            let fillVal = '#ffffff';
            if (isTomadaAlta) fillVal = '#000000';
            
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <g transform={`translate(0, ${wallOffset})`}>
                  <line x1={-H * 1.3} y1={0} x2={H * 1.3} y2={0} stroke="#000000" strokeWidth="0.02" />
                  
                  {isTomadaMedia ? (
                    <>
                      <polygon points={`-${H},0 0,-${H * 1.5} 0,0`} fill="#000000" stroke="#000000" strokeWidth="0.015" />
                      <polygon points={`0,0 0,-${H * 1.5} ${H},0`} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                    </>
                  ) : (
                    <polygon points={`-${H},0 0,-${H * 1.5} ${H},0`} fill={fillVal} stroke="#000000" strokeWidth="0.015" />
                  )}

                  {d.type === 'tue_chuveiro' && (
                    <text x={H * 1.2} y={-H * 1.2} fontSize="0.10" fontWeight="bold" fill="#000000">CH</text>
                  )}
                  {d.type === 'tue_ar' && (
                    <text x={H * 1.2} y={-H * 1.2} fontSize="0.10" fontWeight="bold" fill="#000000">AR</text>
                  )}
                  {d.type === 'tomada_220' && (
                    <>
                      <line x1={0} y1={0} x2={0} y2={-H * 1.5} stroke="#000000" strokeWidth="0.015" />
                      <text x={H * 1.2} y={-H * 1.2} fontSize="0.08" fontWeight="bold" fill="#000000">220</text>
                    </>
                  )}
                  
                  <text x="0" y={-H * 2.2} fontSize="0.09" fontWeight="bold" textAnchor="middle" fill="#000000">{d.power ?? 100}VA</text>
                  <text x="0" y={H * 0.9} fontSize="0.09" fontWeight="bold" textAnchor="middle" fill="#000000">-{circNum}-</text>
                </g>
              </g>
            );
          }

          // Interruptores
          const isInterruptor = d.type.includes('switch') || d.type.includes('interruptor') || d.type === 'sensor_presenca';
          if (isInterruptor) {
            const isParallel = d.type === 'switch_parallel';
            const isIntermediate = d.type === 'switch_intermediate';
            const isDuplo = d.type === 'interruptor_duplo';
            const isTriplo = d.type === 'interruptor_triplo';
            
            let circleFill = '#ffffff';
            if (isParallel) circleFill = '#000000';

            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <g transform={`translate(0, ${wallOffset})`}>
                  <line x1={-H * 1.3} y1={0} x2={H * 1.3} y2={0} stroke="#000000" strokeWidth="0.02" />
                  
                  {isDuplo ? (
                    <>
                      <line x1={-H * 0.3} y1={0} x2={-H * 0.3} y2={-H * 1.5} stroke="#000000" strokeWidth="0.015" />
                      <line x1={H * 0.3} y1={0} x2={H * 0.3} y2={-H * 1.5} stroke="#000000" strokeWidth="0.015" />
                      <circle cx={-H * 0.3} cy={-H * 1.5} r={H * 0.4} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                      <circle cx={H * 0.3} cy={-H * 1.5} r={H * 0.4} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                    </>
                  ) : isTriplo ? (
                    <>
                      <line x1={-H * 0.5} y1={0} x2={-H * 0.5} y2={-H * 1.5} stroke="#000000" strokeWidth="0.015" />
                      <line x1={0} y1={0} x2={0} y2={-H * 1.5} stroke="#000000" strokeWidth="0.015" />
                      <line x1={H * 0.5} y1={0} x2={H * 0.5} y2={-H * 1.5} stroke="#000000" strokeWidth="0.015" />
                      <circle cx={-H * 0.5} cy={-H * 1.5} r={H * 0.35} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                      <circle cx={0} cy={-H * 1.5} r={H * 0.35} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                      <circle cx={H * 0.5} cy={-H * 1.5} r={H * 0.35} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                    </>
                  ) : (
                    <>
                      <line x1={0} y1={0} x2={0} y2={-H * 1.5} stroke="#000000" strokeWidth="0.015" />
                      <circle cx={0} cy={-H * 1.5} r={H * 0.5} fill={circleFill} stroke="#000000" strokeWidth="0.015" />
                      {isIntermediate && (
                        <path d={`M 0,${-H * 2.0} A ${H * 0.5},${H * 0.5} 0 0,1 0,${-H}`} fill="#000000" stroke="#000000" strokeWidth="0.015" />
                      )}
                    </>
                  )}
                  
                  <text x={H * 0.7} y={-H * 1.6} fontSize="0.10" fontWeight="bold" fill="#000000">
                    {`${d.commandLetter ?? 'a'}${circNum}`}
                  </text>
                </g>
              </g>
            );
          }

          // Lâmpadas no Teto
          if (d.type === 'ceiling_light' || d.type === 'lampada') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y})`}>
                <circle cx={0} cy={0} r={H} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <line x1={-H} y1={0} x2={H} y2={0} stroke="#000000" strokeWidth="0.015" />
                <line x1={0} y1={0} x2={0} y2={H} stroke="#000000" strokeWidth="0.015" />
                
                <text x="0" y={-H * 0.2} fontSize="0.08" fontWeight="bold" textAnchor="middle" fill="#000000">{d.power ?? 100}W</text>
                <text x={-H * 0.45} y={H * 0.7} fontSize="0.08" textAnchor="middle" fill="#000000">{d.commandLetter ?? 'a'}</text>
                <text x={H * 0.45} y={H * 0.7} fontSize="0.08" fontWeight="bold" textAnchor="middle" fill="#000000">{circNum}</text>
              </g>
            );
          }

          // Arandelas
          if (d.type === 'sconce' || d.type === 'lampada_parede') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <g transform={`translate(0, ${wallOffset})`}>
                  <line x1={-H} y1={0} x2={H} y2={0} stroke="#000000" strokeWidth="0.015" />
                  <path d={`M -${H},0 A ${H},${H} 0 0,1 ${H},0`} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                  <line x1={-H * 0.5} y1={-H * 0.5} x2={H * 0.5} y2={0} stroke="#000000" strokeWidth="0.015" />
                  
                  <text x="0" y={-H * 1.3} fontSize="0.08" textAnchor="middle" fill="#000000">{d.power ?? 100}W</text>
                  <text x={-H * 0.9} y={-H * 0.3} fontSize="0.08" textAnchor="middle" fill="#000000">{d.commandLetter ?? 'a'}</text>
                  <text x={H * 0.9} y={-H * 0.3} fontSize="0.08" fontWeight="bold" textAnchor="middle" fill="#000000">{circNum}</text>
                </g>
              </g>
            );
          }

          // Fluorescentes
          if (d.type === 'fluorescent') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <rect x={-S * 0.9} y={-H * 0.3} width={S * 1.8} height={H * 0.6} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <line x1={-S * 0.9} y1={-H * 0.3} x2={S * 0.9} y2={H * 0.3} stroke="#000000" strokeWidth="0.01" />
                <line x1={-S * 0.9} y1={H * 0.3} x2={S * 0.9} y2={-H * 0.3} stroke="#000000" strokeWidth="0.01" />
                
                <text x="0" y={-H * 0.9} fontSize="0.09" fontWeight="bold" textAnchor="middle" fill="#000000">{d.power ?? 100}W</text>
                <text x={-S * 1.1} y={H * 0.15} fontSize="0.08" textAnchor="middle" fill="#000000">{d.commandLetter ?? 'a'}</text>
                <text x={S * 1.1} y={H * 0.15} fontSize="0.08" fontWeight="bold" textAnchor="middle" fill="#000000">{circNum}</text>
              </g>
            );
          }

          // QDC
          if (d.type === 'qdc') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <rect x={-S} y={-H} width={S * 2} height={S} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <line x1={-S * 0.4} y1={-H} x2={-S * 0.4} y2={H * 0} stroke="#000000" strokeWidth="0.015" />
                <line x1={0} y1={-H} x2={0} y2={H * 0} stroke="#000000" strokeWidth="0.015" />
                <line x1={S * 0.4} y1={-H} x2={S * 0.4} y2={H * 0} stroke="#000000" strokeWidth="0.015" />
                <text x="0" y={H * 1.5} fontSize="0.10" fontWeight="bold" textAnchor="middle" fill="#000000">QDC</text>
              </g>
            );
          }

          // Caixas de Passagem (Octogonal, 4x2, 4x4)
          if (d.type === 'box_octogonal') {
            const octR = H;
            const octPoints = Array.from({ length: 8 }).map((_, i) => {
              const angle = (i * Math.PI) / 4 + Math.PI / 8;
              return `${octR * Math.cos(angle)},${octR * Math.sin(angle)}`;
            }).join(' ');

            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y})`}>
                <polygon points={octPoints} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <line x1={-H * 0.7} y1={-H * 0.7} x2={H * 0.7} y2={H * 0.7} stroke="#475569" strokeWidth="0.01" strokeDasharray="0.02, 0.02" />
                <line x1={-H * 0.7} y1={H * 0.7} x2={H * 0.7} y2={-H * 0.7} stroke="#475569" strokeWidth="0.01" strokeDasharray="0.02, 0.02" />
              </g>
            );
          }
          if (d.type === 'box_4x2') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <rect x={-H} y={-thickness / 2} width={S} height={thickness} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <line x1={-H} y1={-thickness / 2} x2={H} y2={thickness / 2} stroke="#475569" strokeWidth="0.01" strokeDasharray="0.02, 0.02" />
                <line x1={-H} y1={thickness / 2} x2={H} y2={-thickness / 2} stroke="#475569" strokeWidth="0.01" strokeDasharray="0.02, 0.02" />
              </g>
            );
          }
          if (d.type === 'box_4x4') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <rect x={-H} y={-H} width={S} height={S} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <line x1={-H} y1={-H} x2={H} y2={H} stroke="#475569" strokeWidth="0.01" strokeDasharray="0.02, 0.02" />
                <line x1={-H} y1={H} x2={H} y2={-H} stroke="#475569" strokeWidth="0.01" strokeDasharray="0.02, 0.02" />
              </g>
            );
          }

          // Poste
          if (d.type === 'poste') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y})`}>
                <circle cx={0} cy={0} r={H} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <circle cx={0} cy={0} r={H * 0.6} fill="#ffffff" stroke="#000000" strokeWidth="0.01" />
                <text x="0" y={H * 0.25} fontSize="0.10" fontWeight="bold" textAnchor="middle" fill="#000000">R</text>
              </g>
            );
          }

          // Medidor
          if (d.type === 'meter') {
            return (
              <g key={d.id} transform={`translate(${d.x}, ${d.y}) rotate(${d.rotation})`}>
                <rect x={-H} y={-H} width={S} height={S} fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
                <circle cx={0} cy={0} r={H * 0.45} fill="#ffffff" stroke="#000000" strokeWidth="0.01" />
                <text x="0" y={H * 0.7} fontSize="0.07" fontWeight="bold" textAnchor="middle" fill="#000000">kWh</text>
              </g>
            );
          }

          // Outros Dispositivos / Default
          return (
            <circle key={d.id} cx={d.x} cy={d.y} r="0.08" fill="#ffffff" stroke="#000000" strokeWidth="0.015" />
          );
        })}
      </svg>
    );
  };

  const getUnifilarSVGContent = () => {
    const hasCircuits = circuits.length > 0;
    const hSVG = Math.max(160, circuits.length * 35 + 50);

    if (!hasCircuits) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px' }}>
          Nenhum circuito cadastrado para gerar o diagrama
        </div>
      );
    }

    return (
      <svg viewBox={`0 0 450 ${hSVG}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <rect x="10" y="15" width="60" height="25" rx="3" fill="#3b4252" stroke="#2e3440" strokeWidth="1.5" />
        <text x="40" y="31" fontSize="8" fill="#ffffff" textAnchor="middle" fontWeight="bold">QDC GERAL</text>
        
        <line x1="70" y1="27" x2="90" y2="27" stroke="#2e3440" strokeWidth="2" />
        <line x1="90" y1="27" x2="90" y2={`${hSVG - 25}`} stroke="#2e3440" strokeWidth="2" />
        
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
    );
  };

  // Elementos estáticos de legenda
  const legendItems = [
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <circle cx="12" cy="12" r="8" fill="#ffffff" stroke="#000" stroke-width="1.5" />
        <line x1="4" y1="12" x2="20" y2="12" stroke="#000" stroke-width="1.5" />
        <line x1="12" y1="12" x2="12" y2="20" stroke="#000" stroke-width="1.5" />
        <text x="12" y="10" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">100W</text>
        <text x="8.5" y="17.5" font-size="5.5" font-style="italic" text-anchor="middle" fill="#000">a</text>
        <text x="15.5" y="17.5" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">1</text>
      </svg>`,
      desc: 'Ponto de Luz no Teto (100VA / Circ. 1 / Com. a)',
      install: 'Teto (2.80m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <line x1="4" y1="16" x2="20" y2="16" stroke="#000" stroke-width="1.8" />
        <polygon points="12,5 6,16 18,16" fill="#ffffff" stroke="#000" stroke-width="1.5" />
        <text x="12" y="3" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">100VA</text>
        <text x="12" y="21" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">-1-</text>
      </svg>`,
      desc: 'Tomada Baixa 10A (NBR 14136)',
      install: 'Parede (0.30m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <line x1="4" y1="16" x2="20" y2="16" stroke="#000" stroke-width="1.8" />
        <polygon points="12,5 6,16 12,16" fill="#000" stroke="#000" stroke-width="1.5" />
        <polygon points="12,5 12,16 18,16" fill="#ffffff" stroke="#000" stroke-width="1.5" />
        <text x="12" y="3" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">100VA</text>
        <text x="12" y="21" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">-1-</text>
      </svg>`,
      desc: 'Tomada Média 10A (NBR 14136)',
      install: 'Parede (1.30m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <line x1="4" y1="16" x2="20" y2="16" stroke="#000" stroke-width="1.8" />
        <polygon points="12,5 6,16 18,16" fill="#000" stroke="#000" stroke-width="1.5" />
        <text x="12" y="3" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">100VA</text>
        <text x="12" y="21" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">-1-</text>
      </svg>`,
      desc: 'Tomada Alta TUE (Chuveiro/Ar)',
      install: 'Parede (2.20m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <line x1="4" y1="18" x2="20" y2="18" stroke="#000" stroke-width="1.8" />
        <line x1="12" y1="18" x2="12" y2="9" stroke="#000" stroke-width="1.5" />
        <circle cx="12" cy="9" r="3.5" fill="#ffffff" stroke="#000" stroke-width="1.5" />
        <text x="19" y="11" font-size="6.5" font-weight="bold" fill="#000">a1</text>
      </svg>`,
      desc: 'Interruptor Simples (Acionamento)',
      install: 'Parede (1.10m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <line x1="4" y1="18" x2="20" y2="18" stroke="#000" stroke-width="1.8" />
        <line x1="12" y1="18" x2="12" y2="9" stroke="#000" stroke-width="1.5" />
        <circle cx="12" cy="9" r="3.5" fill="#000" stroke="#000" stroke-width="1.5" />
        <text x="19" y="11" font-size="6.5" font-weight="bold" fill="#000">a1</text>
      </svg>`,
      desc: 'Interruptor Paralelo (Three-Way)',
      install: 'Parede (1.10m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <rect x="5" y="8" width="14" height="8" fill="#ffffff" stroke="#000" stroke-width="1.5" />
        <line x1="5" y1="8" x2="19" y2="16" stroke="#000" stroke-width="1.2" />
        <line x1="5" y1="16" x2="19" y2="8" stroke="#000" stroke-width="1.2" />
        <text x="12" y="6" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#000">100W</text>
      </svg>`,
      desc: 'Lâmpada Fluorescente (Teto)',
      install: 'Teto (2.80m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <rect x="3" y="7" width="18" height="10" fill="#ffffff" stroke="#000" stroke-width="1.5" />
        <line x1="7.5" y1="7" x2="7.5" y2="17" stroke="#000" stroke-width="1.2" />
        <line x1="12" y1="7" x2="12" y2="17" stroke="#000" stroke-width="1.2" />
        <line x1="16.5" y1="7" x2="16.5" y2="17" stroke="#000" stroke-width="1.2" />
        <text x="12" y="14.5" font-size="6.5" font-weight="bold" text-anchor="middle" fill="#000">QDC</text>
      </svg>`,
      desc: 'Quadro de Distribuição (QDC)',
      install: 'Parede (1.50m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <polygon points="12,4 17,6 19,12 17,18 12,20 7,18 5,12 7,6" fill="#ffffff" stroke="#000" stroke-width="1.5" />
      </svg>`,
      desc: 'Caixa de Passagem Octogonal (Teto)',
      install: 'Teto (2.80m)'
    },
    {
      svgMarkup: `<svg width="20" height="20" viewBox="0 0 24 24" style="display: block; margin: auto;">
        <rect x="7" y="4" width="10" height="16" fill="#ffffff" stroke="#000" stroke-width="1.5" />
      </svg>`,
      desc: 'Caixa de Embutir 4x2 (Parede)',
      install: 'Variável'
    }
  ];

  // ─────────────────────────────────────────────────────────────
  // Função Principal de Impressão (Prancha Ativa ou Todas)
  // ─────────────────────────────────────────────────────────────
  const handlePrint = (sheetsToPrint: Sheet[]) => {
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
          body { font-family: 'Inter', sans-serif; background: #fff; color: #0f172a; }
          
          .sheet-print-page {
            position: relative;
            background: #ffffff;
            border: 2px solid #0f172a;
            page-break-after: always;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 15px;
          }
          .sheet-print-page:last-child { page-break-after: avoid; }
          
          .inner-border {
            border: 1.5px solid #0f172a;
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
            padding: 15px;
            padding-bottom: 115px; /* Altura do carimbo para evitar sobreposição */
          }
          
          .stamp-box {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 250px;
            height: 100px;
            border-top: 1.5px solid #0f172a;
            border-left: 1.5px solid #0f172a;
            background: #fafafa;
            padding: 10px;
            display: flex;
            gap: 10px;
            font-size: 8px;
            line-height: 1.4;
          }
          .stamp-logo-col {
            width: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #ddd;
            padding-right: 8px;
          }
          .stamp-info-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .stamp-title { font-weight: bold; font-size: 9px; margin-bottom: 2px; text-transform: uppercase; }
          
          /* Viewports Absolutas Flexíveis */
          .print-viewport {
            position: absolute;
            border: 1px dashed #94a3b8;
            border-radius: 4px;
            background: #ffffff;
            padding: 10px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          
          .vp-header {
            font-size: 8.5px;
            font-weight: bold;
            color: #475569;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          
          .vp-body {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            height: 100%;
          }

          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { border: 1px solid #0f172a; padding: 4px; text-align: left; }
          th { background: #f1f5f9; }
          .mono { font-family: monospace; font-weight: bold; }
          
          @media print {
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: landscape;
              margin: 0;
            }
            .sheet-print-page {
              width: 100vw;
              height: 100vh;
              max-width: 100%;
              max-height: 100%;
              border: none !important;
              padding: 10px !important;
              page-break-before: always;
              page-break-inside: avoid;
              page-break-after: always;
            }
            .sheet-print-page:first-child {
              page-break-before: avoid;
            }
            .inner-border {
              border: 1.5px solid #000 !important;
            }
            .stamp-box {
              border-top: 1.5px solid #000 !important;
              border-left: 1.5px solid #000 !important;
            }
          }
        </style>
      </head>
      <body>
        ${sheetsToPrint.map(s => {
          const sDim = getSheetDimensionsMM(s.size, s.orientation);
          
          // Renderizar as viewports baseadas em suas posições absolutas reais
          const viewportsHTML = s.viewports.map(vp => {
            let vpContent = '';

            if (vp.type === 'planta') {
              // Obter SVG literal da planta baixa
              const svgElement = document.getElementById(`vp-svg-planta`);
              const svgString = svgElement ? svgElement.outerHTML : '';
              vpContent = svgString || `<div style="color: #64748b; font-size: 9px;">Desenho da Planta Baixa</div>`;
            } 
            else if (vp.type === 'unifilar') {
              // Obter SVG literal do unifilar
              const svgElement = document.getElementById(`vp-svg-unifilar`);
              const svgString = svgElement ? svgElement.outerHTML : '';
              vpContent = svgString || `<div style="color: #64748b; font-size: 9px;">Esquema Unifilar</div>`;
            } 
            else if (vp.type === 'cargas') {
              vpContent = `
                <table style="width: 100%;">
                  <thead>
                    <tr>
                      <th>Circ.</th>
                      <th>Tipo</th>
                      <th>Cabo</th>
                      <th>Prot.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${circuits.map(c => {
                      const cd = devices.filter(d => d.circuitId === c.id);
                      const totalPower = cd.reduce((sum, d) => sum + (d.power || 0), 0);
                      const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, 10, c.groupedCircuits);
                      return `
                        <tr>
                          <td><strong>C${c.number}</strong></td>
                          <td>${c.type.toUpperCase()}</td>
                          <td class="mono">${res.selectedSection} mm²</td>
                          <td class="mono">${res.circuitBreaker}A</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `;
            } 
            else if (vp.type === 'materiais') {
              vpContent = `
                <table style="width: 100%;">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Qtde</th>
                      <th>Unid</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${materialsList.slice(0, 10).map(item => `
                      <tr>
                        <td>${item.name}</td>
                        <td class="mono">${item.qty}</td>
                        <td>${item.unit}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            } 
            else if (vp.type === 'legenda') {
              vpContent = `
                <table style="width: 100%;">
                  <thead>
                    <tr>
                      <th style="width: 40px;">Símb.</th>
                      <th>Descrição</th>
                      <th>Instal.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${legendItems.map(item => `
                      <tr>
                        <td style="text-align: center; padding: 2px;">
                          ${item.svgMarkup}
                        </td>
                        <td>${item.desc}</td>
                        <td>${item.install}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            } 
            else if (vp.type === 'corte_3d') {
              const snap = snapshots3D.find(sp => sp.id === vp.snapshotId);
              if (snap) {
                vpContent = `<img src="${snap.dataUrl}" style="width: 100%; height: 100%; object-fit: contain; display: block;" />`;
              } else {
                vpContent = `<div style="color: #64748b; font-size: 8px;">Corte 3D indisponível</div>`;
              }
            }

            const titles = {
              planta: 'Planta Baixa de Distribuição',
              unifilar: 'Diagrama Unifilar do Quadro',
              cargas: 'Quadro de Cargas NBR 5410',
              materiais: 'Lista de Materiais',
              legenda: 'Legenda de Simbologia',
              corte_3d: 'Corte / Vista Tridimensional'
            };

            return `
              <div class="print-viewport" style="left: ${vp.x}%; top: ${vp.y}%; width: ${vp.w}%; height: ${vp.h}%;">
                <div class="vp-header">${titles[vp.type] || 'Viewport'}</div>
                <div class="vp-body">${vpContent}</div>
              </div>
            `;
          }).join('');

          return `
            <div class="sheet-print-page" style="width: ${sDim.w}mm; height: ${sDim.h}mm;">
              <div class="inner-border">
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 8px; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; display: flex; justify-content: space-between;">
                  <span>${s.code} — ${s.title}</span>
                  <span style="font-size: 8px; font-weight: normal; color: #64748b;">Escala Técnica ABNT (${s.size})</span>
                </div>
                
                <!-- Viewports posicionadas absolutamente -->
                ${viewportsHTML}

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
                      <div class="stamp-title" style="font-size: 8px;">PROJ.: ${projectName}</div>
                      <div>Prop.: ${paperOwner}</div>
                      <div>Resp.: ${paperDesigner}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 2px; font-size: 7px; color: #475569;">
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
    
    // Inicia a caixa de diálogo de impressão após o carregamento da janela
    pw.onload = () => {
      setTimeout(() => {
        pw.print();
      }, 500);
    };
  };

  const isSmallSheet = activeSheet.size === 'A3' || activeSheet.size === 'A4';
  const paddingBottom = isSmallSheet ? '110px' : '125px';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#f8fafc', overflow: 'hidden' }}>

      {/* Área de Trabalho */}
      <div style={{ flex: 1, display: 'flex', padding: '20px', gap: '20px', overflow: 'hidden' }}>
        
        {/* Painel de Controle de Folhas com Rolagem Própria */}
        <div style={{ width: '280px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0 }}>Suas Pranchas</h3>
            <button onClick={handleCreateSheet} style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
              + Nova
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '120px' }}>
            {sheetsList.map(s => (
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
                onChange={(e) => updateSheet(activeSheet.id, { title: e.target.value })}
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Tamanho do Papel</span>
              <select
                value={activeSheet.size}
                onChange={(e) => updateSheet(activeSheet.id, { size: e.target.value as any })}
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="A0">A0 (1189x841 mm)</option>
                <option value="A1">A1 (841x594 mm)</option>
                <option value="A2">A2 (594x420 mm)</option>
                <option value="A3">A3 (420x297 mm)</option>
                <option value="A4">A4 (297x210 mm)</option>
              </select>
            </div>

            {/* Conteúdos Habilitados na Prancha (Zustand) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Adicionar no Layout</span>
              {(['planta', 'unifilar', 'cargas', 'materiais', 'legenda'] as const).map(type => {
                const label = type === 'planta' ? 'Planta Baixa 2D'
                            : type === 'unifilar' ? 'Diagrama Unifilar'
                            : type === 'cargas' ? 'Quadro de Cargas'
                            : type === 'materiais' ? 'Lista de Materiais'
                            : 'Legenda de Símbolos';
                const isChecked = activeSheet.viewports.some(vp => vp.type === type);
                return (
                  <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isChecked} onChange={() => handleToggleViewport(type)} />
                    {label}
                  </label>
                );
              })}
            </div>

            {/* Snapshots 3D Capturados */}
            {snapshots3D.length > 0 && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Cortes 3D Capturados</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                  {snapshots3D.map(snap => (
                    <button
                      key={snap.id}
                      onClick={() => addViewportToSheet(activeSheet.id, 'corte_3d', snap.id)}
                      style={{
                        padding: '4px 8px', backgroundColor: '#1e293b', border: '1px solid #334155',
                        borderRadius: '4px', color: '#cbd5e1', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <span>📸</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{snap.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botões de Impressão */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            <button onClick={() => handlePrint([activeSheet])} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              🖨️ Imprimir Prancha Atual
            </button>
            <button onClick={() => handlePrint(sheetsList)} style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              🖨️ Imprimir Todas as Folhas
            </button>
          </div>
        </div>

        {/* Simulador da Folha ABNT (Paper Space) */}
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
              <div
                id="sheet-inner-border"
                style={{
                  border: '1.5px solid #0f172a',
                  flex: 1,
                  position: 'relative',
                  padding: '20px',
                  paddingBottom: paddingBottom
                }}
              >
                
                {/* Título de Prancha */}
                <div style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1.5px solid #000', paddingBottom: '6px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  <span>{activeSheet.code} — {activeSheet.title}</span>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>Escala Real de Prancha ({activeSheet.size})</span>
                </div>

                {/* Viewports posicionáveis absolutas */}
                {activeSheet.viewports.map((vp) => {
                  const isSelected = selectedViewportId === vp.id;
                  
                  let viewportInner = null;
                  if (vp.type === 'planta') {
                    viewportInner = (
                      <div id="vp-svg-planta" style={{ width: '100%', height: '100%' }}>
                        {getPlantaSVGContent()}
                      </div>
                    );
                  } 
                  else if (vp.type === 'unifilar') {
                    viewportInner = (
                      <div id="vp-svg-unifilar" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                        {getUnifilarSVGContent()}
                      </div>
                    );
                  } 
                  else if (vp.type === 'cargas') {
                    viewportInner = (
                      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5px' }}>
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
                  else if (vp.type === 'materiais') {
                    viewportInner = (
                      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th>Material</th>
                              <th>Qtde</th>
                              <th>Unid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {materialsList.slice(0, 12).map((item, i) => (
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
                  else if (vp.type === 'legenda') {
                    viewportInner = (
                      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: '2px', width: '30px' }}>Símb.</th>
                              <th style={{ padding: '2px' }}>Descrição</th>
                              <th style={{ padding: '2px', width: '45px' }}>Instal.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {legendItems.map((item, i) => (
                              <tr key={i} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                                <td style={{ padding: '2px', textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: item.svgMarkup }} />
                                <td style={{ padding: '2px' }}>{item.desc}</td>
                                <td style={{ padding: '2px', color: '#475569' }}>{item.install}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  } 
                  else if (vp.type === 'corte_3d') {
                    const snap = snapshots3D.find(sp => sp.id === vp.snapshotId);
                    if (snap) {
                      viewportInner = (
                        <img src={snap.dataUrl} alt="Corte 3D" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      );
                    } else {
                      viewportInner = (
                        <div style={{ color: '#94a3b8', fontSize: '9px', textAlign: 'center', padding: '10px' }}>
                          📸 Snapshot 3D Indisponível
                        </div>
                      );
                    }
                  }

                  const titles = {
                    planta: 'Planta Baixa de Distribuição',
                    unifilar: 'Diagrama Unifilar do Quadro',
                    cargas: 'Quadro de Cargas NBR 5410',
                    materiais: 'Lista de Materiais',
                    legenda: 'Legenda de Simbologia',
                    corte_3d: 'Corte / Vista Tridimensional'
                  };

                  return (
                    <div
                      key={vp.id}
                      style={{
                        position: 'absolute',
                        left: `${vp.x}%`,
                        top: `${vp.y}%`,
                        width: `${vp.w}%`,
                        height: `${vp.h}%`,
                        border: isSelected ? '1.8px dashed #3b82f6' : '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        padding: '8px 8px 8px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'move',
                        boxShadow: isSelected ? '0 10px 15px -3px rgba(59, 130, 246, 0.15)' : 'none'
                      }}
                      onMouseDown={(e) => handleViewportMouseDown(e, vp.id, false)}
                    >
                      {/* Título da Viewport / Handle de seleção */}
                      <div style={{
                        fontSize: '8px',
                        fontWeight: 'bold',
                        color: isSelected ? '#3b82f6' : '#64748b',
                        borderBottom: '1px solid #e2e8f0',
                        paddingBottom: '3px',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none'
                      }}>
                        <span>{titles[vp.type]}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeViewportFromSheet(activeSheet.id, vp.id); }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '9px', padding: '0px 2px' }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Conteúdo */}
                      <div style={{ flex: 1, overflow: 'hidden', pointerEvents: 'none' }}>
                        {viewportInner}
                      </div>

                      {/* Resize Handle (canto inferior direito) */}
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '2px',
                            bottom: '2px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            cursor: 'se-resize',
                            borderRadius: '1px',
                            zIndex: 10
                          }}
                          onMouseDown={(e) => handleViewportMouseDown(e, vp.id, true)}
                        />
                      )}
                    </div>
                  );
                })}

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
                  lineHeight: '1.3',
                  pointerEvents: 'auto'
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


    </div>
  );
};
