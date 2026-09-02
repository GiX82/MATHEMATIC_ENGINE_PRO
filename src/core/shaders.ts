// ─────────────────────────────────────────────────────────────────────────────
// GLSL Shaders — Inline strings (no Vite plugin needed)
// ─────────────────────────────────────────────────────────────────────────────

// ── Tube Gradient Shader (onBeforeCompile patches MeshPhysicalMaterial) ────

export const tubeGradientVertexPatch = /* glsl */ `
// Injected via onBeforeCompile into #include <common> (no main!)
varying vec2 vTubeUv;
varying vec3 vWorldPos;
varying vec3 vNormW;

void tubeVertexInit() {
  vTubeUv = uv;
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormW = normalize(normalMatrix * normal);
}
`;

export const tubeGradientFragmentPatch = /* glsl */ `
// Injected via onBeforeCompile into #include <common> (no main!)
uniform float uProgress;
uniform float uTime;
uniform vec3 uColorStart;
uniform vec3 uColorEnd;
uniform vec3 uColorGlow;

varying vec2 vTubeUv;
varying vec3 vWorldPos;
varying vec3 vNormW;

vec3 tubeComputeColor() {
  float tubeT = vTubeUv.x;
  if (tubeT > uProgress) return vec3(0.0);

  float t = tubeT / max(uProgress, 0.001);
  // Terzile: 3 equal bands cycling all 3 colors
  vec3 baseColor;
  if (t < 0.33) {
    baseColor = mix(uColorStart, uColorGlow, t / 0.33);
  } else if (t < 0.66) {
    baseColor = mix(uColorGlow, uColorEnd, (t - 0.33) / 0.33);
  } else {
    baseColor = mix(uColorEnd, uColorStart, (t - 0.66) / 0.34);
  }

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - abs(dot(viewDir, vNormW));
  fresnel = pow(fresnel, 3.0);
  // Edge glow cycles through all 3 colors
  float edgePhase = sin(uTime * 0.6 + tubeT * 8.0) * 0.5 + 0.5;
  vec3 edgeCol = mix(uColorStart, mix(uColorGlow, uColorEnd, edgePhase), edgePhase);
  vec3 glowColor = edgeCol * fresnel * 1.8;

  float noise = fract(sin(dot(vWorldPos.xy, vec2(12.9898, 78.233))) * 43758.5453);
  float noiseMix = sin(uTime * 0.8 + tubeT * 12.0) * 0.08 + noise * 0.03;

  return baseColor + glowColor + noiseMix;
}

float tubeComputeAlpha() {
  float tubeT = vTubeUv.x;
  float edgeFade = smoothstep(uProgress - 0.08, uProgress, tubeT);
  return 1.0 - edgeFade * 0.7;
}
`;

// ── GPU Particle Shader ─────────────────────────────────────────────────────

export const particleVertexShader = /* glsl */ `
attribute float aSize;
attribute float aLife;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;

varying float vLife;
varying vec3 vColor;

void main() {
  vLife = aLife;
  vColor = aColor;

  vec3 pos = position;
  // Gentle drift
  pos.x += sin(uTime * 0.3 + position.y * 2.0) * 0.08;
  pos.y += cos(uTime * 0.25 + position.x * 1.5) * 0.06;
  pos.z += sin(uTime * 0.2 + position.x * position.y) * 0.05;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = /* glsl */ `
varying float vLife;
varying vec3 vColor;

void main() {
  // Circular glow sprite
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 1.5);

  float alpha = glow * vLife * 0.85;
  gl_FragColor = vec4(vColor * (1.0 + glow * 0.6), alpha);
}
`;

// ── Vignette Shader (custom pass) ───────────────────────────────────────────

export const vignetteFragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uDarkness;
uniform float uOffset;

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);

  vec2 center = uv - 0.5;
  float dist = length(center);
  float vig = smoothstep(0.6, uOffset, dist);
  color.rgb *= 1.0 - vig * uDarkness;

  gl_FragColor = color;
}
`;

export const vignetteVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
