import * as THREE from 'three';
import type { MaterialMode } from '../domain/types';
import type { PaletteKey } from '../lib/math';
import { getPalette } from '../lib/math';
import { registry } from './registry';
import type { IMaterialEngine } from './plugin';

export interface SceneConfig {
  seed: number;
  palette: PaletteKey;
  material: MaterialMode;
  effect: string;
  customColors?: [string, string, string];
}

function resolveColors(config: SceneConfig) {
  const base = getPalette(config.palette);
  return config.customColors
    ? { ...base, start: config.customColors[0], glow: config.customColors[1], end: config.customColors[2] }
    : base;
}

function createMaterial(config: SceneConfig, overrides: Partial<THREE.MeshPhysicalMaterialParameters> = {}): THREE.MeshPhysicalMaterial {
  const colors = resolveColors(config);
  const engine = registry.get(config.material) as IMaterialEngine | undefined;
  const props = engine?.threeMaterialProps ?? {};

  const base: THREE.MeshPhysicalMaterialParameters = {
    color: new THREE.Color((props.color as string) ?? colors.start),
    emissive: new THREE.Color(colors.start),
    emissiveIntensity: (props.emissiveIntensity as number) ?? 0.15,
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

export function buildLinesGeometry(
  curve: THREE.CatmullRomCurve3,
  config: SceneConfig,
): THREE.Mesh {
  const colors = resolveColors(config);
  const radius = 0.008;
  const geometry = new THREE.TubeGeometry(curve, Math.max(600, 800), radius, 4, false);
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colors.start),
    emissive: new THREE.Color(colors.start),
    emissiveIntensity: 0.15,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, mat);
}

export function buildMeshGeometry(
  curve: THREE.CatmullRomCurve3,
  pointCount: number,
  config: SceneConfig,
): THREE.Group {
  const colors = resolveColors(config);
  const radius = config.material === 'gem' ? 0.11 : config.material === 'crystal' ? 0.09 : 0.07;
  const geometry = new THREE.TubeGeometry(curve, Math.max(360, pointCount * 4), radius, 6, false);
  const mat = createMaterial(config, { wireframe: false });
  const mesh = new THREE.Mesh(geometry, mat);

  const wireGeo = new THREE.TubeGeometry(curve, Math.max(120, pointCount), radius * 1.01, 6, false);
  const wireMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colors.glow),
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });
  const wire = new THREE.Mesh(wireGeo, wireMat);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(wire);
  return group;
}

export function buildRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  config: SceneConfig,
): THREE.Mesh {
  const colors = resolveColors(config);
  const segments = 300;
  const width = 0.18;
  const points = curve.getSpacedPoints(segments);
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    const next = points[Math.min(i + 1, points.length - 1)];
    const prev = points[Math.max(i - 1, 0)];
    tangents.push(next.clone().sub(prev).normalize());
  }

  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = tangents[i];
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(t, up).normalize();
    if (right.lengthSq() < 0.01) right.set(1, 0, 0);
    const twist = Math.sin((i / points.length) * Math.PI * 6) * 0.4;
    const cosT = Math.cos(twist);
    const sinT = Math.sin(twist);
    const offsetA = right.clone().multiplyScalar(-width / 2);
    const offsetB = right.clone().multiplyScalar(width / 2);
    const rotatedA = new THREE.Vector3(
      offsetA.x * cosT - offsetA.y * sinT,
      offsetA.x * sinT + offsetA.y * cosT,
      0,
    );
    const rotatedB = new THREE.Vector3(
      offsetB.x * cosT - offsetB.y * sinT,
      offsetB.x * sinT + offsetB.y * cosT,
      0,
    );
    const pA = p.clone().add(rotatedA);
    const pB = p.clone().add(rotatedB);
    vertices.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
    const n = new THREE.Vector3().crossVectors(t, rotatedB.clone().sub(rotatedA)).normalize();
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z);
    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mat = createMaterial(config, {
    side: THREE.DoubleSide,
    color: new THREE.Color(colors.start),
    emissive: new THREE.Color(colors.end),
    emissiveIntensity: 0.15,
    sheen: 1.0,
    sheenColor: new THREE.Color(colors.glow),
    sheenRoughness: 0.3,
  });
  return new THREE.Mesh(geometry, mat);
}

