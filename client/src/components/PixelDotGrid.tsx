/**
 * PixelDotGrid — ASCII 글라스 타일
 *
 * 특징:
 *   - 반투명 유리 질감 타일 (배경색 비침, 테두리 하이라이트)
 *   - 각 타일 안에 ASCII 문자 표시 (밝기에 따라 .,:;+*#@)
 *   - 동상 오프스크린 렌더를 샘플링하여 밝기/색상 결정
 *   - 동상 앞에 배치 (z-index 상위)
 *   - 타일이 동상 회전에 따라 실시간 업데이트
 */

import { useEffect, useRef } from 'react';
import { latestRenderCanvas } from './ThinkerModel';

interface PixelDotGridProps {
  className?: string;
  style?: React.CSSProperties;
}

// ASCII ramp: dark → light (밝을수록 복잡한 문자)
const ASCII_RAMP = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
const ASCII_LEN = ASCII_RAMP.length;

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

    // Offscreen sampling canvas
    const samplerCanvas = document.createElement('canvas');
    const samplerCtx = samplerCanvas.getContext('2d', { willReadFrequently: true })!;

    const draw = (timestamp: number) => {
      if (!W || !H) { animRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);

      // ── CELL SIZE: 18px for readable ASCII chars ──
      const CELL = Math.max(14, Math.round(W / 55));
      const COLS = Math.ceil(W / CELL) + 1;
      const ROWS = Math.ceil(H / CELL) + 1;

      // ── SAMPLE 3D RENDER every ~33ms ──
      const src = latestRenderCanvas;
      if (src && src.width > 0 && src.height > 0 && timestamp - lastSampleTime.current > 33) {
        lastSampleTime.current = timestamp;
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

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          let brightness = 0;
          let r = 200, g = 200, b = 180;
          let alpha = 0;
          let hasModel = false;

          if (cache) {
            const idx = (row * cache.w + col) * 4;
            const pr = cache.data.data[idx];
            const pg = cache.data.data[idx + 1];
            const pb = cache.data.data[idx + 2];
            const pa = cache.data.data[idx + 3];

            if (pa > 8) {
              hasModel = true;
              r = pr; g = pg; b = pb;
              brightness = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255;
            }
          }

          const cx = col * CELL;
          const cy = row * CELL;
          const pad = 1.5; // gap between tiles

          if (hasModel) {
            // ── GLASS TILE (동상 영역) ──
            // 배경색 #C8C8B6를 기반으로 반투명 유리 효과
            const bgR = 200, bgG = 200, bgB = 182; // #C8C8B6

            // 타일 기본 색: 배경색 + 모델 색상 혼합 (반투명)
            const mixR = Math.round(bgR * 0.6 + r * 0.4);
            const mixG = Math.round(bgG * 0.6 + g * 0.4);
            const mixB = Math.round(bgB * 0.6 + b * 0.4);
            const tileAlpha = 0.45 + brightness * 0.25;

            // 1. 반투명 유리 기반 레이어
            ctx.fillStyle = `rgba(${mixR},${mixG},${mixB},${tileAlpha})`;
            ctx.fillRect(cx + pad, cy + pad, CELL - pad * 2, CELL - pad * 2);

            // 2. 상단 하이라이트 (유리 반사 - 더 강하게)
            const hlGrad = ctx.createLinearGradient(cx + pad, cy + pad, cx + pad, cy + CELL * 0.55);
            hlGrad.addColorStop(0, `rgba(255,255,255,0.70)`);
            hlGrad.addColorStop(0.4, `rgba(255,255,255,0.25)`);
            hlGrad.addColorStop(1, `rgba(255,255,255,0)`);
            ctx.fillStyle = hlGrad;
            ctx.fillRect(cx + pad, cy + pad, CELL - pad * 2, CELL * 0.55);

            // 3. 좌측 엣지 하이라이트 (유리 두께감)
            ctx.fillStyle = `rgba(255,255,255,0.45)`;
            ctx.fillRect(cx + pad, cy + pad, 2, CELL - pad * 2);

            // 4. 하단 그림자 (유리 깊이감)
            ctx.fillStyle = `rgba(0,0,0,0.12)`;
            ctx.fillRect(cx + pad, cy + CELL - pad - 3, CELL - pad * 2, 3);

            // 5. 테두리 (얇은 흰색 + 어두운 테두리)
            ctx.strokeStyle = `rgba(255,255,255,0.55)`;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(cx + pad + 0.4, cy + pad + 0.4, CELL - pad * 2 - 0.8, CELL - pad * 2 - 0.8);

            // 6. ASCII 문자 (밝기에 따라 문자 선택)
            const charIdx = Math.floor(brightness * (ASCII_LEN - 1));
            const char = ASCII_RAMP[charIdx];
            if (char && char !== ' ') {
              const fontSize = Math.max(7, CELL * 0.50);
              ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              // 어두운 타일 → 밝은 텍스트, 밝은 타일 → 어두운 텍스트
              if (brightness < 0.4) {
                ctx.fillStyle = `rgba(220,220,200,0.85)`;
              } else {
                ctx.fillStyle = `rgba(30,30,20,0.75)`;
              }
              ctx.fillText(char, cx + CELL / 2, cy + CELL / 2);
            }

          } else {
            // ── BACKGROUND DOTS (동상 밖 영역) ──
            // 작은 점만 표시
            const dotSize = CELL * 0.08;
            const dotX = cx + CELL / 2 - dotSize / 2;
            const dotY = cy + CELL / 2 - dotSize / 2;
            ctx.fillStyle = `rgba(50,50,38,0.22)`;
            ctx.fillRect(dotX, dotY, dotSize, dotSize);
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
      style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none', ...style }}
    />
  );
}
