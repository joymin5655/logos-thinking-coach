/*
 * SpotlightBeam.tsx — 동상 위 스포트라이트 조명 오버레이
 *
 * 첨부 코드(ParticleHero) 기반으로 LOGOS 팔레트에 맞게 변환:
 *   - Spotlight beams: conic-gradient 크림/골드 빔 3개 (흔들림 애니메이션)
 *   - Particles: 위로 떠오르는 미세 파티클 (크림/골드)
 *   - Accent lines: 얇은 수평 액센트 라인
 *
 * 배경색에 영향 없이 동상 위에만 오버레이로 작동
 */
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  fadeDelay: number;
  fadeStart: number;
  fadingOut: boolean;
  reset: () => void;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

interface SpotlightBeamProps {
  /** 컨테이너 className */
  className?: string;
  style?: React.CSSProperties;
  /** 스포트라이트 색상 (기본: 크림/골드) */
  color?: 'cream' | 'gold' | 'blue';
}

export default function SpotlightBeam({ className, style, color = 'cream' }: SpotlightBeamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // 색상 팔레트
  const palette = {
    cream: {
      beam: 'rgba(240, 235, 224, 0.22)',
      beamCore: 'rgba(255, 252, 245, 0.35)',
      particle: (opacity: number) => `rgba(240, 235, 224, ${opacity})`,
      line: 'rgba(240, 235, 224, 0.10)',
    },
    gold: {
      beam: 'rgba(216, 189, 100, 0.22)',
      beamCore: 'rgba(255, 220, 100, 0.35)',
      particle: (opacity: number) => `rgba(255, 213, 128, ${opacity})`,
      line: 'rgba(216, 189, 100, 0.12)',
    },
    blue: {
      beam: 'rgba(152, 192, 239, 0.22)',
      beamCore: 'rgba(186, 215, 247, 0.35)',
      particle: (opacity: number) => `rgba(186, 215, 247, ${opacity})`,
      line: 'rgba(152, 192, 239, 0.12)',
    },
  };
  const pal = palette[color];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };

    const createParticle = (): Particle => {
      const p: Particle = {
        x: 0, y: 0, speed: 0, opacity: 1,
        fadeDelay: 0, fadeStart: 0, fadingOut: false,
        reset() {
          this.x = Math.random() * canvas.width;
          this.y = canvas.height * (0.3 + Math.random() * 0.7); // 하단 70% 영역에서 생성
          this.speed = Math.random() * 0.4 + 0.15;
          this.opacity = 0.7 + Math.random() * 0.3;
          this.fadeDelay = Math.random() * 800 + 200;
          this.fadeStart = Date.now() + this.fadeDelay;
          this.fadingOut = false;
        },
        update() {
          this.y -= this.speed;
          if (this.y < 0) this.reset();
          if (!this.fadingOut && Date.now() > this.fadeStart) this.fadingOut = true;
          if (this.fadingOut) {
            this.opacity -= 0.006;
            if (this.opacity <= 0) this.reset();
          }
        },
        draw(ctx) {
          ctx.fillStyle = pal.particle(this.opacity * 0.65);
          ctx.fillRect(this.x, this.y, 0.5, Math.random() * 2.5 + 0.5);
        },
      };
      p.reset();
      p.y = Math.random() * canvas.height;
      return p;
    };

    const initParticles = () => {
      const count = Math.floor((canvas.width * canvas.height) / 5000);
      particlesRef.current = Array.from({ length: count }, createParticle);
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => { p.update(); p.draw(ctx); });
      animRef.current = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [color]);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 20,
        ...style,
      }}
    >
      {/* ── 스포트라이트 빔 — 동상 상단 중앙에서 내려오는 3개 빔 ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
        {[
          { rotate: '15deg',  animDur: '17s', delay: '0s' },
          { rotate: '-15deg', animDur: '14s', delay: '0.5s' },
          { rotate: '0deg',   animDur: '21s', delay: '1s', reverse: true },
        ].map((beam, i) => (
          <div
            key={i}
            style={{
              borderRadius: '0 0 50% 50%',
              position: 'absolute',
              left: 0,
              right: 0,
              margin: '0 auto',
              top: 0,
              width: '60%',
              height: '100%',
              backgroundImage: `conic-gradient(from 0deg at 50% -5%, transparent 43%, ${pal.beam} 48%, ${pal.beamCore} 50%, ${pal.beam} 52%, transparent 57%)`,
              transformOrigin: '50% 0',
              transform: `rotate(${beam.rotate})`,
              filter: 'blur(18px)',
              opacity: 0,
              animation: `spotlight-beam-load 2.5s ease-in-out ${beam.delay} forwards, spotlight-beam-sway ${beam.animDur} ease-in-out ${beam.delay} infinite ${beam.reverse ? 'reverse' : ''}`,
            }}
          />
        ))}
      </div>

      {/* ── 수평 액센트 라인 ── */}
      {[15, 28, 42, 58, 72].map((topPct, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${topPct}%`,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${pal.line}, transparent)`,
            opacity: 0,
            animation: `accent-line-load 2s ease-out ${1.5 + i * 0.15}s forwards`,
          }}
        />
      ))}

      {/* ── 파티클 캔버스 ── */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          animation: 'spotlight-beam-load 1.5s ease-in-out 0.5s forwards',
        }}
      />

      <style>{`
        @keyframes spotlight-beam-load {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes spotlight-beam-sway {
          0%   { transform: rotate(var(--rot, 0deg)) scale(1);   filter: blur(18px) opacity(0.5); }
          20%  { transform: rotate(calc(var(--rot, 0deg) - 1deg)) scale(1.15); filter: blur(19px) opacity(0.6); }
          40%  { transform: rotate(calc(var(--rot, 0deg) + 2deg)) scale(1.25); filter: blur(16px) opacity(0.45); }
          60%  { transform: rotate(calc(var(--rot, 0deg) - 2deg)) scale(1.15); filter: blur(18px) opacity(0.6); }
          80%  { transform: rotate(calc(var(--rot, 0deg) + 1deg)) scale(1.08); filter: blur(15px) opacity(0.45); }
          100% { transform: rotate(var(--rot, 0deg)) scale(1);   filter: blur(18px) opacity(0.5); }
        }
        @keyframes accent-line-load {
          0%   { opacity: 0; transform: scaleX(0); }
          100% { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
