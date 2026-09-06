/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useCallback } from 'react';
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
  buildLinesGeometry,
  buildMeshGeometry,
  buildRibbonGeometry,
  buildTorusKnotGeometry,
  buildMobiusGeometry,
  buildHelixGeometry,
  buildNetworkStructure,
  type SceneConfig,
} from '../core/geometry-builder';
import { registry } from '../core/registry';
import type { ILightEngine } from '../core/plugin';
import { setupPostProcessing } from '../core/post-processing';
import type { PostProcessingSetup } from '../core/post-processing';
import { createGPUParticles, createAmbientDust } from '../core/gpu-particles';
import { createProgressiveTubeMaterial } from '../core/progressive-tube';
import { sphereVertexShader, sphereFragmentShader } from '../core/sphere-shader';
import { createTunnelBackground, type TunnelBackground } from '../core/tunnel-background';
import { createCosmicStardust, type CosmicStardustSystem } from '../core/effects/cosmicStardust';

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
  lineWidth?: number;
  pointSize?: number;
  shadowIntensity?: number;
  shadowDirection?: number;
  shadowSoftness?: number;
  lightAngle?: number;
  backgroundMode?: 'none' | 'mosaic' | 'tunnel';
  fogDensity?: number;
  dispersion?: number;
  stardustDensity?: number;
  stardustReactivity?: number;
  shockwaveIntensity?: number;
  dofStrength?: number;
  generationCount?: number;
  showGrid?: boolean;
  onResetCamera?: () => void;
  onExportHiRes?: (fn: (scale?: number) => void) => void;
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
    const ambient = new THREE.AmbientLight(new THREE.Color(colors.start).multiplyScalar(0.6), 0.35);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(new THREE.Color(colors.start), 0.7);
    key.position.set(5, 4, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(new THREE.Color(colors.glow), 0.4);
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

import { mulberry32 } from '../core/seed';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Shared PMREM environment map — computed once, reused by all renderers
let _sharedEnvMap: THREE.Texture | null = null;

export function Renderer3D({ seed, steps, palette, engine, grid, geometry, material, effect, lightPreset, motionPreset, cameraPreset, animationSpeed, isAnimating, customColors, lineWidth = 2.5, pointSize: _pointSize = 3, shadowIntensity: _shadowIntensity, shadowDirection: _shadowDirection, shadowSoftness: _shadowSoftness, lightAngle, backgroundMode = 'none', fogDensity = 0, dispersion = 0, stardustDensity = 0, stardustReactivity = 0, shockwaveIntensity = 0, dofStrength = 0, generationCount = 0, showGrid = false, onResetCamera, onExportHiRes, onCanvasReady }: Renderer3DProps) {
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
  const trailRef = useRef<THREE.Line | null>(null);
  const palRef = useRef<{ start: string; glow: string; end: string } | null>(null);
  const sphereRadiusRef = useRef(0.55);
  const drawablesRef = useRef<THREE.Object3D[]>([]);
  const postProcessingRef = useRef<PostProcessingSetup | null>(null);
  const maxValRef = useRef(0);
  const valuesRef = useRef<number[]>([]);
  const finalCamPosRef = useRef(new THREE.Vector3(0, 0.25, 7.5));
  const bboxCenterRef = useRef(new THREE.Vector3(0, 0, 0));

  const lightHelpersRef = useRef<THREE.Light[]>([]);
  const tunnelRef = useRef<TunnelBackground | null>(null);
  const mosaicMeshRef = useRef<THREE.Mesh | null>(null);
  const mosaicTextureRef = useRef<HTMLCanvasElement | null>(null);
  const stardustRef = useRef<CosmicStardustSystem | null>(null);
  const cameraSpeedRef = useRef(0);
  const prevCamPosRef = useRef(new THREE.Vector3());
  const showGridRef = useRef(showGrid);
  useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isAnimationDoneRef = useRef(false);
  const cameraTransitionRef = useRef<{ active: boolean; startPos: THREE.Vector3; endPos: THREE.Vector3; startTime: number; duration: number } | null>(null);
  const idealDistanceRef = useRef(7.5);
  const onResetCameraRef = useRef(onResetCamera);
  onResetCameraRef.current = onResetCamera;
  const onExportHiResRef = useRef(onExportHiRes);
  onExportHiResRef.current = onExportHiRes;
  const customColorsRef = useRef(customColors);
  customColorsRef.current = customColors;

  // Grid deconstruct refs
  const gridFloorRef = useRef<THREE.GridHelper | null>(null);
  const wireframeOverlaysRef = useRef<THREE.Mesh[]>([]);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:#f87171;font-size:14px;';
      errDiv.textContent = 'WebGL non disponibile';
      container.appendChild(errDiv);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height || 1, 0.1, 100);
    camera.position.set(0, 0.5, 8.5);
    scene.add(camera);

    // ── PMREM Environment Map for metallic reflections ──────────────────────
    // Shared singleton: all renderers reuse the same envMap for performance.
    // BRIGHT: enough reflection regions for metallic/glass/crystal evaluation.
    if (!_sharedEnvMap) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const envScene = new THREE.Scene();
      const envGeo = new THREE.SphereGeometry(50, 32, 16);
      const envCanvas = document.createElement('canvas');
      envCanvas.width = 1024;
      envCanvas.height = 512;
      const ectx = envCanvas.getContext('2d')!;
      // Base gradient — brighter midtones
      const envGrad = ectx.createLinearGradient(0, 0, 0, 512);
      envGrad.addColorStop(0, '#1a2040');
      envGrad.addColorStop(0.2, '#2a2848');
      envGrad.addColorStop(0.4, '#5a4a50');
      envGrad.addColorStop(0.5, '#6a5a48');
      envGrad.addColorStop(0.6, '#4a4050');
      envGrad.addColorStop(0.8, '#2a3040');
      envGrad.addColorStop(1, '#101820');
      ectx.fillStyle = envGrad;
      ectx.fillRect(0, 0, 1024, 512);

      // Bright warm spot — upper left (key light reflection)
      const spot1 = ectx.createRadialGradient(200, 100, 5, 200, 100, 200);
      spot1.addColorStop(0, 'rgba(255,220,180,0.85)');
      spot1.addColorStop(0.3, 'rgba(220,180,140,0.4)');
      spot1.addColorStop(0.7, 'rgba(160,120,80,0.1)');
      spot1.addColorStop(1, 'rgba(0,0,0,0)');
      ectx.fillStyle = spot1;
      ectx.fillRect(0, 0, 1024, 512);

      // Bright cool spot — upper right (fill/rim reflection)
      const spot2 = ectx.createRadialGradient(750, 80, 5, 750, 80, 180);
      spot2.addColorStop(0, 'rgba(180,220,255,0.8)');
      spot2.addColorStop(0.3, 'rgba(140,180,220,0.35)');
      spot2.addColorStop(0.7, 'rgba(80,120,180,0.08)');
      spot2.addColorStop(1, 'rgba(0,0,0,0)');
      ectx.fillStyle = spot2;
      ectx.fillRect(0, 0, 1024, 512);

      // Center bright — subtle overall fill
      const spot3 = ectx.createRadialGradient(512, 256, 10, 512, 256, 300);
      spot3.addColorStop(0, 'rgba(200,200,210,0.5)');
      spot3.addColorStop(0.4, 'rgba(160,160,170,0.15)');
      spot3.addColorStop(1, 'rgba(0,0,0,0)');
      ectx.fillStyle = spot3;
      ectx.fillRect(0, 0, 1024, 512);

      // Bottom rim — warm accent
      const spot4 = ectx.createRadialGradient(512, 450, 10, 512, 450, 250);
      spot4.addColorStop(0, 'rgba(255,200,150,0.4)');
      spot4.addColorStop(0.5, 'rgba(200,150,100,0.1)');
      spot4.addColorStop(1, 'rgba(0,0,0,0)');
      ectx.fillStyle = spot4;
      ectx.fillRect(0, 0, 1024, 512);

      const envTexture = new THREE.CanvasTexture(envCanvas);
      envTexture.mapping = THREE.EquirectangularReflectionMapping;
      const envMesh = new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({ map: envTexture, side: THREE.BackSide }));
      envScene.add(envMesh);
      _sharedEnvMap = pmremGenerator.fromScene(envScene, 0.04).texture;
      pmremGenerator.dispose();
      envScene.clear();
    }
    scene.environment = _sharedEnvMap;

    const root = new THREE.Group();
    scene.add(root);

    // OrbitControls — disabled during animation, enabled after reveal
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);
    controls.enabled = false;
    controlsRef.current = controls;
    isAnimationDoneRef.current = false;

    // Register reset camera function with parent
    const resetCamera = () => {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;
      ctrl.enabled = false;
      isAnimationDoneRef.current = false;
      cameraTransitionRef.current = {
        active: true,
        startPos: cam.position.clone(),
        endPos: finalCamPosRef.current.clone(),
        startTime: performance.now(),
        duration: 1500,
      };
    };
    // Register with parent so it can expose via handle
    onResetCameraRef.current?.(resetCamera);

    // High-res export function — temporarily resizes viewport, renders, captures
    const exportHiRes = (scale = 2) => {
      const r = rendererRef.current;
      const sc = sceneRef.current;
      const cam = cameraRef.current;
      if (!r || !sc || !cam) return;

      const dpr = window.devicePixelRatio || 1;
      const origW = r.domElement.clientWidth;
      const origH = r.domElement.clientHeight;
      const w = Math.round(origW * scale);
      const h = Math.round(origH * scale);

      // Save camera state
      const origAspect = (cam as THREE.PerspectiveCamera).aspect;
      (cam as THREE.PerspectiveCamera).aspect = w / h;
      (cam as THREE.PerspectiveCamera).updateProjectionMatrix();

      // Resize renderer to high-res
      r.setSize(w, h, false);
      r.setPixelRatio(1);
      postProcessingRef.current?.resize(w, h);

      // Render — disable controls temporarily to prevent interference
      const ctrl = controlsRef.current;
      if (ctrl) ctrl.enabled = false;
      const pp = postProcessingRef.current;
      if (pp) {
        pp.composer.render();
      } else {
        r.render(sc, cam);
      }

      // Capture from canvas (preserveDrawingBuffer is true)
      const dataUrl = r.domElement.toDataURL('image/png');

      // Restore original size
      (cam as THREE.PerspectiveCamera).aspect = origAspect;
      (cam as THREE.PerspectiveCamera).updateProjectionMatrix();
      r.setSize(origW, origH, false);
      r.setPixelRatio(dpr);
      postProcessingRef.current?.resize(origW, origH);

      // Re-render at viewport size for display
      if (pp) {
        pp.composer.render();
      } else {
        r.render(sc, cam);
      }

      // Download
      const link = document.createElement('a');
      link.download = `math-engine-hires-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    };
    onExportHiResRef.current?.(exportHiRes);

    // Fog — controlled by fogDensity slider
    if (fogDensity > 0) {
      scene.fog = new THREE.FogExp2(0x030711, fogDensity * 0.06);
    }

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

    // Reset animation and controls state for new seed/geometry
    isAnimationDoneRef.current = false;
    cameraTransitionRef.current = null;
    const controls = controlsRef.current;
    if (controls) {
      controls.enabled = false;
      controls.target.set(0, 0, 0);
    }

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
    const surfacePoints = points3D
      .map((p) => {
        const dir = p.clone().normalize();
        const dist = p.length();
        const pushed = Math.max(dist, 0.9);
        return dir.multiplyScalar(pushed);
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
    if (surfacePoints.length < 2) {
      // Not enough valid points to build a curve — skip expensive rebuild
      return;
    }
    const surfaceCurve = new THREE.CatmullRomCurve3(surfacePoints);
    let curveLength: number;
    try {
      curveLength = surfaceCurve.getLength();
    } catch {
      return;
    }
    if (!Number.isFinite(curveLength) || curveLength < 1e-6) return;
    curveRef.current = surfaceCurve;

    // Starfield
    const starPaletteDef = getPalette(palette);
    const starColors = customColorsRef.current
      ? { ...starPaletteDef, start: customColorsRef.current[0], glow: customColorsRef.current[1], end: customColorsRef.current[2] }
      : starPaletteDef;
    const starRand = mulberry32(seed);
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
    const gpuParticles = createGPUParticles(surfaceCurve, palette, seed, 800, customColorsRef.current);
    if (gpuParticles) {
      root.add(gpuParticles.points);
      gpuParticlesRef.current = gpuParticles;
    }

    // Ambient dust
    const ambientDust = createAmbientDust(palette, seed, 400, customColorsRef.current);
    root.add(ambientDust.points);
    ambientDustRef.current = ambientDust;

    // Palette + custom colors
    const palDef = getPalette(palette);
    const pal = customColorsRef.current
      ? { ...palDef, start: customColorsRef.current[0], glow: customColorsRef.current[1], end: customColorsRef.current[2] }
      : palDef;
    palRef.current = pal;

    // Progressive tube — pass customColors so shader uses them from creation
    const progressiveTube = createProgressiveTubeMaterial(palette, material, customColorsRef.current);
    progressiveTubeRef.current = progressiveTube;

    // ── Tunnel background (if enabled) ──
    if (backgroundMode === 'tunnel') {
      tunnelRef.current = createTunnelBackground(palette, customColorsRef.current);
      scene.add(tunnelRef.current.group);
    }

    // ── Mosaic background (if enabled) ──
    if (backgroundMode === 'mosaic') {
      const size = 2048;
      const cols = 32;
      const rows = 32;
      const cellW = size / cols;
      const cellH = size / rows;
      const mosaicCanvas = document.createElement('canvas');
      mosaicCanvas.width = size;
      mosaicCanvas.height = size;
      const mCtx = mosaicCanvas.getContext('2d')!;
      const palDef = getPalette(palette);
      const mc = customColorsRef.current
        ? { ...palDef, start: customColorsRef.current[0], glow: customColorsRef.current[1], end: customColorsRef.current[2] }
        : palDef;
      const parseHexLocal = (hex: string): [number, number, number] => {
        const h = hex.replace('#', '');
        return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
      };
      const c1 = parseHexLocal(mc.start);
      const c2 = parseHexLocal(mc.glow);
      const c3 = parseHexLocal(mc.end);
      const bgC = parseHexLocal(mc.bg);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = (c / cols + r / rows) * 0.5;
          let cellColor: [number, number, number];
          if (t < 0.33) {
            cellColor = [c1[0] + (c2[0] - c1[0]) * (t / 0.33), c1[1] + (c2[1] - c1[1]) * (t / 0.33), c1[2] + (c2[2] - c1[2]) * (t / 0.33)];
          } else if (t < 0.66) {
            const u = (t - 0.33) / 0.33;
            cellColor = [c2[0] + (c3[0] - c2[0]) * u, c2[1] + (c3[1] - c2[1]) * u, c2[2] + (c3[2] - c2[2]) * u];
          } else {
            const u = (t - 0.66) / 0.34;
            cellColor = [c3[0] + (bgC[0] - c3[0]) * u, c3[1] + (bgC[1] - c3[1]) * u, c3[2] + (bgC[2] - c3[2]) * u];
          }
          const alpha = 0.15 + Math.random() * 0.1;
          mCtx.fillStyle = `rgba(${Math.round(cellColor[0])},${Math.round(cellColor[1])},${Math.round(cellColor[2])},${alpha})`;
          mCtx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
        }
      }
      mosaicTextureRef.current = mosaicCanvas;
      const mosaicTexture = new THREE.CanvasTexture(mosaicCanvas);
      mosaicTexture.wrapS = THREE.RepeatWrapping;
      mosaicTexture.wrapT = THREE.RepeatWrapping;
      const mosaicGeo = new THREE.PlaneGeometry(60, 60);
      const mosaicMat = new THREE.MeshBasicMaterial({
        map: mosaicTexture,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mosaicMesh = new THREE.Mesh(mosaicGeo, mosaicMat);
      mosaicMesh.position.set(0, 0, -8);
      scene.add(mosaicMesh);
      mosaicMeshRef.current = mosaicMesh;
    }

    // Geometry — store drawable objects for progressive reveal
    const drawables: THREE.Object3D[] = [];
    const sceneConfig: SceneConfig = { seed, palette, material, effect, customColors: customColorsRef.current };
    const normalizedWithZ = normalized.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0, value: p.value }));
    const lineRadius = lineWidth * 0.008;

    // ── Liquid sphere — shader-based, moves along curve to draw ──────
    const sphereRadius = lineRadius * 1.5;
    sphereRadiusRef.current = sphereRadius;
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
        uProgress: { value: 0 },
        uMoveDir: { value: new THREE.Vector3(0, 0, 1) },
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

    // Trail — glowing line behind the tracer
    const trailLen = 40;
    const trailPositions = new Float32Array(trailLen * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(pal.glow),
      transparent: true,
      opacity: 0.45,
      linewidth: 2,
      depthWrite: false,
    });
    const trail = new THREE.Line(trailGeo, trailMat);
    root.add(trail);
    trailRef.current = trail;

    // ── Geometry creation — each visually distinct ─────────────────────
    if (geometry === 'lines') {
      const linesMesh = buildLinesGeometry(surfaceCurve, sceneConfig);
      root.add(linesMesh);
      drawables.push(linesMesh);
    } else if (geometry === 'tubes') {
      const tubeGeo = new THREE.TubeGeometry(surfaceCurve, Math.max(360, points3D.length * 4), lineRadius, 16, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, progressiveTube.material);
      root.add(tubeMesh);
      drawables.push(tubeMesh);
    } else if (geometry === 'mesh') {
      const meshGroup = buildMeshGeometry(surfaceCurve, points3D.length, sceneConfig);
      root.add(meshGroup);
      meshGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) drawables.push(obj);
      });
    } else if (geometry === 'ribbon') {
      const ribbon = buildRibbonGeometry(surfaceCurve, sceneConfig);
      root.add(ribbon);
      drawables.push(ribbon);
    } else if (geometry === 'torus-knot') {
      const knot = buildTorusKnotGeometry(surfaceCurve, sceneConfig);
      root.add(knot);
      drawables.push(knot);
    } else if (geometry === 'mobius') {
      const mobius = buildMobiusGeometry(surfaceCurve, sceneConfig);
      root.add(mobius);
      drawables.push(mobius);
    } else if (geometry === 'helix') {
      const helix = buildHelixGeometry(surfaceCurve, sceneConfig);
      root.add(helix);
      drawables.push(helix);
    } else if (geometry === 'network') {
      const net = buildNetworkStructure(normalizedWithZ, sceneConfig);
      root.add(net);
      net.traverse((obj) => {
        if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) drawables.push(obj);
      });
    } else if (geometry === 'polygons') {
      const colors = sceneConfig.customColors
        ? { ...getPalette(palette), start: sceneConfig.customColors[0], glow: sceneConfig.customColors[1], end: sceneConfig.customColors[2] }
        : getPalette(palette);
      const polyGeo = new THREE.TubeGeometry(surfaceCurve, Math.max(200, points3D.length * 2), lineRadius * 0.8, 8, false);
      const polyMat = createIridescentMaterial(colors.start, colors.end, {
        iridescence: 0.9,
        sheen: 0.8,
        sheenColor: colors.glow,
        metalness: 0.7,
        roughness: 0.08,
      });
      const polyMesh = new THREE.Mesh(polyGeo, polyMat);
      root.add(polyMesh);
      drawables.push(polyMesh);
    } else if (geometry === 'surface') {
      const surfGeo = new THREE.TubeGeometry(surfaceCurve, Math.max(200, points3D.length * 2), lineRadius * 1.5, 16, false);
      const surf = new THREE.Mesh(surfGeo, progressiveTube.material);
      root.add(surf);
      drawables.push(surf);
    }

    drawablesRef.current = drawables;

    // ── Compute final camera position from bounding box ──────────────────
    // Only use artwork drawables, NOT starfield/particles/dust/trail
    const bbox = new THREE.Box3();
    for (const d of drawables) bbox.expandByObject(d);
    if (sphere) bbox.expandByObject(sphere);
    const bboxSize = new THREE.Vector3();
    const bboxCenter = new THREE.Vector3();
    bbox.getSize(bboxSize);
    bbox.getCenter(bboxCenter);

    const perspCam = camera as THREE.PerspectiveCamera;
    const aspect = perspCam.aspect;
    const vFov = perspCam.fov * (Math.PI / 180);
    const elevAngle = 12 * (Math.PI / 180);
    const cosElev = Math.cos(elevAngle);
    const sinElev = Math.sin(elevAngle);

    // Project bbox onto camera view plane to get visible extents
    const projV = bboxSize.y * cosElev + bboxSize.z * sinElev;
    const projH = bboxSize.x;

    // Minimum distance to fit within FOV at target occupancy (80%)
    const targetOcc = 0.8;
    const distVert = (projV * 0.5) / (Math.tan(vFov * 0.5) * targetOcc);
    const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * aspect);
    const distHoriz = (projH * 0.5) / (Math.tan(hFov * 0.5) * targetOcc);

    // Frontal position: camera on +Z axis relative to center, slightly above
    const minDist = Math.max(distVert, distHoriz);
    const idealDist = minDist * 1.2; // 20% margin
    idealDistanceRef.current = idealDist;

    // Strictly frontal: same X as center, elevated by 12°, on +Z axis
    finalCamPosRef.current.set(
      bboxCenter.x,
      bboxCenter.y + sinElev * idealDist,
      bboxCenter.z + cosElev * idealDist,
    );
    bboxCenterRef.current.copy(bboxCenter);

    // Debug occupancy (disabled in production)

    // Cosmic Stardust
    if (stardustDensity > 0) {
      const sd = createCosmicStardust(palette, seed, stardustDensity, stardustReactivity, customColorsRef.current);
      root.add(sd.points);
      stardustRef.current = sd;
    }

    // Post-processing
    postProcessingRef.current?.dispose();
    postProcessingRef.current = null;
    postProcessingRef.current = setupPostProcessing(renderer, scene, camera, effect, {
      dispersion,
      dofStrength,
      shockwaveIntensity,
    });

    // Set OrbitControls target and distance limits based on bounding box
    if (controls) {
      controls.target.set(bboxCenter.x, bboxCenter.y, bboxCenter.z);
      controls.minDistance = idealDist * 0.5;
      controls.maxDistance = idealDist * 2.0;
    }

    return () => {
      controlsRef.current?.dispose();
      controlsRef.current = null;
      disposeThreeObject(starfieldRef.current);
      starfieldRef.current = null;
      gpuParticlesRef.current?.dispose();
      gpuParticlesRef.current = null;
      ambientDustRef.current?.dispose();
      ambientDustRef.current = null;
      progressiveTubeRef.current?.dispose();
      progressiveTubeRef.current = null;
      if (tunnelRef.current) {
        tunnelRef.current.dispose();
        tunnelRef.current = null;
      }
      if (mosaicMeshRef.current) {
        disposeThreeObject(mosaicMeshRef.current);
        mosaicMeshRef.current = null;
      }
      mosaicTextureRef.current = null;
      if (stardustRef.current) {
        stardustRef.current.dispose();
        stardustRef.current = null;
      }
      disposeThreeObject(trailRef.current);
      trailRef.current = null;
      disposeThreeObject(sphereRef.current);
      sphereRef.current = null;
      sphereMatRef.current = null;
      curveRef.current = null;
      disposeThreeObject(root);
      while (root.children.length > 0) root.remove(root.children[0]);
    };
  }, [seed, steps, engine, grid, geometry, palette, material, effect, customColors, generationCount]);

  // ── EFFECT 3: Palette/light/fog updates (cheap, no rebuild) ─────────────
  useEffect(() => {
    const scene = sceneRef.current;
    const starfield = starfieldRef.current;
    const tube = progressiveTubeRef.current;
    const sphereMat = sphereMatRef.current;
    const trail = trailRef.current;
    if (!scene) return;

    const paletteDef = getPalette(palette);
    const colors = customColors
      ? { ...paletteDef, start: customColors[0], glow: customColors[1], end: customColors[2] }
      : paletteDef;
    palRef.current = colors;

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

    // Update trail color
    if (trail) {
      const trailMat = trail.material as THREE.LineBasicMaterial;
      if (trailMat.color) trailMat.color.set(colors.glow);
    }

    // Update tube colors — setMaterial with custom colors applied
    if (tube) {
      tube.setMaterial(palette, material, customColors);
      if (customColors) {
        if (tube.material.color) tube.material.color.set(customColors[0]);
        if ('emissive' in tube.material && tube.material.emissive) {
          (tube.material as THREE.MeshPhysicalMaterial).emissive.set(new THREE.Color(customColors[2]).multiplyScalar(0.3));
        }
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
    // Sun directional light positioned by lightAngle (elevation)
    const sunElev = (lightAngle * Math.PI) / 180;
    const sunDist = 10;
    const sunLight = new THREE.DirectionalLight(new THREE.Color('#ffe8c0'), 0.8);
    sunLight.position.set(
      Math.cos(sunElev) * sunDist,
      Math.sin(sunElev) * sunDist,
      5,
    );
    scene.add(sunLight);
    newLights.push(sunLight);
    lightHelpersRef.current = newLights;

    return () => {
      for (const l of lightHelpersRef.current) sceneRef.current?.remove(l);
      lightHelpersRef.current.forEach((l) => {
        if ('dispose' in l && typeof l.dispose === 'function') (l as { dispose: () => void }).dispose();
      });
      lightHelpersRef.current = [];
    };
  }, [palette, material, lightPreset, effect, customColors, lightAngle]);

  // ── EFFECT 4: Animation tick ─────────────────────────────────────────────
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const root = rootRef.current;
    if (!renderer || !scene || !camera || !root) return;

    let disposed = false;
    let animationFrame = 0;
    const drawDuration = animationSpeed * 1000;
    let drawStartTime = -1;

    // Pre-allocated Vector3 to avoid GC pressure in RAF
    const _tmpDir = new THREE.Vector3();
    const _tmpLookAt = new THREE.Vector3();

    // ── Easing functions per motionPreset ────────────────────────────────────
    const applyEasing = (t: number, preset: MotionPresetId): number => {
      switch (preset) {
        case 'ease-in':
          return t * t;
        case 'ease-out':
          return 1 - (1 - t) * (1 - t);
        case 'spring': {
          const c4 = (2 * Math.PI) / 3;
          return t === 0 ? 0 : t === 1 ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }
        case 'bounce': {
          const n1 = 7.5625;
          const d1 = 2.75;
          if (t < 1 / d1) return n1 * t * t;
          if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
          if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
        case 'procedural-wave':
          return t + Math.sin(t * Math.PI * 4) * 0.03 * (1 - t);
        case 'ease-in-out':
        default:
          return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }
    };

    // ── Smoothstep helper ────────────────────────────────────────────────────
    const smoothstep = (edge0: number, edge1: number, x: number): number => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    let firstFrame = true;
    const tick = (time: number) => {
      if (disposed) return;
      if (!isAnimating && !firstFrame) {
        animationFrame = window.requestAnimationFrame(tick);
        return;
      }
      firstFrame = false;

      if (drawStartTime < 0) drawStartTime = time;
      const drawElapsed = time - drawStartTime;
      const drawProgress = Math.min(1, drawElapsed / drawDuration);

      const easedProgress = applyEasing(drawProgress, motionPreset);

      const isRevealing = drawProgress < 1;
      const revealT = isRevealing ? easedProgress : 1;

      // ── Liquid sphere — moves along curve, draws geometry behind it ──
      const curve = curveRef.current;
      const sphere = sphereRef.current;
      const sphereMat = sphereMatRef.current;
      if (curve && curve.points.length >= 2 && sphere && sphereMat) {
        sphereMat.uniforms.uTime.value = time * 0.001;
        sphereMat.uniforms.uProgress.value = revealT;
        const sphereFade = Math.min(1, easedProgress * 4);
        sphereMat.uniforms.uOpacity.value = sphereFade;
        // Organic breathing — slows down as sphere approaches end
        const breathFade = 1 - easedProgress * 0.5;
        const breathe = 1 + Math.sin(time * 0.0008) * 0.06 * breathFade;
        const morph = 1 + Math.sin(time * 0.0012) * 0.03 * breathFade;

        // Move sphere along the curve — smooth deceleration at end
        const t = Math.max(0.001, Math.min(0.999, revealT * 0.999));
        let pos: THREE.Vector3;
        try { pos = curve.getPointAt(t); } catch { pos = curve.getPoint(Math.max(0, Math.min(1, t))); }
        if (!pos || !Number.isFinite(pos.x)) pos = curve.points[0];
        sphere.position.copy(pos);

        // Compute movement direction for liquid deformation
        const lookAheadT = Math.min(t + 0.01, 0.999);
        let nextPos: THREE.Vector3;
        try { nextPos = curve.getPointAt(lookAheadT); } catch { nextPos = curve.getPoint(lookAheadT); }
        if (!nextPos || !Number.isFinite(nextPos.x)) nextPos = pos;
        _tmpDir.copy(nextPos).sub(pos);
        const dirLen = _tmpDir.length();
        if (dirLen > 0.0001) _tmpDir.divideScalar(dirLen); else _tmpDir.set(0, 0, 1);
        sphereMat.uniforms.uMoveDir.value.copy(_tmpDir);

        // Non-uniform scale: stretch along movement, squeeze perpendicular
        const prevProgress = Math.min(1, Math.max(0, (time - drawStartTime - 16)) / drawDuration);
        const speed = Math.abs(easedProgress - applyEasing(prevProgress, motionPreset));
        const stretchFactor = 1.0 + Math.min(speed * 8, 0.35);
        const squeezeFactor = 1.0 / Math.sqrt(stretchFactor);
        sphere.scale.set(
          breathe * morph * squeezeFactor,
          breathe / morph * squeezeFactor,
          breathe * stretchFactor,
        );

        // Orient sphere tangent to curve
        if (dirLen > 0.0001) {
          _tmpLookAt.copy(pos).add(_tmpDir);
          sphere.lookAt(_tmpLookAt);
        }

        // ── Conical tail — liquid extrusion behind sphere ──────
      }

      // ── Trail — glowing line behind the tracer ─────────────────────────
      const trail = trailRef.current;
      if (curve && curve.points.length >= 2 && trail) {
        const trailLen = 40;
        const trailSpan = 0.06;
        const headT = Math.max(0.001, Math.min(0.999, revealT * 0.999));
        const posAttr = trail.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < trailLen; i++) {
          const frac = i / trailLen;
          const trailT = Math.max(0.001, Math.min(0.999, headT - trailSpan * (1 - frac)));
          let p: THREE.Vector3;
          try { p = curve.getPointAt(trailT); } catch { p = curve.getPoint(trailT); }
          if (!p || !Number.isFinite(p.x)) p = curve.points[0];
          posAttr.setXYZ(i, p.x, p.y, p.z);
        }
        posAttr.needsUpdate = true;
        const trailMat = trail.material as THREE.LineBasicMaterial;
        trailMat.opacity = isRevealing ? 0.6 : Math.max(0, trailMat.opacity - 0.02);
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

      // ── Root rotation: gentle spin during reveal, stop after ───────────────
      if (isRevealing) {
        root.rotation.y = drawProgress * Math.PI * 2;
        root.rotation.x = Math.sin(drawProgress * Math.PI) * 0.06;
      }
      // After reveal: root stays at its last rotation (no more spin)

      gpuParticlesRef.current?.update(time * 0.0008);
      ambientDustRef.current?.update(time * 0.0005);
      if (starfieldRef.current) starfieldRef.current.rotation.z = time * 0.00002;
      root.scale.setScalar(effect === 'cinematic-lighting' ? 1.05 : 1);

      // ── Camera: 3-phase cinematic drone path ──────────────────────────

      if (isRevealing) {
        const p = drawProgress;
        const finalPos = finalCamPosRef.current;
        let camX: number;
        let camY: number;
        let camZ: number;

        if (p < 0.3) {
          // Phase 1: Close-up, slightly off-center for drama
          const t1 = p / 0.3;
          const e1 = smoothstep(0, 1, t1);
          camX = 1.2 * (1 - e1) + 0.6 * e1;
          camY = 1.0 * (1 - e1) + 0.6 * e1;
          camZ = 3.0 * (1 - e1) + 4.5 * e1;
        } else if (p < 0.7) {
          // Phase 2: Pull back, center artwork
          const t2 = (p - 0.3) / 0.4;
          const e2 = smoothstep(0, 1, t2);
          camX = 0.6 * (1 - e2) + finalPos.x * e2;
          camY = 0.6 * (1 - e2) + finalPos.y * e2;
          camZ = 4.5 * (1 - e2) + finalPos.z * e2;
        } else {
          // Phase 3: settle from Phase 2 end → finalPos (continuous)
          const t3 = (p - 0.7) / 0.3;
          const e3 = smoothstep(0, 1, t3);
          const p2EndX = finalPos.x;
          const p2EndY = finalPos.y + 0.3;
          const p2EndZ = finalPos.z * 0.9;
          camX = p2EndX * (1 - e3) + finalPos.x * e3;
          camY = p2EndY * (1 - e3) + finalPos.y * e3;
          camZ = p2EndZ * (1 - e3) + finalPos.z * e3;
        }

        camera.position.set(camX, camY, camZ);
      } else {
        // After reveal: smooth transition to frontal position, then OrbitControls
        const finalPos = finalCamPosRef.current;
        const controls = controlsRef.current;

        if (!isAnimationDoneRef.current) {
          // First frame after reveal: start the transition
          isAnimationDoneRef.current = true;
          cameraTransitionRef.current = {
            active: true,
            startPos: camera.position.clone(),
            endPos: finalPos.clone(),
            startTime: time,
            duration: 1500,
          };
        }

        const transition = cameraTransitionRef.current;
        if (transition && transition.active) {
          const elapsed = time - transition.startTime;
          const t = Math.min(1, elapsed / transition.duration);
          // easeInOutCubic
          const ease = t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
          camera.position.lerpVectors(transition.startPos, transition.endPos, ease);

          if (t >= 1) {
            // Transition complete: enable OrbitControls
            transition.active = false;
            camera.position.copy(transition.endPos);
            if (controls) {
              controls.target.set(bboxCenterRef.current.x, bboxCenterRef.current.y, bboxCenterRef.current.z);
              controls.update();
              controls.enabled = true;
            }
          }
        } else if (controls && controls.enabled) {
          // OrbitControls handles the camera — just update damping
          controls.update();
        }
      }

      // Only lookAt when not using OrbitControls
      if (!controlsRef.current || !controlsRef.current.enabled) {
        camera.lookAt(bboxCenterRef.current.x, bboxCenterRef.current.y, bboxCenterRef.current.z);
      }

      // Update tunnel background
      if (tunnelRef.current) {
        tunnelRef.current.update(time);
      }

      // Track camera speed for dispersion
      const camDelta = camera.position.distanceTo(prevCamPosRef.current);
      cameraSpeedRef.current = cameraSpeedRef.current * 0.95 + camDelta * 20;
      prevCamPosRef.current.copy(camera.position);

      // Update cosmic stardust
      if (stardustRef.current) {
        stardustRef.current.update(time, 0, 0);
      }

      try {
        const pp = postProcessingRef.current;
        if (pp) {
          if (pp.grainPass) pp.grainPass.uniforms.uTime.value = time * 0.001;
          if (pp.refractionPass) pp.refractionPass.uniforms.uTime.value = time * 0.001;
          if (pp.dispersionPass) pp.dispersionPass.update(time, cameraSpeedRef.current);
          if (pp.shockwavePass) pp.shockwavePass.update(time, 0);
          pp.composer.render();
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
  }, [seed, effect, motionPreset, animationSpeed, isAnimating, cameraPreset, generationCount]);

  // ── Grid deconstruct: wireframe + floor when showGrid toggles ─────────
  useEffect(() => {
    const scene = sceneRef.current;
    const drawables = drawablesRef.current;
    if (!scene || drawables.length === 0) return;

    if (showGrid) {
      // ── 1. Grid floor ──
      if (!gridFloorRef.current) {
        const floor = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
        floor.position.y = -1.5;
        floor.material = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
        });
        scene.add(floor);
        gridFloorRef.current = floor;
      }

      // ── 2. Wireframe overlays + semi-transparent originals ──
      for (const obj of drawables) {
        if (obj instanceof THREE.Mesh) {
          // Store original material
          if (!originalMaterialsRef.current.has(obj)) {
            originalMaterialsRef.current.set(obj, obj.material);
          }
          // Make original semi-transparent
          const origMat = obj.material;
          if (Array.isArray(origMat)) {
            for (const m of origMat) {
              if ('opacity' in m) { m.transparent = true; m.opacity = 0.25; m.depthWrite = false; }
            }
          } else if ('opacity' in origMat) {
            origMat.transparent = true;
            origMat.opacity = 0.25;
            origMat.depthWrite = false;
          }
          // Add wireframe overlay
          const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00f5d4,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
          });
          const wire = new THREE.Mesh(obj.geometry, wireMat);
          wire.renderOrder = 1;
          obj.parent?.add(wire);
          wireframeOverlaysRef.current.push(wire);
        }
      }
    } else {
      // ── Remove grid floor ──
      if (gridFloorRef.current) {
        scene.remove(gridFloorRef.current);
        gridFloorRef.current = null;
      }
      // ── Remove wireframe overlays ──
      for (const wire of wireframeOverlaysRef.current) {
        wire.parent?.remove(wire);
        wire.geometry?.dispose();
        (wire.material as THREE.Material)?.dispose();
      }
      wireframeOverlaysRef.current = [];
      // ── Restore original materials ──
      for (const [obj, mat] of originalMaterialsRef.current) {
        obj.material = mat;
      }
      originalMaterialsRef.current.clear();
    }

    return () => {
      // Cleanup on unmount
      if (gridFloorRef.current) {
        scene.remove(gridFloorRef.current);
        gridFloorRef.current = null;
      }
      for (const wire of wireframeOverlaysRef.current) {
        wire.parent?.remove(wire);
        wire.geometry?.dispose();
        (wire.material as THREE.Material)?.dispose();
      }
      wireframeOverlaysRef.current = [];
      for (const [obj, mat] of originalMaterialsRef.current) {
        obj.material = mat;
      }
      originalMaterialsRef.current.clear();
    };
  }, [showGrid]);

    // ── Mini-map 2D: draw 2D grid overlay in bottom-right corner ──────────
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || !showGrid) return;

    const size = 220;
    canvas.width = size * 2; // retina
    canvas.height = size * 2;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { points } = buildArtwork(seed, Math.min(steps, 120), engine, grid);
    if (points.length === 0) return;

    const maxVal = Math.max(1, ...points.map((p) => p.value));
    const isPrime = (n: number): boolean => {
      if (n < 2) return false;
      if (n < 4) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;
      for (let d = 5; d * d <= n; d += 6) {
        if (n % d === 0 || n % (d + 2) === 0) return false;
      }
      return true;
    };
    const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

    // Normalize
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const range = Math.max(maxX - minX, maxY - minY) || 1;
    const s = (size - 20) / range;

    ctx.fillStyle = 'rgba(10, 10, 15, 0.92)';
    ctx.fillRect(0, 0, size * 2, size * 2);

    // Lines connecting points
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const sx = (points[i].x - cx) * s + size;
      const sy = (points[i].y - cy) * s + size;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // ALL points with labels — adaptive contrast
    const fontSize = points.length > 80 ? 6 : points.length > 40 ? 7 : 8;
    ctx.font = `700 ${fontSize * 2}px "SF Mono", "Fira Code", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const sx = (p.x - cx) * s + size;
      const sy = (p.y - cy) * s + size;
      const prime = isPrime(p.value);

      // Point dot
      ctx.fillStyle = prime ? 'rgba(0, 245, 212, 0.8)' : 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(sx, sy, prime ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Label with dark pill background for readability
      const text = String(p.value);
      const tw = ctx.measureText(text).width + 4;
      const th = fontSize * 2 + 2;
      const ly = sy - fontSize * 2.5;

      ctx.fillStyle = prime ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(sx - tw / 2, ly - th / 2, tw, th, 2);
      ctx.fill();

      ctx.fillStyle = prime ? 'rgba(0, 245, 212, 0.95)' : 'rgba(255,255,255,0.75)';
      ctx.fillText(text, sx, ly);
    }
  }, [showGrid, seed, steps, engine, grid]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative"
    >
      {/* Mini-map 2D corner overlay */}
      {showGrid && (
        <div className="absolute bottom-4 right-4 z-10 rounded-xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-sm">
          <canvas
            ref={minimapCanvasRef}
            className="block"
          />
          <div className="absolute top-1.5 left-2 text-[9px] font-mono text-white/50 uppercase tracking-wider">
            2D Grid
          </div>
        </div>
      )}
    </div>
  );
}
