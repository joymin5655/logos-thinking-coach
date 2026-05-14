/**
 * PixelDotGrid — Glyph Dither Waffle
 *
 * Unicorn Studio 설정값:
 *   Preset: Waffle
 *   Scale: 69  → cell size proportional to viewport
 *   Gamma: 44  → contrast/threshold for brightness mapping
 *   Mix: 100
 *   Color mode: Texture (samples 3D render colors)
 *   Shape: 46.6×46.7%, Position X:50 Y:65.4
 *
 * 동작:
 *   - latestRenderCanvas(ThinkerModel offscreen)를 매 프레임 샘플링
 *   - 각 셀의 밝기(brightness)에 따라 사각형 크기 결정
 *   - 어두운 영역 → 큰 사각형, 밝은 영역 → 작은 점
 *   - 색상은 해당 셀의 텍스처 색상 사용
 */

import { useEffect, useRef } from 'react';
import { latestRenderCanvas } from './ThinkerModel';

interface PixelDotGridProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function PixelDotGrid({ className, style }: PixelDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const cachedImageData = useRef<{ data: ImageData; w: number; h: number } | null>(null);
  const lastSampleTime = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    let W = 0, H = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cachedImageData.current = null;
    };
    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    // Offscreen sampling canvas (low-res for performance)
    const samplerCanvas = document.createElement('canvas');
    const samplerCtx = samplerCanvas.getContext('2d', { willReadFrequently: true })!;

    const draw = (timestamp: number) => {
      if (!W || !H) { animRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);

      // ── CELL SIZE ──
      // Unicorn Studio Scale 69 on 1000px wide ≈ 14px cells
      const CELL = Math.max(10, Math.round(W / 70));
      const COLS = Math.ceil(W / CELL) + 1;
      const ROWS = Math.ceil(H / CELL) + 1;

      // ── SAMPLE 3D RENDER (every ~33ms = 30fps) ──
      const src = latestRenderCanvas;
      if (src && src.width > 0 && src.height > 0 && timestamp - lastSampleTime.current > 33) {
        lastSampleTime.current = timestamp;
        // Sample at grid resolution for performance
        samplerCanvas.width = COLS;
        samplerCanvas.height = ROWS;
        samplerCtx.clearRect(0, 0, COLS, ROWS);
        samplerCtx.drawImage(src, 0, 0, COLS, ROWS);
        try {
          const imgData = samplerCtx.getImageData(0, 0, COLS, ROWS);
          cachedImageData.current = { data: imgData, w: COLS, h: ROWS };
        } catch {
          // security error
        }
      }

      const cache = cachedImageData.current;

      // Gamma 44 → pow exponent
      const GAMMA_EXP = 1.0 / (44 / 100 * 2.0 + 0.3); // ≈ 1.14

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          let brightness = 0;
          let r = 40, g = 40, b = 28;
          let hasModel = false;

          if (cache) {
            const idx = (row * cache.w + col) * 4;
            const pr = cache.data.data[idx];
            const pg = cache.data.data[idx + 1];
            const pb = cache.data.data[idx + 2];
            const pa = cache.data.data[idx + 3];

            if (pa > 10) {
              hasModel = true;
              r = pr; g = pg; b = pb;
              const lum = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255;
              // Waffle: dark = large square (inverted)
              brightness = Math.pow(Math.max(0.001, 1.0 - lum), GAMMA_EXP);
            }
          }

          if (!hasModel) {
            // Background: tiny uniform dots
            brightness = 0.12;
            r = 50; g = 50; b = 38;
          }

          // ── SQUARE SIZE ──
          const maxSz = CELL * 0.90;
          const minSz = CELL * 0.06;
          const sz = minSz + brightness * (maxSz - minSz);

          if (sz < 0.8) continue;

          const cx = col * CELL + (CELL - sz) * 0.5;
          const cy = row * CELL + (CELL - sz) * 0.5;

          // Clamp colors
          const cr = Math.max(0, Math.min(255, r));
          const cg = Math.max(0, Math.min(255, g));
          const cb = Math.max(0, Math.min(255, b));

          const alpha = hasModel
            ? Math.min(1, 0.45 + brightness * 0.50)
            : 0.28;

          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.fillRect(cx, cy, sz, sz);
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
      style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none', ...style }}
    />
  );
}
