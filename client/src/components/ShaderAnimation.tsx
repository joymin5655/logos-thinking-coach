/**
 * ShaderAnimation — GLSL 셰이더 기반 모자이크 + 동심원 라인 효과
 *
 * 원본 코드를 기반으로:
 *   - Three.js r89 CDN 대신 이미 설치된 three 패키지 사용
 *   - PlaneBufferGeometry → PlaneGeometry (r125+)
 *   - 색상 팔레트를 LOGOS 디자인 (#C8C8B6 배경, 어두운 올리브 톤)에 맞게 조정
 *   - 모자이크 스케일 및 라인 파라미터 튜닝
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

    // ── Fragment Shader (LOGOS 색상 팔레트 + 원본 동심원 라인 효과) ──
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

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

        // 모자이크 픽셀화 (균일한 스케일로 동심원 패턴 유지)
        vec2 fMosaicScal = vec2(4.0, 4.0);
        vec2 vScreenSize = vec2(256.0, 256.0);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

        // 동상 중심으로 이동 (uv 중심이 동상 위치 근처)
        vec2 center = uv - vec2(0.15, 0.05);

        float t = time * 0.06 + random(uv.x) * 0.4;
        float lineWidth = 0.0009;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i) / abs(
              fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(center)
            );
          }
        }

        // LOGOS 팔레트: 배경 #C8C8B6, 라인은 어두운 올리브/세피아 톤
        vec3 bg = vec3(0.784, 0.784, 0.714); // #C8C8B6

        // 원본 셰이더의 RGB 라인 가중치를 그대로 사용하되,
        // 색조를 제거하고 단일 어두운 올리브 톤으로 변환
        float lum = (color[0] + color[1] + color[2]) / 3.0;
        // 어두운 올리브 라인: #262618 = (0.149, 0.149, 0.094)
        vec3 lineCol = vec3(0.149, 0.149, 0.094);
        // 밝은 하이라이트: warm cream
        vec3 hlCol = vec3(0.98, 0.97, 0.92);

        float lineStrength = clamp(lum * 0.55, 0.0, 1.0);
        float hlStrength = clamp(lum * 0.22, 0.0, 0.12);

        // bg에서 라인을 빼고 (dark), 하이라이트 더하기 (bright)
        vec3 finalColor = mix(bg, lineCol, lineStrength) + hlCol * hlStrength;
        finalColor = clamp(finalColor, 0.0, 1.0);

        gl_FragColor = vec4(finalColor, 1.0);
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

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    sceneRef.current = { camera, scene, renderer, uniforms, animationId: null };

    // ── Resize ──
    const onResize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
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
