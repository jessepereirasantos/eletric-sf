import React from 'react';
import { DrawRectangle } from './DrawRectangle';
import { PushPull } from './PushPull';
import { SnapSystem } from './SnapSystem';

export const ToolManager: React.FC = () => {
  return (
    <group>
      <SnapSystem />
      <DrawRectangle />
      <PushPull />
    </group>
  );
};
