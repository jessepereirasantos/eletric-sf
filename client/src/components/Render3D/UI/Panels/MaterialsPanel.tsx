import { useState } from 'react';
import { useCadStore } from '../../../../store/useCadStore';

/** MaterialsPanel â€” Biblioteca de materiais PBR com miniaturas */
export function MaterialsPanel() {
  const { pbrMaterials } = useCadStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('Todos');

  const categories = ['Todos', ...Array.from(new Set(pbrMaterials.map(m => m.category ?? 'Outros')))];

  const filtered = filterCategory === 'Todos'
    ? pbrMaterials
    : pbrMaterials.filter(m => m.category === filterCategory);

  return (
    <div style={{ fontSize: 11 }}>
      {/* Filtro por categoria */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '4px 0', borderBottom: '1px solid var(--su-border-light)', marginBottom: 4 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 2,
              border: '1px solid var(--su-border)',
              background: filterCategory === cat ? 'var(--su-bg-active)' : 'transparent',
              color: filterCategory === cat ? 'var(--su-text-active)' : 'var(--su-text-muted)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de miniaturas */}
      <div className="su-materials-grid">
        {filtered.map(mat => (
          <div
            key={mat.id}
            className={`su-material-thumb ${selectedId === mat.id ? 'selected' : ''}`}
            title={mat.name}
            onClick={() => setSelectedId(mat.id)}
            style={{ backgroundColor: mat.color ?? '#cccccc' }}
          >
            <div className="su-material-thumb-label">{mat.name}</div>
          </div>
        ))}
      </div>

      {/* Detalhes do material selecionado */}
      {selectedId && (() => {
        const mat = pbrMaterials.find(m => m.id === selectedId);
        if (!mat) return null;
        return (
          <div style={{ marginTop: 6, padding: '6px', background: 'white', border: '1px solid var(--su-border)', borderRadius: 2 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--su-text)' }}>{mat.name}</div>
            {mat.category && <div className="su-entity-row"><span className="su-entity-label">Categoria</span><span className="su-entity-value">{mat.category}</span></div>}
            {mat.roughness !== undefined && <div className="su-entity-row"><span className="su-entity-label">Rugosidade</span><span className="su-entity-value">{(mat.roughness * 100).toFixed(0)}%</span></div>}
            {mat.metalness !== undefined && <div className="su-entity-row"><span className="su-entity-label">Metalicidade</span><span className="su-entity-value">{(mat.metalness * 100).toFixed(0)}%</span></div>}
            {mat.opacity !== undefined && mat.opacity < 1 && <div className="su-entity-row"><span className="su-entity-label">Opacidade</span><span className="su-entity-value">{(mat.opacity * 100).toFixed(0)}%</span></div>}
          </div>
        );
      })()}
    </div>
  );
}

