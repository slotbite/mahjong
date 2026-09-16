// Entorno: luces, niebla, fondo (imagen del manifiesto), suelo de sombras y plantas laterales.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { finishTexture } from './themes.js';

const PLANTS = [
  { src: 'assets/themes/plantas/monstera.webp', side: 'left', y: 0.66, h: 1.0 },
  { src: 'assets/themes/plantas/helecho.webp', side: 'right', y: 0.62, h: 0.9 },
  { src: 'assets/themes/plantas/snake_plant.webp', side: 'left', y: 0.30, h: 0.8, onlyUltrawide: true },
  { src: 'assets/themes/plantas/monstera.webp', side: 'right', y: 0.28, h: 0.75, onlyUltrawide: true, flip: true },
];

function pickSrc(srcset, cssWidth, dpr) {
  if (!srcset) return null;
  if (typeof srcset === 'string') return srcset;
  const need = cssWidth * dpr;
  const keys = Object.keys(srcset).map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
  if (!keys.length) return Object.values(srcset)[0];
  const k = keys.find((n) => n >= need) ?? keys[keys.length - 1];
  return srcset[String(k)];
}

function rel(src) { return /^(https?:)?\/\//.test(src) || src.startsWith('./') ? src : './' + src; }

function gradientTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(15,42,34,0.55)');
  grad.addColorStop(0.35, 'rgba(31,77,58,0.05)');
  grad.addColorStop(0.7, 'rgba(15,42,34,0.15)');
  grad.addColorStop(1, 'rgba(15,42,34,0.85)');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createEnvironment({ scene, camera, renderer, manifest, glassMaterial }) {
  // Luces: para resaltar biseles en gema
  const hemi = new THREE.HemisphereLight(0xf4ead8, 0x1f4d3a, 1.15);
  scene.add(hemi);

  // Luz principal (frontal-superior)
  const sun = new THREE.DirectionalLight(0xffe9c9, 2.4);
  sun.position.set(5, 8, 12);
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  // Luz de contra (verde desde abajo-izquierda-atrás)
  const backLight = new THREE.DirectionalLight(0x88ff88, 1.2);
  backLight.position.set(-5, -3, -8);
  scene.add(backLight);

  // Punto cálido (para captar brillos en biseles)
  const pointLight = new THREE.PointLight(0xffe9c9, 1.5);
  pointLight.position.set(2, 3, 3);
  scene.add(pointLight);

  // Niebla exponencial --bg-mid
  scene.fog = new THREE.FogExp2(0x1f4d3a, 0.012);

  // Entorno procedural bokeh (selva) mejorado para reflejos del vidrio tipo gema
  function createJungleBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Degradado de fondo: oscuro abajo, claro arriba (cielo)
    const gradFondo = ctx.createLinearGradient(0, 0, 0, 1024);
    gradFondo.addColorStop(0, '#9fd3c7');    // cielo claro arriba
    gradFondo.addColorStop(0.33, '#6a9d8f'); // transición
    gradFondo.addColorStop(1, '#2a4a30');    // tierra oscura abajo
    ctx.fillStyle = gradFondo;
    ctx.fillRect(0, 0, 1024, 1024);

    // Círculos difuminados: hojas oscuras y luces bokeh claras (80% oscuras, 20% claras)
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const radius = Math.random() * 70 + 15;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      const isLight = Math.random() < 0.2; // 20% luces claras
      if (isLight) {
        gradient.addColorStop(0, 'rgba(230, 255, 200, 0.95)');
        gradient.addColorStop(1, 'rgba(150, 200, 100, 0.2)');
      } else {
        const g = Math.floor(Math.random() * 100) + 40;
        const b = Math.floor(Math.random() * 40) + 15;
        gradient.addColorStop(0, `rgba(20, ${g}, ${b}, 0.8)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  try {
    const jungleEnvTex = createJungleBackground();
    const pmrem = new THREE.PMREMGenerator(renderer);
    // Entorno neutro a baja intensidad: el bokeh verde teñía el cristal esmerilado (rechazado por el dueño);
    // la sala neutra a 1.0+ lo plateaba. A 0.45 da brillo sin color.
    void jungleEnvTex;
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    pmrem.dispose();
  } catch (err) { console.warn('[scene/env] sin environment map', err); }

  // Suelo que solo recibe sombras (profundidad de las fichas sobre el fondo)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.30, color: 0x06150f }));
  floor.position.z = -0.12;
  floor.receiveShadow = true;
  scene.add(floor);

  // Fondo: plano lejano hijo de la cámara (fijo a la pantalla), sin niebla, con tinte.
  const bgGroup = new THREE.Group();
  camera.add(bgGroup);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x9fb8ad, fog: false, toneMapped: false, depthWrite: false });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
  bg.position.z = -150;
  bg.renderOrder = -10;
  bgGroup.add(bg);
  const vignette = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: gradientTexture(), transparent: true, fog: false, toneMapped: false, depthWrite: false }));
  vignette.position.z = -140;
  vignette.renderOrder = -9;
  bgGroup.add(vignette);
  let bgAspect = 1.5, bgLoadedSrc = null;

  function loadBackground(view) {
    const entry = manifest?.backgrounds?.[0];
    const src = pickSrc(entry?.srcset, view.w, view.dpr);
    if (!src || src === bgLoadedSrc) return;
    bgLoadedSrc = src;
    new THREE.TextureLoader().load(rel(src), (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      bgAspect = tex.image.width / tex.image.height;
      bgMat.map = tex; bgMat.needsUpdate = true;
      fitBackground(view);
    }, undefined, () => console.warn('[scene/env] fondo no disponible', src));
  }

  function fitBackground(view) {
    const W = view.halfW * 2.15, H = view.halfH * 2.15;   // margen para parallax
    let sx, sy;
    if (W / H > bgAspect) { sx = W; sy = W / bgAspect; } else { sy = H; sx = H * bgAspect; }
    bg.scale.set(sx, sy, 1);
    vignette.scale.set(view.halfW * 2.05, view.halfH * 2.05, 1);
  }

  // Plantas laterales en repisas de vidrio (solo desktop/ultrawide)
  const plants = new THREE.Group();
  plants.position.z = -1.6;
  scene.add(plants);
  const plantItems = [];
  let plantsBuilt = false;
  const parallax = new THREE.Vector2();
  const parallaxTarget = new THREE.Vector2();

  function buildPlants() {
    plantsBuilt = true;
    const loader = new THREE.TextureLoader();
    for (const spec of PLANTS) {
      const mat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.1, fog: true });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      loader.load(rel(spec.src), (tex) => {
        finishTexture(tex);
        if (spec.flip) { tex.repeat.x = -1; tex.offset.x = 1; }
        mat.map = tex; mat.needsUpdate = true;
        sprite.userData.aspect = tex.image.width / tex.image.height;
        if (sprite.userData.layout) place(sprite, spec);
      });
      const shelf = new THREE.Mesh(new RoundedBoxGeometry(1, 0.08, 0.5, 2, 0.03), glassMaterial);
      shelf.visible = false;
      plants.add(sprite, shelf);
      plantItems.push({ spec, sprite, shelf, phase: Math.random() * Math.PI * 2 });
    }
  }

  function place(sprite, spec) {
    const { view, item } = sprite.userData.layout;
    const marginPx = view.rect.x;                     // espacio libre a cada lado del tablero
    const show = (view.kind === 'desktop' || view.kind === 'ultrawide') && marginPx > 170 && (!spec.onlyUltrawide || view.kind === 'ultrawide');
    sprite.visible = show; item.shelf.visible = show;
    if (!show) return;
    const aspect = sprite.userData.aspect ?? 0.75;
    const hPx = Math.min(view.h * 0.30 * spec.h, marginPx * 0.9 / aspect);
    const hU = hPx / view.unitPx, wU = hU * aspect;
    const xPx = spec.side === 'left' ? marginPx * 0.5 : view.w - marginPx * 0.5;
    const yPx = view.h * spec.y;
    const p = view.screenToWorld(xPx, yPx);
    sprite.scale.set(wU, hU, 1);
    sprite.position.set(p.x, p.y, 0);
    item.shelf.scale.set(wU * 1.25, 1, 1);
    item.shelf.position.set(p.x, p.y - hU * 0.5 - 0.02, 0.1);
    item.basePos = sprite.position.clone();
    item.baseShelf = item.shelf.position.clone();
  }

  return {
    sun, hemi,
    layout(view) {
      const shadows = view.kind === 'desktop' || view.kind === 'ultrawide';
      if (renderer.shadowMap.enabled !== shadows) {
        renderer.shadowMap.enabled = shadows;
        scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
      }
      sun.castShadow = shadows;
      const half = Math.max(view.boardW, view.boardH) / view.unitPx / 2 + 1.5;
      const sc = sun.shadow.camera;
      sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
      sc.updateProjectionMatrix();
      sun.position.set(view.target.x + 5, view.target.y + 8, 12);
      sun.target.position.set(view.target.x, view.target.y, 0);
      floor.position.set(view.target.x, view.target.y, -0.12);

      loadBackground(view);
      fitBackground(view);

      if (!plantsBuilt && (view.kind === 'desktop' || view.kind === 'ultrawide')) buildPlants();
      for (const item of plantItems) {
        item.sprite.userData.layout = { view, item };
        place(item.sprite, item.spec);
      }
    },
    setPointer(nx, ny) { parallaxTarget.set(nx, ny); },
    update(dt, t) {
      parallax.lerp(parallaxTarget, Math.min(1, dt * 3));
      bg.position.x = -parallax.x * bg.scale.x * 0.012;
      bg.position.y = -parallax.y * bg.scale.y * 0.012;
      for (const item of plantItems) {
        if (!item.sprite.visible || !item.basePos) continue;
        const sway = Math.sin(t * 0.6 + item.phase) * 0.02;
        item.sprite.position.x = item.basePos.x + parallax.x * 0.18 + sway;
        item.sprite.position.y = item.basePos.y + parallax.y * 0.08;
        item.sprite.material.rotation = sway * 0.6;
        item.shelf.position.x = item.baseShelf.x + parallax.x * 0.18;
        item.shelf.position.y = item.baseShelf.y + parallax.y * 0.08;
      }
    },
  };
}
