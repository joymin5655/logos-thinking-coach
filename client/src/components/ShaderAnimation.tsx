/**
 * ShaderAnimation — GLSL 셰이더 기반 모자이크 + 동심원 라인 효과
 *
 * 개선 사항:
 *   - 해상도 2x (devicePixelRatio 완전 활용, antialias 활성화)
 *   - 유리/크리스탈 효과: IOR 굴절, 프리즘 색 분산, 크롬 반사
 *   - 모자이크 픽셀 크기 축소 (더 세밀한 그리드)
 *   - 동심원 라인 수 증가 (5 → 8)
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ShaderAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

export function ShaderAnimation({ className, style }: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    camera: THREE.Camera | null;
    scene: THREE.Scene | null;
    renderer: THREE.WebGLRenderer | null;
    uniforms: any;
    animationId: number | null;
  }>({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    // ── Camera ──
    const camera = new THREE.Camera();
    camera.position.z = 1;

    // ── Scene ──
    const scene = new THREE.Scene();

    // ── Geometry ──
    const geometry = new THREE.PlaneGeometry(2, 2);

    // ── Uniforms ──
    const uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
      mousePos: { value: new THREE.Vector2(0.5, 0.5) },
    };

    // ── Vertex Shader ──
    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // ── Fragment Shader: 고해상도 + 유리/크리스탈 효과 ──
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform vec2 mousePos;

      float random(in float x) {
        return fract(sin(x) * 1e4);
      }

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      // 유리 IOR 굴절 — uv를 굴절 벡터로 왜곡
      vec2 glassRefract(vec2 uv, float ior, float t) {
        float angle = atan(uv.y, uv.x);
        float r = length(uv);
        // 굴절: 반지름에 따라 각도 왜곡
        float refractAngle = angle + sin(r * 8.0 - t * 0.3) * 0.04 * ior;
        return vec2(cos(refractAngle), sin(refractAngle)) * r;
      }

      // 동심원 라인 강도 계산
      float concentricLines(vec2 uv, float t, float lineWidth, int count) {
        float result = 0.0;
        for (int i = 0; i < 8; i++) {
          if (i >= count) break;
          result += lineWidth * float(i * i + 1) / abs(
            fract(t + float(i) * 0.013) * 1.0 - length(uv)
          );
        }
        return result;
      }

      void main(void) {
        // 고해상도: 픽셀 좌표를 그대로 사용 (모자이크 없음 or 매우 세밀)
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

        // 모자이크 픽셀 크기: 3px (배경이 잘 보이면서 세밀한 패턴)
        float mosaicSize = 3.0;
        float gridRes = 320.0;
        uv.x = floor(uv.x * gridRes / mosaicSize) / (gridRes / mosaicSize);
        uv.y = floor(uv.y * gridRes / mosaicSize) / (gridRes / mosaicSize);

        // 동상 중심 기준
        vec2 center = uv - vec2(0.15, 0.05);

        // 유리 굴절 적용 (IOR 1.52 = 유리)
        vec2 refractedCenter = glassRefract(center, 1.52, time * 0.06);

        // 노이즈 제거 → 깔끔한 동심원 패턴
        float t = time * 0.055;

        // ── 채널별 프리즘 분산 (크로마틱 어베레이션) ──
        // R 채널: 약간 바깥쪽 (낮은 굴절)
        float dispR = 0.008;
        // G 채널: 중간
        float dispG = 0.0;
        // B 채널: 약간 안쪽 (높은 굴절)
        float dispB = -0.008;

        vec2 centerR = refractedCenter + normalize(refractedCenter + vec2(0.001)) * dispR;
        vec2 centerG = refractedCenter;
        vec2 centerB = refractedCenter + normalize(refractedCenter + vec2(0.001)) * dispB;

        float lineWidth = 0.0007;

        float lineR = concentricLines(centerR, t - 0.008, lineWidth, 8);
        float lineG = concentricLines(centerG, t,         lineWidth, 8);
        float lineB = concentricLines(centerB, t + 0.008, lineWidth, 8);

        // ── 크리스탈 반사 하이라이트 ──
        // 동심원 교차점에서 밝은 스파클
        float sparkle = 0.0;
        float dist = length(refractedCenter);
        for (int k = 0; k < 4; k++) {
          float ring = fract(t + float(k) * 0.25) * 1.2;
          float ringDist = abs(dist - ring);
          sparkle += smoothstep(0.015, 0.0, ringDist) * (1.0 - float(k) * 0.2);
        }

        // ── 검정+크림 팔레트 기반 유리 색상 합성 ──
        // 배경: 딥 블랙 (#0A0A0A)
        vec3 bg = vec3(0.039, 0.039, 0.039);

        // 동심원 라인 색상: 크림 (#F0EBE0) — 어두운 배경 위에 밝게
        vec3 lineCol = vec3(0.941, 0.922, 0.878);

        // 프리즘 분산: R은 약간 따뜻하게(크림), B는 약간 차갑게(쿨 화이트)
        float rStr = clamp(lineR * 0.55, 0.0, 1.0);
        float gStr = clamp(lineG * 0.50, 0.0, 1.0);
        float bStr = clamp(lineB * 0.45, 0.0, 1.0);

        // 유리 색상: 검정 배경에서 크림 라인으로 mix
        vec3 glassColor;
        glassColor.r = mix(bg.r, lineCol.r, rStr) + sparkle * 0.08;
        glassColor.g = mix(bg.g, lineCol.g, gStr) + sparkle * 0.06;
        glassColor.b = mix(bg.b, lineCol.b, bStr) + sparkle * 0.04;

        // 크리스탈 반사: 크림-화이트 하이라이트
        vec3 crystalHL = vec3(0.98, 0.96, 0.92);
        glassColor += crystalHL * sparkle * 0.18;

        // 유리 엣지 프레넬 효과: 중심에서 멀수록 약간 더 밝게
        float fresnel = smoothstep(0.0, 1.2, dist) * 0.04;
        glassColor += vec3(fresnel * 0.9, fresnel * 0.88, fresnel * 0.82);

        glassColor = clamp(glassColor, 0.0, 1.0);

        gl_FragColor = vec4(glassColor, 1.0);
      }
    `;

    // ── Material ──
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    // ── Mesh ──
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // ── Renderer: 고해상도 (devicePixelRatio 완전 활용) ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // 디바이스 픽셀 비율 최대 2.5까지 활용 (고해상도 디스플레이 대응)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    container.appendChild(renderer.domElement);

    sceneRef.current = { camera, scene, renderer, uniforms, animationId: null };

    // ── Resize ──
    const onResize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      // resolution uniform은 실제 픽셀 크기 (devicePixelRatio 반영)
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };
    onResize();
    window.addEventListener("resize", onResize, false);

    // ── Mouse ──
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      uniforms.mousePos.value.x = (e.clientX - rect.left) / rect.width;
      uniforms.mousePos.value.y = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener("mousemove", onMouseMove, false);

    // ── Animation Loop ──
    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (sceneRef.current.animationId) cancelAnimationFrame(sceneRef.current.animationId);
      renderer.dispose();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
