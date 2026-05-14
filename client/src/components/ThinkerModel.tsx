/*
 * ThinkerModel.tsx — 로댕 "생각하는 사람" 이미지 기반 3D + 글라스 타일 모자이크
 *
 * 구현 방식:
 * 1. Three.js PlaneGeometry에 로댕 이미지 텍스처 적용 (3D 공간에 배치)
 * 2. 이미지 위에 글라스 타일 격자 (InstancedMesh) 오버레이
 * 3. 회전 애니메이션: 이미지 플레인이 Y축 회전
 * 4. 회전 각도에 따라 타일들이 순차적으로 채워지고 사라지는 모자이크 효과
 *    - 회전 각도 → 각 타일의 "reveal progress" 계산
 *    - 타일 색상: 이미지 픽셀 색상 샘플링
 *    - 글라스 효과: 반투명 + 굴절 + 테두리 하이라이트
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Shared offscreen canvas for PixelDotGrid (legacy, kept for compatibility)
export let latestRenderCanvas: HTMLCanvasElement | null = null;

const RODIN_URL = '/template-storage/rodin_adee69a8.webp';

// Tile grid dimensions
const TILE_COLS = 32;
const TILE_ROWS = 42;
const TOTAL_TILES = TILE_COLS * TILE_ROWS;

interface ThinkerModelProps {
  className?: string;
  mouseX?: number;
  mouseY?: number;
}

export default function ThinkerModel({ className, mouseX = 0.5, mouseY = 0.5 }: ThinkerModelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: mouseX, y: mouseY });

  useEffect(() => {
    mouseRef.current = { x: mouseX, y: mouseY };
  }, [mouseX, mouseY]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 600;
    const H = mount.clientHeight || 800;

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    // ── SCENE & CAMERA ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 3.5);
    camera.lookAt(0, 0, 0);

    // ── OFFSCREEN CANVAS (for PixelDotGrid compatibility) ──
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    latestRenderCanvas = offscreen;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true })!;

    // ── LOAD RODIN IMAGE ──
    const textureLoader = new THREE.TextureLoader();
    const rodinTex = textureLoader.load(RODIN_URL);
    rodinTex.colorSpace = THREE.SRGBColorSpace;

    // Image aspect: ~0.75 (portrait)
    const IMG_ASPECT = 0.75;
    const planeH = 2.6;
    const planeW = planeH * IMG_ASPECT;

    // ── MAIN IMAGE PLANE ──
    const planeGeo = new THREE.PlaneGeometry(planeW, planeH);
    const planeMat = new THREE.MeshBasicMaterial({
      map: rodinTex,
      transparent: false,
      side: THREE.FrontSide,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.position.set(0, 0, 0);
    scene.add(planeMesh);

    // ── GLASS TILE GRID (InstancedMesh) ──
    // Each tile is a thin box with glass-like material
    const tileW = planeW / TILE_COLS;
    const tileH = planeH / TILE_ROWS;
    const tileDepth = 0.022;
    const tileGap = 0.008; // gap between tiles

    const tileGeo = new THREE.BoxGeometry(
      tileW - tileGap,
      tileH - tileGap,
      tileDepth
    );

    // Glass material: semi-transparent with strong edge highlights
    const tileMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.04,
      metalness: 0.0,
      transmission: 0.6,
      thickness: 0.2,
      ior: 1.5,
      reflectivity: 0.9,
      side: THREE.FrontSide,
    });

    // Add edge highlight geometry (thin border lines around each tile)
    // We use a secondary InstancedMesh with wireframe for the glass edge effect
    const edgeGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(tileW - tileGap, tileH - tileGap, tileDepth)
    );
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.5,
    });
    // Create instanced line segments for tile edges
    // Using a custom approach: each tile gets a thin wireframe box
    const wireGeo = new THREE.BoxGeometry(
      tileW - tileGap + 0.001,
      tileH - tileGap + 0.001,
      tileDepth + 0.002
    );
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xbbddff,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    const wiresMesh = new THREE.InstancedMesh(wireGeo, wireMat, TOTAL_TILES);
    wiresMesh.position.set(0, 0, tileDepth * 0.5 + 0.005);

    const tilesMesh = new THREE.InstancedMesh(tileGeo, tileMat, TOTAL_TILES);
    tilesMesh.position.set(0, 0, tileDepth * 0.5 + 0.005);

    // Pre-compute tile positions
    const dummy = new THREE.Object3D();
    const tilePositions: { x: number; y: number; col: number; row: number }[] = [];
    for (let row = 0; row < TILE_ROWS; row++) {
      for (let col = 0; col < TILE_COLS; col++) {
        const x = -planeW / 2 + tileW * (col + 0.5);
        const y = planeH / 2 - tileH * (row + 0.5);
        tilePositions.push({ x, y, col, row });
        dummy.position.set(x, y, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        tilesMesh.setMatrixAt(row * TILE_COLS + col, dummy.matrix);
      }
    }
    tilesMesh.instanceMatrix.needsUpdate = true;

    // Per-tile color array (sampled from image)
    const tileColors = new Float32Array(TOTAL_TILES * 3);
    let colorsReady = false;

    // Sample image colors once texture loads
    const sampleColors = () => {
      const img = rodinTex.image as HTMLImageElement;
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = TILE_COLS;
      tmpCanvas.height = TILE_ROWS;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(img, 0, 0, TILE_COLS, TILE_ROWS);
      const imgData = tmpCtx.getImageData(0, 0, TILE_COLS, TILE_ROWS);

      for (let i = 0; i < TOTAL_TILES; i++) {
        const r = imgData.data[i * 4] / 255;
        const g = imgData.data[i * 4 + 1] / 255;
        const b = imgData.data[i * 4 + 2] / 255;
        tileColors[i * 3] = r;
        tileColors[i * 3 + 1] = g;
        tileColors[i * 3 + 2] = b;
      }
      colorsReady = true;
    };

    // Try immediately and also on load
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      rodinTex.image = img;
      rodinTex.needsUpdate = true;
      sampleColors();
    };
    img.src = RODIN_URL;

    // Per-tile opacity state
    const tileOpacity = new Float32Array(TOTAL_TILES).fill(0);
    const tileTarget = new Float32Array(TOTAL_TILES).fill(0);
    const tilePhase = new Float32Array(TOTAL_TILES);
    // Assign random phase offset per tile for staggered reveal
    for (let i = 0; i < TOTAL_TILES; i++) {
      tilePhase[i] = Math.random() * Math.PI * 2;
    }

    // ── LIGHTS ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x88aaff, 0.4);
    backLight.position.set(-2, -1, -2);
    scene.add(backLight);

    // ── ROTATION GROUP ──
    const group = new THREE.Group();
    group.add(planeMesh);
    group.add(wiresMesh);
    group.add(tilesMesh);
    scene.add(group);

    // ── ANIMATE ──
    let rotY = 0;
    let prevRotY = 0;
    const color = new THREE.Color();

    const animate = (timestamp: number) => {
      animRef.current = requestAnimationFrame(animate);

      const t = timestamp * 0.001;

      // Slow Y rotation (like Unicorn Studio: Speed 50, Axis Y:43)
      rotY = t * 0.35;
      const deltaRot = rotY - prevRotY;
      prevRotY = rotY;

      // Apply rotation to group - gentle oscillation for 3D feel
      group.rotation.y = Math.sin(rotY * 0.5) * 0.55;
      group.rotation.x = Math.sin(t * 0.25) * 0.08;

      // Mouse parallax
      const mx = (mouseRef.current.x - 0.5) * 0.15;
      const my = (mouseRef.current.y - 0.5) * -0.1;
      group.rotation.y += mx;
      group.rotation.x += my;

      // ── TILE MOSAIC EFFECT ──
      // Tiles reveal/hide based on rotation angle
      // - When rotating forward: tiles fill in from top-left to bottom-right (mosaic build)
      // - When rotating back: tiles disappear
      // Each tile has a unique threshold based on position + random phase

      // Slow oscillating rotation progress: 0 → 1 → 0 → ...
      // Use a sawtooth-like wave for clear fill/empty cycle
      const cycleT = (t * 0.4) % (Math.PI * 2);
      // Smooth sine: 0→1→0, but spend more time at extremes
      const rawProgress = (Math.sin(cycleT - Math.PI * 0.5) + 1) * 0.5;
      // Sharpen the curve: ease in/out
      const rotProgress = rawProgress < 0.5
        ? 2 * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      if (colorsReady) {
        for (let i = 0; i < TOTAL_TILES; i++) {
          const col = i % TILE_COLS;
          const row = Math.floor(i / TILE_COLS);

          // Each tile has a threshold: when rotProgress > threshold, tile appears
          // Threshold based on position (diagonal sweep) + random jitter
          const normCol = col / TILE_COLS;
          const normRow = row / TILE_ROWS;
          // Diagonal sweep: top-left first, bottom-right last
          const diag = (normCol + normRow) * 0.5;
          const threshold = diag * 0.65 + tilePhase[i] / (Math.PI * 2) * 0.35;

          // Tile is visible when rotProgress > threshold
          const visible = rotProgress > threshold;
          tileTarget[i] = visible ? 1 : 0;

          // Smooth lerp with different speeds for appear/disappear
          const lerpSpeed = visible ? 0.12 : 0.07;
          tileOpacity[i] += (tileTarget[i] - tileOpacity[i]) * lerpSpeed;

          const op = tileOpacity[i];

          if (op < 0.015) {
            // Invisible: scale to 0
            dummy.position.set(tilePositions[i].x, tilePositions[i].y, 0);
            dummy.scale.set(0.001, 0.001, 0.001);
            dummy.updateMatrix();
            tilesMesh.setMatrixAt(i, dummy.matrix);
          } else {
            // Visible: scale in with spring effect
            // Tiles pop in with slight overshoot
            const sc = op < 0.5 ? op * 2 * 1.1 : 1.0 + (1 - op) * 0.1;
            dummy.position.set(tilePositions[i].x, tilePositions[i].y, 0);
            dummy.scale.set(sc, sc, 1.0);
            dummy.updateMatrix();
            tilesMesh.setMatrixAt(i, dummy.matrix);

            // Set tile color from image + glass shimmer
            const r = tileColors[i * 3];
            const g = tileColors[i * 3 + 1];
            const b = tileColors[i * 3 + 2];

            // Glass tint: cool blue shimmer on edges, warm on center
            const shimmer = Math.sin(t * 3.0 + tilePhase[i] * 1.5) * 0.15;
            const edgeDist = Math.abs(col / TILE_COLS - 0.5) + Math.abs(row / TILE_ROWS - 0.5);
            const edgeTint = edgeDist * 0.3;
            color.setRGB(
              Math.min(1, r * 0.95 + shimmer * 0.2 + edgeTint * 0.1),
              Math.min(1, g * 0.92 + shimmer * 0.05),
              Math.min(1, b * 1.15 + shimmer * 0.4 + edgeTint * 0.2)
            );
            tilesMesh.setColorAt(i, color);
          }
        }
        tilesMesh.instanceMatrix.needsUpdate = true;
        if (tilesMesh.instanceColor) tilesMesh.instanceColor.needsUpdate = true;
        // Sync wireframe mesh with tile positions
        wiresMesh.instanceMatrix.copy(tilesMesh.instanceMatrix);
        wiresMesh.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // Copy to offscreen
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.drawImage(renderer.domElement, 0, 0, offscreen.width, offscreen.height);
    };
    animate(0);

    // ── RESIZE ──
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
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
