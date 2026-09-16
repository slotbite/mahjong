// Fichas de vidrio: geometría y texturas compartidas, materiales por ficha para
// hover/brillo/desvanecido. Animaciones §2.2 con easing cozy.
import * as THREE from 'three';
import { tween, ease } from './anim.js';
import { slotPosition } from './layout.js';
import { BACK_KEY } from './themes.js';

// Valores gem-19 iteración 2: Gema de cristal con biseles facetados tipo diamante/zafiro.
// transmission 0.92 (no total, deja ver pixel art), ior 1.9, thickness 0.35,
// attenuationDistance 3.0 con color muy claro #cfe9e0 (casi invisible), clearcoat 1.0,
// specularIntensity 1.0, envMapIntensity 2.2 para reflejos visibles en bokeh mejorado.
export const GLASS = Object.freeze({
  // Boceto gema_cristal_transparente.html: cristal sin color propio, todo es refracción del entorno.
  // Cámara ortográfica y ficha delgada: ior moderado y grosor óptico corto para que la selva
  // se vea a través; el ior 2.4 del boceto desplazaba la muestra fuera de la ficha (gris).
  transmission: 1.0, roughness: 0.16, thickness: 0.3, ior: 1.35, // roughness 0.16 = esmerilado suave (pedido del dueño)
  attenuationColor: 0xffffff, attenuationDistance: Infinity, // vidrio incoloro: el fondo se ve sin tinte
  clearcoat: 1.0, clearcoatRoughness: 0.1, metalness: 0.0,
  specularIntensity: 0.8, envMapIntensity: 0.35,
});
const LIME = new THREE.Color(0xb8d96a);
const SKY = new THREE.Color(0x8fb3c7);
const BLACK = new THREE.Color(0x000000);
const FACE_DOWN = Math.PI;
const FLIP_DIR = 1; // 1: destapa hacia el borde izquierdo (elegido por el dueño); -1: hacia el derecho (v1)
const TILT = (8 * Math.PI) / 180;
// flip: 320ms with ease.cozy matches v1's 250ms linear. Right edge toward viewer (v1 direction).
const DUR = { flip: 320, settle: 900, drop: 560, dropStagger: 40, tilt: 220, press: 160, fade: 180 };

export function createGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: GLASS.metalness, roughness: GLASS.roughness,
    transmission: GLASS.transmission, thickness: GLASS.thickness, ior: GLASS.ior,
    attenuationColor: new THREE.Color(GLASS.attenuationColor),
    attenuationDistance: GLASS.attenuationDistance,
    clearcoat: GLASS.clearcoat, clearcoatRoughness: GLASS.clearcoatRoughness,
    specularIntensity: GLASS.specularIntensity,
    envMapIntensity: GLASS.envMapIntensity,
    emissive: BLACK.clone(), emissiveIntensity: 0,
    side: THREE.FrontSide,
  });
}

function radialTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function diagonalShineTexture(opacity = 0.35) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, `rgba(255,255,255,${opacity})`);
  grad.addColorStop(0.45, 'rgba(255,255,255,0.1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function createGemGeometry() {
  const shape = new THREE.Shape();
  const size = 0.5 - 0.16; // mitad de lado 1.0 TOTAL: el bisel (bevelSize 0.16) se suma por fuera
  const radius = 0.1;    // radio de esquina
  shape.moveTo(-size + radius, -size);
  shape.lineTo(size - radius, -size);
  shape.quadraticCurveTo(size, -size, size, -size + radius);
  shape.lineTo(size, size - radius);
  shape.quadraticCurveTo(size, size, size - radius, size);
  shape.lineTo(-size + radius, size);
  shape.quadraticCurveTo(-size, size, -size, size - radius);
  shape.lineTo(-size, -size + radius);
  shape.quadraticCurveTo(-size, -size, -size + radius, -size);

  const extrudeSettings = {
    steps: 1, depth: 0.06, bevelEnabled: true,
    bevelThickness: 0.07, bevelSize: 0.16, bevelSegments: 4
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

function createVoxelQuestionMark(baseColor) {
  const group = new THREE.Group();
  const grid = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,0,0,1,1,0],
    [0,1,1,0,0,1,1,0],
    [0,0,0,0,1,1,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,0]
  ];
  const boxGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
  const boxMat = new THREE.MeshStandardMaterial({
    color: baseColor, emissive: baseColor.clone().multiplyScalar(0.3),
    roughness: 0.3, toneMapped: false
  });
  const offsetX = -(8 * 0.055) / 2 + 0.0275;
  const offsetY = (8 * 0.055) / 2 - 0.0275;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 1) {
        const cube = new THREE.Mesh(boxGeo, boxMat.clone());
        cube.position.set(x * 0.055 + offsetX, -y * 0.055 + offsetY, 0);
        group.add(cube);
      }
    }
  }
  group.position.z = -0.045;
  group.rotation.y = Math.PI;
  group.userData.materials = group.children.map(c => c.material);
  return group;
}

