/*
 * MarqueeText.tsx
 * LOGOS Design: 흘러가는 철학 텍스트 마퀴
 * - 두 줄이 반대 방향으로 흐름
 * - 에디토리얼 대형 타이포그래피
 * - 동상 앞/뒤를 교차
 */
import React from 'react';

interface MarqueeTextProps {
  texts: string[];
  direction?: 'left' | 'right';
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
  textClassName?: string;
  separator?: string;
  style?: React.CSSProperties;
}

export default function MarqueeText({
  texts,
  direction = 'left',
  speed = 'slow',
  className = '',
  textClassName = '',
  separator = '·',
  style,
}: MarqueeTextProps) {
  const speedMap = {
    slow: '60s',
    medium: '35s',
    fast: '20s',
  };

  const animationName = direction === 'left' ? 'marquee-left' : 'marquee-right';
  const duration = speedMap[speed];

  // Duplicate texts for seamless loop
  const allTexts = [...texts, ...texts, ...texts, ...texts];

  return (
    <div
      className={`overflow-hidden whitespace-nowrap ${className}`}
      style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', ...style }}
    >
      <div
        className="inline-flex items-center gap-0"
        style={{
          animation: `${animationName} ${duration} linear infinite`,
          willChange: 'transform',
        }}
      >
        {allTexts.map((text, i) => (
          <span key={i} className={`inline-flex items-center ${textClassName}`}>
            <span>{text}</span>
            <span className="mx-6 opacity-40">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
