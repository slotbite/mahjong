// Fichas de vidrio: geometría y texturas compartidas, materiales por ficha para
// hover/brillo/desvanecido. Animaciones §2.2 con easing cozy.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tween, ease } from './anim.js';
import { slotPosition } from './layout.js';
import { BACK_KEY } from './themes.js';

// Valores de §2.2 iteración 2. Vidrio luminoso verde-azulado translúcido con símbolo nítido en superficie.
// transmission 0.88 para cuerpo visible, color claro #dfeaf0, atenuación suave #a9c9d6,
// roughness 0.08 para suavidad, envMap 1.4 para reflejos, sheen 0.5 para borde luminoso.
export const GLASS = Object.freeze({
  transmission: 0.88, roughness: 0.08, thickness: 0.35, ior: 1.48,
  attenuationColor: 0xa9c9d6, attenuationDistance: 2.0,
  clearcoat: 0.7, clearcoatRoughness: 0.1, sheen: 0.5, sheenRoughness: 0.4,
  sheenColor: 0xf4ead8,
  tint: 0xdfeaf0, tintAmount: 0.08,
});
const LIME = new THREE.Color(0xb8d96a);
const SKY = new THREE.Color(0x8fb3c7);
const BLACK = new THREE.Color(0x000000);
const FACE_DOWN = Math.PI;
const TILT = (8 * Math.PI) / 180;
const DUR = { flip: 600, settle: 900, drop: 560, dropStagger: 40, tilt: 220, press: 160, fade: 180 };

export function createGlassMaterial() {
  const color = new THREE.Color(0xffffff).lerp(new THREE.Color(GLASS.tint), GLASS.tintAmount);
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0, roughness: GLASS.roughness,
    transmission: GLASS.transmission, thickness: GLASS.thickness, ior: GLASS.ior,
    attenuationColor: new THREE.Color(GLASS.attenuationColor),
    attenuationDistance: GLASS.attenuationDistance,
    clearcoat: GLASS.clearcoat, clearcoatRoughness: GLASS.clearcoatRoughness,
    sheen: GLASS.sheen, sheenRoughness: GLASS.sheenRoughness,
    sheenColor: new THREE.Color(GLASS.sheenColor),
    specularIntensity: 1, envMapIntensity: 1.4,
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

export function createCards({ scene, bus, EV, isReducedMotion }) {
  const board = new THREE.Group();
  scene.add(board);

  const geo = new RoundedBoxGeometry(1, 1, 0.12, 4, 0.08);
  const frontGeo = new THREE.PlaneGeometry(0.84, 0.84);
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
  let time = 0;

  function texFor(id) { return textures?.get(id) ?? null; }

  function makeCard(data) {
    const group = new THREE.Group();
    const glassMat = baseGlass.clone();
    const glass = new THREE.Mesh(geo, glassMat);
    glass.castShadow = true;
    glass.userData.index = data.index;

    const frontMat = new THREE.MeshBasicMaterial({ map: texFor(data.pairKey), alphaTest: 0.5, side: THREE.FrontSide, toneMapped: false });
    const front = new THREE.Mesh(frontGeo, frontMat);
    front.position.z = 0.062;  // en la superficie frontal para máxima nitidez
    front.renderOrder = 1;

    // Brillo especular diagonal en la cara frontal
    const shineMat = new THREE.MeshBasicMaterial({ map: shineTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const shine = new THREE.Mesh(shineGeo, shineMat);
    shine.position.z = 0.063;
    shine.renderOrder = 2;

    const backMat = new THREE.MeshBasicMaterial({ map: texFor(BACK_KEY), alphaTest: 0.5, side: THREE.FrontSide, toneMapped: false });
    const back = new THREE.Mesh(symbolGeo, backMat);
    back.position.z = -0.062;  // en la superficie trasera para máxima nitidez
    back.rotation.y = Math.PI;
    back.renderOrder = 1;

    // Brillo especular diagonal en la cara trasera (más tenue)
    const shineBackMat = new THREE.MeshBasicMaterial({ map: shineTexBack, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const shineBack = new THREE.Mesh(shineGeo, shineBackMat);
    shineBack.position.z = -0.063;
    shineBack.rotation.y = Math.PI;
    shineBack.renderOrder = 2;

    group.add(glass, front, shine, back, shineBack);
    glass.renderOrder = 0;
    const slot = slotPosition(data.index, cols, rows);
    const card = {
      index: data.index, pairKey: data.pairKey, group, glass, glassMat, front, frontMat, back, backMat,
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
    const mats = [card.glassMat, card.frontMat, card.backMat];
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
      c.glassMat.dispose(); c.frontMat.dispose(); c.backMat.dispose();
    }
    for (const h of holes) { board.remove(h.mesh); h.mesh.material.dispose(); }
    cards = []; holes = []; hovered = -1;
  }

  // --- animaciones ---
  function rotateTo(card, targetY, dur, withLift = true) {
    const fromY = card.group.rotation.y;
    if (isReducedMotion() || dur === 0) {
      // Giro instantáneo + "fade" por escala (0.86→1). No se usa opacidad: un material
      // transparente sale del pase de transmisión y el vidrio mostraría solo el esmerilado.
      card.group.rotation.y = targetY; card.group.rotation.z = card.tiltTarget;
      card.group.scale.set(0.86, 0.86, 1);
      return track(card, tween({ dur: DUR.fade, ease: ease.outCubic, onUpdate: (k) => { const s = 0.86 + 0.14 * k; card.group.scale.set(s, s, 1); }, onDone: () => card.group.scale.set(1, 1, 1) }));
    }
    return track(card, tween({
      dur, ease: ease.cozy,
      onUpdate: (k, lin) => {
        card.group.rotation.y = fromY + (targetY - fromY) * k;
        if (withLift) card.group.position.z = card.baseZ + Math.sin(lin * Math.PI) * 0.35;
      },
      onDone: () => { card.group.rotation.y = targetY; card.group.position.z = card.baseZ; },
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
    for (const card of cards) {
      card.frontMat.map = texFor(card.pairKey); card.frontMat.needsUpdate = true;
      card.backMat.map = texFor(BACK_KEY); card.backMat.needsUpdate = true;
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
    deal, flip, press, match, miss, hint, celebrate, dim, setTheme, setHover, update,
    get phase() { return phase; },
    get hovered() { return hovered; },
    pickables() {
      if (phase !== 'playing' && phase !== 'hint') return [];
      return cards.filter((c) => !c.matched && !c.faceUp).map((c) => c.glass);
    },
    cardCount() { return cards.length; },
  };
}
