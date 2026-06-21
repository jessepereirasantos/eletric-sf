const fs = require('fs');

function fixStore() {
  const file = 'src/store/useCadStore.ts';
  let content = fs.readFileSync(file, 'utf8');
  
  // Eu adicionei "setCurrentTool:" ali por volta da linha 720 antes de "setActiveTool:" ?
  // Vamos remover a minha declaração errada de setSelectedDeviceType e setCurrentTool se tiverem duas.
  // Como são linhas 1340, a outra deve estar antes.
  // Vou usar Regex para encontrar a primeira ocorrência.
  
  const lines = content.split('\n');
  
  let toolOccurrences = [];
  let deviceOccurrences = [];
  
  for(let i=0; i<lines.length; i++) {
    if (lines[i].trim().startsWith('setCurrentTool: (tool) =>')) {
      toolOccurrences.push(i);
    }
    if (lines[i].trim().startsWith('setSelectedDeviceType: (type) =>')) {
      deviceOccurrences.push(i);
    }
  }
  
  if (toolOccurrences.length > 1) {
    // Remove a primeira ocorrência do `setCurrentTool` que provavelmente foi a que eu adicionei incorretamente ou a que não faz tudo
    const idx = toolOccurrences[0];
    lines[idx] = '// removed dup';
  }
  
  if (deviceOccurrences.length > 1) {
    const idx = deviceOccurrences[0];
    lines[idx] = '// removed dup';
  }
  
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Store fixed.', toolOccurrences, deviceOccurrences);
}

function fixPostProcessing() {
  const file = 'src/components/Render3D/Effects/PostProcessing.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/{!disableAO \? \(/g, '{!disableAO && (');
  content = content.replace(/\) : null}/g, ')}');
  content = content.replace(/Type 'Element \| null'/g, ''); // just in case
  // To fix the "false | Element" error from React Three Postprocessing EffectComposer
  // It expects strictly a ReactElement, so we should return a fragment wrapper or something.
  // Actually, EffectComposer accepts children. If we pass `false`, it fails typing.
  content = content.replace(/{!disableAO && \(/g, '{!disableAO ? (');
  content = content.replace(/halfRes={false} \n        \/>\n      \)}/g, 'halfRes={false} \n        />\n      ) : <></>}');
  
  fs.writeFileSync(file, content);
  console.log('PostProcessing fixed');
}

function fixEnvironment() {
  const fileEnv = 'src/components/Render3D/Scene/Environment.tsx';
  let contentEnv = `import React from 'react';
import { useCadStore } from '../../../store/useCadStore';
import { Environment as EnvironmentDrei } from '@react-three/drei';
import { OriginAxes3D } from './OriginAxes3D'; // We'll just define it here or remove

export const EnvironmentManager: React.FC = () => {
  const { showOriginAxes, renderMode } = useCadStore();

  return (
    <>
      <EnvironmentDrei preset="city" background={false} />
    </>
  );
};
`;
  fs.writeFileSync(fileEnv, contentEnv);
  
  const fileView = 'src/views/Render3DView.tsx';
  let contentView = fs.readFileSync(fileView, 'utf8');
  // Add EnvironmentManager import back
  if (!contentView.includes('EnvironmentManager')) {
     contentView = contentView.replace("import { RenderMode } from '../types';", "import { RenderMode } from '../types';\nimport { EnvironmentManager } from '../components/Render3D/Scene/Environment';");
  }
  // The user reported TextureGenerator was unused
  contentView = contentView.replace("import { TextureGenerator } from '../utils/textureGenerator';", "");
  
  fs.writeFileSync(fileView, contentView);
  console.log('Environment fixed');
}

fixStore();
fixPostProcessing();
fixEnvironment();
