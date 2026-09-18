import { useEffect, useRef } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, Group, OrthographicCamera, Points, PointsMaterial, Scene, WebGLRenderer } from 'three';

/** Procedural geometry is available before the actual model downloads. */
export function BuildingPointCloud() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ alpha: true, antialias: true }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);
    const scene = new Scene();
    const group = new Group();
    scene.add(group);
    const camera = new OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
    camera.position.set(17, 13, 20);
    camera.lookAt(0, 4, 0);
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new Color();
    const low = new Color('#5579f5');
    const middle = new Color('#19c9bd');
    const high = new Color('#e1db72');
    const addPoint = (x: number, y: number, z: number) => {
      positions.push(x, y, z);
      const h = Math.min(y / 10, 1);
      color.copy(h < 0.6 ? low : middle).lerp(h < 0.6 ? middle : high, h < 0.6 ? h / 0.6 : (h - 0.6) / 0.4);
      colors.push(color.r, color.g, color.b);
    };
    const box = (cx: number, cz: number, width: number, depth: number, bottom: number, top: number) => {
      const nx = Math.ceil(width / 0.13), nz = Math.ceil(depth / 0.13), ny = Math.ceil((top - bottom) / 0.13);
      for (let iy = 0; iy <= ny; iy++) {
        const y = bottom + (top - bottom) * iy / ny;
        for (let ix = 0; ix <= nx; ix++) {
          const x = cx - width / 2 + width * ix / nx;
          addPoint(x, y, cz - depth / 2);
          addPoint(x, y, cz + depth / 2);
        }
        for (let iz = 1; iz < nz; iz++) {
          const z = cz - depth / 2 + depth * iz / nz;
          addPoint(cx - width / 2, y, z);
          addPoint(cx + width / 2, y, z);
        }
      }
      for (let ix = 0; ix <= nx; ix++) {
        for (let iz = 0; iz <= nz; iz++) addPoint(cx - width / 2 + width * ix / nx, top, cz - depth / 2 + depth * iz / nz);
      }
    };
    box(0, 0, 8, 5.6, 0, 0.65);
    box(-1.4, 0, 4.4, 3.8, 0.7, 9.4);
    box(2.15, 0.35, 2.4, 3.1, 0.7, 5.6);
    box(-1.4, 0, 3.2, 2.6, 9.4, 9.85);
    box(-1.7, 0.15, 1.3, 1.2, 9.85, 10.2);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const colorAttribute = new Float32BufferAttribute(colors, 3);
    geometry.setAttribute('color', colorAttribute);
    const material = new PointsMaterial({ size: 1.65, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85 });
    group.add(new Points(geometry, material));
    const ground: number[] = [];
    const groundColors: number[] = [];
    for (let x = -34; x <= 34; x += 0.42) {
      for (let z = -42; z <= 24; z += 0.42) {
        ground.push(x, -0.15, z);
        groundColors.push(0.24, 0.31, 0.4);
      }
    }
    const groundGeometry = new BufferGeometry();
    groundGeometry.setAttribute('position', new Float32BufferAttribute(ground, 3));
    const groundColorAttribute = new Float32BufferAttribute(groundColors, 3);
    groundGeometry.setAttribute('color', groundColorAttribute);
    const groundMaterial = new PointsMaterial({ size: 1.15, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false });
    group.add(new Points(groundGeometry, groundMaterial));
    const ambientPositions: number[] = [];
    const ambientColors: number[] = [];
    for (let x = -24; x <= 24; x += 0.55) {
      for (let y = -10; y <= 18; y += 0.55) {
        ambientPositions.push(x, y, -7);
        ambientColors.push(0.32, 0.39, 0.48);
      }
    }
    const ambientGeometry = new BufferGeometry();
    ambientGeometry.setAttribute('position', new Float32BufferAttribute(ambientPositions, 3));
    const ambientColorAttribute = new Float32BufferAttribute(ambientColors, 3);
    ambientGeometry.setAttribute('color', ambientColorAttribute);
    const ambientMaterial = new PointsMaterial({ size: 1.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
    group.add(new Points(ambientGeometry, ambientMaterial));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, elapsed = 0, previous = 0;
    const render = (time: number) => {
      elapsed += previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      group.rotation.y = motion.matches ? 0 : Math.sin(elapsed * 0.2) * 0.12;
      for (let i = 0; i < positions.length / 3; i++) {
        const y = positions[i * 3 + 1];
        const floor = Math.abs(y % 0.87) < 0.1 ? 1 : 0.72;
        const wave = motion.matches ? 0.82 : 0.82 + 0.18 * ((Math.sin(y * 0.8 - elapsed * 0.7) + 1) / 2);
        const brightness = floor * wave;
        colorAttribute.setXYZ(i, colors[i * 3] * brightness, colors[i * 3 + 1] * brightness, colors[i * 3 + 2] * brightness);
      }
      colorAttribute.needsUpdate = true;
      for (let i = 0; i < ambientPositions.length / 3; i++) {
        const x = ambientPositions[i * 3];
        const y = ambientPositions[i * 3 + 1];
        const wave = motion.matches ? 0.7 : 0.7 + 0.3 * ((Math.sin(x * 0.42 + y * 0.18 - elapsed * 0.7) + 1) / 2);
        ambientColorAttribute.setXYZ(i, ambientColors[i * 3] * wave, ambientColors[i * 3 + 1] * wave, ambientColors[i * 3 + 2] * wave);
      }
      ambientColorAttribute.needsUpdate = true;
      for (let i = 0; i < ground.length / 3; i++) {
        const x = ground[i * 3];
        const z = ground[i * 3 + 2];
        const wave = motion.matches ? 0.72 : 0.72 + 0.28 * ((Math.sin(x * 0.18 + z * 0.08 - elapsed * 0.45) + 1) / 2);
        groundColorAttribute.setXYZ(i, groundColors[i * 3] * wave, groundColors[i * 3 + 1] * wave, groundColors[i * 3 + 2] * wave);
      }
      groundColorAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      if (!motion.matches) frame = requestAnimationFrame(render);
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      const halfHeight = Math.max(7.5, 6.5 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      if (motion.matches) render(0);
    };
    const restart = () => { cancelAnimationFrame(frame); previous = 0; render(0); };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    motion.addEventListener('change', restart);
    resize();
    restart();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener('change', restart);
      geometry.dispose();
      material.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      ambientGeometry.dispose();
      ambientMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  return <div ref={hostRef} className="digital-twin-model-loader__field" aria-hidden="true" />;
}
