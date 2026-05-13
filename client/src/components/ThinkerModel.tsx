/*
 * ThinkerModel.tsx
 * LOGOS Design: 로댕의 생각하는 사람 3D 모델
 * - Y축 회전 (20초/회전)
 * - 크림/베이지 배경에 어울리는 조명
 * - GLB 텍스처 포함 모델 렌더링
 */
import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const GLB_URL = '/template-storage/thinker_bc8101a6.glb';

function RotatingThinker() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(GLB_URL);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (Math.PI * 2 / 20); // 20초에 한 바퀴
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.2, 0]} scale={[1.8, 1.8, 1.8]}>
      <primitive object={scene} />
    </group>
  );
}

function FallbackThinker() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (Math.PI * 2 / 20);
    }
  });
  return (
    <group ref={groupRef}>
      {/* Simple placeholder geometry */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.6, 0.6]} />
        <meshStandardMaterial color="#3D2B1A" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#3D2B1A" roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  );
}

interface ThinkerModelProps {
  className?: string;
}

export default function ThinkerModel({ className }: ThinkerModelProps) {
  return (
    <div className={className} style={{ background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Warm lighting to match cream/beige background */}
        <ambientLight intensity={0.6} color="#C5C9B4" />
        <directionalLight
          position={[3, 5, 3]}
          intensity={1.2}
          color="#D8DBC8"
          castShadow
        />
        <directionalLight
          position={[-2, 3, -2]}
          intensity={0.4}
          color="#BFC4AB"
        />
        <pointLight position={[0, 4, 2]} intensity={0.5} color="#EF9F27" />

        <Suspense fallback={<FallbackThinker />}>
          <RotatingThinker />
          <ContactShadows
            position={[0, -1.8, 0]}
            opacity={0.25}
            scale={4}
            blur={2}
            color="#2C2C1E"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload the GLB
useGLTF.preload(GLB_URL);
