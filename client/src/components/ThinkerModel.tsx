/*
 * ThinkerModel.tsx — Three.js 3D 조각상 (Matcap 재질, Y축 회전)
 *
 * 유니콘 스튜디오 설정값:
 * - Model: venus_demilo, Scale: 186.5
 * - Material: Matcap, Matcap value: 50, Rotation: 212
 * - Animation: Speed 50, Axis Y:43
 * - Position: X:52.1 Y:116 Z:-58
 * - Rotation: X:180 Y:179 Z:0
 * - Interactivity: Position:0, Rotation:0, Light:22, Momentum:100
 *
 * 구현: Three.js + LatheGeometry로 조각상 형태 + Matcap 재질
 * 오프스크린 렌더링 → PixelDotGrid에 픽셀 데이터 공유
 */
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface ThinkerModelProps {
  className?: string;
  mouseX?: number; // 0-1
  mouseY?: number; // 0-1
}

// Shared offscreen render target for PixelDotGrid sampling
export let latestRenderCanvas: HTMLCanvasElement | null = null;

export default function ThinkerModel({ className, mouseX = 0.5, mouseY = 0.5 }: ThinkerModelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: mouseX, y: mouseY });
  const animRef = useRef<number>(0);

  useEffect(() => {
    mouseRef.current = { x: mouseX, y: mouseY };
  }, [mouseX, mouseY]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 500;
    const H = mount.clientHeight || 700;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.8, 5.5);
    camera.lookAt(0, 0.5, 0);

    // Renderer — transparent background
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Offscreen canvas for pixel sampling — same aspect ratio as main renderer
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    latestRenderCanvas = offscreen;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true })!;

    // Matcap texture — dark glossy black
    const matcapTex = createMatcapTexture();
    const mat = new THREE.MeshMatcapMaterial({
      matcap: matcapTex,
      side: THREE.FrontSide,
    });

    const group = new THREE.Group();

    // ── Venus de Milo / Classical Bust shape using LatheGeometry ──
    // Profile points define the silhouette when rotated around Y axis

    // HEAD — slightly elongated sphere
    const headPoints = [];
    for (let i = 0; i <= 16; i++) {
      const angle = (i / 16) * Math.PI;
      const x = Math.sin(angle) * 0.27 * (1 + Math.sin(angle * 0.5) * 0.15);
      const y = Math.cos(angle) * 0.31;
      headPoints.push(new THREE.Vector2(Math.max(0.001, x), y));
    }
    const headGeo = new THREE.LatheGeometry(headPoints, 32);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0.04, 2.18, 0);
    group.add(head);

    // NECK
    const neckPoints = [
      new THREE.Vector2(0.13, 0),
      new THREE.Vector2(0.15, -0.12),
      new THREE.Vector2(0.17, -0.28),
      new THREE.Vector2(0.19, -0.38),
    ];
    const neckGeo = new THREE.LatheGeometry(neckPoints, 24);
    const neck = new THREE.Mesh(neckGeo, mat);
    neck.position.set(0.02, 1.88, 0);
    group.add(neck);

    // UPPER TORSO — wider at shoulders, narrower at waist
    const torsoPoints = [
      new THREE.Vector2(0.19, 0),
      new THREE.Vector2(0.38, -0.08),
      new THREE.Vector2(0.52, -0.22),
      new THREE.Vector2(0.55, -0.42),
      new THREE.Vector2(0.54, -0.62),
      new THREE.Vector2(0.50, -0.82),
      new THREE.Vector2(0.44, -1.02),
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
    const torso = new THREE.Mesh(torsoGeo, mat);
    torso.position.set(0, 1.5, 0);
    group.add(torso);

    // LOWER TORSO / HIPS — wider
    const hipsPoints = [
      new THREE.Vector2(0.44, 0),
      new THREE.Vector2(0.50, -0.15),
      new THREE.Vector2(0.54, -0.32),
      new THREE.Vector2(0.52, -0.52),
      new THREE.Vector2(0.48, -0.68),
    ];
    const hipsGeo = new THREE.LatheGeometry(hipsPoints, 32);
    const hips = new THREE.Mesh(hipsGeo, mat);
    hips.position.set(0, 0.48, 0);
    group.add(hips);

    // DRAPED LOWER BODY — slightly flared
    const drapePoints = [
      new THREE.Vector2(0.48, 0),
      new THREE.Vector2(0.52, -0.18),
      new THREE.Vector2(0.55, -0.38),
      new THREE.Vector2(0.57, -0.58),
      new THREE.Vector2(0.58, -0.78),
      new THREE.Vector2(0.60, -0.98),
    ];
    const drapeGeo = new THREE.LatheGeometry(drapePoints, 32);
    const drape = new THREE.Mesh(drapeGeo, mat);
    drape.position.set(0, -0.2, 0);
    group.add(drape);

    // BASE / PEDESTAL
    const basePoints = [
      new THREE.Vector2(0.60, 0),
      new THREE.Vector2(0.63, -0.12),
      new THREE.Vector2(0.65, -0.28),
      new THREE.Vector2(0.64, -0.44),
      new THREE.Vector2(0.62, -0.55),
    ];
    const baseGeo = new THREE.LatheGeometry(basePoints, 32);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.set(0, -1.18, 0);
    group.add(base);

    // LEFT SHOULDER STUMP (broken arm — Venus de Milo)
    const stumpGeo = new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const stump = new THREE.Mesh(stumpGeo, mat);
    stump.position.set(-0.52, 1.22, 0.08);
    stump.rotation.z = -0.3;
    group.add(stump);

    // RIGHT SHOULDER STUMP
    const stump2Geo = new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const stump2 = new THREE.Mesh(stump2Geo, mat);
    stump2.position.set(0.50, 1.28, 0.05);
    stump2.rotation.z = 0.25;
    group.add(stump2);

    // Scale and position to fill viewport
    group.scale.set(0.68, 0.68, 0.68);
    group.position.set(0.08, -0.2, 0);
    // Slight initial Y rotation (Rotation Y:179 → nearly facing back)
    group.rotation.set(0, Math.PI * 0.95, 0);

    scene.add(group);

    // Lights for Matcap
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);

    // Animation
    let startTime = performance.now();

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      // Y-axis rotation: Speed 50 → ~0.314 rad/s
      group.rotation.y = Math.PI * 0.95 + elapsed * 0.314;

      // Mouse parallax
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      camera.position.x += ((mx - 0.5) * 0.5 - camera.position.x) * 0.04;
      camera.position.y += (0.8 + (my - 0.5) * -0.3 - camera.position.y) * 0.04;
      camera.lookAt(0, 0.5, 0);

      renderer.render(scene, camera);

      // Copy to offscreen for pixel sampling (same size as renderer)
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.drawImage(renderer.domElement, 0, 0, offscreen.width, offscreen.height);
    };
    animate();

    // Resize handler
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w && h) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        offscreen.width = w;
        offscreen.height = h;
      }
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      latestRenderCanvas = null;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        background: 'transparent',
        overflow: 'visible',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
}

