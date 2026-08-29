export const sphereVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uNoiseStrength;
  uniform float uProgress;
  uniform vec3 uMoveDir;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vProgress;

  //
  // Simplex 3D noise
  //
  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vProgress = uProgress;

    float slowTime = uTime * 0.15;
    float noise = snoise(position * 1.8 + slowTime);
    float noise2 = snoise(position * 3.5 + slowTime * 0.7);
    float combined = noise * 0.6 + noise2 * 0.4;

    vDisplacement = combined;

    // Liquid deformation: stretch along local Z (aligned with movement via lookAt)
    vec3 deformed = position;
    float stretch = dot(vec3(0.0, 0.0, 1.0), normalize(position));
    float liquidBulge = max(0.0, stretch) * 0.25;
    float liquidSqueeze = 1.0 - max(0.0, -stretch) * 0.15;
    deformed.x *= liquidSqueeze;
    deformed.y *= liquidSqueeze;
    deformed.z += liquidBulge;
    deformed += normal * combined * uNoiseStrength;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(deformed, 1.0);
  }
`;

export const sphereFragmentShader = /* glsl */ `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uProgress;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vProgress;

  void main() {
    float slowTime = uTime * 0.15;

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

    float pattern = vDisplacement * 0.5 + 0.5;
    pattern = smoothstep(0.2, 0.8, pattern);

    // Color lerps along trajectory based on progress
    vec3 color;
    if (vProgress < 0.5) {
      float u = vProgress * 2.0;
      color = mix(uColor1, uColor2, u);
    } else {
      float u = (vProgress - 0.5) * 2.0;
      color = mix(uColor2, uColor3, u);
    }

    // Blend with displacement pattern for surface variation
    vec3 patternColor = mix(uColor1, uColor2, pattern);
    patternColor = mix(patternColor, uColor3, fresnel * 0.7);
    color = mix(color, patternColor, 0.4);

    float edge = pow(fresnel, 1.5);
    color += uColor3 * edge * 0.5;

    // Inner glow pulse
    float pulse = sin(slowTime * 2.0) * 0.08 + 0.92;
    color *= pulse;

    // Bright core
    float core = 1.0 - fresnel;
    color += vec3(0.15, 0.12, 0.2) * core * 0.3;

    float alpha = mix(0.8, 0.98, 1.0 - fresnel) * uOpacity;

    gl_FragColor = vec4(color, alpha);
  }
`;