export function buildTorusKnotGeometry(
  curve: THREE.CatmullRomCurve3,
  config: SceneConfig,
): THREE.Mesh {
  const colors = resolveColors(config);
  const tubeRadius = config.material === 'gem' ? 0.06 : 0.04;
  const geometry = new THREE.TubeGeometry(curve, Math.max(500, 600), tubeRadius, 12, false);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const angle = Math.atan2(y, x);
    const r = Math.sqrt(x * x + y * y);
    const knotR = 0.08 * Math.sin(angle * 3 + z * 4);
    const knotZ = 0.08 * Math.cos(angle * 2 + z * 3);
    const rx = r + knotR * Math.cos(angle);
    const ry = r + knotR * Math.sin(angle);
    posAttr.setXYZ(i, rx * Math.cos(angle), ry * Math.sin(angle), z + knotZ);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  const mat = createMaterial(config, {
    side: THREE.DoubleSide,
    color: new THREE.Color(colors.start),
    emissive: new THREE.Color(colors.start),
    emissiveIntensity: 0.15,
    iridescence: 0.8,
    iridescenceIOR: 1.5,
    sheen: 0.6,
    sheenColor: new THREE.Color(colors.glow),
  });

  return new THREE.Mesh(geometry, mat);
}

export function buildMobiusGeometry(
  curve: THREE.CatmullRomCurve3,
  config: SceneConfig,
): THREE.Mesh {
  const colors = resolveColors(config);
  const shape = new THREE.Shape();
  shape.moveTo(-0.12, -0.015);
  shape.lineTo(0.12, -0.015);
  shape.lineTo(0.12, 0.015);
  shape.lineTo(-0.12, 0.015);
  shape.closePath();

  const extrudeSettings = { steps: 300, bevelEnabled: false, extrudePath: curve };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const t = Math.min(1, Math.max(0, i / 300));
    const twist = t * Math.PI;
    const cosT = Math.cos(twist);
    const sinT = Math.sin(twist);
    const newY = y * cosT - z * sinT;
    const newZ = y * sinT + z * cosT;
    posAttr.setXYZ(i, x, newY, newZ);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  const mat = createMaterial(config, {
    side: THREE.DoubleSide,
    color: new THREE.Color(colors.start),
    emissive: new THREE.Color(colors.end),
    sheen: 1.0,
    sheenColor: new THREE.Color(colors.glow),
    sheenRoughness: 0.2,
    iridescence: 1.0,
    iridescenceIOR: 2.0,
  });
  return new THREE.Mesh(geometry, mat);
}

export function buildHelixGeometry(
  curve: THREE.CatmullRomCurve3,
  config: SceneConfig,
): THREE.Mesh {
  const colors = resolveColors(config);
  const tubeRadius = config.material === 'gem' ? 0.07 : 0.04;
  const geometry = new THREE.TubeGeometry(curve, 400, tubeRadius, 12, false);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const angle = Math.atan2(y, x);
    const helixPhase = z * 4 + angle;
    const helixR = 0.10 * Math.sin(helixPhase);
    const helixZ = 0.10 * Math.cos(helixPhase);
    posAttr.setXYZ(i, x + helixR * Math.cos(angle + Math.PI / 2), y + helixR * Math.sin(angle + Math.PI / 2), z + helixZ);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  const mat = createMaterial(config, {
    color: new THREE.Color(colors.start),
    emissive: new THREE.Color(colors.end),
    emissiveIntensity: 0.15,
    iridescence: 0.9,
    iridescenceIOR: 1.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  });
  return new THREE.Mesh(geometry, mat);
}

export function buildNetworkStructure(
  points: Array<{ x: number; y: number; z: number }>,
  config: SceneConfig,
  maxDistance = 2,
): THREE.Group {
  const group = new THREE.Group();
  const colors = resolveColors(config);
  const nodeMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colors.accent),
    emissive: new THREE.Color(colors.glow),
    emissiveIntensity: 0.15,
    roughness: 0.15,
    metalness: 0.4,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
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
