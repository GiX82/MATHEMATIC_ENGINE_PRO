import * as THREE from 'three';
import type { MaterialMode } from '../domain/types';
import type { PaletteKey } from '../lib/math';
import { getPalette } from '../lib/math';
import { mulberry32 } from './seed';
import { registry } from './registry';
import type { IMaterialEngine } from './plugin';

export interface SceneConfig {
  seed: number;
  palette: PaletteKey;
  material: MaterialMode;
  effect: string;
}

function createMaterial(config: SceneConfig, overrides: Partial<THREE.MeshPhysicalMaterialParameters> = {}): THREE.MeshPhysicalMaterial {
  const colors = getPalette(config.palette);
  const engine = registry.get(config.material) as IMaterialEngine | undefined;
  const props = engine?.threeMaterialProps ?? {};

  const base: THREE.MeshPhysicalMaterialParameters = {
    color: new THREE.Color((props.color as string) ?? colors.start),
    emissive: new THREE.Color(colors.end),
    emissiveIntensity: (props.emissiveIntensity as number) ?? 0.9,
    roughness: (props.roughness as number) ?? 0.15,
    metalness: (props.metalness as number) ?? 0.35,
    clearcoat: (props.clearcoat as number) ?? 0.7,
    clearcoatRoughness: (props.clearcoatRoughness as number) ?? 0.05,
    transparent: (props.transparent as boolean) ?? false,
    opacity: (props.opacity as number) ?? 0.82,
    transmission: (props.transmission as number) ?? 0,
    ior: (props.ior as number) ?? 1.5,
  };

  return new THREE.MeshPhysicalMaterial({ ...base, ...overrides });
}

export function buildTubeGeometry(
  curve: THREE.CatmullRomCurve3,
  pointCount: number,
  config: SceneConfig,
): THREE.Mesh {
  const radius = config.material === 'gem' ? 0.11 : config.material === 'crystal' ? 0.09 : config.material === 'metallic' ? 0.08 : 0.06;
  const geometry = new THREE.TubeGeometry(curve, Math.max(360, pointCount * 4), radius, 16, false);
  return new THREE.Mesh(geometry, createMaterial(config));
}

export function buildRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  config: SceneConfig,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, 0);
  shape.quadraticCurveTo(0, 0.08, 0.15, 0);
  shape.quadraticCurveTo(0, -0.08, -0.15, 0);

  const extrudeSettings = { steps: 200, bevelEnabled: false, extrudePath: curve };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  return new THREE.Mesh(geometry, createMaterial(config, { side: THREE.DoubleSide }));
}

export function buildTorusGeometry(
  config: SceneConfig,
  radius = 2,
  tube = 0.3,
): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radius, tube, 32, 100);
  return new THREE.Mesh(geometry, createMaterial(config));
}

export function buildCylinderGeometry(
  config: SceneConfig,
  radius = 0.15,
  height = 4,
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
  return new THREE.Mesh(geometry, createMaterial(config));
}

export function buildConeGeometry(
  config: SceneConfig,
  radius = 0.3,
  height = 2,
): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(radius, height, 32);
  return new THREE.Mesh(geometry, createMaterial(config));
}

export function buildSphereGeometry(
  config: SceneConfig,
  radius = 0.14,
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 24, 24);
  return new THREE.Mesh(geometry, createMaterial(config));
}

export function buildParticleField(
  points: Array<{ x: number; y: number; z: number; value: number }>,
  config: SceneConfig,
  maxValue: number,
  sizeMultiplier = 1,
): THREE.Points {
  const colors = getPalette(config.palette);
  const positions: number[] = [];
  const colorArr: number[] = [];

  points.forEach((point, index) => {
    const depth = Math.sin((index / Math.max(1, points.length - 1)) * Math.PI * 2) * 1.6;
    const energy = point.value / Math.max(1, maxValue);
    const radiusBoost = 1 + energy * 1.6;
    positions.push(point.x * 2.7 * radiusBoost, point.y * 2.7 * radiusBoost, depth);
    const color = new THREE.Color(colors.start).lerp(new THREE.Color(colors.end), index / Math.max(1, points.length - 1));
    colorArr.push(color.r, color.g, color.b);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));

  const material = new THREE.PointsMaterial({
    size: 0.07 * sizeMultiplier,
    vertexColors: true,
    transparent: true,
    opacity: config.effect === 'glow' ? 0.9 : 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

export function buildStarfield(
  seed: number,
  config: SceneConfig,
  count = 1800,
): THREE.Points {
  const colors = getPalette(config.palette);
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (rand() - 0.5) * 18;
    positions[i + 1] = (rand() - 0.5) * 18;
    positions[i + 2] = (rand() - 0.5) * 16 - 4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(colors.glow),
    size: 0.035,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

export function buildTracer(
  config: SceneConfig,
): THREE.Mesh {
  const colors = getPalette(config.palette);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.accent),
    emissive: new THREE.Color(colors.glow),
    emissiveIntensity: 1.4,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), material);
}

export function buildBranchingSystem(
  config: SceneConfig,
  depth = 4,
  length = 1.5,
  angle = Math.PI / 6,
): THREE.Group {
  const group = new THREE.Group();
  const material = createMaterial(config, { emissiveIntensity: 0.5 });

  function branch(parent: THREE.Object3D, len: number, dep: number) {
    if (dep <= 0 || len < 0.1) return;

    const geo = new THREE.CylinderGeometry(0.02 * dep, 0.03 * dep, len, 8);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.y = len / 2;
    parent.add(mesh);

    const left = new THREE.Group();
    left.position.y = len;
    left.rotation.z = angle;
    parent.add(left);
    branch(left, len * 0.7, dep - 1);

    const right = new THREE.Group();
    right.position.y = len;
    right.rotation.z = -angle;
    parent.add(right);
    branch(right, len * 0.7, dep - 1);
  }

  branch(group, length, depth);
  return group;
}

export function buildNetworkStructure(
  points: Array<{ x: number; y: number; z: number }>,
  config: SceneConfig,
  maxDistance = 2,
): THREE.Group {
  const group = new THREE.Group();
  const colors = getPalette(config.palette);
  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.accent),
    emissive: new THREE.Color(colors.glow),
    emissiveIntensity: 0.8,
  });
  const lineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(colors.start),
    transparent: true,
    opacity: 0.3,
  });

  const nodeGeo = new THREE.SphereGeometry(0.06, 12, 12);
  for (const p of points) {
    const node = new THREE.Mesh(nodeGeo, nodeMaterial);
    node.position.set(p.x * 2.5, p.y * 2.5, (p.z ?? 0) * 2.5);
    group.add(node);
  }

  const linePositions: number[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dz = (points[i].z ?? 0) - (points[j].z ?? 0);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < maxDistance) {
        linePositions.push(
          points[i].x * 2.5, points[i].y * 2.5, (points[i].z ?? 0) * 2.5,
          points[j].x * 2.5, points[j].y * 2.5, (points[j].z ?? 0) * 2.5,
        );
      }
    }
  }

  if (linePositions.length > 0) {
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    group.add(new THREE.LineSegments(lineGeo, lineMaterial));
  }

  return group;
}

export function buildTrailSystem(
  curve: THREE.CatmullRomCurve3,
  config: SceneConfig,
  trailLength = 100,
): THREE.Line {
  const colors = getPalette(config.palette);
  const points = curve.getPoints(trailLength);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(colors.start),
    transparent: true,
    opacity: 0.6,
    linewidth: 2,
  });
  return new THREE.Line(geometry, material);
}
