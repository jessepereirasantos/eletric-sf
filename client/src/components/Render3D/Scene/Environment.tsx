import React from 'react';
import { Environment as EnvironmentDrei } from '@react-three/drei';

export const EnvironmentManager: React.FC = () => {
  return (
    <>
      <EnvironmentDrei preset="city" background={false} />
    </>
  );
};