export function createCards({ scene, bus, EV, isReducedMotion }) {
  const board = new THREE.Group();
  scene.add(board);

  // Detectar parámetro URL ?art=inside
  const urlParams = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const artInside = urlParams.get('art') === 'inside';

  const geo = createGemGeometry();
  const frontGeo = new THREE.PlaneGeometry(0.64, 0.64);
  const symbolGeo = new THREE.PlaneGeometry(0.5, 0.5);
  const shineGeo = new THREE.PlaneGeometry(0.9, 0.9);
  const holeGeo = new THREE.PlaneGeometry(1.15, 1.15);
  const baseGlass = createGlassMaterial();
  const holeTex = radialTexture();
  const shineTex = diagonalShineTexture(0.35);
  const shineTexBack = diagonalShineTexture(0.2);

  let textures = null;   // Map id → Texture
  let theme = null;
  let cards = [];
  let holes = [];
  let cols = 4, rows = 4;
  let phase = 'idle';    // idle | dealing | playing | hint | won | lost
  let hovered = -1;
  // Tilt sutil del tablero siguiendo el puntero (±4.5°), para que los biseles cambien de brillo.
  const pointer = { x: 0, y: 0 };
  const TILT_X = 0.075, TILT_Y = 0.09;
  function setPointer(nx, ny) { pointer.x = Math.max(-1, Math.min(1, nx)); pointer.y = Math.max(-1, Math.min(1, ny)); }
  let time = 0;
  let backVoxelGroups = [];  // grupos de voxels por carta

  function texFor(id) { return textures?.get(id) ?? null; }

  function extractDominantColor(texture) {
    if (!texture || !texture.image) return new THREE.Color(0x55ff55);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = texture.image.width;
      canvas.height = texture.image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(texture.image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 128) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
      }
      if (count === 0) return new THREE.Color(0x55ff55);
      return new THREE.Color(r / count / 255, g / count / 255, b / count / 255);
    } catch (e) {
      return new THREE.Color(0x55ff55);
    }
  }

  function makeCard(data) {
    const group = new THREE.Group();
    const glassMat = baseGlass.clone();
    const glass = new THREE.Mesh(geo, glassMat);
    glass.castShadow = true;
    glass.userData.index = data.index;

    const frontMat = new THREE.MeshBasicMaterial({ map: texFor(data.pairKey), alphaTest: 0.5, side: THREE.FrontSide, toneMapped: false });
    const front = new THREE.Mesh(frontGeo, frontMat);
    // Geometría gem: faceta frontal aproximadamente en z = 0.06-0.09; con bevel de 0.06, ponemos front en +0.091
    front.position.z = artInside ? -0.03 : 0.101;
    front.renderOrder = 1;

    // Brillo especular diagonal en la cara frontal
    const shineMat = new THREE.MeshBasicMaterial({ map: shineTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const shine = new THREE.Mesh(shineGeo, shineMat);
    shine.position.z = artInside ? -0.031 : 0.092;
    shine.renderOrder = 2;

    // Reemplazar back (imagen) con grupo de voxels
    const backColor = extractDominantColor(texFor(BACK_KEY));
    const voxelGroup = createVoxelQuestionMark(backColor);
    backVoxelGroups.push({ group: voxelGroup, color: backColor });

    // Brillo especular diagonal en la cara trasera (mantener para consistencia visual)
    const shineBackMat = new THREE.MeshBasicMaterial({ map: shineTexBack, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const shineBack = new THREE.Mesh(shineGeo, shineBackMat);
    shineBack.position.z = -0.063;
    shineBack.rotation.y = Math.PI;
    shineBack.renderOrder = 2;

    // Los planos de brillo aditivo (shine/shineBack) quedan fuera: emblanquecían el cristal. El brillo lo dan clearcoat y el entorno.
    group.add(glass, front, voxelGroup);
    glass.renderOrder = 0;
    const slot = slotPosition(data.index, cols, rows);
    const card = {
      index: data.index, pairKey: data.pairKey, group, glass, glassMat, front, frontMat, voxelGroup,
      slot, faceUp: false, matched: false, tiltTarget: 0, dropping: false, hoverK: 0, tweens: [], baseZ: 0, bobPhase: Math.random() * 6.283,
    };
    group.rotation.y = FACE_DOWN;
    group.position.set(slot.x, slot.y, 0);
    board.add(group);
    return card;
  }

  function kill(card) {
    for (const t of card.tweens) t.cancel();
    card.tweens.length = 0;
  }
  function track(card, t) { card.tweens.push(t); return t; }

  function setOpacity(card, o) {
    const mats = [card.glassMat, card.frontMat];
    // Agregar materiales de voxels
    if (card.voxelGroup) {
      for (const child of card.voxelGroup.children) {
        if (child.material) mats.push(child.material);
      }
    }
    for (const m of mats) {
      const transparent = o < 0.999;
      if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
      m.opacity = o;
      m.depthWrite = !transparent;
    }
  }

  function clear() {
    for (const c of cards) {
      kill(c);
      board.remove(c.group);
      c.glassMat.dispose(); c.frontMat.dispose();
      if (c.voxelGroup) {
        for (const child of c.voxelGroup.children) {
          if (child.material) child.material.dispose();
        }
      }
    }
    for (const h of holes) { board.remove(h.mesh); h.mesh.material.dispose(); }
    cards = []; holes = []; hovered = -1; backVoxelGroups = [];
  }

  // --- animaciones ---
  function rotateTo(card, targetY, dur, withLift = true) {
    const fromY = card.group.rotation.y;

    // Ensure consistent flip direction: right edge always toward viewer (like v1)
    // When flipping from π (face-down) to 0 (face-up), interpolate via 2π instead of 0
    // This reverses the rotation direction to match v1's right-edge-toward-viewer motion
    // Sentido pedido por el dueño: destapar π → 0 (borde izquierdo hacia el espectador) y
    // tapar 0 → π deshaciendo ese giro. FLIP_DIR = -1 invierte ambos si se quiere volver.
    let startY = fromY, adjustedTargetY = targetY;
    if (FLIP_DIR < 0) {
      if (Math.abs(fromY - Math.PI) < 0.5 && targetY < Math.PI / 2) adjustedTargetY = 2 * Math.PI;
      else if (Math.abs(fromY) < 0.5 && targetY > Math.PI / 2) startY = 2 * Math.PI;
    }

    // El "?" de cubos es 3D dentro del cristal: se vería a través del arte con la carta boca arriba.
    // Se oculta al cruzar la mitad del giro hacia arriba y reaparece al cruzarla hacia abajo.
    const faceUpTarget = targetY < Math.PI / 2;
    const setVoxels = (visible) => { if (card.voxelGroup) card.voxelGroup.visible = visible; };
    if (dur === 0) {
      card.group.rotation.y = targetY; card.group.rotation.z = card.tiltTarget; card.group.position.z = card.baseZ;
      setVoxels(!faceUpTarget);
      return null;
    }
    // Movimiento reducido (ajuste "on" o el SO con animaciones desactivadas): el giro es la
    // información esencial del juego, así que se conserva, más corto y sin elevación. Antes se
    // sustituía por un zoom 0.86→1 y el dueño lo percibía como "no gira".
    if (isReducedMotion()) { dur = Math.min(dur, 180); withLift = false; }
    return track(card, tween({
      dur, ease: ease.cozy,
      onUpdate: (k, lin) => {
        card.group.rotation.y = startY + (adjustedTargetY - startY) * k;
        if (withLift) card.group.position.z = card.baseZ + Math.sin(lin * Math.PI) * 0.35;
        setVoxels(faceUpTarget ? k < 0.5 : k >= 0.5);
      },
      onDone: () => { card.group.rotation.y = targetY; card.group.position.z = card.baseZ; setVoxels(!faceUpTarget); },
    }));
  }

  function deal(payload) {
    clear();
    cols = payload.cols; rows = payload.rows;
    phase = 'dealing';
    cards = payload.cards.map(makeCard);
    const reduced = isReducedMotion();
    let pending = cards.length;
    const done = () => { if (--pending === 0) phase = 'playing'; };
    cards.forEach((card, i) => {
      const { slot } = card;
      if (reduced) {
        card.group.position.set(slot.x, slot.y, 0);
        setOpacity(card, 0);
        track(card, tween({ dur: 220, delay: i * 12, onUpdate: (k) => setOpacity(card, k), onDone: () => { setOpacity(card, 1); done(); } }));
        return;
      }
      const wobble = (Math.random() - 0.5) * 0.12;
      card.dropping = true;
      card.group.position.set(slot.x, slot.y + 2, 0.5);
      card.group.rotation.z = wobble;
      track(card, tween({
        dur: DUR.drop, delay: i * DUR.dropStagger, ease: ease.drop,
        onUpdate: (k, lin) => {
          card.group.position.y = slot.y + 2 * (1 - k);
          card.group.position.z = 0.5 * (1 - lin);
          card.group.rotation.z = wobble * (1 - lin);
        },
        onDone: () => { card.group.position.set(slot.x, slot.y, 0); card.group.rotation.z = 0; card.dropping = false; done(); },
      }));
    });
  }

  function flip(index, faceUp) {
    const card = cards[index];
    if (!card || card.matched) return;
    card.faceUp = faceUp;
    kill(card);
    card.group.position.z = card.baseZ;
    if (!faceUp) card.tiltTarget = 0;
    rotateTo(card, faceUp ? 0 : FACE_DOWN, DUR.flip);
  }

  function press(index) {
    const card = cards[index];
    if (!card || card.matched || phase === 'won') return;
    if (isReducedMotion()) return;
    const z0 = card.group.position.z;
    tween({ dur: DUR.press, ease: ease.inOutCubic, onUpdate: (k) => { card.group.position.z = z0 - Math.sin(k * Math.PI) * 0.08; } });
  }

  function addHole(card) {
    const mat = new THREE.MeshBasicMaterial({ map: holeTex, color: LIME.clone().lerp(SKY, 0.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(holeGeo, mat);
    mesh.position.set(card.slot.x, card.slot.y, -0.06);
    board.add(mesh);
    const hole = { mesh, phase: Math.random() * 6.283, base: mesh.position.clone() };
    holes.push(hole);
    tween({ dur: 700, onUpdate: (k) => { mat.opacity = 0.42 * k; } });
  }

  function match(indices) {
    for (const i of indices) {
      const card = cards[i];
      if (!card) continue;
      card.matched = true;
      card.faceUp = true;
      kill(card);
      const reduced = isReducedMotion();
      card.group.rotation.y = 0;
      const z0 = card.group.position.z;
      card.glassMat.emissive.copy(LIME);
      track(card, tween({
        dur: reduced ? 300 : DUR.settle, delay: reduced ? 0 : 250, ease: ease.cozy,
        onUpdate: (k) => {
          card.group.position.z = z0 + (reduced ? 0 : 0.3 * k);
          card.glassMat.emissiveIntensity = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.9;
          const s = 1 - 0.12 * k;
          card.group.scale.set(s, s, 1);
          setOpacity(card, 1 - k);
        },
        onDone: () => { card.group.visible = false; card.glassMat.emissiveIntensity = 0; addHole(card); },
      }));
    }
  }

  function miss(indices) {
    indices.forEach((i, n) => {
      const card = cards[i];
      if (!card) return;
      if (isReducedMotion()) return;
      card.tiltTarget = (n === 0 ? 1 : -1) * TILT;   // se aplica en update(); vuelve a 0 con el card:flip a dorso
    });
  }

  function hint(duration = 1200) {
    if (phase === 'won' || phase === 'lost') return;
    const prev = phase; phase = 'hint';
    const shown = cards.filter((c) => !c.matched && !c.faceUp);
    for (const card of shown) {
      kill(card);
      rotateTo(card, 0, DUR.flip, false);
      const r0 = card.glassMat.roughness;
      track(card, tween({ dur: 400, onUpdate: (k) => { card.glassMat.roughness = r0 + (0.6 - r0) * k; } }));
    }
    tween({ dur: 0, delay: duration, onDone: () => {
      for (const card of shown) {
        if (card.matched || card.faceUp) continue;
        kill(card);
        rotateTo(card, FACE_DOWN, DUR.flip, false);
        const r0 = card.glassMat.roughness;
        track(card, tween({ dur: 500, onUpdate: (k) => { card.glassMat.roughness = r0 + (GLASS.roughness - r0) * k; } }));
      }
      if (phase === 'hint') phase = prev;
    } });
  }

  /** Victoria: las fichas reaparecen como vidrio traslúcido flotando; los huecos se apagan. */
  function celebrate() {
    phase = 'won';
    hovered = -1;
    for (const h of holes) tween({ dur: 1200, onUpdate: (k) => { h.mesh.material.opacity = 0.42 * (1 - k); } });
    cards.forEach((card, i) => {
      kill(card);
      card.group.visible = true;
      card.group.rotation.set(0, 0, 0);
      card.group.scale.set(1, 1, 1);
      card.glassMat.emissive.copy(LIME);
      card.glassMat.emissiveIntensity = 0;
      setOpacity(card, 0);
      card.baseZ = 0.3;
      track(card, tween({ dur: 1400, delay: 200 + i * 30, ease: ease.cozy, onUpdate: (k) => {
        setOpacity(card, 0.55 * k);
        card.group.position.z = 0.3 * k;
        card.glassMat.emissiveIntensity = 0.25 * k;
      } }));
    });
  }

  function dim() {
    phase = 'lost';
    for (const card of cards) {
      if (card.matched) continue;
      kill(card);
      const o0 = card.glassMat.opacity ?? 1;
      track(card, tween({ dur: 900, onUpdate: (k) => setOpacity(card, o0 + (0.35 - o0) * k) }));
    }
  }

  function setTheme(payload) {
    theme = payload.theme; textures = payload.textures;
    const backTex = texFor(BACK_KEY);
    const backColor = extractDominantColor(backTex);
    for (const card of cards) {
      card.frontMat.map = texFor(card.pairKey); card.frontMat.needsUpdate = true;
      // Actualizar color de voxels
      if (card.voxelGroup) {
        for (const child of card.voxelGroup.children) {
          if (child.material) {
            child.material.color.copy(backColor);
            child.material.emissive.copy(backColor.clone().multiplyScalar(0.3));
            child.material.needsUpdate = true;
          }
        }
      }
    }
  }

  function setHover(index) {
    if (phase !== 'playing' && phase !== 'hint') index = -1;
    const card = cards[index];
    if (card && (card.matched || card.faceUp)) index = -1;
    hovered = index;
  }

  function update(dt, t) {
    time = t;
    if (!isReducedMotion()) {
      const tx = -pointer.y * TILT_X, ty = pointer.x * TILT_Y;
      board.rotation.x += (tx - board.rotation.x) * Math.min(1, dt * 4);
      board.rotation.y += (ty - board.rotation.y) * Math.min(1, dt * 4);
    } else if (board.rotation.x !== 0 || board.rotation.y !== 0) { board.rotation.set(0, 0, 0); }
    for (const card of cards) {
      if (card.matched && phase !== 'won') continue;
      if (!card.dropping && phase !== 'won') {
        // Inclinación de 8° del fallo (≈220 ms) y su vuelta a 0, independiente del flip.
        const dz = card.tiltTarget - card.group.rotation.z;
        if (Math.abs(dz) > 0.0005) card.group.rotation.z += dz * Math.min(1, dt * 11);
        else card.group.rotation.z = card.tiltTarget;
      }
      const target = card.index === hovered ? 1 : 0;
      if (card.hoverK !== target) {
        card.hoverK += (target - card.hoverK) * Math.min(1, dt * 9);
        if (Math.abs(card.hoverK - target) < 0.01) card.hoverK = target;
        if (phase !== 'won') {
          card.glassMat.emissive.copy(SKY);
          card.glassMat.emissiveIntensity = card.hoverK * 0.22;
        }
      }
      if (phase === 'won') {
        card.group.position.z = card.baseZ + Math.sin(t * 1.1 + card.bobPhase) * 0.06;
        card.group.rotation.z = Math.sin(t * 0.7 + card.bobPhase) * 0.03;
      }
    }
    if (phase === 'won') {
      for (const h of holes) h.mesh.position.y = h.base.y + Math.sin(t + h.phase) * 0.03;
    }
  }

  return {
    board, baseGlass,
    deal, flip, press, match, miss, hint, celebrate, dim, setTheme, setHover, setPointer, update,
    get phase() { return phase; },
    get hovered() { return hovered; },
    pickables() {
      if (phase !== 'playing' && phase !== 'hint') return [];
      return cards.filter((c) => !c.matched && !c.faceUp).map((c) => c.glass);
    },
    cardCount() { return cards.length; },
  };
}
