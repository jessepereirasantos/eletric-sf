import React from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { ToolMode } from '../../../types';
import { DrawRectangle } from './DrawRectangle';
import { PushPull } from './PushPull';
import { SnapSystem } from './SnapSystem';

export const ToolManager: React.FC = () => {
  const { activeTool } = useCadStore();

  return (
    <group>
      <SnapSystem />
      <DrawRectangle />
      <PushPull />
    </group>
  );
};
