import React from 'react';
import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing';

export const PostProcessingEffects: React.FC = () => {
  return (
    <EffectComposer>
      <SMAA />
      <N8AO 
        aoRadius={0.5} 
        intensity={2.0} 
        aoSamples={16} 
        denoiseSamples={4} 
        halfRes={false} 
      />
    </EffectComposer>
  );
};
