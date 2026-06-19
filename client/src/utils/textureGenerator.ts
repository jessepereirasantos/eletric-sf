import * as THREE from 'three';

// Cache para não regenerar as mesmas texturas a cada frame
const textureCache: Record<string, THREE.CanvasTexture> = {};

/**
 * Utilitário para geração de texturas procedimentais em runtime
 * para garantir alta fidelidade visual 100% offline.
 */
export const TextureGenerator = {
  /**
   * Gera uma textura de veios de madeira
   */
  getWood: (baseColor = '#a16207', grainColor = '#78350f'): THREE.CanvasTexture => {
    const cacheKey = `wood_${baseColor}_${grainColor}`;
    if (textureCache[cacheKey]) return textureCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Fundo
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // Veios da madeira
    ctx.strokeStyle = grainColor;
    ctx.lineWidth = 1.5;
    for (let i = -50; i < 300; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      
      // Curva senoidal com pequenas irregularidades para simular madeira real
      ctx.bezierCurveTo(
        i + Math.sin(i * 0.05) * 20, 80,
        i - Math.cos(i * 0.05) * 20, 170,
        i + Math.sin(i * 0.02) * 10, 256
      );
      ctx.globalAlpha = 0.08 + Math.random() * 0.12;
      ctx.stroke();
    }

    // Adiciona alguns nós de madeira circulares
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = grainColor;
    for (let n = 0; n < 3; n++) {
      const kx = Math.random() * 256;
      const ky = Math.random() * 256;
      const kr = 15 + Math.random() * 25;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    textureCache[cacheKey] = texture;
    return texture;
  },

  /**
   * Gera uma textura de porcelanato marmorizado
   */
  getPorcelanato: (baseColor = '#e2e8f0'): THREE.CanvasTexture => {
    const cacheKey = `porcelanato_${baseColor}`;
    if (textureCache[cacheKey]) return textureCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Cor de base
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Veios suaves de mármore
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, 0);
      ctx.bezierCurveTo(
        Math.random() * 512, 120,
        Math.random() * 512, 380,
        Math.random() * 512, 512
      );
      ctx.globalAlpha = 0.1 + Math.random() * 0.15;
      ctx.stroke();
    }

    // Borda de rejunte (linha escura bem fina ao redor)
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8); // Repete 8x8 placas no piso do projeto

    textureCache[cacheKey] = texture;
    return texture;
  },

  /**
   * Gera azulejo para paredes de banheiros/cozinhas
   */
  getAzulejo: (tileColor = '#ffffff', jointColor = '#cbd5e1'): THREE.CanvasTexture => {
    const cacheKey = `azulejo_${tileColor}_${jointColor}`;
    if (textureCache[cacheKey]) return textureCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Fundo
    ctx.fillStyle = tileColor;
    ctx.fillRect(0, 0, 256, 256);

    // Divisões de azulejos (grid de 4x4)
    ctx.strokeStyle = jointColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    const step = 64;
    for (let x = 0; x <= 256; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, x);
      ctx.lineTo(256, x);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    textureCache[cacheKey] = texture;
    return texture;
  },

  /**
   * Gera uma textura rugosa fina para simular pintura de parede fosca (rolo de lã)
   */
  getWallPaint: (colorHex = '#ffffff'): THREE.CanvasTexture => {
    const cacheKey = `wall_${colorHex}`;
    if (textureCache[cacheKey]) return textureCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 128, 128);

    // Adicionar micro-ruído de textura de rolo
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 2500; i++) {
      const rx = Math.random() * 128;
      const ry = Math.random() * 128;
      ctx.globalAlpha = Math.random() * 0.025;
      ctx.fillRect(rx, ry, 1, 1);
    }
    
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 2000; i++) {
      const rx = Math.random() * 128;
      const ry = Math.random() * 128;
      ctx.globalAlpha = Math.random() * 0.035;
      ctx.fillRect(rx, ry, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    textureCache[cacheKey] = texture;
    return texture;
  }
};
