/**
 * ThinkerModel — Unicorn Studio 설정값 재현
 *
 * Model: The Thinker (Meshy AI GLB)
 * Material: Matcap (검정 광택)
 * Animation: Y축 회전 Speed 50, Axis Y:43
 * Glyph Dither: Waffle preset, Scale 69, Gamma 44, Color mode Texture
 * Background: #C8C8B6
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Expose offscreen canvas for PixelDotGrid sampling
export let latestRenderCanvas: HTMLCanvasElement | null = null;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const GLB_URL = "/template-storage/thinker_meshy_7020fc79.glb";
const TEXTURE_URL = "/template-storage/thinker_texture_a4910afa.png";

// Glyph Dither Waffle settings (Unicorn Studio values)
const GLYPH_SCALE = 69;   // Scale 69 → cell size in px (relative to 1000px width)
const GLYPH_GAMMA = 44;   // Gamma 44 → contrast/threshold
const GLYPH_MIX = 1.0;    // Mix 100

// ── MATCAP TEXTURE (dark glossy black) ─────────────────────────────────────
function createMatcapTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Unicorn Studio Matcap 50: dark glossy black with strong white highlight
  // Reference: venus_demilo appears as very dark/black with bright specular
  
  // Base: very dark
  ctx.fillStyle = "#050505";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Main specular (top-left, large bright white)
  const spec = ctx.createRadialGradient(size * 0.32, size * 0.28, 0, size * 0.32, size * 0.28, size * 0.5);
  spec.addColorStop(0, "rgba(255,255,255,1.0)");
  spec.addColorStop(0.15, "rgba(240,245,255,0.95)");
  spec.addColorStop(0.35, "rgba(180,190,220,0.6)");
  spec.addColorStop(0.6, "rgba(80,100,140,0.2)");
  spec.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Secondary specular (center-right, subtle)
  const spec2 = ctx.createRadialGradient(size * 0.65, size * 0.45, 0, size * 0.65, size * 0.45, size * 0.25);
  spec2.addColorStop(0, "rgba(160,170,200,0.5)");
  spec2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spec2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Rim light (bottom-right, blue-ish)
  const rim = ctx.createRadialGradient(size * 0.78, size * 0.82, 0, size * 0.78, size * 0.82, size * 0.28);
  rim.addColorStop(0, "rgba(60,80,160,0.45)");
  rim.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
interface ThinkerModelProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ThinkerModel({ className, style }: ThinkerModelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;

    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    // Offscreen canvas for PixelDotGrid sampling
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    latestRenderCanvas = offscreen;

    // ── SCENE ──
    const scene = new THREE.Scene();

    // ── CAMERA ──
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.01, 100);
    camera.position.set(0, 0.2, 4.5);
    camera.lookAt(0, 0.2, 0);

    // ── LIGHTS ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, 3, 3);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8899cc, 0.4);
    fillLight.position.set(-2, 1, 2);
    scene.add(fillLight);

    // ── MATCAP ──
    const matcapTex = createMatcapTexture();
    const matcapMat = new THREE.MeshMatcapMaterial({
      matcap: matcapTex,
      side: THREE.FrontSide,
    });

    // ── LOAD GLB ──
    const group = new THREE.Group();
    scene.add(group);

    // Rotation: Unicorn Studio Y:43 means ~43° offset, Speed 50
    // We'll rotate continuously on Y axis
    let rotY = 0;
    let modelLoaded = false;

    const loader = new GLTFLoader();
    loader.load(
      GLB_URL,
      (gltf) => {
        const model = gltf.scene;

        // Apply matcap to all meshes
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = matcapMat;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        });

        // Auto-scale and center
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.2 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        // Shift up slightly so base is near bottom
        model.position.y -= size.y * scale * 0.05;

        group.add(model);
        modelLoaded = true;
      },
      undefined,
      (err) => {
        console.error("GLB load error:", err);
        // Fallback: use LatheGeometry statue shape
        const points: THREE.Vector2[] = [];
        const profile = [
          [0.0, -1.0], [0.15, -0.95], [0.18, -0.7], [0.16, -0.5],
          [0.22, -0.3], [0.25, -0.1], [0.22, 0.1], [0.19, 0.3],
          [0.16, 0.5], [0.14, 0.65], [0.12, 0.75], [0.09, 0.85],
          [0.07, 0.92], [0.05, 0.98], [0.0, 1.0],
        ];
        for (const [x, y] of profile) points.push(new THREE.Vector2(x, y));
        const geo = new THREE.LatheGeometry(points, 32);
        const mesh = new THREE.Mesh(geo, matcapMat);
        mesh.scale.set(1, 1.5, 1);
        group.add(mesh);
        modelLoaded = true;
      }
    );

    // ── ANIMATE ──
    let animId: number;
    let lastTime = 0;

    // Unicorn Studio: Speed 50, Axis Y:43 → ~0.5 rad/s Y rotation
    const ROT_SPEED = 0.004; // radians per frame at 60fps

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 16.67, 3); // normalized to 60fps
      lastTime = time;

      if (modelLoaded) {
        rotY += ROT_SPEED * dt;
        group.rotation.y = rotY;
      }

      renderer.render(scene, camera);

      // Copy to offscreen for PixelDotGrid
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(renderer.domElement, 0, 0);
      }
    };
    animId = requestAnimationFrame(animate);

    // ── RESIZE ──
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      offscreen.width = nw;
      offscreen.height = nh;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      matcapTex.dispose();
      matcapMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      latestRenderCanvas = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    />
  );
}
