// ─────────────────────────────────────────────────────────────────────────────
// Cyclone Tunnel Background — Spiral particles + volumetric ring
// Lightweight Three.js implementation behind main scene
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import type { PaletteKey } from '../lib/math';
import { getPalette } from '../lib/math';

export interface TunnelBackground {
  group: THREE.Group;
  update: (time: number) => void;
  updateColors: (palette: PaletteKey, customColors?: [string, string, string]) => void;
  dispose: () => void;
}

function resolveColors(palette: PaletteKey, customColors?: [string, string, string]) {
  const base = getPalette(palette);
  return customColors
    ? { ...base, start: customColors[0], glow: customColors[1], end: customColors[2] }
    : base;
}

export function createTunnelBackground(
  palette: PaletteKey,
  customColors?: [string, string, string],
): TunnelBackground {
  const group = new THREE.Group();
  group.renderOrder = -10;

  const colors = resolveColors(palette, customColors);
  const c1 = new THREE.Color(colors.start);
  const c2 = new THREE.Color(colors.glow);
  const c3 = new THREE.Color(colors.end);

  // ── Spiral particle ring ──
  const particleCount = 600;
  const positions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const angles = new Float32Array(particleCount);
  const radii = new Float32Array(particleCount);
  const speeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 20;
    const radius = 2 + (i / particleCount) * 6;
    const z = -15 + (i / particleCount) * 25;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = z;

    const colorT = i / particleCount;
    const col = colorT < 0.33
      ? c1.clone().lerp(c2, colorT / 0.33)
      : colorT < 0.66
        ? c2.clone().lerp(c3, (colorT - 0.33) / 0.33)
        : c3.clone().lerp(c1, (colorT - 0.66) / 0.34);
    particleColors[i * 3] = col.r;
    particleColors[i * 3 + 1] = col.g;
    particleColors[i * 3 + 2] = col.b;

    sizes[i] = 0.05 + Math.random() * 0.1;
    angles[i] = angle;
    radii[i] = radius;
    speeds[i] = 0.3 + Math.random() * 0.7;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  // ── Volumetric ring (torus) ──
  const ringGeo = new THREE.TorusGeometry(5, 0.03, 8, 100);
  const ringMat = new THREE.MeshBasicMaterial({
    color: c2,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.5;
  group.add(ring);

  // ── Inner glow disc ──
  const discGeo = new THREE.CircleGeometry(3, 64);
  const discMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: c1.clone() },
      uColor2: { value: c2.clone() },
      uColor3: { value: c3.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      varying vec2 vUv;

      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float angle = atan(center.y, center.x);

        float spiral = sin(angle * 3.0 - uTime * 0.5 + dist * 12.0) * 0.5 + 0.5;
        float t = fract(spiral + dist * 0.8);

        vec3 col;
        if (t < 0.33) col = mix(uColor1, uColor2, t / 0.33);
        else if (t < 0.66) col = mix(uColor2, uColor3, (t - 0.33) / 0.33);
        else col = mix(uColor3, uColor1, (t - 0.66) / 0.34);

        float alpha = smoothstep(0.5, 0.1, dist) * 0.25;
        float pulse = sin(uTime * 0.3) * 0.05 + 0.95;
        gl_FragColor = vec4(col * pulse, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.z = -12;
  group.add(disc);

  const update = (time: number) => {
    const t = time * 0.001;
    group.rotation.z = t * 0.1;

    const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < particleCount; i++) {
      const a = angles[i] + t * speeds[i];
      const r = radii[i];
      posAttr.setX(i, Math.cos(a) * r);
      posAttr.setY(i, Math.sin(a) * r);
    }
    posAttr.needsUpdate = true;

    ring.rotation.z = t * 0.15;
    ring.rotation.y = Math.sin(t * 0.2) * 0.1;

    discMat.uniforms.uTime.value = t;
  };

  const updateColors = (newPalette: PaletteKey, newCustomColors?: [string, string, string]) => {
    const c = resolveColors(newPalette, newCustomColors);
    const nc1 = new THREE.Color(c.start);
    const nc2 = new THREE.Color(c.glow);
    const nc3 = new THREE.Color(c.end);

    discMat.uniforms.uColor1.value.copy(nc1);
    discMat.uniforms.uColor2.value.copy(nc2);
    discMat.uniforms.uColor3.value.copy(nc3);
    ringMat.color.copy(nc2);

    const colAttr = particleGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < particleCount; i++) {
      const colorT = i / particleCount;
      const col = colorT < 0.33
        ? nc1.clone().lerp(nc2, colorT / 0.33)
        : colorT < 0.66
          ? nc2.clone().lerp(nc3, (colorT - 0.33) / 0.33)
          : nc3.clone().lerp(nc1, (colorT - 0.66) / 0.34);
      colAttr.setXYZ(i, col.r, col.g, col.b);
    }
    colAttr.needsUpdate = true;
  };

  const dispose = () => {
    particleGeo.dispose();
    particleMat.dispose();
    ringGeo.dispose();
    ringMat.dispose();
    discGeo.dispose();
    discMat.dispose();
  };

  return { group, update, updateColors, dispose };
}
