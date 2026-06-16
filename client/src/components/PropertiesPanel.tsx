import React from 'react';
import { useCadStore } from '../store/useCadStore';
import type { Device, Wall, CadText, Conduit } from '../store/useCadStore';

// ─── Painel de Propriedades da Parede ────────────────────────

const WallProperties: React.FC<{ wall: Wall }> = ({ wall }) => {
  const { updateWall, removeWall, clearSelection } = useCadStore();

  const handleChange = <K extends keyof Wall>(key: K, value: Wall[K]) => {
    updateWall(wall.id, { [key]: value } as Partial<Wall>);
  };

  const handleLengthChange = (newLength: number) => {
    const dx = wall.p2.x - wall.p1.x;
    const dy = wall.p2.y - wall.p1.y;
    const currentLength = Math.sqrt(dx * dx + dy * dy);
    if (currentLength === 0) return;
    const cosVal = dx / currentLength;
    const sinVal = dy / currentLength;
    const newP2 = {
      x: wall.p1.x + cosVal * newLength,
      y: wall.p1.y + sinVal * newLength
    };
    updateWall(wall.id, { p2: newP2 });
  };

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon">▬</span>
        <div>
          <div className="props-title">Parede</div>
          <div className="props-subtitle">Segmento de alvenaria/estrutura</div>
        </div>
      </div>

      <div className="props-field">
        <label>Comprimento (m)</label>
        <input
          type="number"
          className="props-input"
          min={0.10} max={50.00} step={0.05}
          value={Math.round(Math.sqrt(Math.pow(wall.p2.x - wall.p1.x, 2) + Math.pow(wall.p2.y - wall.p1.y, 2)) * 100) / 100}
          onChange={e => handleLengthChange(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
        />
      </div>

      <div className="props-field">
        <label>Espessura</label>
        <div className="props-input-row">
          <input
            type="range"
            min={0.08}
            max={0.50}
            step={0.01}
            value={wall.thickness}
            onChange={e => handleChange('thickness', parseFloat(e.target.value))}
          />
          <span className="props-value">{(wall.thickness * 100).toFixed(0)} cm</span>
        </div>
        <input
          type="number"
          className="props-input"
          min={0.08} max={0.50} step={0.01}
          value={wall.thickness}
          onChange={e => handleChange('thickness', Math.max(0.08, parseFloat(e.target.value) || 0.15))}
        />
      </div>

      <div className="props-field">
        <label>Altura (m)</label>
        <input
          type="number"
          className="props-input"
          min={1.00} max={6.00} step={0.05}
          value={wall.height}
          onChange={e => handleChange('height', Math.max(1, parseFloat(e.target.value) || 2.8))}
        />
      </div>

      <div className="props-field">
        <label>Material</label>
        <select
          className="props-select"
          value={wall.material}
          onChange={e => handleChange('material', e.target.value as Wall['material'])}
        >
          <option value="alvenaria">Alvenaria</option>
          <option value="drywall">Drywall</option>
          <option value="concreto">Concreto</option>
          <option value="vidro">Vidro</option>
        </select>
      </div>

      <div className="props-info">
        <div>Comprimento:&nbsp;
          <strong>{(Math.sqrt(
            Math.pow(wall.p2.x - wall.p1.x, 2) +
            Math.pow(wall.p2.y - wall.p1.y, 2)
          ) * 100).toFixed(0)} cm</strong>
        </div>
      </div>

      <div className="props-actions">
        <button className="props-btn-danger" onClick={() => { removeWall(wall.id); clearSelection(); }}>
          🗑 Excluir Parede
        </button>
      </div>
    </div>
  );
};

// ─── Painel de Propriedades de Cota ───────────────────────────

const DimensionProperties: React.FC<{ dimId: string }> = ({ dimId }) => {
  const { dimensions, removeDimension, clearSelection, updateDimensionLabel, updateDimensionPoints, updateDimensionOffset } = useCadStore();
  const dim = dimensions.find(d => d.id === dimId);
  if (!dim) return null;

  const dx = dim.p2.x - dim.p1.x;
  const dy = dim.p2.y - dim.p1.y;
  const L = Math.sqrt(dx * dx + dy * dy);

  const [labelVal, setLabelVal] = React.useState(dim.labelOverride ?? '');

  const handleLabelApply = () => {
    const v = labelVal.trim();
    if (v === '') {
      updateDimensionLabel(dimId, '');
    } else {
      updateDimensionLabel(dimId, v);
    }
  };

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon">⟺</span>
        <div>
          <div className="props-title">Cota / Medida</div>
          <div className="props-subtitle">Comprimento: {L.toFixed(2)} m</div>
        </div>
      </div>

      <div className="props-field">
        <label>P1 — X (m)</label>
        <input
          type="number" className="props-input" step={0.01}
          value={Math.round(dim.p1.x * 100) / 100}
          onChange={e => updateDimensionPoints(dimId, { x: parseFloat(e.target.value) || 0, y: dim.p1.y }, dim.p2)}
        />
      </div>
      <div className="props-field">
        <label>P1 — Y (m)</label>
        <input
          type="number" className="props-input" step={0.01}
          value={Math.round(dim.p1.y * 100) / 100}
          onChange={e => updateDimensionPoints(dimId, { x: dim.p1.x, y: parseFloat(e.target.value) || 0 }, dim.p2)}
        />
      </div>
      <div className="props-field">
        <label>P2 — X (m)</label>
        <input
          type="number" className="props-input" step={0.01}
          value={Math.round(dim.p2.x * 100) / 100}
          onChange={e => updateDimensionPoints(dimId, dim.p1, { x: parseFloat(e.target.value) || 0, y: dim.p2.y })}
        />
      </div>
      <div className="props-field">
        <label>P2 — Y (m)</label>
        <input
          type="number" className="props-input" step={0.01}
          value={Math.round(dim.p2.y * 100) / 100}
          onChange={e => updateDimensionPoints(dimId, dim.p1, { x: dim.p2.x, y: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="props-field">
        <label>Afastamento (m)</label>
        <input
          type="number" className="props-input" step={0.05}
          value={dim.offset ?? 0}
          onChange={e => updateDimensionOffset(dimId, parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="props-field">
        <label>Rótulo personalizado (opcional)</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text" className="props-input"
            placeholder="Ex: 3.50"
            value={labelVal}
            onChange={e => setLabelVal(e.target.value)}
            onBlur={handleLabelApply}
            onKeyDown={e => e.key === 'Enter' && handleLabelApply()}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={handleLabelApply}
            style={{ padding: '0 8px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            ✓
          </button>
        </div>
        <div className="props-hint" style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
          Deixe em branco para usar o valor calculado automaticamente.
        </div>
      </div>

      <div className="props-actions">
        <button className="props-btn-danger" onClick={() => { removeDimension(dimId); clearSelection(); }}>
          🗑 Excluir Cota
        </button>
      </div>
    </div>
  );
};

// ─── Painel de Propriedades de Linha de Guia ──────────────────

const GuideLineProperties: React.FC<{ guideId: string }> = ({ guideId }) => {
  const { guideLines, removeGuideLine, clearSelection, updateGuideLine } = useCadStore();
  const guide = guideLines.find(g => g.id === guideId);
  if (!guide) return null;

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon">📐</span>
        <div>
          <div className="props-title">Linha de Guia</div>
          <div className="props-subtitle">{guide.type === 'vertical' ? 'Vertical (eixo X)' : 'Horizontal (eixo Y)'}</div>
        </div>
      </div>

      <div className="props-field">
        <label>Posição {guide.type === 'vertical' ? 'X' : 'Y'} — em metros (Marco Zero)</label>
        <input
          type="number"
          className="props-input"
          step={0.01}
          value={Math.round(guide.value * 100) / 100}
          onChange={e => updateGuideLine(guideId, parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="props-info" style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
        <div>Referência: Marco Zero = (0, 0)</div>
        <div>Posição atual: {guide.value.toFixed(3)} m</div>
      </div>

      <div className="props-actions">
        <button className="props-btn-danger" onClick={() => { removeGuideLine(guideId); clearSelection(); }}>
          🗑 Excluir Guia
        </button>
      </div>
    </div>
  );
};

// ─── Painel de Propriedades de Dispositivo ────────────────────

const DeviceProperties: React.FC<{ device: Device }> = ({ device }) => {
  const { updateDeviceProperties, removeDevice, clearSelection, circuits, addDeviceModule, removeDeviceModule } = useCadStore();

  const update = (props: Partial<Device>) => updateDeviceProperties(device.id, props);

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      tug_baixa: '▽', tug_media: '◁', tug_alta: '△',
      tue_chuveiro: '♨', tue_ar: '❄',
      ceiling_light: '⚪', sconce: '🌙', fluorescent: '▭',
      switch_simple: '▣', switch_parallel: '⬛', switch_intermediate: '◪',
      qdc: '◪', poste: '⚡', meter: '📦',
      door: '🚪', door_correr: '🚪', door_pivotante: '🚪', open_van: '🚪',
      window: '🖼️', stairs: '📶',
      tele_rj45: '▲', tele_rj11: '▲', tele_coaxial: '▲',
      cftv_camera: '📹', sensor_presenca: '🚨', central_alarme: '📟',
      box_octogonal: '⬡', box_4x2: '▭', box_4x4: '□',
      // Ícones das novas cargas
      motor: 'Ⓜ️', bomba_agua: '⛲', torneira_eletrica: '🚰',
      fotocelula: '👁️', campainha: '🔔',
    };
    return icons[type] || '●';
  };

  const getTitle = (type: string) => {
    const titles: Record<string, string> = {
      tug_baixa: 'Tomada TUG Baixa 10A (0.3m)',
      tug_media: 'Tomada TUG Média 10A (1.1m)',
      tug_alta: 'Tomada TUG Alta 10A (2.2m)',
      tue_chuveiro: 'Tomada TUE Chuveiro',
      tue_ar: 'Tomada TUE Ar Condic.',
      ceiling_light: 'Ponto de Luz no Teto',
      sconce: 'Arandela (Parede)',
      fluorescent: 'Lâmpada Fluorescente',
      switch_simple: 'Interruptor Simples',
      switch_parallel: 'Interruptor Paralelo (3-Way)',
      switch_intermediate: 'Interruptor Intermediário (4-Way)',
      qdc: 'Quadro de Distribuição (QDC)',
      poste: 'Poste de Entrada',
      meter: 'Caixa de Medição',
      door: 'Porta de Giro',
      door_correr: 'Porta de Correr',
      door_pivotante: 'Porta Pivotante',
      open_van: 'Vão Livre',
      window: 'Janela de Correr',
      stairs: 'Escada de Subida',
      tele_rj45: 'Tomada RJ45 (Rede/Dados)',
      tele_rj11: 'Tomada RJ11 (Telefone)',
      tele_coaxial: 'Tomada Coaxial (TV)',
      cftv_camera: 'Câmera CFTV',
      sensor_presenca: 'Sensor de Presença',
      central_alarme: 'Central de Alarme',
      box_octogonal: 'Caixa Octogonal (Teto)',
      box_4x2: 'Caixa 4x2 (Parede)',
      box_4x4: 'Caixa 4x4 (Parede)',
      // Títulos das novas cargas
      motor: 'Motor Elétrico (Força)',
      bomba_agua: 'Bomba d\'Água (Força)',
      torneira_eletrica: 'Torneira Elétrica (Força)',
      fotocelula: 'Fotocélula (Sensor)',
      campainha: 'Campainha / Cigarra',
    };
    return titles[type] || device.name;
  };

  const isTomada = device.type.startsWith('tug_') || device.type.startsWith('tue_') || device.type === 'tomada_220';
  const isLampada = device.type === 'ceiling_light' || device.type === 'sconce' || device.type === 'fluorescent' || device.type === 'lampada';
  const isInterruptor = device.type.startsWith('switch_') || device.type.startsWith('interruptor') || device.type.includes('switch');
  const isQDC = device.type === 'qdc';
  const isEsquadria = device.type.startsWith('door') || device.type === 'window' || device.type === 'open_van';
  const isTelecom = device.type.startsWith('tele_');
  const isSeguranca = device.type === 'cftv_camera' || device.type === 'sensor_presenca' || device.type === 'central_alarme' || device.type === 'fotocelula' || device.type === 'campainha';
  const isBox = device.type.startsWith('box_');
  const isCargaCatalogo = ['motor', 'bomba_agua', 'torneira_eletrica'].includes(device.type);
  const isComandoEspecial = ['sensor_presenca', 'fotocelula'].includes(device.type);
  const isModular = (isTomada || isInterruptor || isTelecom) && !isBox && !isCargaCatalogo && !isComandoEspecial;

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon props-icon-device">{getIcon(device.type)}</span>
        <div>
          <div className="props-title">{getTitle(device.type)}</div>
          <div className="props-subtitle">{device.name}</div>
        </div>
      </div>

      {/* Nome personalizado */}
      <div className="props-field">
        <label>Nome / Referência</label>
        <input
          type="text"
          className="props-input"
          value={device.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="Nome do ponto"
        />
      </div>

      {/* Largura do Vão (apenas para esquadrias) */}
      {isEsquadria && (
        <div className="props-field">
          <label>Largura do Vão (cm)</label>
          <input
            type="number"
            className="props-input"
            min={10} max={500} step={5}
            value={Math.round((device.width ?? (device.type === 'window' ? 1.2 : device.type === 'open_van' ? 1.0 : 0.8)) * 100)}
            onChange={e => update({ width: Math.max(10, parseInt(e.target.value) || 80) / 100 })}
          />
        </div>
      )}

      {/* Tensão — tomadas, QDC e Cargas */}
      {(isTomada || isQDC || isCargaCatalogo) && (
        <div className="props-field">
          <label>Tensão Nominal</label>
          <div className="props-toggle-row">
            <button
              className={`props-toggle ${device.voltage === 127 ? 'active' : ''}`}
              onClick={() => update({ voltage: 127 })}
            >127 V (Mono)</button>
            <button
              className={`props-toggle ${device.voltage === 220 ? 'active' : ''}`}
              onClick={() => update({ voltage: 220 })}
            >220 V (Bi)</button>
          </div>
        </div>
      )}

      {/* Potência — tomadas, lâmpadas, telecom, segurança e cargas do catálogo */}
      {(isTomada || isLampada || isTelecom || isSeguranca || isCargaCatalogo) && (
        <div className="props-field">
          <label>Potência (W)</label>
          <input
            type="number"
            className="props-input"
            min={0} max={10000} step={10}
            value={device.power}
            onChange={e => update({ power: Math.max(0, parseInt(e.target.value) || 0) })}
          />
          {isTomada && (
            <div className="props-hint">
              Média residencial: 100W/ponto (TUG) ou 1500W-7500W (TUE)
            </div>
          )}
          {isCargaCatalogo && (
            <div className="props-hint">
              Cargas específicas: Motor (750W = 1CV), Torneira (4400W), Bomba (375W)
            </div>
          )}
        </div>
      )}

      {/* Tipo de lâmpada */}
      {isLampada && (
        <div className="props-field">
          <label>Tipo de Lâmpada</label>
          <select
            className="props-select"
            value={device.power <= 15 ? 'led' : device.power <= 25 ? 'fluorescente' : 'incandescente'}
            onChange={e => {
              const pMap: Record<string, number> = { led: 9, fluorescente: 20, incandescente: 60 };
              update({ power: pMap[e.target.value] ?? 60 });
            }}
          >
            <option value="led">LED</option>
            <option value="fluorescente">Fluorescente</option>
            <option value="incandescente">Incandescente</option>
          </select>
        </div>
      )}

      {/* Rotação */}
      {!isQDC && device.type !== 'poste' && (
        <div className="props-field">
          <label>Rotação</label>
          <div className="props-input-row">
            <input
              type="range"
              min={0} max={270} step={90}
              value={device.rotation}
              onChange={e => update({ rotation: parseInt(e.target.value) })}
            />
            <span className="props-value">{device.rotation}°</span>
          </div>
          <div className="props-rotation-btns">
            {[0, 90, 180, 270].map(r => (
              <button
                key={r}
                className={`props-rot-btn ${device.rotation === r ? 'active' : ''}`}
                onClick={() => update({ rotation: r })}
              >{r}°</button>
            ))}
          </div>
        </div>
      )}

      {/* Sentido de Abertura (apenas para portas de giro/pivotante) */}
      {(device.type === 'door' || device.type === 'door_pivotante') && (
        <div className="props-field">
          <label>Sentido de Abertura</label>
          <div className="props-toggle-row">
            <button
              className={`props-toggle ${device.flip ? 'active' : ''}`}
              onClick={() => update({ flip: true })}
            >Esquerda</button>
            <button
              className={`props-toggle ${!device.flip ? 'active' : ''}`}
              onClick={() => update({ flip: false })}
            >Direita</button>
          </div>
        </div>
      )}

      {/* Fases de Alimentação (Cargas do Catálogo) */}
      {isCargaCatalogo && (
        <div className="props-field">
          <label>Fases de Alimentação</label>
          <select
            className="props-select"
            value={device.phases ?? 'mono'}
            onChange={e => update({ phases: e.target.value as any })}
          >
            <option value="mono">Monofásico (F + N)</option>
            <option value="bi">Bifásico (F + F)</option>
            <option value="tri">Trifásico (3F)</option>
          </select>
        </div>
      )}

      {/* Topologia Interna do QDC (Apenas QDC) */}
      {isQDC && (
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', marginTop: '12px', marginBottom: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🛡️ Topologia Interna (Proteção)
          </h4>
          
          <div className="props-field" style={{ marginBottom: '8px' }}>
            <label>Disjuntor Geral</label>
            <select
              className="props-select"
              value={device.qdcGeralBreaker ?? 0}
              onChange={e => update({ qdcGeralBreaker: parseInt(e.target.value) || 0 })}
            >
              <option value={0}>Nenhum (Sem Geral)</option>
              <option value={32}>32 A</option>
              <option value={40}>40 A</option>
              <option value={50}>50 A</option>
              <option value={63}>63 A</option>
              <option value={80}>80 A</option>
              <option value={100}>100 A</option>
            </select>
          </div>

          <div className="props-field" style={{ marginBottom: '8px' }}>
            <label>Proteção DR (Diferencial Residual)</label>
            <select
              className="props-select"
              value={device.qdcDRType ?? 'none'}
              onChange={e => update({ qdcDRType: e.target.value as any })}
            >
              <option value="none">Nenhum</option>
              <option value="geral">DR Geral (30mA)</option>
              <option value="grupos">DRs por Grupos de Circuitos</option>
            </select>
          </div>

          <div className="props-field" style={{ marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'normal' }}>
              <input
                type="checkbox"
                checked={!!device.qdcHasDPS}
                onChange={e => update({ qdcHasDPS: e.target.checked })}
              />
              DPS Geral (Proteção Contra Surtos)
            </label>
          </div>

          <div className="props-field" style={{ marginBottom: '8px' }}>
            <label>Barramentos de Distribuição</label>
            <select
              className="props-select"
              value={device.qdcBusbarType ?? 'none'}
              onChange={e => update({ qdcBusbarType: e.target.value as any })}
            >
              <option value="none">Nenhum</option>
              <option value="monofasico">Monofásico (F + N + T)</option>
              <option value="bifasico">Bifásico (2F + N + T)</option>
              <option value="trifasico">Trifásico (3F + N + T)</option>
            </select>
          </div>
        </div>
      )}

      {/* Circuito vinculado */}
      {(isTomada || isLampada || isInterruptor || isTelecom || isSeguranca || isCargaCatalogo || isComandoEspecial) && (
        <div className="props-field">
          <label>Circuito</label>
          <select
            className="props-select"
            value={device.circuitId ?? ''}
            onChange={e => update({ circuitId: e.target.value || undefined })}
          >
            <option value="">— Sem circuito —</option>
            {circuits.map(c => (
              <option key={c.id} value={c.id}>
                Circ. {c.number} — {c.name} ({c.voltage}V)
              </option>
            ))}
          </select>
          {circuits.length === 0 && (
            <div className="props-hint">
              Nenhum circuito cadastrado. Use Análise → Dimensionamento para criar circuitos.
            </div>
          )}
        </div>
      )}

      {/* Letra do Comando (apenas para interruptores, lâmpadas e comandos especiais) */}
      {(isInterruptor || isLampada || isComandoEspecial) && (
        <div className="props-field">
          <label>Letra do Comando (Acionamento)</label>
          <input
            type="text"
            className="props-input"
            maxLength={5}
            value={device.commandLetter ?? ''}
            onChange={e => update({ commandLetter: e.target.value.toLowerCase() })}
            placeholder="Ex: a, b, c..."
          />
          <div className="props-hint">
            Letra que vincula o interruptor ao ponto de luz correspondente.
          </div>
        </div>
      )}

      {/* Seção de Módulos da Caixa Elétrica (Modularidade) */}
      {isModular && (
        <div className="props-field" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
          <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🔌</span> Módulos da Caixa (4x2 / 4x4)
          </label>
          
          <div className="props-modules-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
            {(device.modules || [device.type]).map((mod, idx) => {
              const friendlyNames: Record<string, string> = {
                tug_baixa: 'Tomada Baixa 10A',
                tug_media: 'Tomada Média 10A',
                tug_alta: 'Tomada Alta 10A',
                tue_chuveiro: 'Tomada Chuveiro',
                tue_ar: 'Tomada Ar Condicionado',
                switch_simple: 'Interruptor Simples',
                switch_parallel: 'Interruptor Paralelo',
                switch_intermediate: 'Interruptor Intermediário',
                tele_rj45: 'Tomada RJ45 (Rede)',
                tele_rj11: 'Tomada RJ11 (Telefone)',
                tele_coaxial: 'Tomada Coaxial (TV)',
                cftv_camera: 'Câmera CFTV',
                sensor_presenca: 'Sensor de Presença',
                central_alarme: 'Central de Alarme',
              };
              const name = friendlyNames[mod] || mod;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#334155'
                }}>
                  <span><strong>Módulo {idx + 1}:</strong> {name}</span>
                  {idx > 0 && (
                    <button
                      onClick={() => removeDeviceModule(device.id, idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        padding: '2px 6px'
                      }}
                      title="Remover módulo"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Adicionar Módulo */}
          {(!device.modules || device.modules.length < 3) && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <select
                id={`add-mod-select-${device.id}`}
                className="props-select"
                style={{ fontSize: '0.75rem', padding: '4px 8px', height: '28px', flex: 1 }}
                defaultValue="tug_media"
              >
                <option value="tug_baixa">Tomada Baixa 10A</option>
                <option value="tug_media">Tomada Média 10A</option>
                <option value="tug_alta">Tomada Alta 10A</option>
                <option value="switch_simple">Interruptor Simples</option>
                <option value="switch_parallel">Interruptor Paralelo</option>
                <option value="tele_rj45">Tomada RJ45 (Rede)</option>
              </select>
              <button
                className="props-btn"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0 10px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  height: '28px'
                }}
                onClick={() => {
                  const sel = document.getElementById(`add-mod-select-${device.id}`) as HTMLSelectElement;
                  if (sel) {
                    addDeviceModule(device.id, sel.value);
                  }
                }}
              >
                ＋ Adicionar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Posição (apenas informativa) */}
      <div className="props-info">
        <div>Posição: <strong>X: {(device.x * 100).toFixed(0)} cm, Y: {(device.y * 100).toFixed(0)} cm</strong></div>
        {device.power > 0 && <div>Potência: <strong>{device.power} W</strong></div>}
        {isEsquadria && <div>Tipo: <strong>Esquadria de Alvenaria Inteligente</strong></div>}
      </div>

      <div className="props-actions">
        <button
          className="props-btn-danger"
          onClick={() => { removeDevice(device.id); clearSelection(); }}
        >
          🗑 Excluir Componente
        </button>
      </div>
    </div>
  );
};

// ─── Painel de Propriedades de Texto ──────────────────────────

const TextProperties: React.FC<{ textItem: CadText }> = ({ textItem }) => {
  const { updateText, removeText, clearSelection } = useCadStore();

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon props-icon-device">✏️</span>
        <div>
          <div className="props-title">Anotação de Texto</div>
          <div className="props-subtitle">Rótulo / Legenda técnica</div>
        </div>
      </div>

      <div className="props-field">
        <label>Conteúdo do Texto</label>
        <textarea
          className="props-input"
          rows={3}
          value={textItem.text}
          onChange={e => updateText(textItem.id, e.target.value)}
          placeholder="Digite o texto aqui"
          style={{ width: '100%', resize: 'vertical', padding: '8px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        />
      </div>

      <div className="props-field">
        <label>Tamanho da Fonte</label>
        <div className="props-input-row">
          <input
            type="range"
            min={8}
            max={32}
            step={1}
            value={textItem.fontSize || 14}
            onChange={e => updateText(textItem.id, textItem.text, parseInt(e.target.value))}
          />
          <span className="props-value">{textItem.fontSize || 14} px</span>
        </div>
      </div>

      <div className="props-actions" style={{ marginTop: '16px' }}>
        <button className="props-btn-danger" onClick={() => { removeText(textItem.id); clearSelection(); }}>
          🗑 Excluir Texto
        </button>
      </div>
    </div>
  );
};

// ─── Painel Vazio (sem seleção) ───────────────────────────────

const EmptyPanel: React.FC = () => (
  <div className="props-panel-content props-empty">
    <div className="props-empty-icon">↖</div>
    <div className="props-empty-title">Nenhum elemento selecionado</div>
    <div className="props-empty-text">
      Clique em uma parede ou componente no canvas para ver e editar suas propriedades aqui.
    </div>
    <div className="props-tips">
      <div className="props-tip"><strong>▬</strong> Parede: espessura, altura, material</div>
      <div className="props-tip"><strong>▽</strong> Tomada: tensão, potência, circuito</div>
      <div className="props-tip"><strong>⚪</strong> Luz: tipo, potência, circuito</div>
      <div className="props-tip"><strong>▣</strong> Interruptor: tipo, circuito</div>
    </div>
  </div>
);

// ─── Painel do Paper Space (Pranchas) ─────────────────────────

const PaperProperties: React.FC = () => {
  const {
    paperSize, paperScale, paperTitle, paperOwner, paperDesigner, paperDate, paperSheetNum,
    setPaperSize, setPaperScale, updatePaperStamp,
  } = useCadStore();

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon props-icon-device">📄</span>
        <div>
          <div className="props-title">Prancha de Impressão</div>
          <div className="props-subtitle">Paper Space (ABNT)</div>
        </div>
      </div>

      <div className="props-field">
        <label>Formato do Papel</label>
        <select
          className="props-select"
          value={paperSize}
          onChange={e => setPaperSize(e.target.value as any)}
        >
          <option value="A0">Folha A0 (1189 x 841 mm)</option>
          <option value="A1">Folha A1 (841 x 594 mm)</option>
          <option value="A2">Folha A2 (594 x 420 mm)</option>
          <option value="A3">Folha A3 (420 x 297 mm)</option>
          <option value="A4">Folha A4 (297 x 210 mm)</option>
        </select>
      </div>

      <div className="props-field">
        <label>Escala de Plotagem</label>
        <select
          className="props-select"
          value={paperScale}
          onChange={e => setPaperScale(parseInt(e.target.value))}
        >
          <option value={20}>Escala 1:20</option>
          <option value={25}>Escala 1:25</option>
          <option value={50}>Escala 1:50</option>
          <option value={75}>Escala 1:75</option>
          <option value={100}>Escala 1:100</option>
          <option value={125}>Escala 1:125</option>
          <option value={150}>Escala 1:150</option>
          <option value={200}>Escala 1:200</option>
        </select>
        <div className="props-hint">
          Ajusta os limites virtuais da prancha para enquadrar a planta na escala desejada.
        </div>
      </div>

      <div className="props-field">
        <label>Título do Projeto</label>
        <input
          type="text"
          className="props-input"
          value={paperTitle}
          onChange={e => updatePaperStamp({ title: e.target.value })}
        />
      </div>

      <div className="props-field">
        <label>Proprietário</label>
        <input
          type="text"
          className="props-input"
          value={paperOwner}
          onChange={e => updatePaperStamp({ owner: e.target.value })}
        />
      </div>

      <div className="props-field">
        <label>Responsável Técnico</label>
        <input
          type="text"
          className="props-input"
          value={paperDesigner}
          onChange={e => updatePaperStamp({ designer: e.target.value })}
        />
      </div>

      <div className="props-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label>Data</label>
          <input
            type="text"
            className="props-input"
            value={paperDate}
            onChange={e => updatePaperStamp({ date: e.target.value })}
          />
        </div>
        <div>
          <label>Nº Prancha</label>
          <input
            type="text"
            className="props-input"
            value={paperSheetNum}
            onChange={e => updatePaperStamp({ sheetNum: e.target.value })}
          />
        </div>
      </div>

      <div className="props-info">
        <div>Dica: <strong>Use a ferramenta de seleção (Seta)</strong> para arrastar a prancha no canvas e enquadrar o desenho para impressão.</div>
      </div>
    </div>
  );
};

// ─── Painel de Propriedades do Conduíte (Eletroduto) ──────────
const ConduitProperties: React.FC<{ conduit: Conduit }> = ({ conduit }) => {
  const { updateConduitProperties, removeConduit, clearSelection, circuits } = useCadStore();
  const [selectedCircuitId, setSelectedCircuitId] = React.useState('');
  const [phase, setPhase] = React.useState(1);
  const [neutral, setNeutral] = React.useState(1);
  const [ground, setGround] = React.useState(1);
  const [ret, setRet] = React.useState(0);

  const update = (props: Partial<Conduit>) => updateConduitProperties(conduit.id, props);

  const handleAddWire = () => {
    if (!selectedCircuitId) return;
    const currentWires = conduit.manualWires || [];
    
    // Evita duplicados para o mesmo circuito
    const filtered = currentWires.filter(w => w.circuitId !== selectedCircuitId);
    const updated = [
      ...filtered,
      { circuitId: selectedCircuitId, phase, neutral, ground, ret }
    ];
    update({ manualWires: updated });
    setSelectedCircuitId('');
    setPhase(1);
    setNeutral(1);
    setGround(1);
    setRet(0);
  };

  const handleRemoveWire = (circId: string) => {
    const currentWires = conduit.manualWires || [];
    const updated = currentWires.filter(w => w.circuitId !== circId);
    update({ manualWires: updated });
  };

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', color: '#0f172a' }}>〰</span>
        <div>
          <div className="props-title">Eletroduto</div>
          <div className="props-subtitle">Conexão física (conduíte)</div>
        </div>
      </div>

      {/* Diâmetro */}
      <div className="props-field">
        <label>Diâmetro Nominal (Pol.)</label>
        <select
          className="props-select"
          value={conduit.diameter}
          onChange={e => update({ diameter: e.target.value as Conduit['diameter'] })}
        >
          <option value="1/2">1/2"</option>
          <option value="3/4">3/4"</option>
          <option value="1">1"</option>
          <option value="1 1/4">1 1/4"</option>
        </select>
      </div>

      {/* Tipo */}
      <div className="props-field">
        <label>Material / Tipo</label>
        <select
          className="props-select"
          value={conduit.type}
          onChange={e => update({ type: e.target.value as Conduit['type'] })}
        >
          <option value="flexivel">Corrugado Flexível</option>
          <option value="rigido">PVC Rígido</option>
        </select>
      </div>

      {/* Alternância Automática vs Manual */}
      <div className="props-field" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <input
            type="checkbox"
            checked={!!conduit.isManualWiring}
            onChange={e => update({ isManualWiring: e.target.checked })}
          />
          Habilitar Fiação Manual
        </label>
        <div className="props-hint">
          Se ativo, ignora o cálculo automático e utiliza as fiações listadas abaixo.
        </div>
      </div>

      {conduit.isManualWiring && (
        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Lançamento de Fiação Manual</h4>
          
          {/* Adicionar Fiação */}
          <div className="props-field" style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '10px' }}>Circuito</label>
            <select
              className="props-select"
              style={{ padding: '4px', fontSize: '12px', height: 'auto' }}
              value={selectedCircuitId}
              onChange={e => setSelectedCircuitId(e.target.value)}
            >
              <option value="">— Selecione o Circuito —</option>
              {circuits.map(c => (
                <option key={c.id} value={c.id}>Circ. {c.number} — {c.name}</option>
              ))}
            </select>
          </div>

          {selectedCircuitId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '9px', display: 'block', color: '#64748b' }}>Fase(s)</label>
                <input type="number" min={0} max={3} className="props-input" style={{ padding: '3px', fontSize: '11px' }} value={phase} onChange={e => setPhase(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
              <div>
                <label style={{ fontSize: '9px', display: 'block', color: '#64748b' }}>Neutro(s)</label>
                <input type="number" min={0} max={2} className="props-input" style={{ padding: '3px', fontSize: '11px' }} value={neutral} onChange={e => setNeutral(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
              <div>
                <label style={{ fontSize: '9px', display: 'block', color: '#64748b' }}>Terra(s)</label>
                <input type="number" min={0} max={2} className="props-input" style={{ padding: '3px', fontSize: '11px' }} value={ground} onChange={e => setGround(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
              <div>
                <label style={{ fontSize: '9px', display: 'block', color: '#64748b' }}>Retorno(s)</label>
                <input type="number" min={0} max={4} className="props-input" style={{ padding: '3px', fontSize: '11px' }} value={ret} onChange={e => setRet(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
              <button 
                type="button" 
                className="props-btn-primary" 
                style={{ gridColumn: 'span 2', padding: '5px', fontSize: '11px', marginTop: '4px', cursor: 'pointer', background: '#0f172a', color: 'white', border: 'none', borderRadius: '4px' }}
                onClick={handleAddWire}
              >
                + Adicionar Fiação
              </button>
            </div>
          )}

          {/* Lista de Fiações Existentes */}
          <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#64748b' }}>Fiações Lançadas:</span>
            {(!conduit.manualWires || conduit.manualWires.length === 0) ? (
              <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma fiação manual.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {conduit.manualWires.map(mw => {
                  const circ = circuits.find(c => c.id === mw.circuitId);
                  if (!circ) return null;
                  return (
                    <div key={mw.circuitId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '10px' }}>
                      <div style={{ color: '#334155' }}>
                        <strong>Circ. {circ.number}</strong>: {mw.phase}F, {mw.neutral}N, {mw.ground}T, {mw.ret}R
                      </div>
                      <button 
                        type="button" 
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: '0 2px' }}
                        onClick={() => handleRemoveWire(mw.circuitId)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="props-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '16px' }}>
        <button className="props-btn-danger" onClick={() => { removeConduit(conduit.id); clearSelection(); }}>
          🗑 Excluir Eletroduto
        </button>
      </div>
    </div>
  );
};

// ─── Painel de Propriedades da Planta Rascunho (Imagem de Fundo) ──
const BgImageProperties: React.FC = () => {
  const { 
    bgImageScaleX, bgImageScaleY, bgImageRotation, bgImagePos,
    setBgImageScaleX, setBgImageScaleY, setBgImageRotation, setBgImagePos, setBgImageLock, setBgImageSelected
  } = useCadStore();

  const handleScaleXChange = (val: number) => {
    setBgImageScaleX(Math.max(0.01, val));
  };

  const handleScaleYChange = (val: number) => {
    setBgImageScaleY(Math.max(0.01, val));
  };

  const handleRotationChange = (val: number) => {
    setBgImageRotation((val % 360 + 360) % 360);
  };

  const handlePosChange = (axis: 'x' | 'y', val: number) => {
    setBgImagePos({
      ...bgImagePos,
      [axis]: val
    });
  };

  return (
    <div className="props-panel-content">
      <div className="props-header">
        <span className="props-icon" style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>🖼️</span>
        <div>
          <div className="props-title">Planta Rascunho</div>
          <div className="props-subtitle">Ajuste de imagem base</div>
        </div>
      </div>

      {/* Escala X */}
      <div className="props-field">
        <label>Escala Largura (X)</label>
        <div className="props-input-row">
          <input
            type="range"
            min={0.1}
            max={5.0}
            step={0.01}
            value={bgImageScaleX}
            onChange={e => handleScaleXChange(parseFloat(e.target.value))}
          />
          <span className="props-value">{bgImageScaleX.toFixed(2)}x</span>
        </div>
        <input
          type="number"
          className="props-input"
          min={0.01} max={100} step={0.01}
          value={parseFloat(bgImageScaleX.toFixed(3))}
          onChange={e => handleScaleXChange(parseFloat(e.target.value) || 1.0)}
        />
      </div>

      {/* Escala Y */}
      <div className="props-field">
        <label>Escala Altura (Y)</label>
        <div className="props-input-row">
          <input
            type="range"
            min={0.1}
            max={5.0}
            step={0.01}
            value={bgImageScaleY}
            onChange={e => handleScaleYChange(parseFloat(e.target.value))}
          />
          <span className="props-value">{bgImageScaleY.toFixed(2)}x</span>
        </div>
        <input
          type="number"
          className="props-input"
          min={0.01} max={100} step={0.01}
          value={parseFloat(bgImageScaleY.toFixed(3))}
          onChange={e => handleScaleYChange(parseFloat(e.target.value) || 1.0)}
        />
      </div>

      {/* Rotação */}
      <div className="props-field">
        <label>Rotação (Graus)</label>
        <div className="props-input-row">
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={Math.round(bgImageRotation)}
            onChange={e => handleRotationChange(parseInt(e.target.value))}
          />
          <span className="props-value">{Math.round(bgImageRotation)}°</span>
        </div>
        <input
          type="number"
          className="props-input"
          min={0} max={360} step={1}
          value={Math.round(bgImageRotation)}
          onChange={e => handleRotationChange(parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Posição X */}
      <div className="props-field">
        <label>Posição X (Pixels)</label>
        <input
          type="number"
          className="props-input"
          step={5}
          value={Math.round(bgImagePos.x)}
          onChange={e => handlePosChange('x', parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Posição Y */}
      <div className="props-field">
        <label>Posição Y (Pixels)</label>
        <input
          type="number"
          className="props-input"
          step={5}
          value={Math.round(bgImagePos.y)}
          onChange={e => handlePosChange('y', parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Ações */}
      <div className="props-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '16px' }}>
        <button 
          className="props-btn-primary" 
          onClick={() => { 
            setBgImageLock(true); 
            setBgImageSelected(false); 
          }}
          style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🔒 Travar Posição da Planta
        </button>
      </div>
    </div>
  );
};

// ─── Painel Principal (exportado) ─────────────────────────────

export const PropertiesPanel: React.FC = () => {
  const {
    selectedDeviceId, selectedWallId, selectedTextId, selectedConduitId,
    selectedDimensionId, selectedGuideLineId,
    devices, walls, texts, conduits, paperSpaceActive, bgImageSelected, bgImageSrc
  } = useCadStore();

  const selectedDevice = selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) : null;
  const selectedWall = selectedWallId ? walls.find(w => w.id === selectedWallId) : null;
  const selectedText = selectedTextId ? (texts || []).find(t => t.id === selectedTextId) : null;
  const selectedConduit = selectedConduitId ? conduits.find(c => c.id === selectedConduitId) : null;

  const noSelection = !selectedWall && !selectedDevice && !selectedText && !selectedConduit
    && !bgImageSelected && !selectedDimensionId && !selectedGuideLineId;

  return (
    <aside className="properties-panel">
      <div className="props-panel-header">
        <span>Propriedades</span>
      </div>

      {selectedWall && <WallProperties wall={selectedWall} />}
      {selectedDevice && <DeviceProperties device={selectedDevice} />}
      {selectedText && <TextProperties textItem={selectedText} />}
      {selectedConduit && <ConduitProperties conduit={selectedConduit} />}
      {bgImageSelected && bgImageSrc && <BgImageProperties />}
      {selectedDimensionId && <DimensionProperties dimId={selectedDimensionId} />}
      {selectedGuideLineId && <GuideLineProperties guideId={selectedGuideLineId} />}
      {noSelection && paperSpaceActive && <PaperProperties />}
      {noSelection && !paperSpaceActive && <EmptyPanel />}
    </aside>
  );
};
