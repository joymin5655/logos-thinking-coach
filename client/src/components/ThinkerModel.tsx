/*
 * ThinkerModel.tsx
 * LOGOS Design: 로댕의 생각하는 사람 3D 모델
 * - Y축 회전 (20초/회전)
 * - 세이지 그린 배경에 어울리는 조명
 * - GLB 텍스처 포함 모델 렌더링
 *
 * Fix: scene.clone() to avoid React Three Fiber DOM unmount TypeError
 * when Suspense switches from fallback to actual component.
 */
import { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const GLB_URL = '/template-storage/thinker_bc8101a6.glb';

function RotatingThinker() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(GLB_URL);

  // Clone the scene to avoid sharing the same object between renders
  // This prevents the "Cannot convert undefined or null to object" error
  // that occurs when React Three Fiber tries to remove a child from a
  // container that has already been cleaned up.
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (Math.PI * 2 / 20); // 20초에 한 바퀴
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.2, 0]} scale={[1.8, 1.8, 1.8]}>
      <primitive object={clonedScene} />
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
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.6, 0.6]} />
        <meshStandardMaterial color="#2A2A1A" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#2A2A1A" roughness={0.9} metalness={0.1} />
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
        // frameloop="always" ensures smooth rotation
        frameloop="always"
      >
        {/* Lighting tuned for sage green background */}
        <ambientLight intensity={0.5} color="#C5C9B4" />
        <directionalLight
          position={[3, 5, 3]}
          intensity={1.4}
          color="#FFFFFF"
          castShadow
        />
        <directionalLight
          position={[-2, 3, -2]}
          intensity={0.3}
          color="#D8DBC8"
        />
        <pointLight position={[0, 4, 2]} intensity={0.4} color="#EF9F27" />

        <Suspense fallback={<FallbackThinker />}>
          <RotatingThinker />
          <ContactShadows
            position={[0, -1.8, 0]}
            opacity={0.2}
            scale={4}
            blur={2.5}
            color="#1E1E14"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload the GLB
useGLTF.preload(GLB_URL);
