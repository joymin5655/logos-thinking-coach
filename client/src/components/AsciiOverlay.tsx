/*
 * AsciiOverlay.tsx
 * LOGOS Design: ASCII 스타일로 모호함을 표현하는 중앙 오버레이
 * - 도트/문자 패턴이 동상 중앙을 관통
 * - 랜덤 문자 교체로 "모호함" 연출
 * - 마우스 위치에 따라 패턴 왜곡
 */
import { useEffect, useRef, useCallback } from 'react';

const CHARS = '·∙•◦○◉◎□■▪▫▬▭▮▯░▒▓█▀▄▌▐─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬';
const PHILOSOPHY_CHARS = 'ΛΟΓΟΣ思考哲学思索問答LOGOS';

interface AsciiOverlayProps {
  className?: string;
  mouseX?: number;
  mouseY?: number;
}

export default function AsciiOverlay({ className, mouseX = 0.5, mouseY = 0.5 }: AsciiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const gridRef = useRef<string[][]>([]);

  const initGrid = useCallback((cols: number, rows: number) => {
    const grid: string[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = Math.random() < 0.3
          ? CHARS[Math.floor(Math.random() * CHARS.length)]
          : '·';
      }
    }
    return grid;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const FONT_SIZE = 12;
    const LINE_HEIGHT = 16;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cols = Math.floor(canvas.width / (FONT_SIZE * 0.65));
      const rows = Math.floor(canvas.height / LINE_HEIGHT);
      gridRef.current = initGrid(cols, rows);
    };

    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas);

    const draw = (timestamp: number) => {
      const delta = timestamp - timeRef.current;
      timeRef.current = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cols = Math.floor(canvas.width / (FONT_SIZE * 0.65));
      const rows = Math.floor(canvas.height / LINE_HEIGHT);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px "Courier New", monospace`;

      const centerX = canvas.width * mouseX;
      const centerY = canvas.height * mouseY;

      for (let r = 0; r < rows; r++) {
        if (!gridRef.current[r]) continue;
        for (let c = 0; c < cols; c++) {
          const x = c * FONT_SIZE * 0.65;
          const y = r * LINE_HEIGHT + FONT_SIZE;

          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.min(canvas.width, canvas.height) * 0.45;
          const proximity = Math.max(0, 1 - dist / maxDist);

          // Random char update based on proximity
          if (Math.random() < proximity * 0.08 + 0.002) {
            const usePhilo = Math.random() < proximity * 0.3;
            const charSet = usePhilo ? PHILOSOPHY_CHARS : CHARS;
            gridRef.current[r][c] = charSet[Math.floor(Math.random() * charSet.length)];
          }

          const char = gridRef.current[r]?.[c] || '·';

          // Color based on proximity and position
          const baseAlpha = 0.12 + proximity * 0.55;
          const wave = Math.sin(dist * 0.03 - timestamp * 0.001) * 0.15;
          const alpha = Math.max(0.05, Math.min(0.85, baseAlpha + wave));

          if (proximity > 0.6) {
            // Near center: dark olive / amber
            const t = (proximity - 0.6) / 0.4;
            ctx.fillStyle = `rgba(44, 44, 30, ${alpha})`;
          } else if (proximity > 0.3) {
            ctx.fillStyle = `rgba(74, 74, 56, ${alpha * 0.8})`;
          } else {
            ctx.fillStyle = `rgba(136, 135, 128, ${alpha * 0.5})`;
          }

          ctx.fillText(char, x, y);
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObs.disconnect();
    };
  }, [initGrid]);

  // Update mouse position effect
  useEffect(() => {
    // Mouse position is passed as props, canvas will use it in next frame
  }, [mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
