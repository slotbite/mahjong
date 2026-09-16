// Renderer WebGL. Sin tone mapping para que la paleta pixel art de las cartas sea exacta.
import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x0f2a22, 1);
  return renderer;
}

/** Ajusta DPR/tamaño y la resolución del pase de transmisión según el layout. */
export function applyRendererLayout(renderer, { w, h, dpr, kind }) {
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  // El pase de transmisión (vidrio) renderiza la escena opaca a una textura: a media
  // resolución en móvil/tablet cuesta ~4× menos y el desenfoque del vidrio lo disimula.
  renderer.transmissionResolutionScale = kind === 'mobile' ? 0.5 : kind === 'tablet' ? 0.75 : 1;
}
