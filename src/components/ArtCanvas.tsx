import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { EffectMode, GeometryMode, MaterialMode } from '../domain/types';
import { buildArtwork, getPalette, normalizeArtwork, type GeneratorEngine, type PaletteKey, type SpatialGrid } from '../lib/math';

interface ArtCanvasProps {
  seed: number;
  steps: number;
  mode: '2d' | '3d';
  palette: PaletteKey;
  engine?: GeneratorEngine;
  grid?: SpatialGrid;
  geometry?: GeometryMode;
  material?: MaterialMode;
  effect?: EffectMode;
  animationSpeed?: number;
  isAnimating?: boolean;
}

export type ArtCanvasHandle = {
  getCanvas: () => HTMLCanvasElement | null;
};

const ArtCanvasComponent = forwardRef<ArtCanvasHandle, ArtCanvasProps>(function ArtCanvas({ seed, steps, mode, palette, engine = 'collatz', grid = 'ulam', geometry = 'points', material = 'basic', effect = 'glow', animationSpeed = 1, isAnimating = false }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Velocità e stato animazione letti via ref: evitano la ricostruzione
  // dell'intera scena a ogni movimento dello slider.
  const animationStateRef = useRef({ speed: animationSpeed, animating: isAnimating });

  useEffect(() => {
    animationStateRef.current.speed = animationSpeed;
    animationStateRef.current.animating = isAnimating;
  }, [animationSpeed, isAnimating]);

  // Frame renderer corrente, guidato dal loop di animazione.
  const renderFrameRef = useRef<((time: number) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousCanvas = container.querySelector('canvas');
    if (previousCanvas) {
      previousCanvas.remove();
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'h-full w-full rounded-[28px] bg-[#050812]';
    canvas.style.display = 'block';
    canvasRef.current = canvas;
    container.appendChild(canvas);

    const rect = container.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    if (mode === '3d') {
      let disposed = false;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.setClearColor(new THREE.Color(getPalette(palette).bg), 1);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(new THREE.Color(getPalette(palette).bg), 6, 18);

      const camera = new THREE.PerspectiveCamera(40, width / height || 1, 0.1, 100);
      camera.position.set(0, 0.5, 8.5);

      const ambient = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0x8ae6ff, 1.6);
      keyLight.position.set(5, 4, 6);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xff7bd5, 0.8);
      rimLight.position.set(-5, -2, 4);
      scene.add(rimLight);

      const { points } = buildArtwork(seed, steps, engine, grid);
      const normalized = normalizeArtwork(points);
      const colors = getPalette(palette);

      // Massimo calcolato una sola volta: evita O(n^2).
      const maxValue = points.reduce((max, item) => Math.max(max, item.value), 0);

      const points3D = normalized.map((point, index) => {
        const energy = 1 + (point.value / Math.max(1, maxValue)) * 1.5;
        return new THREE.Vector3(point.x * (2.4 + energy * 0.25), point.y * (2.4 + energy * 0.25), Math.sin(index * 0.35) * 1.2 + energy * 0.25);
      });
      const curve = new THREE.CatmullRomCurve3(points3D);

      let mainMesh: THREE.Object3D | null = null;
      if (geometry === 'tubes' || geometry === 'mesh') {
        const radius = material === 'gem' ? 0.11 : material === 'crystal' ? 0.09 : material === 'metallic' ? 0.08 : 0.06;
        const tubeGeometry = new THREE.TubeGeometry(curve, Math.max(360, points3D.length * 4), radius, geometry === 'mesh' ? 18 : 16, false);
        const tubeMaterial = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(material === 'gem' ? colors.accent : material === 'crystal' ? colors.glow : colors.start),
          emissive: new THREE.Color(material === 'crystal' || material === 'glass' ? colors.start : colors.end),
          emissiveIntensity: material === 'glass' ? 0.65 : material === 'gem' ? 1.1 : 0.9,
          roughness: material === 'crystal' ? 0.08 : material === 'gem' ? 0.12 : material === 'metallic' ? 0.25 : 0.18,
          metalness: material === 'metallic' ? 0.8 : material === 'gem' ? 0.42 : 0.35,
          clearcoat: material === 'glass' || material === 'crystal' || material === 'gem' ? 1 : 0.7,
          transparent: material === 'glass' || material === 'crystal' || material === 'holographic',
          opacity: material === 'glass' ? 0.72 : material === 'crystal' ? 0.8 : material === 'holographic' ? 0.58 : 0.82,
          transmission: material === 'glass' || material === 'crystal' ? 0.6 : 0,
          ior: material === 'gem' ? 2.0 : 1.5,
        });
        mainMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        scene.add(mainMesh);
      }

      const starPositions = new Float32Array(1800 * 3);
      for (let index = 0; index < starPositions.length; index += 3) {
        starPositions[index] = (Math.random() - 0.5) * 18;
        starPositions[index + 1] = (Math.random() - 0.5) * 18;
        starPositions[index + 2] = (Math.random() - 0.5) * 16 - 4;
      }

      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(colors.glow),
        size: 0.035,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);

      const particlePositions: number[] = [];
      const particleColors: number[] = [];
      normalized.forEach((point, index) => {
        const depth = Math.sin((index / Math.max(1, normalized.length - 1)) * Math.PI * 2) * 1.6;
        const energy = point.value / Math.max(1, maxValue);
        const radiusBoost = 1 + energy * 1.6;
        particlePositions.push(point.x * 2.7 * radiusBoost, point.y * 2.7 * radiusBoost, depth);
        const color = new THREE.Color(colors.start).lerp(new THREE.Color(colors.end), index / Math.max(1, normalized.length - 1));
        particleColors.push(color.r, color.g, color.b);
      });

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));

      const particleMaterial = new THREE.PointsMaterial({
        size: geometry === 'particles' ? 0.09 : 0.07,
        vertexColors: true,
        transparent: true,
        opacity: effect === 'glow' ? 0.9 : 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      const tracerMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colors.accent),
        emissive: new THREE.Color(colors.glow),
        emissiveIntensity: 1.4,
      });
      const tracer = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), tracerMaterial);
      scene.add(tracer);

      const root = new THREE.Group();
      root.add(starField, particles, tracer);
      if (mainMesh) root.add(mainMesh);
      scene.add(root);

      let animationFrame = 0;
      const tick = (time: number) => {
        if (disposed) return;

        const { speed, animating } = animationStateRef.current;
        const multiplier = Math.min(Math.max(speed, 0.2), 3);
        const t = time * 0.001 * (animating ? multiplier : 0.4);
        root.rotation.y = t * 0.65;
        root.rotation.x = Math.sin(t * 0.9 + seed * 0.2) * 0.5;
        particles.rotation.y = t * 0.55;
        starField.rotation.z = t * 0.18;

        if (mainMesh) {
          mainMesh.rotation.y = t * 0.35;
          mainMesh.rotation.z = Math.sin(t * 0.8 + seed) * 0.45;
        }

        const sample = curve.getPointAt((t * 0.22) % 1);
        tracer.position.copy(sample);

        const energyPulse = 1 + Math.sin(t * 2.8 + seed * 0.18) * 0.22;
        tracer.scale.setScalar(energyPulse);
        root.scale.setScalar(effect === 'cinematic-lighting' ? 1.08 : 1);

        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(tick);
      };

      const resize = () => {
        const nextWidth = canvas.clientWidth || 1;
        const nextHeight = canvas.clientHeight || 1;
        renderer.setSize(nextWidth, nextHeight, false);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
      };

      resize();
      animationFrame = window.requestAnimationFrame(tick);
      window.addEventListener('resize', resize);

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        renderer.setAnimationLoop(null);
        window.removeEventListener('resize', resize);

        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const objectMaterial = object.material;
            if (Array.isArray(objectMaterial)) {
              objectMaterial.forEach((item) => item.dispose());
            } else if (objectMaterial) {
              objectMaterial.dispose();
            }
          }
        });

        starGeometry.dispose();
        starMaterial.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        tracerMaterial.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
        canvas.remove();
        if (canvasRef.current === canvas) {
          canvasRef.current = null;
        }
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    let viewWidth = width;
    let viewHeight = height;

    const syncSize = () => {
      const nextRect = container.getBoundingClientRect();
      viewWidth = nextRect.width || 1;
      viewHeight = nextRect.height || 1;
      canvas.width = Math.floor(viewWidth * ratio);
      canvas.height = Math.floor(viewHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    syncSize();

    const { points, stats } = buildArtwork(seed, steps, engine, grid);
    const normalized = normalizeArtwork(points);
    const colors = getPalette(palette);

    const drawFrame = (time: number) => {
      const { speed, animating } = animationStateRef.current;
      const pulse = animating ? Math.sin(time * 0.001 * speed + seed) : 0;

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      const bg = ctx.createRadialGradient(viewWidth * 0.5, viewHeight * 0.5, 15, viewWidth * 0.5, viewHeight * 0.5, Math.max(viewWidth, viewHeight));
      bg.addColorStop(0, colors.bg);
      bg.addColorStop(0.38, colors.start);
      bg.addColorStop(1, '#02050b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      for (let index = 0; index < 160; index += 1) {
        const x = ((Math.sin(index * 19.17 + seed) * 0.5 + 0.5) * viewWidth);
        const y = ((Math.cos(index * 13.71 + seed) * 0.5 + 0.5) * viewHeight);
        const radius = 0.8 + ((index % 5) / 6) + (pulse * 0.6);
        ctx.beginPath();
        ctx.fillStyle = effect === 'glow' ? 'rgba(200, 240, 255, 0.7)' : 'rgba(120, 160, 220, 0.45)';
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const centerX = viewWidth / 2 + Math.sin(pulse + seed) * 14;
      const centerY = viewHeight / 2 + Math.cos(pulse * 1.7 + seed * 0.3) * 12;
      const scale = Math.min(viewWidth, viewHeight) * 0.34;
      const gradient = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
      gradient.addColorStop(0, colors.start);
      gradient.addColorStop(0.5, colors.glow);
      gradient.addColorStop(1, colors.end);

      if (geometry !== 'particles') {
        ctx.beginPath();
        normalized.forEach((point, index) => {
          const x = centerX + point.x * scale * (1 + pulse * 0.1);
          const y = centerY + point.y * scale * (1 + pulse * 0.1);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = gradient;
        ctx.lineWidth = geometry === 'lines' ? 3.4 : 2.5;
        ctx.shadowBlur = effect === 'glow' ? 28 : 14;
        ctx.shadowColor = colors.glow;
        ctx.stroke();
      }

      normalized.forEach((point, index) => {
        const x = centerX + point.x * scale * (1 + pulse * 0.2);
        const y = centerY + point.y * scale * (1 + pulse * 0.2);
        const radius = geometry === 'particles' ? 1.8 + (point.value / Math.max(1, stats.maxValue)) * 3.4 : 1.6 + (point.value / Math.max(1, stats.maxValue)) * 4.0;
        ctx.fillStyle = index === 0 ? '#ffd166' : effect === 'glow' ? '#e8faff' : '#c9dcff';
        ctx.beginPath();
        ctx.arc(x, y, radius + (animating ? pulse * 2 : 0), 0, Math.PI * 2);
        ctx.fill();
      });
    };

    renderFrameRef.current = drawFrame;
    drawFrame(performance.now());

    const handleResize = () => {
      syncSize();
      renderFrameRef.current?.(performance.now());
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderFrameRef.current = null;
      canvas.remove();
      if (canvasRef.current === canvas) {
        canvasRef.current = null;
      }
    };
  }, [mode, palette, seed, steps, engine, grid, geometry, material, effect]);

  // Loop di animazione condiviso: guida il frame renderer 2D mentre
  // l'animazione è attiva senza ricostruire la scena.
  useEffect(() => {
    if (!isAnimating) return;

    let frame = 0;
    const tick = (time: number) => {
      renderFrameRef.current?.(time);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isAnimating]);

  return <div ref={containerRef} className="h-full w-full rounded-[28px] bg-[#050812]" />;
});

export const ArtCanvas = ArtCanvasComponent;
export default ArtCanvasComponent;