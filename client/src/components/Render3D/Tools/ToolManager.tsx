import React from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { ToolMode } from '../../../types';
// Importação futura das ferramentas individuais
// import { DrawLine } from './DrawLine';
// import { PushPull } from './PushPull';

export const ToolManager: React.FC = () => {
  const { activeTool } = useCadStore();

  return (
    <group>
      {/* Aqui instanciamos os comportamentos invisíveis ou os Ghost Meshes (Pré-visualização geométrica) */}
      
      {/* activeTool === ToolMode.LINE && <DrawLine /> */}
      {/* activeTool === ToolMode.PUSH_PULL && <PushPull /> */}
      
    </group>
  );
};
