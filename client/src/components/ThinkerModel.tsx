/*
 * ThinkerModel.tsx — 로댕 동상 (이미지 기반 + CSS 실루엣 효과)
 *
 * 유니콘 스튜디오 분석:
 * - Model: Matcap 재질, 거의 검정 실루엣
 * - Animation Speed:50, Axis Y:43 (Y축 회전)
 * - Interactivity: 마우스 Position/Rotation 반응, Momentum:100
 *
 * 구현: 로댕 이미지 + CSS 필터로 어두운 실루엣 + Y축 회전 시뮬레이션
 */
import { useRef, useEffect, useState } from 'react';

const RODIN_IMG = '/template-storage/rodin_transparent_07e954b5.png';

interface ThinkerModelProps {
  className?: string;
  mouseX?: number; // 0-1
  mouseY?: number; // 0-1
}

export default function ThinkerModel({ className, mouseX = 0.5, mouseY = 0.5 }: ThinkerModelProps) {
  const [scaleX, setScaleX] = useState(1);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  // Simulate Y-axis rotation via scaleX oscillation
  // Speed:50 in unicorn → ~18s per full rotation
  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      // cos oscillates 1 → -1 → 1, simulating Y rotation
      const s = Math.cos((elapsed / 18) * Math.PI * 2);
      setScaleX(s);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Mouse parallax — Momentum:100 → smooth interpolation
  const offsetX = (mouseX - 0.5) * 22;
  const offsetY = (mouseY - 0.5) * 12;

  return (
    <div
      className={className}
      style={{
        background: 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflow: 'visible',
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        transition: 'transform 0.12s cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      <img
        src={RODIN_IMG}
        alt="The Thinker"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center top',
          // Matcap dark silhouette matching unicorn studio
          filter: 'brightness(0.05) contrast(2.0) saturate(0)',
          transform: `scaleX(${scaleX})`,
          willChange: 'transform',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
