import { useState } from 'react';
import { useCadStore } from '../../../../store/useCadStore';

/** ScenesPanel â€” Gerenciador de cenas estilo SketchUp */
export function ScenesPanel() {
  const { scenesList, activeSceneId, addScene, removeScene, renameScene, activateScene } = useCadStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      renameScene(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <div style={{ fontSize: 11 }}>
      {scenesList.map(scene => (
        <div
          key={scene.id}
          className={`su-scene-item ${activeSceneId === scene.id ? 'active' : ''}`}
          onClick={() => activateScene(scene.id)}
        >
          <span style={{ fontSize: 13 }}>ðŸŽ¬</span>
          {editingId === scene.id ? (
            <input
              autoFocus
              className="su-entity-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={e => { if (e.key === 'Enter') handleFinishRename(); if (e.key === 'Escape') setEditingId(null); }}
              style={{ flex: 1, height: 18 }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              style={{ flex: 1 }}
              onDoubleClick={(e) => { e.stopPropagation(); handleStartRename(scene.id, scene.name); }}
            >
              {scene.name}
            </span>
          )}
          {scenesList.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--su-text-muted)', fontSize: 12, padding: '0 2px' }}
              title="Remover cena"
            >
              âœ•
            </button>
          )}
        </div>
      ))}
      <button
        className="su-scene-add-btn"
        onClick={() => addScene(`Cena ${scenesList.length + 1}`)}
      >
        + Adicionar Cena
      </button>
      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--su-text-muted)', lineHeight: 1.5 }}>
        Duplo clique para renomear.<br />
        Clique para ativar a cena.
      </div>
    </div>
  );
}

