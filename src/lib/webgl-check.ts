let cached: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');

    cached = gl !== null;

    if (gl && 'getExtension' in gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }

    return cached;
  } catch {
    cached = false;
    return false;
  }
}
