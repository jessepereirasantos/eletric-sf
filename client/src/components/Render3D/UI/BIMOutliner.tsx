import React, { useMemo, useState } from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { FolderTree, Lock, Unlock, Eye, EyeOff, Box } from 'lucide-react';
import type { BIMNode } from '../../../types';

export const BIMOutliner: React.FC = () => {
  const { walls, devices, areas, setSelectedWallId, setSelectedDeviceId, selectedWallId, selectedDeviceId } = useCadStore();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  // Constrói a árvore BIM pseudo-real em tempo de execução
  const bimTree: BIMNode[] = useMemo(() => {
    return [
      {
        id: 'group_arquitetura',
        name: 'Arquitetura',
        type: 'group',
        children: walls.map(w => ({
          id: w.id,
          name: `Parede L=${(Math.sqrt(Math.pow(w.p2.x - w.p1.x, 2) + Math.pow(w.p2.y - w.p1.y, 2))).toFixed(2)}m`,
          type: 'object'
        }))
      },
      {
        id: 'group_eletrica',
        name: 'Elétrica / MEP',
        type: 'group',
        children: devices.map(d => ({
          id: d.id,
          name: `${d.type.toUpperCase()} - ${d.name || 'Sem nome'}`,
          type: 'object'
        }))
      },
      {
        id: 'group_areas',
        name: 'Terrenos e Lajes',
        type: 'group',
        children: areas.map(a => ({
          id: a.id,
          name: `Área/Piso ${a.type || ''}`,
          type: 'object'
        }))
      }
    ];
  }, [walls, devices, areas]);

  const toggleHidden = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(hiddenIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHiddenIds(next);
  };

  const toggleLock = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(lockedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLockedIds(next);
  };

  const renderNode = (node: BIMNode, depth = 0) => {
    const isGroup = node.type === 'group';
    const isHidden = hiddenIds.has(node.id);
    const isLocked = lockedIds.has(node.id);
    const isSelected = selectedWallId === node.id || selectedDeviceId === node.id;

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 12}px`, display: 'flex', flexDirection: 'column' }}>
        <div 
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 6px',
            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onClick={() => {
            if (isGroup) return; // Aqui no futuro, abre o grupo
            if (node.id.includes('wall')) setSelectedWallId(node.id);
            else if (node.id.includes('device')) setSelectedDeviceId(node.id);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isGroup ? <FolderTree size={14} color="#f59e0b" /> : <Box size={14} color="#60a5fa" />}
            <span style={{ fontSize: '0.75rem', opacity: isHidden ? 0.5 : 1 }}>{node.name}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={(e) => toggleLock(e, node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {isLocked ? <Lock size={12} color="#ef4444" /> : <Unlock size={12} color="#64748b" />}
            </button>
            <button onClick={(e) => toggleHidden(e, node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {isHidden ? <EyeOff size={12} color="#64748b" /> : <Eye size={12} color="#10b981" />}
            </button>
          </div>
        </div>

        {isGroup && node.children && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 20,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px',
      color: '#cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'auto',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)',
      width: '280px',
      maxHeight: '60vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
        <FolderTree size={18} color="#3b82f6" />
        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>Outliner (BIM)</h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '4px' }}>
        {bimTree.map(rootNode => renderNode(rootNode))}
      </div>
    </div>
  );
};
