import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useCadStore } from '../store/useCadStore';
import { dimensionateCircuit, calculateDemand, validateCircuits, autoPhaseBalance } from '../utils/nbr5410';
import { BottomBar } from '../components/BottomBar';

interface UnifilarViewProps {
  activeTab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets';
  onTabChange: (tab: 'cad2d' | 'render3d' | 'unifilar' | 'sheets') => void;
}

export const UnifilarView: React.FC<UnifilarViewProps> = ({ activeTab, onTabChange }) => {
  const { circuits, devices } = useCadStore();

  const { nodes, edges, demandInfo, validations, phaseBalance } = useMemo(() => {
    const listNodes: Array<{
      id: string;
      data: { label: React.ReactNode };
      position: { x: number; y: number };
      style?: React.CSSProperties;
    }> = [];
    const listEdges: Array<{
      id: string;
      source: string;
      target: string;
      type?: string;
      style?: React.CSSProperties;
      label?: string;
      labelStyle?: React.CSSProperties;
      labelBgStyle?: React.CSSProperties;
    }> = [];

    // Helper: QDC do projeto
    const qdc = devices.find(d => d.type === 'qdc');

    // Calcular dados dos circuitos
    const circuitData = circuits.map(c => {
      const circuitDevices = devices.filter(d => d.circuitId === c.id);
      const totalPower = circuitDevices.reduce((sum, d) => sum + d.power, 0);
      let maxDistance = 10.0;
      if (qdc && circuitDevices.length > 0) {
        const distances = circuitDevices.map(d =>
          Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0
        );
        maxDistance = Math.max(...distances);
      }
      const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, maxDistance, c.groupedCircuits);
      return { circuit: c, totalPower, maxDistance, res, deviceCount: circuitDevices.length, deviceTypes: circuitDevices.map(d => d.type) };
    });

    // Potência total e demanda
    const totalInstalledPower = circuitData.reduce((sum, cd) => sum + cd.totalPower, 0);
    const demandInfo = calculateDemand(
      totalInstalledPower,
      220,
      qdc?.qdcBusbarType === 'trifasico' ? 'tri' : qdc?.qdcBusbarType === 'bifasico' ? 'bi' : 'mono',
      circuits.map(c => {
        const cd = devices.filter(d => d.circuitId === c.id);
        return { type: c.type, totalPower: cd.reduce((s, d) => s + (d.power || 0), 0) };
      })
    );

    // Balanceamento de Fases
    const phaseBalance = autoPhaseBalance(
      circuits.map(c => {
        const cd = devices.filter(d => d.circuitId === c.id);
        return { id: c.id, totalPower: cd.reduce((s, d) => s + (d.power || 0), 0), voltage: c.voltage };
      }),
      qdc?.qdcBusbarType === 'trifasico' ? 'trifasico' : qdc?.qdcBusbarType === 'bifasico' ? 'bifasico' : 'monofasico'
    );

    // Validações NBR 5410
    const validations = validateCircuits(circuitData.map(cd => ({
      id: cd.circuit.id,
      number: cd.circuit.number,
      name: cd.circuit.name,
      type: cd.circuit.type,
      voltage: cd.circuit.voltage,
      deviceCount: cd.deviceCount,
      totalPower: cd.totalPower,
      deviceTypes: cd.deviceTypes,
    })));

    // Validações NBR 5410

    // Proteções do QDC
    const hasDR = qdc?.qdcDRType && qdc.qdcDRType !== 'none';
    const hasDPS = qdc?.qdcHasDPS;
    const busbarType = qdc?.qdcBusbarType || 'monofasico';

    // ─── 1. Nó Concessionária ─────────────────────────────
    listNodes.push({
      id: 'entrance',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '6px' }}>
            <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>
              ⚡ ENTRADA CONCESSIONÁRIA
            </span>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '2px' }}>{demandInfo.connectionType.toUpperCase()}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Medidor: {demandInfo.connectionType === 'monofasico' ? 'Monofásico 2F' : demandInfo.connectionType === 'bifasico' ? 'Bifásico 3F' : 'Trifásico 4F'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
              Demanda: {(demandInfo.demandPower / 1000).toFixed(1)} kW
            </div>
          </div>
        )
      },
      position: { x: 350, y: 20 },
      style: {
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        border: '1.5px solid #ef4444',
        borderRadius: '8px',
        width: 200
      }
    });

    // ─── 2. Medidor ─────────────────────────────────────────
    listNodes.push({
      id: 'meter',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '4px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>📊 Medidor kWh</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
              Cabo entrada: {demandInfo.suggestedEntrySection}mm²
            </div>
          </div>
        )
      },
      position: { x: 370, y: 120 },
      style: {
        backgroundColor: '#1e293b', color: '#f8fafc',
        border: '1px solid #475569', borderRadius: '6px', width: 160
      }
    });
    listEdges.push({
      id: 'e-entrance-meter', source: 'entrance', target: 'meter',
      type: 'smoothstep', style: { stroke: '#ef4444', strokeWidth: 2 },
      label: `${demandInfo.suggestedEntrySection}mm²`,
      labelStyle: { fontSize: '0.6rem', fill: '#94a3b8' },
      labelBgStyle: { fill: '#0f172a' },
    });

    // ─── 3. Disjuntor Geral ─────────────────────────────────
    const generalBreakerA = demandInfo.suggestedBreakerGeneral;
    listNodes.push({
      id: 'general_breaker',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '6px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>🛡️ Disjuntor Geral</div>
            <div style={{ fontSize: '0.85rem', color: '#eab308', fontWeight: 'bold', fontFamily: 'monospace', margin: '2px 0' }}>
              {generalBreakerA}A Termomagnético
            </div>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Bipolar/Tripolar</div>
          </div>
        )
      },
      position: { x: 355, y: 200 },
      style: {
        backgroundColor: '#1e293b', color: '#f8fafc',
        border: '1.5px solid #eab308', borderRadius: '8px', width: 190
      }
    });
    listEdges.push({
      id: 'e-meter-breaker', source: 'meter', target: 'general_breaker',
      type: 'smoothstep', style: { stroke: '#f8fafc', strokeWidth: 2 }
    });

    let nextY = 290;

    // ─── 4. DR Geral (se configurado) ───────────────────────
    if (hasDR) {
      const drType = qdc?.qdcDRType === 'geral' ? 'DR Geral 30mA' : 'DR por Grupos 30mA';
      listNodes.push({
        id: 'dr_general',
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#f87171' }}>🔴 {drType}</div>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Proteção contra choque</div>
            </div>
          )
        },
        position: { x: 370, y: nextY },
        style: {
          backgroundColor: '#1e293b', color: '#f8fafc',
          border: '1.5px solid #f87171', borderRadius: '6px', width: 160
        }
      });
      listEdges.push({
        id: 'e-breaker-dr', source: 'general_breaker', target: 'dr_general',
        type: 'smoothstep', style: { stroke: '#f87171', strokeWidth: 1.5 }
      });
      nextY += 80;
    }

    // ─── 5. DPS (se configurado) ────────────────────────────
    if (hasDPS) {
      listNodes.push({
        id: 'dps',
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#f59e0b' }}>⚡ DPS Class II 275V</div>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                {busbarType === 'trifasico' ? '3 módulos' : busbarType === 'bifasico' ? '2 módulos' : '1 módulo'}
              </div>
            </div>
          )
        },
        position: { x: 600, y: nextY - 60 },
        style: {
          backgroundColor: '#1e293b', color: '#f8fafc',
          border: '1.5px solid #f59e0b', borderRadius: '6px', width: 150
        }
      });
      listEdges.push({
        id: 'e-breaker-dps', source: hasDR ? 'dr_general' : 'general_breaker', target: 'dps',
        type: 'smoothstep', style: { stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4,4' }
      });
    }

    // ─── 6. Barramento QDC ──────────────────────────────────
    const barSourceId = hasDR ? 'dr_general' : 'general_breaker';
    listNodes.push({
      id: 'qdc_bar',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
            ═══ Barramento QDC ({busbarType === 'monofasico' ? 'F+N' : busbarType === 'bifasico' ? 'F+F+N' : 'R+S+T+N'}) ═══
          </div>
        )
      },
      position: { x: 150, y: nextY },
      style: {
        backgroundColor: '#334155', color: '#f8fafc',
        border: '1px solid #475569', borderRadius: '4px', width: 600
      }
    });
    listEdges.push({
      id: 'e-source-bar', source: barSourceId, target: 'qdc_bar',
      type: 'smoothstep', style: { stroke: '#f8fafc', strokeWidth: 2 }
    });

    // ─── 7. Barramento N + PE ───────────────────────────────
    listNodes.push({
      id: 'bar_npe',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '4px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#22c55e' }}>⏚ Barra N + PE (Terra)</span>
          </div>
        )
      },
      position: { x: 20, y: nextY + 60 },
      style: {
        backgroundColor: '#14532d', color: '#f8fafc',
        border: '1px solid #22c55e', borderRadius: '4px', width: 140
      }
    });
    listEdges.push({
      id: 'e-bar-npe', source: 'qdc_bar', target: 'bar_npe',
      type: 'smoothstep', style: { stroke: '#22c55e', strokeWidth: 1.5 }
    });

    nextY += 80;

    // ─── 8. Circuitos ───────────────────────────────────────
    if (circuits.length === 0) {
      listNodes.push({
        id: 'no-circuits',
        data: { label: 'Nenhum circuito cadastrado. Adicione circuitos na prancheta 2D.' },
        position: { x: 320, y: nextY },
        style: {
          backgroundColor: '#0f172a', color: '#94a3b8',
          border: '1px dashed #334155', borderRadius: '8px',
          width: 260, fontSize: '0.75rem', textAlign: 'center', padding: '12px'
        }
      });
      listEdges.push({
        id: 'e-bar-nocirc', source: 'qdc_bar', target: 'no-circuits',
        style: { stroke: '#475569', strokeDasharray: '5,5' }
      });
    } else {
      const sortedCircuits = [...circuitData].sort((a, b) => a.circuit.number - b.circuit.number);
      const totalWidth = (sortedCircuits.length - 1) * 210;
      const startX = 450 - (totalWidth / 2);

      sortedCircuits.forEach((cd, idx) => {
        const { circuit: c, totalPower, maxDistance, res, deviceCount } = cd;
        const validation = validations.find(v => v.circuitId === c.id);
        const hasErrors = validation && !validation.valid;
        const hasWarnings = validation && validation.warnings.length > 0;
        
        const statusIcon = hasErrors ? '❌' : hasWarnings ? '⚠️' : '✅';
        const borderColor = hasErrors ? '#ef4444' : hasWarnings ? '#f59e0b' : '#334155';

        const nodeX = startX + (idx * 210);
        const circuitNodeId = `node-circ-${c.id}`;

        listNodes.push({
          id: circuitNodeId,
          data: {
            label: (
              <div style={{ textAlign: 'left', padding: '4px', fontSize: '0.68rem', lineHeight: '1.4' }}>
                <div style={{ borderBottom: '1px dashed #475569', paddingBottom: '3px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#eab308' }}>Circ. {c.number}</strong>
                  <span>{statusIcon} <span style={{ color: '#94a3b8', fontSize: '0.6rem' }}>{c.type.toUpperCase()}</span></span>
                </div>
                <div style={{ color: '#f8fafc', fontWeight: '600', marginBottom: '2px' }}>{c.name}</div>
                <div>⚡ {c.voltage}V | 🔌 {totalPower}W | 📐 {maxDistance.toFixed(1)}m</div>
                <div>👤 {deviceCount} ponto{deviceCount !== 1 ? 's' : ''} | 🧭 Fase: <strong style={{ color: '#eab308' }}>{phaseBalance.circuits.find((pc: any) => pc.circuitId === c.id)?.phaseAssigned || 'R'}</strong></div>
                <div style={{ borderTop: '1px dashed #475569', marginTop: '3px', paddingTop: '3px' }}>
                  <strong>Cabo: </strong>
                  <span style={{ color: '#22c55e', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {res.selectedSection.toFixed(1)} mm²
                  </span>
                  {' | '}
                  <strong>DJ: </strong>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {res.circuitBreaker}A
                  </span>
                </div>
                <div>ΔV: <span style={{ color: res.voltageDropPercent > 4 ? '#ef4444' : '#22c55e' }}>{res.voltageDropPercent.toFixed(2)}%</span></div>
                {hasErrors && (
                  <div style={{ color: '#ef4444', fontSize: '0.6rem', marginTop: '2px' }}>
                    {validation?.errors[0]}
                  </div>
                )}
                {hasWarnings && !hasErrors && (
                  <div style={{ color: '#f59e0b', fontSize: '0.6rem', marginTop: '2px' }}>
                    {validation?.warnings[0]}
                  </div>
                )}
              </div>
            )
          },
          position: { x: nodeX, y: nextY },
          style: {
            backgroundColor: '#0f172a', color: '#f8fafc',
            border: `1.5px solid ${borderColor}`, borderRadius: '8px', width: 190
          }
        });

        listEdges.push({
          id: `e-bar-circ-${c.id}`,
          source: 'qdc_bar',
          target: circuitNodeId,
          type: 'smoothstep',
          style: { stroke: '#475569', strokeWidth: 1.5 },
          label: `${res.selectedSection}mm²`,
          labelStyle: { fontSize: '0.55rem', fill: '#64748b' },
          labelBgStyle: { fill: '#0f172a' },
        });
      });
    }

    return { nodes: listNodes, edges: listEdges, demandInfo, validations, phaseBalance };
  }, [circuits, devices]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#090d16', color: '#f8fafc', overflow: 'hidden' }}>

      <div style={{ flex: 1, position: 'relative', outline: 'none' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="#1e293b" gap={16} size={1} />
        <Controls showInteractive={false} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fill: '#f8fafc' }} />
      </ReactFlow>

      {/* ── Legenda + Resumo de Demanda ── */}
      <div
        style={{
          position: 'absolute', top: '16px', left: '16px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155', borderRadius: '10px',
          padding: '14px 18px', zIndex: 10, color: '#f8fafc',
          maxWidth: '320px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}
      >
        <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase', color: '#eab308' }}>
          Diagrama Unifilar — NBR 5410
        </h4>
        <div style={{ fontSize: '0.7rem', lineHeight: '1.5', color: '#cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Pot. Instalada:</span>
            <strong>{(demandInfo.totalInstalledPower / 1000).toFixed(1)} kW</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Fator Demanda:</span>
            <strong>{(demandInfo.demandFactor * 100).toFixed(0)}%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Pot. Demanda:</span>
            <strong style={{ color: '#22c55e' }}>{(demandInfo.demandPower / 1000).toFixed(1)} kW</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Corrente Demanda:</span>
            <strong>{demandInfo.demandCurrent.toFixed(1)} A</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Tipo Ligação:</span>
            <strong style={{ color: '#eab308' }}>{demandInfo.connectionType.toUpperCase()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>DJ Geral:</span>
            <strong>{demandInfo.suggestedBreakerGeneral}A</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Ramal Entrada:</span>
            <strong>{demandInfo.suggestedEntrySection}mm²</strong>
          </div>
          <div style={{ borderTop: '1px dashed #334155', margin: '6px 0', paddingTop: '6px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Fase R:</span>
            <strong>{(phaseBalance.phaseLoads.R / 1000).toFixed(2)} kW</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Fase S:</span>
            <strong>{(phaseBalance.phaseLoads.S / 1000).toFixed(2)} kW</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Fase T:</span>
            <strong>{(phaseBalance.phaseLoads.T / 1000).toFixed(2)} kW</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Desequilíbrio:</span>
            <strong style={{ color: phaseBalance.unbalancePercent > 10 ? '#ef4444' : '#22c55e' }}>{phaseBalance.unbalancePercent.toFixed(1)}%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Corr. Neutro:</span>
            <strong style={{ color: phaseBalance.neutralCurrent > 15 ? '#ef4444' : '#22c55e' }}>{phaseBalance.neutralCurrent.toFixed(1)} A</strong>
          </div>
        </div>

        {demandInfo.warnings.length > 0 && (
          <div style={{ marginTop: '8px', padding: '6px 8px', backgroundColor: '#451a03', border: '1px solid #f59e0b', borderRadius: '4px', fontSize: '0.65rem', color: '#fbbf24' }}>
            {demandInfo.warnings.map((w, i) => <div key={i}>{w}</div>)}
          </div>
        )}

        {validations.some(v => !v.valid) && (
          <div style={{ marginTop: '8px', padding: '6px 8px', backgroundColor: '#450a0a', border: '1px solid #ef4444', borderRadius: '4px', fontSize: '0.65rem', color: '#fca5a5' }}>
            <strong>Erros NBR 5410:</strong>
            {validations.filter(v => !v.valid).map((v, i) => (
              <div key={i}>• Circ.{v.circuitNumber}: {v.errors[0]}</div>
            ))}
          </div>
        )}

        <p style={{ fontSize: '0.6rem', color: '#64748b', lineHeight: '1.4', margin: '8px 0 0 0' }}>
          Diagrama gerado automaticamente com base nos circuitos e dispositivos do projeto. Conforme NBR 5410:2024.
        </p>
      </div>

    </div>
    </div>
  );
};
