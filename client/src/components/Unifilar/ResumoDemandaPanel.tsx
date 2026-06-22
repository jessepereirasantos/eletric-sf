import React, { useMemo } from 'react';
import { useCadStore } from '../../store/useCadStore';
import { calculateDemand, autoPhaseBalance } from '../../utils/nbr5410';

export function ResumoDemandaPanel() {
  const { circuits, devices } = useCadStore();

  const { demandInfo, phaseBalance } = useMemo(() => {
    const qdc = devices.find(d => d.type === 'qdc');
    
    // Potência total e demanda
    const totalInstalledPower = circuits.reduce((sum, c) => {
      const cd = devices.filter(d => d.circuitId === c.id);
      return sum + cd.reduce((s, d) => s + (d.power || 0), 0);
    }, 0);

    const dInfo = calculateDemand(
      totalInstalledPower,
      220,
      qdc?.qdcBusbarType === 'trifasico' ? 'tri' : qdc?.qdcBusbarType === 'bifasico' ? 'bi' : 'mono',
      circuits.map(c => {
        const cd = devices.filter(d => d.circuitId === c.id);
        return { type: c.type, totalPower: cd.reduce((s, d) => s + (d.power || 0), 0) };
      })
    );

    // Balanceamento de Fases
    const pBalance = autoPhaseBalance(
      circuits.map(c => {
        const cd = devices.filter(d => d.circuitId === c.id);
        return { id: c.id, totalPower: cd.reduce((s, d) => s + (d.power || 0), 0), voltage: c.voltage };
      }),
      qdc?.qdcBusbarType === 'trifasico' ? 'trifasico' : qdc?.qdcBusbarType === 'bifasico' ? 'bifasico' : 'monofasico'
    );

    return { demandInfo: dInfo, phaseBalance: pBalance };
  }, [circuits, devices]);

  return (
    <div style={{ fontSize: '11px', color: 'var(--su-text)' }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--su-text-active)', borderBottom: '1px solid var(--su-border)', paddingBottom: '4px' }}>
        DIAGRAMA UNIFILAR — NBR 5410
      </h4>
      
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
      
      <div style={{ borderTop: '1px dashed var(--su-border)', margin: '8px 0', paddingTop: '8px' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: 'var(--su-text-muted)' }}>
          <span>Desbalanço máx:</span>
          <strong>{(phaseBalance.maxImbalance * 100).toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
}
