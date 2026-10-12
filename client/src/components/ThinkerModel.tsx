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

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

// Expose offscreen canvas for PixelDotGrid sampling
export let latestRenderCanvas: HTMLCanvasElement | null = null;

const GLB_URL = "/thinker.glb";

// ── COMPONENT ──────────────────────────────────────────────────────────────
interface ThinkerModelProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ThinkerModel({ className, style }: ThinkerModelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dark = useTheme().theme === "dark";
  // 모델이 뜨기 전·WebGL을 못 쓸 때는 포스터(로고)를 보여준다.
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // 장면 생성 effect가 채우고, 테마 effect가 값만 바꾼다(GLB를 다시 읽지 않는다).
  const rigRef = useRef<{
    renderer: THREE.WebGLRenderer;
    ambient: THREE.AmbientLight;
    rim: THREE.DirectionalLight;
    material: THREE.MeshStandardMaterial;
    invalidate: () => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── RENDERER ──
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      // WebGL 미지원·컨텍스트 생성 실패 → 정적 포스터로 대체
      console.warn("WebGL unavailable:", err);
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

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
    // 검정 배경 조명 v2: 스포트라이트 효과와 연동하여 동상을 크림/골드로 밝게 부각
    // Ambient: 적당한 기본 가시성
    const ambient = new THREE.AmbientLight(0xf0ebe0, 0.12);
    scene.add(ambient);

    // Key Light: 크림-화이트, 좌상단 앞 → 주 그림자
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 3.2);
    keyLight.position.set(-2.0, 5.0, 3.5);
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
    keyLight.shadow.radius = 3;
    scene.add(keyLight);

    // Fill Light: 크림 우측 필 → 그림자 없는 면도 밝게
    const fillLight = new THREE.DirectionalLight(0xf5ede0, 1.2);
    fillLight.position.set(3.5, 2.0, 2.5);
    scene.add(fillLight);

    // Rim Light: 골드 후면 하단 → 배경에서 동상을 선명하게 분리
    const rimLight = new THREE.DirectionalLight(0xffd580, 2.0);
    rimLight.position.set(0.5, -1.0, -3.5);
    scene.add(rimLight);

    // Top accent: 위에서 내리켜는 스포트라이트 효과 연동
    const topLight = new THREE.DirectionalLight(0xfff5e8, 1.6);
    topLight.position.set(0, 6, 2);
    scene.add(topLight);

    // Front fill: 정면 약한 크림 필 → 얼굴 부분 가시성
    const frontLight = new THREE.DirectionalLight(0xf0ebe0, 0.7);
    frontLight.position.set(0, 1.5, 5.0);
    scene.add(frontLight);

    // ── MATERIAL: MeshStandardMaterial for real 3D lighting ──
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x2a2520),       // 약간 더 밝은 베이스 (순수 검정 대신 어두운 브라운)
      metalness: 0.75,                          // 약간 낮춰서 디퓨즈 마스키로 더 밝게
      roughness: 0.32,                          // 높이면 디퓨즈 많아져 전체적으로 밝아짐
      envMapIntensity: 1.5,
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
    loader.setMeshoptDecoder(MeshoptDecoder);
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
        setReady(true);
        invalidate();
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
        setReady(true);
        invalidate();
      }
    );

    // ── ANIMATE ──
    // 탭이 숨겨지거나 화면 밖이면 루프를 멈춘다. 모션 감소 설정이면 연속 회전 없이 필요할 때 한 프레임만 그린다.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animId = 0;
    let lastTime = 0;
    let onScreen = true;
    const ROT_SPEED = 0.004;

    const draw = () => {
      renderer.render(scene, camera);

      // Copy to offscreen for PixelDotGrid
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(renderer.domElement, 0, 0);
      }
    };

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;

      if (modelLoaded) {
        rotY += ROT_SPEED * dt;
        group.rotation.y = rotY;
      }
      draw();
    };

    const stop = () => {
      cancelAnimationFrame(animId);
      animId = 0;
    };
    const sync = () => {
      const shouldRun = onScreen && !document.hidden && !reduceMotion.matches;
      if (shouldRun && !animId) {
        lastTime = performance.now();
        animId = requestAnimationFrame(animate);
      } else if (!shouldRun) {
        stop();
        if (reduceMotion.matches) invalidate();
      }
    };
    // 정지 상태(모션 감소 등)에서 장면이 바뀌면 한 프레임만 다시 그린다.
    let pending = 0;
    function invalidate() {
      if (animId || pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        draw();
      });
    }

    rigRef.current = { renderer, ambient, rim: rimLight, material, invalidate };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(container);
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener("change", sync);
    sync();

    // ── RESIZE ──
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      offscreen.width = nw;
      offscreen.height = nh;
      invalidate();
    };
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      cancelAnimationFrame(pending);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduceMotion.removeEventListener("change", sync);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      latestRenderCanvas = null;
      rigRef.current = null;
    };
  }, []);

  // 테마: 다크 = 어두운 배경에 림라이트로 분리, 라이트 = 크림 배경 위에서 윤곽이 읽히도록 앰비언트를 올리고 노출을 낮춘다.
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    rig.renderer.toneMappingExposure = dark ? 1.35 : 1.0;
    rig.ambient.intensity = dark ? 0.12 : 0.55;
    rig.rim.color.set(dark ? 0xffd580 : 0xb98a3a);
    rig.rim.intensity = dark ? 2.0 : 1.2;
    rig.material.color.set(dark ? 0x2a2520 : 0x3a332a);
    rig.invalidate();
  }, [dark]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {/* 포스터: 모델이 뜨기 전·WebGL 실패 시 보이고, 로드되면 서서히 사라진다. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          opacity: ready && !failed ? 0 : 1,
          transition: "opacity 600ms ease",
          background: "radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--l-fg) 10%, transparent), transparent 65%)",
        }}
      >
        <img src="/logo.png" alt="" className="logo-mark" draggable={false} style={{ width: "28%", maxWidth: 160, opacity: 0.35 }} />
      </div>
    </div>
  );
}
