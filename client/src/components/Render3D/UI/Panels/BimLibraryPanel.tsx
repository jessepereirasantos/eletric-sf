import { useState } from 'react';
import { useCadStore } from '../../../../store/useCadStore';

/** BimLibraryPanel â€” Biblioteca BIM com abas por disciplina */
export function BimLibraryPanel() {
  const { setCurrentTool, setSelectedDeviceType, setActiveToolId } = useCadStore();
  const [activeTab, setActiveTab] = useState<'eletrica' | 'arquitetura' | 'hidraulica' | 'estrutura'>('eletrica');
  const [search, setSearch] = useState('');

  const bimItems = {
    eletrica: [
      { id: 'tug_baixa', label: 'Tomada 2P+T 10A', icon: '⚡', category: 'Tomadas' },
      { id: 'tug_media', label: 'Tomada 2P+T 15A', icon: '⚡', category: 'Tomadas' },
      { id: 'tug_alta', label: 'Tomada 2P+T 20A', icon: '⚡', category: 'Tomadas' },
      { id: 'tomada_10a_nbr', label: 'Tomada NBR 10A', icon: '⊕', category: 'Tomadas' },
      { id: 'switch_simple', label: 'Interruptor Simples', icon: '⬡', category: 'Interruptores' },
      { id: 'switch_parallel', label: 'Interruptor Paralelo', icon: '⬡', category: 'Interruptores' },
      { id: 'switch_intermediate', label: 'Interruptor Intermediário', icon: '⬡', category: 'Interruptores' },
      { id: 'dimmer', label: 'Dimmer', icon: 'â—', category: 'Interruptores' },
      { id: 'ceiling_light', label: 'Ponto de Luz Teto', icon: '☀️', category: 'Iluminação' },
      { id: 'sconce', label: 'Arandela', icon: '🔆', category: 'Iluminação' },
      { id: 'fluorescent', label: 'Fluorescente/LED', icon: '▬', category: 'Iluminação' },
      { id: 'tue_chuveiro', label: 'Chuveiro Elétrico', icon: '🚿', category: 'TUE' },
      { id: 'tue_ar', label: 'Ar Condicionado', icon: 'â„', category: 'TUE' },
      { id: 'qdc', label: 'Quadro Distribuição', icon: '▦', category: 'Quadros' },
      { id: 'qgbt', label: 'QGBT', icon: '▩', category: 'Quadros' },
      { id: 'disjuntor', label: 'Disjuntor', icon: '🛡️', category: 'Proteção' },
      { id: 'dr', label: 'Disjuntor DR', icon: '🛡️', category: 'Proteção' },
      { id: 'dps', label: 'DPS', icon: '🌩️', category: 'Proteção' },
      { id: 'cftv_camera', label: 'Câmera CFTV', icon: '📷', category: 'Automação' },
      { id: 'sensor_presenca', label: 'Sensor Presença', icon: 'ðŸ‘', category: 'Automação' },
      { id: 'sensor_fumaca', label: 'Sensor Fumaça', icon: '🔥', category: 'Automação' },
      { id: 'central_alarme', label: 'Central Alarme', icon: '🚨', category: 'Automação' },
      { id: 'caixa_passagem', label: 'Caixa Passagem', icon: '□', category: 'Infraestrutura' },
      { id: 'box_octogonal', label: 'Caixa Octogonal', icon: '⬡', category: 'Infraestrutura' },
      { id: 'box_4x2', label: 'Caixa 4x2', icon: '▯', category: 'Infraestrutura' },
      { id: 'box_4x4', label: 'Caixa 4x4', icon: '▪', category: 'Infraestrutura' },
      { id: 'tele_rj45', label: 'Ponto RJ45', icon: '🔌', category: 'Telecom' },
      { id: 'tele_rj11', label: 'Ponto RJ11', icon: '📞', category: 'Telecom' },
      { id: 'tele_coaxial', label: 'Ponto Coaxial', icon: '📡', category: 'Telecom' },
    ],
    arquitetura: [
      { id: 'door', label: 'Porta Simples', icon: '🚪', category: 'Esquadrias' },
      { id: 'door_correr', label: 'Porta Correr', icon: '🚪', category: 'Esquadrias' },
      { id: 'door_pivotante', label: 'Porta Pivotante', icon: '🚪', category: 'Esquadrias' },
      { id: 'window', label: 'Janela', icon: '⬛', category: 'Esquadrias' },
      { id: 'open_van', label: 'Vão Aberto', icon: '🌩️', category: 'Esquadrias' },
      { id: 'stairs', label: 'Escada', icon: '🪜', category: 'Circulação' },
      { id: 'sofa', label: 'Sofá', icon: '🛋️', category: 'Mobiliário' },
      { id: 'cama', label: 'Cama', icon: 'ðŸ›', category: 'Mobiliário' },
      { id: 'mesa_jantar', label: 'Mesa de Jantar', icon: 'ðŸ½', category: 'Mobiliário' },
      { id: 'geladeira', label: 'Geladeira', icon: '🧊', category: 'Eletrodomésticos' },
      { id: 'fogao', label: 'Fogão', icon: '🔥', category: 'Eletrodomésticos' },
      { id: 'maquina_lavar', label: 'Máquina de Lavar', icon: '🔄', category: 'Eletrodomésticos' },
      { id: 'vaso_sanitario', label: 'Vaso Sanitário', icon: '🚽', category: 'Banheiro' },
      { id: 'pia_esculpida', label: 'Pia/Cuba', icon: '🛡️', category: 'Banheiro' },
    ],
    hidraulica: [
      { id: 'torneira_eletrica', label: 'Torneira Elétrica', icon: '🚰', category: 'Pontos' },
      { id: 'bomba_agua', label: 'Bomba de ígua', icon: '⚙️', category: 'Equipamentos' },
    ],
    estrutura: [
      { id: 'motor', label: 'Motor', icon: '⚙️', category: 'Equipamentos' },
      { id: 'gerador', label: 'Gerador', icon: '⚡', category: 'Equipamentos' },
      { id: 'nobreak', label: 'Nobreak', icon: '🔋', category: 'Equipamentos' },
    ],
  };

  const items = bimItems[activeTab];
  const filtered = items.filter(item =>
    !search || item.label.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por categoria
  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const handleSelectItem = (itemId: string) => {
    setCurrentTool('device');
    setSelectedDeviceType(itemId);
    setActiveToolId('device');
  };

  const tabs: Array<{ key: typeof activeTab; label: string }> = [
    { key: 'eletrica', label: '⚡ Elétrica' },
    { key: 'arquitetura', label: 'ðŸ  Arq.' },
    { key: 'hidraulica', label: '💧 Hidr.' },
    { key: 'estrutura', label: '⚙️ Equip.' },
  ];

  return (
    <div style={{ fontSize: 11 }}>
      {/* Abas de disciplina */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--su-border)', marginBottom: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              fontSize: 10,
              padding: '3px 2px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--su-text-active)' : '2px solid transparent',
              background: activeTab === tab.key ? 'var(--su-bg-active)' : 'transparent',
              color: activeTab === tab.key ? 'var(--su-text-active)' : 'var(--su-text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--su-font)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <input
        type="text"
        className="su-bim-search"
        placeholder="Buscar componente..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Lista de componentes agrupados */}
      <div style={{ overflowY: 'auto', maxHeight: 300 }}>
        {Object.entries(groups).map(([category, items]) => (
          <div key={category}>
            <div className="su-bim-category">{category}</div>
            {items.map(item => (
              <div
                key={item.id}
                className="su-bim-item"
                onClick={() => handleSelectItem(item.id)}
                title={`Clique para selecionar: ${item.label}`}
              >
                <span className="su-bim-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '8px 4px', color: 'var(--su-text-muted)', textAlign: 'center' }}>
            Nenhum componente encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