// Dark glossy Matcap — matches Unicorn Studio Matcap:50, Rotation:212
function createMatcapTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base: very dark charcoal
  ctx.fillStyle = '#080806';
  ctx.fillRect(0, 0, size, size);

  // Primary specular highlight — Rotation:212° → lower-right quadrant
  const angle = (212 * Math.PI) / 180;
  const hx = size * 0.5 + Math.cos(angle) * size * 0.30;
  const hy = size * 0.5 + Math.sin(angle) * size * 0.30;

  const grad1 = ctx.createRadialGradient(hx, hy, 0, hx, hy, size * 0.28);
  grad1.addColorStop(0, 'rgba(220, 215, 195, 0.9)');
  grad1.addColorStop(0.15, 'rgba(150, 145, 125, 0.7)');
  grad1.addColorStop(0.4, 'rgba(60, 58, 48, 0.4)');
  grad1.addColorStop(0.8, 'rgba(15, 14, 10, 0.1)');
  grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, size, size);

  // Secondary soft highlight — top-left (environment reflection)
  const grad2 = ctx.createRadialGradient(
    size * 0.22, size * 0.22, 0,
    size * 0.22, size * 0.22, size * 0.22
  );
  grad2.addColorStop(0, 'rgba(80, 78, 65, 0.5)');
  grad2.addColorStop(0.5, 'rgba(30, 28, 22, 0.2)');
  grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, size, size);

  // Rim light — bottom edge
  const grad3 = ctx.createRadialGradient(
    size * 0.5, size * 0.9, 0,
    size * 0.5, size * 0.9, size * 0.18
  );
  grad3.addColorStop(0, 'rgba(45, 43, 35, 0.35)');
  grad3.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad3;
  ctx.fillRect(0, 0, size, size);

  // Clip to circle
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const cx = size / 2, cy = size / 2, r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > r * r) {
        data[(y * size + x) * 4 + 3] = 0;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
