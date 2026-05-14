/*
 * PixelDotGrid.tsx — Glyph Dither (Waffle Preset) 정밀 재현
 *
 * 유니콘 스튜디오 설정:
 * - Preset: "Waffle" → 균일 격자, 밝기에 따라 사각형 크기 변화
 * - Characters: .;-=+*#%@ (밝기 단계)
 * - Scale: 69 → 격자 셀 크기
 * - Gamma: 44 → 대비 조정 (어두운 쪽 강조)
 * - Mix: 100 → 완전 혼합
 * - Color mode: Texture → 동상 텍스처 색상 반영
 * - Background: ON → 배경 포함
 * - Shape: 46.6×46.7%, Position X:50 Y:65.4
 * - Fill: #777777, Stroke: 검정
 *
 * 시각적 특징:
 * 1. 외곽 영역: 작은 원형 점 (밝은 배경)
 * 2. 중앙 영역: 점점 커지는 사각형 (어두운 동상 실루엣)
 * 3. 동상 윤곽: 가장 큰 검정 사각형 + 테두리
 * 4. 중심부: 약간의 색상 틴트 (텍스처 모드)
 */
import { useEffect, useRef } from 'react';

interface PixelDotGridProps {
  className?: string;
  mouseX?: number;
  mouseY?: number;
}

export default function PixelDotGrid({ className, mouseX = 0.5, mouseY = 0.5 }: PixelDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: mouseX, y: mouseY });

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
    };
    resize();

    const ro = new ResizeObserver(() => { resize(); });
    ro.observe(canvas);

    // Waffle pattern noise field (pre-computed for performance)
    const noise = (x: number, y: number, t: number): number => {
      const s = Math.sin(x * 0.7 + t * 0.5) * Math.cos(y * 0.6 + t * 0.4);
      const s2 = Math.sin((x + y) * 0.45 + t * 0.3);
      return (s + s2) * 0.5 * 0.5 + 0.5;
    };

    const draw = (timestamp: number) => {
      if (!W || !H) { animRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);

      const t = timestamp * 0.00035;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Waffle cell size: Scale:69 → ~14-16px
      const CELL = Math.max(11, Math.min(17, W * 0.027));
      const COLS = Math.ceil(W / CELL) + 1;
      const ROWS = Math.ceil(H / CELL) + 1;

      // The "statue silhouette" region within the grid
      // This mimics the dither pattern that traces the statue's body
      // Shifted right to align with the statue position (left: 52%)
      const statueX = W * 0.55;
      const statueY = H * 0.48;
      const statueW = W * 0.42;
      const statueH = H * 0.80;

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const px = col * CELL + CELL / 2;
          const py = row * CELL + CELL / 2;

          // Distance from statue silhouette center (elliptical)
          const ndx = (px - statueX) / (statueW * 0.5);
          const ndy = (py - statueY) / (statueH * 0.5);
          const distFromStatue = Math.sqrt(ndx * ndx + ndy * ndy);

          // Only render within the grid bounds
          if (distFromStatue > 1.1) continue;

          // Noise-based brightness (Waffle pattern)
          const n = noise(col * 0.6, row * 0.55, t + mx * 1.5 + my * 1.2);

          // Gamma: 44/100 → pow(n, 1/0.44) ≈ pow(n, 2.27) → darken midtones
          const gamma = 44 / 100;
          const brightness = Math.pow(Math.max(0.001, n), 1 / gamma);

          // Proximity to statue center → more dark pixels
          const proximity = Math.max(0, 1 - distFromStatue);
          // Statue silhouette: darker in the body area
          const statueDark = Math.max(0, 1 - distFromStatue * 1.2);
          const finalBrightness = brightness * (1 - statueDark * 0.72);

          // Waffle: square size inversely proportional to brightness
          // Dark → large square (max 88% of cell)
          // Bright → tiny dot (min 5% of cell)
          const maxSz = CELL * 0.88;
          const minSz = CELL * 0.05;
          const sz = minSz + (1 - finalBrightness) * (maxSz - minSz);

          const cx = col * CELL + (CELL - sz) / 2;
          const cy = row * CELL + (CELL - sz) / 2;

          // Alpha: outer dots are more transparent, inner squares more visible
          const alpha = 0.08 + proximity * 0.55;

          if (sz < CELL * 0.12) {
            // Tiny dot (bright area) - small dots in outer region
            ctx.beginPath();
            ctx.arc(px, py, sz * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(38, 38, 24, ${alpha * 0.45})`;
            ctx.fill();
          } else if (sz < CELL * 0.4) {
            // Small square
            ctx.fillStyle = `rgba(38, 38, 24, ${alpha * 0.6})`;
            ctx.fillRect(cx, cy, sz, sz);
          } else {
            // Large dark square — Waffle style with border
            // Color mode: Texture → subtle color tint near center
            let r = 30, g = 28, b = 22;
            if (proximity > 0.55) {
              // Texture color: warm brown (statue bronze color)
              r = Math.floor(30 + proximity * 15);
              g = Math.floor(25 + proximity * 10);
              b = Math.floor(15 + proximity * 8);
            }
            if (proximity > 0.75) {
              // Near center: slight iridescent tint (matches unicorn's colorful center)
              const tintPhase = t * 2 + col * 0.3 + row * 0.25;
              r = Math.floor(r + Math.sin(tintPhase) * 12 * proximity);
              g = Math.floor(g + Math.sin(tintPhase + 2) * 8 * proximity);
              b = Math.floor(b + Math.cos(tintPhase) * 18 * proximity);
            }
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.85})`;
            ctx.fillRect(cx, cy, sz, sz);

            // Stroke for larger squares (Waffle border)
            if (sz > CELL * 0.55) {
              ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.22})`;
              ctx.lineWidth = 0.5;
              ctx.strokeRect(cx, cy, sz, sz);
            }
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
