/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId } from '../domain/types';
import { buildArtwork, getPalette, normalizeArtwork, type GeneratorEngine, type PaletteKey, type SpatialGrid } from '../lib/math';
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
import type { ICameraEngine, ILightEngine, IMotionEngine } from '../core/plugin';
import { setupPostProcessing } from '../core/post-processing';
import type { PostProcessingSetup } from '../core/post-processing';
import { createGPUParticles, createAmbientDust } from '../core/gpu-particles';
import { createProgressiveTubeMaterial } from '../core/progressive-tube';
import { createTracerManager } from '../core/tracer-manager';

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
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

function addLightsToScene(scene: THREE.Scene, presetId: LightPresetId, palette: PaletteKey) {
  const engine = registry.get(presetId) as ILightEngine | undefined;
  const lights = engine?.lights ?? [];
  const colors = getPalette(palette);

  if (lights.length === 0) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(new THREE.Color(colors.start), 1.6);
    key.position.set(5, 4, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(new THREE.Color(colors.glow), 0.8);
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

export function Renderer3D({ seed, steps, palette, engine, grid, geometry, material, effect, lightPreset, motionPreset, cameraPreset, animationSpeed, isAnimating, onCanvasReady }: Renderer3DProps) {
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
  const tracerRef = useRef<ReturnType<typeof createTracerManager> | null>(null);
  const progressiveTubeRef = useRef<ReturnType<typeof createProgressiveTubeMaterial> | null>(null);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const postProcessingRef = useRef<PostProcessingSetup | null>(null);
  const maxValRef = useRef(0);
  const valuesRef = useRef<number[]>([]);

  const cameraDefRef = useRef<ICameraEngine | null>(null);
  const motionRef = useRef<IMotionEngine | null>(null);
  const lightHelpersRef = useRef<THREE.Light[]>([]);

  const animRef = useRef({ speed: animationSpeed, animating: isAnimating });
  useEffect(() => {
    animRef.current.speed = animationSpeed;
    animRef.current.animating = isAnimating;
  }, [animationSpeed, isAnimating]);

  useEffect(() => {
    cameraDefRef.current = (registry.get(cameraPreset) as ICameraEngine | undefined) ?? null;
  }, [cameraPreset]);

  useEffect(() => {
    motionRef.current = (registry.get(motionPreset) as IMotionEngine | undefined) ?? null;
  }, [motionPreset]);

  // ── EFFECT 1: One-time renderer + scene setup ────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousCanvas = container.querySelector('canvas');
    if (previousCanvas) previousCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.className = 'h-full w-full';
    canvas.style.display = 'block';
    canvasRef.current = canvas;
    container.appendChild(canvas);
    onCanvasReady?.(canvas);

    const rect = container.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

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
      const nextWidth = canvas.clientWidth || 1;
      const nextHeight = canvas.clientHeight || 1;
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      postProcessingRef.current?.resize(nextWidth, nextHeight);
    };

    resize();
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', resize);
      postProcessingRef.current?.dispose();
      postProcessingRef.current = null;
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
    starfieldRef.current?.dispose();
    gpuParticlesRef.current?.dispose();
    ambientDustRef.current?.dispose();
    tracerRef.current?.dispose();
    progressiveTubeRef.current?.dispose();
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
    const curve = new THREE.CatmullRomCurve3(points3D);
    curveRef.current = curve;

    // Starfield
    const starColors = getPalette(palette);
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
    const gpuParticles = createGPUParticles(curve, palette, seed, 800);
    root.add(gpuParticles.points);
    gpuParticlesRef.current = gpuParticles;

    // Ambient dust
    const ambientDust = createAmbientDust(palette, seed, 400);
    root.add(ambientDust.points);
    ambientDustRef.current = ambientDust;

    // Tracer
    const tracerManager = createTracerManager(palette, curve);
    root.add(tracerManager.group);
    tracerRef.current = tracerManager;

    // Progressive tube
    const progressiveTube = createProgressiveTubeMaterial(palette, material);
    progressiveTubeRef.current = progressiveTube;

    // Geometry
    const sceneConfig: SceneConfig = { seed, palette, material, effect };
    const normalizedWithZ = normalized.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0, value: p.value }));

    if (geometry === 'tubes' || geometry === 'mesh') {
      const radius = material === 'gem' ? 0.11 : material === 'crystal' ? 0.09 : material === 'metallic' ? 0.08 : 0.06;
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(360, points3D.length * 4), radius, 16, false);
      root.add(new THREE.Mesh(tubeGeo, progressiveTube.material));
    } else if (geometry === 'ribbon') {
      root.add(buildRibbonGeometry(curve, sceneConfig));
    } else if (geometry === 'torus') {
      root.add(buildTorusGeometry(sceneConfig));
    } else if (geometry === 'cylinder') {
      root.add(buildCylinderGeometry(sceneConfig));
    } else if (geometry === 'cone') {
      root.add(buildConeGeometry(sceneConfig));
    } else if (geometry === 'branching') {
      root.add(buildBranchingSystem(sceneConfig));
    } else if (geometry === 'network') {
      root.add(buildNetworkStructure(normalizedWithZ, sceneConfig));
    } else if (geometry === 'trail') {
      root.add(buildTrailSystem(curve, sceneConfig));
    } else if (geometry === 'polygons') {
      const polyGeo = new THREE.BufferGeometry().setFromPoints(points3D);
      const polyMat = new THREE.LineBasicMaterial({ color: new THREE.Color(getPalette(palette).start), transparent: true, opacity: 0.8 });
      root.add(new THREE.Line(polyGeo, polyMat));
    } else if (geometry === 'surface') {
      root.add(buildTorusGeometry(sceneConfig, 2, 0.5));
    } else if (geometry === 'points' || geometry === 'particles') {
      // Points/particles: only show GPU particles
    }

    // Post-processing
    postProcessingRef.current?.dispose();
    postProcessingRef.current = null;
    if (effect === 'bloom' || effect === 'glow' || effect === 'cinematic-lighting') {
      postProcessingRef.current = setupPostProcessing(renderer, scene, camera);
    }

    return () => {
      starfieldRef.current?.dispose();
      gpuParticlesRef.current?.dispose();
      ambientDustRef.current?.dispose();
      tracerRef.current?.dispose();
      progressiveTubeRef.current?.dispose();
      starfieldRef.current = null;
      gpuParticlesRef.current = null;
      ambientDustRef.current = null;
      tracerRef.current = null;
      progressiveTubeRef.current = null;
      curveRef.current = null;
    };
  }, [seed, steps, engine, grid, geometry, palette, material, effect]);

  // ── EFFECT 3: Palette/light/fog updates (cheap, no rebuild) ─────────────
  useEffect(() => {
    const scene = sceneRef.current;
    const starfield = starfieldRef.current;
    const tube = progressiveTubeRef.current;
    if (!scene) return;

    const colors = getPalette(palette);

    scene.fog = new THREE.Fog(new THREE.Color(colors.bg), 8, 22);

    if (rendererRef.current) {
      rendererRef.current.setClearColor(new THREE.Color(colors.bg), 1);
    }

    if (starfield) {
      (starfield.material as THREE.PointsMaterial).color.set(colors.glow);
    }

    if (tube) {
      tube.setMaterial(palette, material);
    }

    // Dispose previous lights
    for (const l of lightHelpersRef.current) scene.remove(l);
    lightHelpersRef.current.forEach((l) => {
      if ('dispose' in l && typeof l.dispose === 'function') (l as { dispose: () => void }).dispose();
    });

    const newLights = addLightsToScene(scene, lightPreset, palette);
    lightHelpersRef.current = newLights;

    return () => {
      for (const l of lightHelpersRef.current) sceneRef.current?.remove(l);
      lightHelpersRef.current.forEach((l) => {
        if ('dispose' in l && typeof l.dispose === 'function') (l as { dispose: () => void }).dispose();
      });
      lightHelpersRef.current = [];
    };
  }, [palette, material, lightPreset, effect]);

  // ── EFFECT 4: Animation tick ─────────────────────────────────────────────
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const root = rootRef.current;
    if (!renderer || !scene || !camera || !root) return;

    let animationFrame = 0;
    const drawDuration = 9000;
    let drawStartTime = -1;

    const tick = (time: number) => {
      const { speed, animating } = animRef.current;
      const multiplier = Math.min(Math.max(speed, 0.2), 3);
      const rawT = time * 0.001 * (animating ? multiplier : 0.4);
      const motion = motionRef.current;
      const t = motion ? motion.evaluate(rawT % 1, { intensity: 1 }) * rawT : rawT;

      if (drawStartTime < 0) drawStartTime = time;
      const drawElapsed = time - drawStartTime;
      const drawProgress = Math.min(1, drawElapsed / drawDuration);
      const easedProgress = drawProgress < 0.5
        ? 2 * drawProgress * drawProgress
        : -1 + (4 - 2 * drawProgress) * drawProgress;

      progressiveTubeRef.current?.setProgress(easedProgress);
      progressiveTubeRef.current?.setTime(rawT);
      tracerRef.current?.update(easedProgress, curveRef.current!, maxValRef.current, valuesRef.current);

      root.rotation.y = t * 0.15;
      root.rotation.x = Math.sin(t * 0.9 + seed * 0.2) * 0.08;

      gpuParticlesRef.current?.update(rawT);
      ambientDustRef.current?.update(rawT);
      if (starfieldRef.current) starfieldRef.current.rotation.z = t * 0.03;
      root.scale.setScalar(effect === 'cinematic-lighting' ? 1.05 : 1);

      const camDef = cameraDefRef.current;
      if (camDef) {
        const ct = rawT * 0.3;
        const dist = camDef.position[2];
        const height = camDef.position[1];

        switch (camDef.cameraType) {
          case 'orbit':
            camera.position.x = Math.sin(ct) * dist;
            camera.position.z = Math.cos(ct) * dist;
            camera.position.y = height + Math.sin(ct * 0.5) * 0.5;
            break;
          case 'follow': {
            const curve = curveRef.current;
            if (curve) {
              const followPoint = curve.getPointAt((ct * 0.15) % 1);
              camera.position.lerp(
                new THREE.Vector3(followPoint.x * 1.5, followPoint.y * 1.5 + 2, followPoint.z + 4),
                0.02,
              );
            }
            break;
          }
          case 'cinematic': {
            const angle = ((camDef.params.find((p) => p.id === 'angle')?.default as number) ?? 12) * Math.PI / 180;
            camera.position.x = Math.sin(ct * 0.5 + angle) * dist;
            camera.position.z = Math.cos(ct * 0.5 + angle) * dist;
            camera.position.y = height + Math.sin(ct * 0.3) * 1.5;
            break;
          }
        }
        camera.lookAt(...camDef.lookAt);
      }

      if (postProcessingRef.current) {
        postProcessingRef.current.composer.render();
      } else {
        renderer.render(scene, camera);
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
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
