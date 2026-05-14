/**
 * ThinkerModel — 실제 3D 조각상 (Meshy AI GLB)
 *
 * 조명 설정:
 *   - Key Light: 강한 흰색 좌상단 (intensity 3.5)
 *   - Fill Light: 부드러운 청색 우측 (intensity 0.8)
 *   - Rim Light: 강한 황금색 후면 하단 (intensity 2.0)
 *   - Ambient: 매우 약한 (intensity 0.15)
 *   - Shadow: PCFSoftShadowMap
 *
 * Material: MeshStandardMaterial (metalness 0.9, roughness 0.15)
 *   → 실제 금속/대리석 느낌의 3D 입체감
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Expose offscreen canvas for PixelDotGrid sampling
export let latestRenderCanvas: HTMLCanvasElement | null = null;

const GLB_URL = "/template-storage/thinker_meshy_7020fc79.glb";

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

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
    // 검정 배경 조명: 크림/골드 튤으로 동상을 밝게 부각
    // Ambient: 매우 약한 크림색
    scene.add(new THREE.AmbientLight(0xf0ebe0, 0.08));

    // Key Light: 강한 크림-화이트, 좌상단 앞 → 주 그림자
    const keyLight = new THREE.DirectionalLight(0xf5f0e8, 4.2);
    keyLight.position.set(-2.5, 4.0, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.bias = -0.001;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    // Fill Light: 소프트 크림 우측, 강한 그림자 완화
    const fillLight = new THREE.DirectionalLight(0xf0e8d8, 0.9);
    fillLight.position.set(3.0, 1.0, 2.0);
    scene.add(fillLight);

    // Rim Light: 강한 골드 후면 하단 → 배경에서 동상을 분리
    const rimLight = new THREE.DirectionalLight(0xffd580, 2.8);
    rimLight.position.set(0.5, -1.5, -3.0);
    scene.add(rimLight);

    // Top accent: 약한 따뜻한 화이트 위에서
    const topLight = new THREE.DirectionalLight(0xfff8f0, 1.2);
    topLight.position.set(0, 5, 1);
    scene.add(topLight);

    // ── MATERIAL: MeshStandardMaterial for real 3D lighting ──
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x1a1a1a),       // Very dark base
      metalness: 0.85,                          // High metalness → strong reflections
      roughness: 0.18,                          // Low roughness → glossy surface
      envMapIntensity: 1.2,
    });

    // Simple environment map for reflections using a neutral grey scene
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const neutralEnvScene = new THREE.Scene();
    neutralEnvScene.background = new THREE.Color(0x303040);
    const envRT = pmremGenerator.fromScene(neutralEnvScene);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // ── LOAD GLB ──
    const group = new THREE.Group();
    scene.add(group);

    let rotY = 0;
    let modelLoaded = false;

    const loader = new GLTFLoader();
    loader.load(
      GLB_URL,
      (gltf) => {
        const model = gltf.scene;

        // Apply standard material to all meshes
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = material;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
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
        model.position.y -= size.y * scale * 0.05;

        group.add(model);
        modelLoaded = true;
      },
      undefined,
      (err) => {
        console.error("GLB load error:", err);
        // Fallback: LatheGeometry
        const points: THREE.Vector2[] = [];
        const profile = [
          [0.0, -1.0], [0.15, -0.95], [0.18, -0.7], [0.16, -0.5],
          [0.22, -0.3], [0.25, -0.1], [0.22, 0.1], [0.19, 0.3],
          [0.16, 0.5], [0.14, 0.65], [0.12, 0.75], [0.09, 0.85],
          [0.07, 0.92], [0.05, 0.98], [0.0, 1.0],
        ];
        for (const [x, y] of profile) points.push(new THREE.Vector2(x, y));
        const geo = new THREE.LatheGeometry(points, 32);
        const mesh = new THREE.Mesh(geo, material);
        mesh.scale.set(1, 1.5, 1);
        mesh.castShadow = true;
        group.add(mesh);
        modelLoaded = true;
      }
    );

    // ── ANIMATE ──
    let animId: number;
    let lastTime = 0;
    const ROT_SPEED = 0.004;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 16.67, 3);
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
      material.dispose();
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
