/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId } from '../domain/types';
import { buildArtwork, getPalette, normalizeArtwork, type GeneratorEngine, type PaletteKey, type SpatialGrid } from '../lib/math';

function disposeThreeObject(obj: THREE.Object3D | null | undefined) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        for (const m of mat) m.dispose();
      } else if (mat) {
        mat.dispose();
      }
    }
  });
}

import {
  buildRibbonGeometry,
  buildTorusGeometry,
  buildCylinderGeometry,
  buildConeGeometry,
  buildBranchingSystem,
  buildNetworkStructure,
  buildTrailSystem,
  type SceneConfig,
} from '../core/geometry-builder';
import { registry } from '../core/registry';
import type { ILightEngine } from '../core/plugin';
import { setupPostProcessing } from '../core/post-processing';
import type { PostProcessingSetup } from '../core/post-processing';
import { createGPUParticles, createAmbientDust } from '../core/gpu-particles';
import { createProgressiveTubeMaterial } from '../core/progressive-tube';
import { sphereVertexShader, sphereFragmentShader } from '../core/sphere-shader';

// ── Iridescent material factory — cangiante effect ───────────────────────
function createIridescentMaterial(
  baseColor: string,
  emissiveColor: string,
  opts?: {
    iridescence?: number;
    iridescenceIOR?: number;
    sheen?: number;
    sheenColor?: string;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  },
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(baseColor),
    emissive: new THREE.Color(emissiveColor),
    emissiveIntensity: 0.4,
    iridescence: opts?.iridescence ?? 1.0,
    iridescenceIOR: opts?.iridescenceIOR ?? 1.8,
    iridescenceThicknessRange: [100, 800],
    sheen: opts?.sheen ?? 1.0,
    sheenColor: new THREE.Color(opts?.sheenColor ?? emissiveColor),
    sheenRoughness: 0.3,
    metalness: opts?.metalness ?? 0.3,
    roughness: opts?.roughness ?? 0.2,
    transparent: true,
    opacity: opts?.opacity ?? 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

interface Renderer3DProps {
  seed: number;
  steps: number;
  palette: PaletteKey;
  engine: GeneratorEngine;
  grid: SpatialGrid;
  geometry: GeometryMode;
  material: MaterialMode;
  effect: EffectMode;
  lightPreset: LightPresetId;
  motionPreset: MotionPresetId;
  cameraPreset: CameraPresetId;
  animationSpeed: number;
  isAnimating: boolean;
  customColors?: [string, string, string];
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

function addLightsToScene(scene: THREE.Scene, presetId: LightPresetId, palette: PaletteKey, customColors?: [string, string, string]) {
  const engine = registry.get(presetId) as ILightEngine | undefined;
  const lights = engine?.lights ?? [];
  const paletteDef = getPalette(palette);
  const colors = customColors
    ? { ...paletteDef, start: customColors[0], glow: customColors[1], end: customColors[2] }
    : paletteDef;

  if (lights.length === 0) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(new THREE.Color(colors.start), 0.9);
    key.position.set(5, 4, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(new THREE.Color(colors.glow), 0.5);
    rim.position.set(-5, -2, 4);
    scene.add(rim);
    return [];
  }

  const helpers: THREE.Light[] = [];
  for (const def of lights) {
    const color = new THREE.Color(def.color);
    let light: THREE.Light;
    switch (def.type) {
      case 'ambient':
        light = new THREE.AmbientLight(color, def.intensity);
        break;
      case 'point': {
        const p = new THREE.PointLight(color, def.intensity);
        if (def.position) p.position.set(...def.position);
        light = p;
        break;
      }
      case 'spot': {
        const s = new THREE.SpotLight(color, def.intensity);
        if (def.position) s.position.set(...def.position);
        light = s;
        break;
      }
      default: {
        const d = new THREE.DirectionalLight(color, def.intensity);
        if (def.position) d.position.set(...def.position);
        light = d;
        break;
      }
    }
    scene.add(light);
    helpers.push(light);
  }
  return helpers;
}

function mulberry32Fast(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Renderer3D({ seed, steps, palette, engine, grid, geometry, material, effect, lightPreset, motionPreset: _motionPreset, cameraPreset: _cameraPreset, animationSpeed, isAnimating, customColors, onCanvasReady }: Renderer3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Refs shared across effects ────────────────────────────────────────────
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rootRef = useRef<THREE.Group | null>(null);
  const starfieldRef = useRef<THREE.Points | null>(null);
  const gpuParticlesRef = useRef<ReturnType<typeof createGPUParticles> | null>(null);
  const ambientDustRef = useRef<ReturnType<typeof createAmbientDust> | null>(null);
  const progressiveTubeRef = useRef<ReturnType<typeof createProgressiveTubeMaterial> | null>(null);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const sphereMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const drawablesRef = useRef<THREE.Object3D[]>([]);
  const postProcessingRef = useRef<PostProcessingSetup | null>(null);
  const maxValRef = useRef(0);
  const valuesRef = useRef<number[]>([]);

  const lightHelpersRef = useRef<THREE.Light[]>([]);

  const animRef = useRef({ speed: animationSpeed, animating: isAnimating });
  useEffect(() => {
    animRef.current.speed = animationSpeed;
    animRef.current.animating = isAnimating;
  }, [animationSpeed, isAnimating]);

  // ── EFFECT 1: One-time renderer + scene setup ────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousCanvas = container.querySelector('canvas');
    if (previousCanvas) previousCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvasRef.current = canvas;
    container.appendChild(canvas);
    onCanvasReady?.(canvas);

    const rect = container.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      canvas.remove();
      if (canvasRef.current === canvas) canvasRef.current = null;
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f87171;font-size:14px;">WebGL non disponibile</div>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height || 1, 0.1, 100);
    camera.position.set(0, 0.5, 8.5);
    scene.add(camera);

    const root = new THREE.Group();
    scene.add(root);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    rootRef.current = root;

    const resize = () => {
      if (disposed) return;
      const nextRect = container.getBoundingClientRect();
      const nextWidth = nextRect.width || 1;
      const nextHeight = nextRect.height || 1;
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      postProcessingRef.current?.resize(nextWidth, nextHeight);
    };

    resize();
    window.addEventListener('resize', resize);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      window.removeEventListener('resize', resize);
      resizeObserver.disconnect();
      postProcessingRef.current?.dispose();
      postProcessingRef.current = null;
      // Dispose refs that have custom dispose methods
      disposeThreeObject(starfieldRef.current);
      starfieldRef.current = null;
      gpuParticlesRef.current?.dispose();
      gpuParticlesRef.current = null;
      ambientDustRef.current?.dispose();
      ambientDustRef.current = null;
      progressiveTubeRef.current?.dispose();
      progressiveTubeRef.current = null;
      curveRef.current = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const objectMaterial = object.material;
          if (Array.isArray(objectMaterial)) objectMaterial.forEach((item) => item.dispose());
          else if (objectMaterial) objectMaterial.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove();
      if (canvasRef.current === canvas) canvasRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rootRef.current = null;
      sphereRef.current = null;
      sphereMatRef.current = null;
    };
  }, []);

  // ── EFFECT 2: Expensive scene rebuild (only when math/geometry changes) ──
  useEffect(() => {
    const scene = sceneRef.current;
    const root = rootRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !root || !camera || !renderer) return;

    // Dispose previous objects
    disposeThreeObject(starfieldRef.current);
    starfieldRef.current = null;
    gpuParticlesRef.current?.dispose();
    gpuParticlesRef.current = null;
    ambientDustRef.current?.dispose();
    ambientDustRef.current = null;
    progressiveTubeRef.current?.dispose();
    progressiveTubeRef.current = null;
    disposeThreeObject(root);
    while (root.children.length > 0) root.remove(root.children[0]);

    // Compute artwork data
    const { points } = buildArtwork(seed, steps, engine, grid);
    const normalized = normalizeArtwork(points);

    let maxValue = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].value > maxValue) maxValue = points[i].value;
    }
    maxValRef.current = maxValue;
    valuesRef.current = points.map((p) => p.value);

    const points3D = normalized.map((point, index) => {
      const energy = 1 + (point.value / Math.max(1, maxValue)) * 1.5;
      return new THREE.Vector3(
        point.x * (2.4 + energy * 0.25),
        point.y * (2.4 + energy * 0.25),
        Math.sin(index * 0.35) * 1.2 + energy * 0.25,
      );
    });

    // Remap points to radiate outward from sphere surface
    const surfacePoints = points3D.map((p) => {
      const dir = p.clone().normalize();
      const dist = p.length();
      const pushed = Math.max(dist, 0.9);
      return dir.multiplyScalar(pushed);
    });
    const surfaceCurve = new THREE.CatmullRomCurve3(surfacePoints);
    curveRef.current = surfaceCurve;

    // Starfield
    const starPaletteDef = getPalette(palette);
    const starColors = customColors
      ? { ...starPaletteDef, start: customColors[0], glow: customColors[1], end: customColors[2] }
      : starPaletteDef;
    const starRand = mulberry32Fast(seed);
    const starPositions = new Float32Array(1200 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = (starRand() - 0.5) * 20;
      starPositions[i + 1] = (starRand() - 0.5) * 20;
      starPositions[i + 2] = (starRand() - 0.5) * 18 - 4;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: new THREE.Color(starColors.glow),
      size: 0.03,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    root.add(starField);
    starfieldRef.current = starField;

    // GPU particles
    const gpuParticles = createGPUParticles(surfaceCurve, palette, seed, 800);
    root.add(gpuParticles.points);
    gpuParticlesRef.current = gpuParticles;

    // Ambient dust
    const ambientDust = createAmbientDust(palette, seed, 400);
    root.add(ambientDust.points);
    ambientDustRef.current = ambientDust;

    // Palette + custom colors
    const palDef = getPalette(palette);
    const pal = customColors
      ? { ...palDef, start: customColors[0], glow: customColors[1], end: customColors[2] }
      : palDef;

    // Progressive tube
    const progressiveTube = createProgressiveTubeMaterial(palette, material);
    const tubeUniforms = (progressiveTube.material.userData as Record<string, unknown>).shader;
    if (tubeUniforms && typeof tubeUniforms === 'object' && 'uniforms' in tubeUniforms) {
      const u = (tubeUniforms as { uniforms: Record<string, { value: THREE.Color }> }).uniforms;
      if (u.uColorStart) u.uColorStart.value.set(pal.start);
      if (u.uColorEnd) u.uColorEnd.value.set(pal.end);
      if (u.uColorGlow) u.uColorGlow.value.set(pal.glow);
    }
    progressiveTube.material.color.set(pal.start);
    progressiveTube.material.emissive.set(pal.end);
    progressiveTubeRef.current = progressiveTube;

    // Geometry — store drawable objects for progressive reveal
    const drawables: THREE.Object3D[] = [];
    const sceneConfig: SceneConfig = { seed, palette, material, effect };
    const normalizedWithZ = normalized.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0, value: p.value }));

    // ── Liquid sphere — shader-based, moves along curve to draw ──────
    const sphereRadius = 0.55;
    const sphereMat = new THREE.ShaderMaterial({
      vertexShader: sphereVertexShader,
      fragmentShader: sphereFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uNoiseStrength: { value: 0.12 },
        uColor1: { value: new THREE.Color(pal.start) },
        uColor2: { value: new THREE.Color(pal.glow) },
        uColor3: { value: new THREE.Color(pal.end) },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    root.add(sphere);
    sphereRef.current = sphere;
    sphereMatRef.current = sphereMat;

    // Line thickness — proportional to sphere for visual harmony
    const lineRadius = sphereRadius * 0.12;

    // ── Geometry creation — all 3D with proper thickness ─────────────
    if (geometry === 'tubes' || geometry === 'mesh' || geometry === 'lines') {
      // Lines become real 3D tubes — not flat
      const tubeGeo = new THREE.TubeGeometry(surfaceCurve, Math.max(360, points3D.length * 4), lineRadius, 16, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, progressiveTube.material);
      root.add(tubeMesh);
      drawables.push(tubeMesh);
    } else if (geometry === 'ribbon') {
      const ribbon = buildRibbonGeometry(surfaceCurve, sceneConfig);
      root.add(ribbon);
      drawables.push(ribbon);
    } else if (geometry === 'torus') {
      const torus = buildTorusGeometry(sceneConfig);
      root.add(torus);
      drawables.push(torus);
    } else if (geometry === 'cylinder') {
      const cyl = buildCylinderGeometry(sceneConfig);
      root.add(cyl);
      drawables.push(cyl);
    } else if (geometry === 'cone') {
      const cone = buildConeGeometry(sceneConfig);
      root.add(cone);
      drawables.push(cone);
    } else if (geometry === 'branching') {
      const branch = buildBranchingSystem(sceneConfig);
      root.add(branch);
      branch.traverse((obj) => {
        if (obj instanceof THREE.Mesh) drawables.push(obj);
      });
    } else if (geometry === 'network') {
      const net = buildNetworkStructure(normalizedWithZ, sceneConfig);
      root.add(net);
      net.traverse((obj) => {
        if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) drawables.push(obj);
      });
    } else if (geometry === 'trail') {
      const trail = buildTrailSystem(surfaceCurve, sceneConfig);
      root.add(trail);
      drawables.push(trail);
    } else if (geometry === 'polygons') {
      // Polygons also get 3D tube treatment with metallic finish
      const polyGeo = new THREE.TubeGeometry(surfaceCurve, Math.max(200, points3D.length * 2), lineRadius * 0.8, 8, false);
      const polyMat = createIridescentMaterial(pal.start, pal.end, {
        iridescence: 0.9,
        sheen: 0.8,
        sheenColor: pal.glow,
        metalness: 0.7,
        roughness: 0.08,
      });
      const polyMesh = new THREE.Mesh(polyGeo, polyMat);
      root.add(polyMesh);
      drawables.push(polyMesh);
    } else if (geometry === 'surface') {
      const surf = buildTorusGeometry(sceneConfig, 2, 0.5);
      root.add(surf);
      drawables.push(surf);
    }

    drawablesRef.current = drawables;

    // Post-processing
    postProcessingRef.current?.dispose();
    postProcessingRef.current = null;
    if (effect === 'bloom' || effect === 'glow' || effect === 'cinematic-lighting' || effect === 'depth') {
      postProcessingRef.current = setupPostProcessing(renderer, scene, camera, effect);
    }

    return () => {
      disposeThreeObject(starfieldRef.current);
      starfieldRef.current = null;
      gpuParticlesRef.current?.dispose();
      gpuParticlesRef.current = null;
      ambientDustRef.current?.dispose();
      ambientDustRef.current = null;
      progressiveTubeRef.current?.dispose();
      progressiveTubeRef.current = null;
      curveRef.current = null;
    };
  }, [seed, steps, engine, grid, geometry, palette, material, effect, customColors]);

  // ── EFFECT 3: Palette/light/fog updates (cheap, no rebuild) ─────────────
  useEffect(() => {
    const scene = sceneRef.current;
    const starfield = starfieldRef.current;
    const tube = progressiveTubeRef.current;
    const sphereMat = sphereMatRef.current;
    if (!scene) return;

    const paletteDef = getPalette(palette);
    const colors = customColors
      ? { ...paletteDef, start: customColors[0], glow: customColors[1], end: customColors[2] }
      : paletteDef;

    if (effect === 'fog') {
      scene.fog = new THREE.Fog(new THREE.Color(colors.bg), 4, 16);
    } else if (effect === 'depth') {
      scene.fog = new THREE.FogExp2(new THREE.Color(colors.bg), 0.04);
    } else {
      scene.fog = new THREE.Fog(new THREE.Color(colors.bg), 10, 28);
    }

    if (rendererRef.current) {
      rendererRef.current.setClearColor(new THREE.Color(colors.bg), 1);
    }

    if (starfield) {
      (starfield.material as THREE.PointsMaterial).color.set(colors.glow);
    }

    // Update tube colors — setMaterial then override with custom colors
    if (tube) {
      tube.setMaterial(palette, material);
      // Re-apply custom colors after setMaterial resets to palette defaults
      if (customColors) {
        const su = (tube.material.userData as Record<string, unknown>).shader;
        if (su && typeof su === 'object' && 'uniforms' in su) {
          const u = (su as { uniforms: Record<string, { value: THREE.Color }> }).uniforms;
          if (u.uColorStart) u.uColorStart.value.set(customColors[0]);
          if (u.uColorEnd) u.uColorEnd.value.set(customColors[2]);
          if (u.uColorGlow) u.uColorGlow.value.set(customColors[1]);
        }
        tube.material.color.set(customColors[0]);
        tube.material.emissive.set(customColors[2]);
      }
    }

    // Update sphere shader colors
    if (sphereMat && customColors) {
      sphereMat.uniforms.uColor1.value.set(customColors[0]);
      sphereMat.uniforms.uColor2.value.set(customColors[1]);
      sphereMat.uniforms.uColor3.value.set(customColors[2]);
    }

    // Dispose previous lights
    for (const l of lightHelpersRef.current) scene.remove(l);
    lightHelpersRef.current.forEach((l) => {
      if ('dispose' in l && typeof l.dispose === 'function') (l as { dispose: () => void }).dispose();
    });

    const newLights = addLightsToScene(scene, lightPreset, palette, customColors);
    lightHelpersRef.current = newLights;

    return () => {
      for (const l of lightHelpersRef.current) sceneRef.current?.remove(l);
      lightHelpersRef.current.forEach((l) => {
        if ('dispose' in l && typeof l.dispose === 'function') (l as { dispose: () => void }).dispose();
      });
      lightHelpersRef.current = [];
    };
  }, [palette, material, lightPreset, effect, customColors]);

  // ── EFFECT 4: Animation tick ─────────────────────────────────────────────
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const root = rootRef.current;
    if (!renderer || !scene || !camera || !root) return;

    let disposed = false;
    let animationFrame = 0;
    const drawDuration = 10000;
    let drawStartTime = -1;
    let prevTime = -1;

    // Pre-allocated Vector3 to avoid GC pressure in RAF
    const _tmpDir = new THREE.Vector3();
    const _tmpLookAt = new THREE.Vector3();

    const tick = (time: number) => {
      if (disposed) return;

      if (drawStartTime < 0) drawStartTime = time;
      const drawElapsed = time - drawStartTime;
      const drawProgress = Math.min(1, drawElapsed / drawDuration);

      // Smooth cubic ease-in-out — fluid, no stuttering
      const easedProgress = drawProgress < 0.5
        ? 4 * drawProgress * drawProgress * drawProgress
        : 1 - Math.pow(-2 * drawProgress + 2, 3) / 2;

      const isRevealing = drawProgress < 1;
      const revealT = isRevealing ? easedProgress : 1;

      // ── Liquid sphere — moves along curve, draws geometry behind it ──
      const curve = curveRef.current;
      const sphere = sphereRef.current;
      const sphereMat = sphereMatRef.current;
      if (curve && sphere && sphereMat) {
        sphereMat.uniforms.uTime.value = time * 0.001;
        const sphereFade = Math.min(1, easedProgress * 4);
        sphereMat.uniforms.uOpacity.value = sphereFade;
        // Organic breathing
        const breathe = 1 + Math.sin(time * 0.0008) * 0.06;
        const morph = 1 + Math.sin(time * 0.0012) * 0.03;
        sphere.scale.set(breathe * morph, breathe / morph, breathe);
        // Move sphere along the curve
        const t = Math.min(revealT * 0.999, 1);
        const pos = curve.getPointAt(t);
        sphere.position.copy(pos);
        // Orient sphere tangent to curve
        if (t < 0.99) {
          const nextPos = curve.getPointAt(Math.min(t + 0.01, 1));
          _tmpDir.copy(nextPos).sub(pos).normalize();
          _tmpLookAt.copy(pos).add(_tmpDir);
          sphere.lookAt(_tmpLookAt);
        }
      }

      // ── Progressive drawRange — geometry grows behind the sphere ──────
      const drawables = drawablesRef.current;
      for (const obj of drawables) {
        if (obj instanceof THREE.Line || obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          const geo = obj.geometry;
          const count = geo.index
            ? geo.index.count
            : geo.attributes.position?.count ?? 0;
          const visible = Math.floor(revealT * count);
          geo.setDrawRange(0, Math.max(0, visible));
        }
      }

      progressiveTubeRef.current?.setProgress(easedProgress);
      progressiveTubeRef.current?.setTime(time * 0.001);

      // ── Root rotation: gentle continuous spin ──────────────────────────
      root.rotation.y = time * 0.00012;
      root.rotation.x = Math.sin(time * 0.00008) * 0.04;

      gpuParticlesRef.current?.update(time * 0.0008);
      ambientDustRef.current?.update(time * 0.0005);
      if (starfieldRef.current) starfieldRef.current.rotation.z = time * 0.00002;
      root.scale.setScalar(effect === 'cinematic-lighting' ? 1.05 : 1);

      // ── Camera: 360° orbit, always in frame, 90% fill, frontal end ───
      const dt = prevTime >= 0 ? (time - prevTime) : 16;
      prevTime = time;
      if (isRevealing) {
        const orbitAngle = revealT * Math.PI * 2;
        const minDist = 3.8;
        const maxDist = 7.0;
        const dist = minDist + (maxDist - minDist) * easedProgress;
        camera.position.x = Math.sin(orbitAngle) * dist;
        camera.position.z = Math.cos(orbitAngle) * dist;
        camera.position.y = 0.4 + Math.sin(orbitAngle * 0.5) * 0.12;
      } else {
        const lerpFactor = 1 - Math.exp(-dt * 0.003);
        camera.position.x += (0 - camera.position.x) * lerpFactor;
        camera.position.y += (0.3 - camera.position.y) * lerpFactor;
        camera.position.z += (6 - camera.position.z) * lerpFactor;
      }
      camera.lookAt(0, 0, 0);

      try {
        if (postProcessingRef.current) {
          postProcessingRef.current.composer.render();
        } else {
          renderer.render(scene, camera);
        }
      } catch {
        disposed = true;
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [seed, effect]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
