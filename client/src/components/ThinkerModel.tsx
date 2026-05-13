/*
 * ThinkerModel.tsx
 * LOGOS Design: 로댕의 생각하는 사람 이미지 기반 회전 효과
 * - 배경 제거된 PNG 이미지 사용 (GLB 대신)
 * - CSS perspective + scaleX 트릭으로 Y축 회전 시뮬레이션
 * - 20초에 한 바퀴 회전
 * - 세이지 그린 배경에 어울리는 drop-shadow 필터
 */
import { useEffect, useRef } from 'react';

const RODIN_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663647714246/6TkpfBVetBKa7U8H88xcFN/rodin_transparent-MeJJLUhBdXeWmJKycwYuw3.png';

interface ThinkerModelProps {
  className?: string;
}

export default function ThinkerModel({ className }: ThinkerModelProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const PERIOD = 20000; // 20 seconds per full rotation

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const angle = ((elapsed % PERIOD) / PERIOD) * Math.PI * 2;

      if (imgRef.current) {
        // Simulate Y-axis rotation using scaleX with perspective distortion
        const scaleX = Math.cos(angle);
        const absScale = Math.abs(scaleX);

        // Perspective depth effect: slightly shrink when side-on
        const scaleY = 1 - (1 - absScale) * 0.05;

        // Slight horizontal shift to simulate 3D parallax
        const translateX = Math.sin(angle) * 8;

        imgRef.current.style.transform =
          `translateX(${translateX}px) scaleX(${scaleX}) scaleY(${scaleY})`;

        // Drop shadow shifts with rotation
        const shadowX = Math.sin(angle) * 12;
        imgRef.current.style.filter =
          `drop-shadow(${shadowX}px 20px 30px rgba(20, 20, 10, 0.45))`;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div
      className={className}
      style={{
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '800px',
      }}
    >
      <img
        ref={imgRef}
        src={RODIN_IMG}
        alt="The Thinker by Rodin"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center bottom',
          transformOrigin: 'center center',
          willChange: 'transform, filter',
          transition: 'none',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable={false}
      />
    </div>
  );
}
