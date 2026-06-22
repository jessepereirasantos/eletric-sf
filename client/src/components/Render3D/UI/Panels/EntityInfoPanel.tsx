import { useCadStore } from '../../../../store/useCadStore';

/** EntityInfoPanel â€” InformaÃ§Ãµes da entidade selecionada (equivalente ao Entity Info do SketchUp) */
export function EntityInfoPanel() {
  const {
    selectedDeviceId, selectedWallId, selectedConduitId, selectedTextId,
    devices, walls, conduits, texts,
    updateDeviceProperties, updateWall,
  } = useCadStore();


  // Determinar a entidade selecionada
  if (selectedDeviceId) {
    const device = devices.find(d => d.id === selectedDeviceId);
    if (!device) return <div className="su-instructor" style={{ color: 'var(--su-text-muted)' }}>Nenhuma entidade selecionada.</div>;
    return (
      <div style={{ fontSize: 11 }}>
        <div style={{ fontWeight: 700, padding: '3px 0 6px', color: 'var(--su-text)', borderBottom: '1px solid var(--su-border)', marginBottom: 4 }}>
          Dispositivo
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Tipo</span>
          <span className="su-entity-value">{device.type}</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Nome</span>
          <input
            className="su-entity-input"
            value={device.name}
            onChange={e => updateDeviceProperties(device.id, { name: e.target.value })}
            style={{ width: 110 }}
          />
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">X</span>
          <span className="su-entity-value">{device.x.toFixed(2)} m</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Y</span>
          <span className="su-entity-value">{device.y.toFixed(2)} m</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">PotÃªncia</span>
          <span className="su-entity-value">{device.power} W</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">TensÃ£o</span>
          <span className="su-entity-value">{device.voltage} V</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Circuito</span>
          <span className="su-entity-value">{device.circuitId ?? 'â€”'}</span>
        </div>
        {device.height3d !== undefined && (
          <div className="su-entity-row">
            <span className="su-entity-label">Altura</span>
            <input
              type="number"
              className="su-entity-input"
              value={device.height3d}
              step={0.05}
              onChange={e => updateDeviceProperties(device.id, { height3d: parseFloat(e.target.value) })}
              style={{ width: 60 }}
            />
            <span style={{ marginLeft: 2, color: 'var(--su-text-muted)' }}>m</span>
          </div>
        )}
      </div>
    );
  }

  if (selectedWallId) {
    const wall = walls.find(w => w.id === selectedWallId);
    if (!wall) return null;
    return (
      <div style={{ fontSize: 11 }}>
        <div style={{ fontWeight: 700, padding: '3px 0 6px', color: 'var(--su-text)', borderBottom: '1px solid var(--su-border)', marginBottom: 4 }}>
          Parede
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Material</span>
          <span className="su-entity-value">{wall.material}</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Espessura</span>
          <input
            type="number"
            className="su-entity-input"
            value={wall.thickness}
            step={0.01}
            onChange={e => updateWall(wall.id, { thickness: parseFloat(e.target.value) })}
            style={{ width: 60 }}
          />
          <span style={{ marginLeft: 2, color: 'var(--su-text-muted)' }}>m</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Altura</span>
          <input
            type="number"
            className="su-entity-input"
            value={wall.height}
            step={0.1}
            onChange={e => updateWall(wall.id, { height: parseFloat(e.target.value) })}
            style={{ width: 60 }}
          />
          <span style={{ marginLeft: 2, color: 'var(--su-text-muted)' }}>m</span>
        </div>
        <div className="su-entity-row">
          <span className="su-entity-label">Comprimento</span>
          <span className="su-entity-value">
            {Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(wall.p2.y - wall.p1.y, 2)).toFixed(2)} m
          </span>
        </div>
      </div>
    );
  }

  if (selectedConduitId) {
    const conduit = conduits.find(c => c.id === selectedConduitId);
    if (!conduit) return null;
    return (
      <div style={{ fontSize: 11 }}>
        <div style={{ fontWeight: 700, padding: '3px 0 6px', color: 'var(--su-text)', borderBottom: '1px solid var(--su-border)', marginBottom: 4 }}>
          Eletroduto
        </div>
        <div className="su-entity-row"><span className="su-entity-label">DiÃ¢metro</span><span className="su-entity-value">{conduit.diameter}"</span></div>
        <div className="su-entity-row"><span className="su-entity-label">Tipo</span><span className="su-entity-value">{conduit.type}</span></div>
      </div>
    );
  }

  if (selectedTextId) {
    const text = texts.find(t => t.id === selectedTextId);
    if (!text) return null;
    return (
      <div style={{ fontSize: 11 }}>
        <div style={{ fontWeight: 700, padding: '3px 0 6px', color: 'var(--su-text)', borderBottom: '1px solid var(--su-border)', marginBottom: 4 }}>
          Texto
        </div>
        <div className="su-entity-row"><span className="su-entity-label">ConteÃºdo</span><span className="su-entity-value">{text.text}</span></div>
        <div className="su-entity-row"><span className="su-entity-label">Tamanho</span><span className="su-entity-value">{text.fontSize}pt</span></div>
      </div>
    );
  }

  return (
    <div className="su-instructor" style={{ color: 'var(--su-text-muted)' }}>
      <div className="su-instructor-title">InformaÃ§Ãµes da Entidade</div>
      <p>Selecione uma entidade no editor para ver suas propriedades aqui.</p>
    </div>
  );
}

