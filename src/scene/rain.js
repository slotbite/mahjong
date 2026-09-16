// Lluvia: Points con un solo BufferGeometry, animada 100 % en el vertex shader.
import * as THREE from 'three';
import { tween, ease } from './anim.js';

const VERT = /* glsl */`
  uniform float uTime, uIntensity, uPixelRatio, uTop, uHeight, uWind;
  attribute float aSpeed, aSize, aPhase, aDepth;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float fall = fract(aPhase + uTime * aSpeed * uIntensity);
    p.y = uTop - fall * uHeight;
    p.x += uWind * fall * uHeight * 0.12 + sin(uTime * 0.7 + aPhase * 6.2831) * 0.08;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (0.8 + 0.4 * uIntensity);
    vAlpha = (0.18 + 0.32 * aDepth) * min(1.0, uIntensity);
  }
`;
const FRAG = /* glsl */`
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float line = 1.0 - smoothstep(0.0, 0.11, abs(c.x));
    float len = 1.0 - smoothstep(0.30, 0.5, abs(c.y));
    float head = smoothstep(-0.5, 0.5, c.y);
    gl_FragColor = vec4(uColor, line * len * (0.5 + 0.5 * head) * vAlpha);
  }
`;

// 1 = velocidad original; 0.5 = la mitad (valor elegido por el dueño en la primera prueba real).
const RAIN_SPEED = 0.5;

export function createRain({ scene }) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uIntensity: { value: 1 }, uPixelRatio: { value: 1 },
      uTop: { value: 10 }, uHeight: { value: 20 }, uWind: { value: -0.35 },
      uColor: { value: new THREE.Color(0x8fb3c7) },
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, fog: false,
  });
  let points = null;
  let count = 0;
  let intensityTween = null;

  function build(n, bounds) {
    if (points) { scene.remove(points); points.geometry.dispose(); }
    count = n;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), speed = new Float32Array(n), size = new Float32Array(n), phase = new Float32Array(n), depth = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = Math.random();                       // 0 lejos … 1 cerca
      pos[i * 3] = bounds.cx + (Math.random() - 0.5) * bounds.w;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = -8 + d * 6;                   // z entre -8 y -2 (detrás de las fichas)
      speed[i] = (0.35 + d * 0.45) * RAIN_SPEED;   // alturas de pantalla por segundo (RAIN_SPEED escala la velocidad)
      size[i] = 10 + d * 16;                         // px de alto del sprite
      phase[i] = Math.random();
      depth[i] = d;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
    points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    points.renderOrder = -1;
    scene.add(points);
  }

  return {
    /** view: { kind, halfW, halfH, target, dpr } */
    layout(view) {
      const n = view.kind === 'mobile' ? 400 : 1500;
      const bounds = { cx: view.target.x, w: view.halfW * 2.6 };
      if (n !== count || !points) build(n, bounds);
      else {
        const pos = points.geometry.attributes.position;
        for (let i = 0; i < count; i++) pos.setX(i, bounds.cx + (Math.random() - 0.5) * bounds.w);
        pos.needsUpdate = true;
      }
      material.uniforms.uTop.value = view.target.y + view.halfH * 1.3;
      material.uniforms.uHeight.value = view.halfH * 2.6;
      material.uniforms.uPixelRatio.value = view.dpr;
    },
    update(dt) { material.uniforms.uTime.value += dt; },
    setIntensity(v, ms = 2500) {
      intensityTween?.cancel();
      const from = material.uniforms.uIntensity.value;
      intensityTween = tween({ dur: ms, ease: ease.cozy, onUpdate: (k) => { material.uniforms.uIntensity.value = from + (v - from) * k; } });
    },
    get intensity() { return material.uniforms.uIntensity.value; },
  };
}
