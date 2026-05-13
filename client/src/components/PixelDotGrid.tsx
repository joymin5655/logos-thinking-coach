/*
 * PixelDotGrid.tsx
 * LOGOS Design: 뮤제 리믹스 스타일 픽셀/도트 그리드 오버레이
 * 
 * 참조: musee_remix_scene.webp
 * - 균일한 도트 그리드 (작은 원형 점)
 * - 중앙으로 갈수록 도트가 사각형 픽셀로 변환
 * - 픽셀들이 동상 실루엣을 따라 더 크고 불규칙하게 변화
 * - 세이지 그린 배경 위에서 어두운 픽셀 패턴
 */
import { useEffect, useRef } from 'react';

interface PixelDotGridProps {
  className?: string;
}

export default function PixelDotGrid({ className }: PixelDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const GRID_SPACING = 22; // spacing between dots
    const DOT_RADIUS = 1.5; // base dot radius

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas);

    const draw = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const t = timestamp * 0.0008;
      timeRef.current = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas.width / GRID_SPACING) + 1;
      const rows = Math.ceil(canvas.height / GRID_SPACING) + 1;

      // Center of the grid overlay (slightly left of center to match musee style)
      const gridCenterX = canvas.width * 0.5;
      const gridCenterY = canvas.height * 0.52;
      const gridW = canvas.width * 0.55;
      const gridH = canvas.height * 0.65;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * GRID_SPACING;
          const y = row * GRID_SPACING;

          // Distance from grid center (normalized)
          const dx = (x - gridCenterX) / (gridW * 0.5);
          const dy = (y - gridCenterY) / (gridH * 0.5);
          const distNorm = Math.sqrt(dx * dx + dy * dy);

          // Only draw within the grid bounding box
          const inGrid =
            x >= gridCenterX - gridW * 0.5 &&
            x <= gridCenterX + gridW * 0.5 &&
            y >= gridCenterY - gridH * 0.5 &&
            y <= gridCenterY + gridH * 0.5;

          if (!inGrid) continue;

          // Proximity to center: 0 = edge, 1 = center
          const proximity = Math.max(0, 1 - distNorm);

          // Animated noise for pixel variation
          const noise = Math.sin(col * 0.7 + t) * Math.cos(row * 0.5 + t * 0.8) * 0.5 + 0.5;

          // Pixel size: dots at edges, larger squares near center
          const pixelSize = proximity > 0.3
            ? DOT_RADIUS + proximity * 8 * noise
            : DOT_RADIUS;

          // Opacity: subtle at edges, stronger near center
          const alpha = 0.15 + proximity * 0.55 * (0.7 + noise * 0.3);

          // Color: dark olive matching the musee style
          const isDark = proximity > 0.5 && noise > 0.4;
          if (isDark) {
            ctx.fillStyle = `rgba(30, 30, 20, ${alpha})`;
          } else {
            ctx.fillStyle = `rgba(44, 44, 30, ${alpha * 0.7})`;
          }

          if (proximity > 0.35) {
            // Square pixels near center
            const size = pixelSize * 2;
            ctx.fillRect(x - size / 2, y - size / 2, size, size);

            // Outline for some pixels (musee style border effect)
            if (noise > 0.6 && proximity > 0.5) {
              ctx.strokeStyle = `rgba(44, 44, 30, ${alpha * 0.4})`;
              ctx.lineWidth = 0.5;
              ctx.strokeRect(x - size / 2, y - size / 2, size, size);
            }
          } else {
            // Dots at edges
            ctx.beginPath();
            ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObs.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
