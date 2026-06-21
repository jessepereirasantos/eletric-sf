import React from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing';
import { RenderMode } from '../../../types';

export const PostProcessingEffects: React.FC = () => {
  const { renderMode } = useCadStore();

  // No Wireframe ou XRAY não precisamos calcular N8AO para poupar GPU
  const disableAO = renderMode === RenderMode.WIREFRAME || renderMode === RenderMode.XRAY;

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      {/* SMAA: Subpixel Morphological Antialiasing - Excelente para arestas finas */}
      <SMAA />

      {/* Ambient Occlusion Físico para evidenciar quinas como o Sketchup */}
      {!disableAO && (
        <N8AO 
          aoRadius={0.5} 
          intensity={2.0} 
          aoSamples={16} 
          denoiseSamples={4} 
          halfRes={false} 
        />
      )}
    </EffectComposer>
  );
};
