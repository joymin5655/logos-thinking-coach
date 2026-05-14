/*
 * PixelDotGrid.tsx — Glyph Dither (Waffle Preset) — 10배 해상도, 사각형 전용
 *
 * 유니콘 스튜디오 설정값:
 * - Preset: "Waffle" → 사각형 격자, 밝기에 따라 크기 변화
 * - Scale: 69 → 격자 셀 크기 (10배 해상도 → ~1.5px 셀)
 * - Gamma: 44 → 대비 조정
 * - Mix: 100, Color mode: Texture
 * - Shape: 46.6×46.7%, Position X:50 Y:65.4
 *
 * 핵심:
 * 1. 해상도 10배: CELL = 1.5px
 * 2. 사각형만: fillRect() 전용
 * 3. 3D 렌더 이미지 픽셀 샘플링 → 조각상 형태 Dither
 *    - ThinkerModel의 offscreen canvas에서 직접 픽셀 읽기
 *    - PixelDotGrid canvas와 ThinkerModel canvas가 같은 크기 컨테이너에 있으므로
 *      좌표가 1:1 매핑됨
 */
import { useEffect, useRef } from 'react';
import { latestRenderCanvas } from './ThinkerModel';

interface PixelDotGridProps {
  className?: string;
  mouseX?: number;
  mouseY?: number;
}

export default function PixelDotGrid({ className, mouseX = 0.5, mouseY = 0.5 }: PixelDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: mouseX, y: mouseY });
  // Cache imageData to avoid re-reading every frame
  const cachedImageData = useRef<{ data: ImageData; w: number; h: number } | null>(null);
  const lastSampleTime = useRef(0);

  useEffect(() => {
    mouseRef.current = { x: mouseX, y: mouseY };
  }, [mouseX, mouseY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cachedImageData.current = null; // reset cache on resize
    };
    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    // Offscreen sampling canvas
    const samplerCanvas = document.createElement('canvas');
    const samplerCtx = samplerCanvas.getContext('2d', { willReadFrequently: true })!;

    const draw = (timestamp: number) => {
      if (!W || !H) { animRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);

      const t = timestamp * 0.00018;

      // ── CELL SIZE ──
      // 레퍼런스: 셌이지 ~8-12px, 조각상 실루엣을 따라 큰 사각형
      // 사용자 요청 '10배 해상도' → 원본 ~140px 셌이지의 1/10 = 14px
      const CELL = 14;
      const COLS = Math.ceil(W / CELL) + 1;
      const ROWS = Math.ceil(H / CELL) + 1;

      // ── 3D 렌더 이미지 샘플링 (60fps → 30fps로 줄여서 성능 최적화) ──
      const src = latestRenderCanvas;
      if (src && src.width > 0 && src.height > 0 && timestamp - lastSampleTime.current > 33) {
        lastSampleTime.current = timestamp;
        samplerCanvas.width = src.width;
        samplerCanvas.height = src.height;
        samplerCtx.clearRect(0, 0, src.width, src.height);
        samplerCtx.drawImage(src, 0, 0);
        try {
          const imgData = samplerCtx.getImageData(0, 0, src.width, src.height);
          cachedImageData.current = { data: imgData, w: src.width, h: src.height };
        } catch {
          // cross-origin or security error
        }
      }

      const cache = cachedImageData.current;

      // Gamma: 44/100 → pow(n, 1/0.44) ≈ pow(n, 2.27)
      const gamma = 44 / 100;

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const px = col * CELL + CELL * 0.5;
          const py = row * CELL + CELL * 0.5;

          let brightness: number = 0;
          let cr = 20, cg = 20, cb = 14;
          let hasStatueData = false;

          if (cache) {
            // Map PixelDotGrid canvas coords → ThinkerModel render coords
            // Both are in the same container, same size
            // PixelDotGrid div: top:20%, left:-15%, width:130%, height:60%
            // So the grid extends beyond the model container
            // We need to map back to model container coords:
            // gridX = px / W → maps to model container x: (gridX - (-0.15)) / 1.30 = (gridX + 0.15) / 1.30
            // gridY = py / H → maps to model container y: (gridY - 0.20) / 0.60
            const gridNX = px / W;
            const gridNY = py / H;

            // Map to model container normalized coords
            const modelNX = (gridNX + 0.15) / 1.30;
            const modelNY = (gridNY - 0.20) / 0.60;

            // Map to render canvas pixel coords
            const ix = Math.floor(modelNX * cache.w);
            const iy = Math.floor(modelNY * cache.h);

            if (ix >= 0 && iy >= 0 && ix < cache.w && iy < cache.h) {
              const idx = (iy * cache.w + ix) * 4;
              const r = cache.data.data[idx];
              const g = cache.data.data[idx + 1];
              const b = cache.data.data[idx + 2];
              const a = cache.data.data[idx + 3];

              if (a > 5) {
                hasStatueData = true;
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                // Invert: dark statue → large squares
                brightness = 1 - lum;
                brightness = Math.pow(Math.max(0.001, brightness), 1 / gamma);

                // Texture color
                if (brightness > 0.35) {
                  const tintPhase = t * 1.2 + col * 0.04 + row * 0.04;
                  cr = Math.floor(r * 0.3 + Math.sin(tintPhase) * 18 * brightness + 12);
                  cg = Math.floor(g * 0.25 + Math.sin(tintPhase + 2.1) * 10 * brightness + 10);
                  cb = Math.floor(b * 0.4 + Math.cos(tintPhase) * 22 * brightness + 6);
                } else {
                  cr = 15; cg = 15; cb = 10;
                }
              }
            }
          }

          if (!hasStatueData) {
            // Background dot grid — uniform small squares
            brightness = 0.20;
            cr = 40; cg = 40; cb = 28;
          }

          // ── SQUARE SIZE: Waffle preset ──
          const maxSz = CELL * 0.88;
          const minSz = CELL * 0.04;
          const sz = minSz + brightness * (maxSz - minSz);

          if (sz < CELL * 0.05) continue;

          const cx = col * CELL + (CELL - sz) * 0.5;
          const cy = row * CELL + (CELL - sz) * 0.5;

          cr = Math.max(0, Math.min(255, cr));
          cg = Math.max(0, Math.min(255, cg));
          cb = Math.max(0, Math.min(255, cb));

          const alpha = hasStatueData
            ? 0.50 + brightness * 0.45
            : 0.32;

          // ── DRAW SQUARE (no circles) ──
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
          ctx.fillRect(cx, cy, sz, sz);

          // Stroke for large squares
          if (sz > CELL * 0.60 && brightness > 0.60) {
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.22})`;
            ctx.lineWidth = 0.3;
            ctx.strokeRect(cx, cy, sz, sz);
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
