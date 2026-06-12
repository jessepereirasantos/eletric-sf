import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useCadStore } from '../store/useCadStore';
import { dimensionateCircuit } from '../utils/nbr5410';

export const UnifilarView: React.FC = () => {
  const { circuits, devices } = useCadStore();

  const { nodes, edges } = useMemo(() => {
    // Tipagem inline para evitar conflitos de importação de tipos do reactflow v11
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
    }> = [];

    // 1. Nó da Concessionária (Topo)
    listNodes.push({
      id: 'entrance',
      data: { 
        label: (
          <div style={{ textAlign: 'center', padding: '6px' }}>
            <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>
              ⚡ ENTRADA CONCESSIONÁRIA
            </span>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '2px' }}>Rede Padrão de Entrada</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Enel/CPFL Paulista</div>
          </div>
        ) 
      },
      position: { x: 300, y: 30 },
      style: {
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        border: '1.5px solid #ef4444',
        borderRadius: '8px',
        width: 180
      }
    });

    // Calcula parâmetros gerais
    // Disjuntor geral estimado com base na corrente de projeto total acumulada dos circuitos
    let totalIp = 0;
    circuits.forEach(c => {
      const circuitDevices = devices.filter(d => d.circuitId === c.id);
      const totalPower = circuitDevices.reduce((sum, d) => sum + d.power, 0);
      const qdc = devices.find(d => d.type === 'qdc');
      let maxDistance = 10.0;
      if (qdc && circuitDevices.length > 0) {
        const distances = circuitDevices.map(d => 
          Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0
        );
        maxDistance = Math.max(...distances);
      }
      const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, maxDistance, c.groupedCircuits);
      totalIp += res.currentProject;
    });

    // Escolhe disjuntor geral padrão comercial
    const generalBreakerA = totalIp <= 20 ? 32 : totalIp <= 32 ? 40 : totalIp <= 50 ? 63 : totalIp <= 70 ? 80 : 100;

    // 2. Nó do Disjuntor Geral
    listNodes.push({
      id: 'general_breaker',
      data: { 
        label: (
          <div style={{ textAlign: 'center', padding: '6px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Disjuntor Geral</div>
            <div style={{ fontSize: '0.85rem', color: '#eab308', fontWeight: 'bold', fontFamily: 'monospace', margin: '2px 0' }}>
              {generalBreakerA}A Termomagnético
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Proteção Geral QDC</div>
          </div>
        ) 
      },
      position: { x: 300, y: 140 },
      style: {
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        border: '1.5px solid #334155',
        borderRadius: '8px',
        width: 180
      }
    });

    listEdges.push({
      id: 'e-entrance-breaker',
      source: 'entrance',
      target: 'general_breaker',
      type: 'smoothstep',
      style: { stroke: '#ef4444', strokeWidth: 2 }
    });

    // 3. Nó do Barramento QDC
    listNodes.push({
      id: 'qdc_bar',
      data: { 
        label: (
          <div style={{ textAlign: 'center', padding: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            Barramento Quadro de Distribuição (QDC)
          </div>
        ) 
      },
      position: { x: 190, y: 250 },
      style: {
        backgroundColor: '#334155',
        color: '#f8fafc',
        border: '1px solid #475569',
        borderRadius: '4px',
        width: 400
      }
    });

    listEdges.push({
      id: 'e-breaker-bar',
      source: 'general_breaker',
      target: 'qdc_bar',
      type: 'smoothstep',
      style: { stroke: '#f8fafc', strokeWidth: 2 }
    });

    // 4. Circuitos
    if (circuits.length === 0) {
      listNodes.push({
        id: 'no-circuits',
        data: { label: 'Nenhum circuito cadastrado. Adicione circuitos na prancheta 2D.' },
        position: { x: 270, y: 330 },
        style: {
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          border: '1px dashed #334155',
          borderRadius: '8px',
          width: 240,
          fontSize: '0.75rem',
          textAlign: 'center',
          padding: '12px'
        }
      });
      
      listEdges.push({
        id: 'e-bar-nocirc',
        source: 'qdc_bar',
        target: 'no-circuits',
        style: { stroke: '#475569', strokeDasharray: '5,5' }
      });
    } else {
      // Ordena circuitos por número para ficar organizado
      const sortedCircuits = [...circuits].sort((a, b) => a.number - b.number);
      const totalWidth = (sortedCircuits.length - 1) * 200;
      const startX = 390 - (totalWidth / 2);

      sortedCircuits.forEach((c, idx) => {
        const circuitDevices = devices.filter(d => d.circuitId === c.id);
        const totalPower = circuitDevices.reduce((sum, d) => sum + d.power, 0);
        const qdc = devices.find(d => d.type === 'qdc');
        
        let maxDistance = 10.0;
        if (qdc && circuitDevices.length > 0) {
          const distances = circuitDevices.map(d => 
            Math.sqrt(Math.pow(d.x - qdc.x, 2) + Math.pow(d.y - qdc.y, 2)) + 2.0
          );
          maxDistance = Math.max(...distances);
        }

        // Calcula bitola e proteção normatizada
        const res = dimensionateCircuit(c.type, totalPower || 100, c.voltage, maxDistance, c.groupedCircuits);

        const nodeX = startX + (idx * 200);
        const circuitNodeId = `node-circ-${c.id}`;

        listNodes.push({
          id: circuitNodeId,
          data: {
            label: (
              <div style={{ textAlign: 'left', padding: '4px', fontSize: '0.7rem', lineHeight: '1.4' }}>
                <div style={{ borderBottom: '1px dashed #475569', paddingBottom: '3px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#eab308' }}>Circ. {c.number}</strong>
                  <span style={{ color: '#94a3b8' }}>{c.type.toUpperCase()}</span>
                </div>
                <div style={{ color: '#f8fafc', fontWeight: '600' }}>{c.name}</div>
                <div>⚡ Tensão: <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{c.voltage}V</span></div>
                <div>🔌 Carga: <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{totalPower} W</span></div>
                <div>📐 Dist. Máx: <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{maxDistance.toFixed(1)}m</span></div>
                <div style={{ borderTop: '1px dashed #475569', marginTop: '4px', paddingTop: '3px' }}>
                  <strong>Cabo: </strong>
                  <span style={{ color: '#22c55e', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {res.selectedSection.toFixed(1)} mm²
                  </span>
                </div>
                <div>
                  <strong>Disjuntor: </strong>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {res.circuitBreaker}A ({c.voltage === 127 ? 'Mono' : 'Bi'})
                  </span>
                </div>
                <div>Queda V: <span style={{ color: res.voltageDropPercent > 4 ? '#ef4444' : '#22c55e' }}>{res.voltageDropPercent.toFixed(2)}%</span></div>
              </div>
            )
          },
          position: { x: nodeX, y: 330 },
          style: {
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            border: '1.5px solid #334155',
            borderRadius: '8px',
            width: 170
          }
        });

        listEdges.push({
          id: `e-bar-circ-${c.id}`,
          source: 'qdc_bar',
          target: circuitNodeId,
          type: 'smoothstep',
          style: { stroke: '#475569', strokeWidth: 1.5 }
        });
      });
    }

    return { nodes: listNodes, edges: listEdges };
  }, [circuits, devices]);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#090d16', position: 'relative' }}>
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
      
      {/* Legenda Flutuante */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '12px 16px',
          zIndex: 10,
          color: '#f8fafc',
          maxWidth: '300px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
        }}
      >
        <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0 0 6px 0', textTransform: 'uppercase', color: '#eab308' }}>
          Diagrama Unifilar do QDC
        </h4>
        <p style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.4', margin: 0 }}>
          Este diagrama representa a árvore de cargas e disjuntores da instalação. Os circuitos e cabos são calculados automaticamente conforme a NBR 5410 com base nos símbolos inseridos na prancheta 2D.
        </p>
      </div>
    </div>
  );
};
