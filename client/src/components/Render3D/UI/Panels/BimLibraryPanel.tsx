import { useState } from 'react';
import { useCadStore } from '../../../../store/useCadStore';

/** BimLibraryPanel â€” Biblioteca BIM com abas por disciplina */
export function BimLibraryPanel() {
  const { setCurrentTool, setSelectedDeviceType, setActiveToolId } = useCadStore();
  const [activeTab, setActiveTab] = useState<'eletrica' | 'arquitetura' | 'hidraulica' | 'estrutura'>('eletrica');
  const [search, setSearch] = useState('');

  const bimItems = {
    eletrica: [
      { id: 'tug_baixa', label: 'Tomada 2P+T 10A', icon: 'âš¡', category: 'Tomadas' },
      { id: 'tug_media', label: 'Tomada 2P+T 15A', icon: 'âš¡', category: 'Tomadas' },
      { id: 'tug_alta', label: 'Tomada 2P+T 20A', icon: 'âš¡', category: 'Tomadas' },
      { id: 'tomada_10a_nbr', label: 'Tomada NBR 10A', icon: 'âŠ•', category: 'Tomadas' },
      { id: 'switch_simple', label: 'Interruptor Simples', icon: 'â¬¡', category: 'Interruptores' },
      { id: 'switch_parallel', label: 'Interruptor Paralelo', icon: 'â¬¡', category: 'Interruptores' },
      { id: 'switch_intermediate', label: 'Interruptor IntermediÃ¡rio', icon: 'â¬¡', category: 'Interruptores' },
      { id: 'dimmer', label: 'Dimmer', icon: 'â—', category: 'Interruptores' },
      { id: 'ceiling_light', label: 'Ponto de Luz Teto', icon: 'â˜€', category: 'IluminaÃ§Ã£o' },
      { id: 'sconce', label: 'Arandela', icon: 'ðŸ”†', category: 'IluminaÃ§Ã£o' },
      { id: 'fluorescent', label: 'Fluorescente/LED', icon: 'â–¬', category: 'IluminaÃ§Ã£o' },
      { id: 'tue_chuveiro', label: 'Chuveiro ElÃ©trico', icon: 'ðŸš¿', category: 'TUE' },
      { id: 'tue_ar', label: 'Ar Condicionado', icon: 'â„', category: 'TUE' },
      { id: 'qdc', label: 'Quadro DistribuiÃ§Ã£o', icon: 'â–¦', category: 'Quadros' },
      { id: 'qgbt', label: 'QGBT', icon: 'â–©', category: 'Quadros' },
      { id: 'disjuntor', label: 'Disjuntor', icon: 'âŠ¡', category: 'ProteÃ§Ã£o' },
      { id: 'dr', label: 'Disjuntor DR', icon: 'âŠ¡', category: 'ProteÃ§Ã£o' },
      { id: 'dps', label: 'DPS', icon: 'âŠŸ', category: 'ProteÃ§Ã£o' },
      { id: 'cftv_camera', label: 'CÃ¢mera CFTV', icon: 'ðŸ“·', category: 'AutomaÃ§Ã£o' },
      { id: 'sensor_presenca', label: 'Sensor PresenÃ§a', icon: 'ðŸ‘', category: 'AutomaÃ§Ã£o' },
      { id: 'sensor_fumaca', label: 'Sensor FumaÃ§a', icon: 'ðŸ”¥', category: 'AutomaÃ§Ã£o' },
      { id: 'central_alarme', label: 'Central Alarme', icon: 'ðŸš¨', category: 'AutomaÃ§Ã£o' },
      { id: 'caixa_passagem', label: 'Caixa Passagem', icon: 'â–¡', category: 'Infraestrutura' },
      { id: 'box_octogonal', label: 'Caixa Octogonal', icon: 'â¬¡', category: 'Infraestrutura' },
      { id: 'box_4x2', label: 'Caixa 4x2', icon: 'â–­', category: 'Infraestrutura' },
      { id: 'box_4x4', label: 'Caixa 4x4', icon: 'â–ª', category: 'Infraestrutura' },
      { id: 'tele_rj45', label: 'Ponto RJ45', icon: 'ðŸ”Œ', category: 'Telecom' },
      { id: 'tele_rj11', label: 'Ponto RJ11', icon: 'ðŸ“ž', category: 'Telecom' },
      { id: 'tele_coaxial', label: 'Ponto Coaxial', icon: 'ðŸ“¡', category: 'Telecom' },
    ],
    arquitetura: [
      { id: 'door', label: 'Porta Simples', icon: 'ðŸšª', category: 'Esquadrias' },
      { id: 'door_correr', label: 'Porta Correr', icon: 'ðŸšª', category: 'Esquadrias' },
      { id: 'door_pivotante', label: 'Porta Pivotante', icon: 'ðŸšª', category: 'Esquadrias' },
      { id: 'window', label: 'Janela', icon: 'â¬œ', category: 'Esquadrias' },
      { id: 'open_van', label: 'VÃ£o Aberto', icon: 'âŠŸ', category: 'Esquadrias' },
      { id: 'stairs', label: 'Escada', icon: 'ðŸªœ', category: 'CirculaÃ§Ã£o' },
      { id: 'sofa', label: 'SofÃ¡', icon: 'ðŸ›‹', category: 'MobiliÃ¡rio' },
      { id: 'cama', label: 'Cama', icon: 'ðŸ›', category: 'MobiliÃ¡rio' },
      { id: 'mesa_jantar', label: 'Mesa de Jantar', icon: 'ðŸ½', category: 'MobiliÃ¡rio' },
      { id: 'geladeira', label: 'Geladeira', icon: 'ðŸ§Š', category: 'EletrodomÃ©sticos' },
      { id: 'fogao', label: 'FogÃ£o', icon: 'ðŸ”¥', category: 'EletrodomÃ©sticos' },
      { id: 'maquina_lavar', label: 'MÃ¡quina de Lavar', icon: 'ðŸ”„', category: 'EletrodomÃ©sticos' },
      { id: 'vaso_sanitario', label: 'Vaso SanitÃ¡rio', icon: 'ðŸš½', category: 'Banheiro' },
      { id: 'pia_esculpida', label: 'Pia/Cuba', icon: 'âŠ¡', category: 'Banheiro' },
    ],
    hidraulica: [
      { id: 'torneira_eletrica', label: 'Torneira ElÃ©trica', icon: 'ðŸš°', category: 'Pontos' },
      { id: 'bomba_agua', label: 'Bomba de Ãgua', icon: 'âš™', category: 'Equipamentos' },
    ],
    estrutura: [
      { id: 'motor', label: 'Motor', icon: 'âš™', category: 'Equipamentos' },
      { id: 'gerador', label: 'Gerador', icon: 'âš¡', category: 'Equipamentos' },
      { id: 'nobreak', label: 'Nobreak', icon: 'ðŸ”‹', category: 'Equipamentos' },
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
    { key: 'eletrica', label: 'âš¡ ElÃ©trica' },
    { key: 'arquitetura', label: 'ðŸ  Arq.' },
    { key: 'hidraulica', label: 'ðŸ’§ Hidr.' },
    { key: 'estrutura', label: 'âš™ Equip.' },
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

