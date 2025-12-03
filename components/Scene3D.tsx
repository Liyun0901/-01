import React, { useMemo } from 'react';
import { Canvas, ThreeElements } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { FoldStrip } from './FoldStrip';

// Fix for TypeScript not recognizing R3F elements
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

interface Scene3DProps {
  imageSrc: string;
  onReset: () => void;
}

const FoldingWall: React.FC<{ imageSrc: string }> = ({ imageSrc }) => {
  const texture = useMemo(() => new THREE.TextureLoader().load(imageSrc), [imageSrc]);
  
  // Configuration
  const STRIP_COUNT = 24; // High count for fluid fluid
  const WALL_WIDTH = 12;
  const WALL_HEIGHT = 8; // 3:2 Aspect ratio roughly
  
  // Generate indices
  const strips = useMemo(() => Array.from({ length: STRIP_COUNT }, (_, i) => i), []);

  return (
    <group>
      {strips.map((i) => (
        <FoldStrip
          key={i}
          index={i}
          totalStrips={STRIP_COUNT}
          texture={texture}
          width={WALL_WIDTH}
          height={WALL_HEIGHT}
          globalConfig={{
            maxFoldAngle: Math.PI / 2.2, // almost 90 degrees max
          }}
        />
      ))}
    </group>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({ imageSrc, onReset }) => {
  return (
    <div className="relative w-full h-full bg-zinc-900">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
        
        <color attach="background" args={['#111']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4c1d95" />
        <pointLight position={[10, 10, -10]} intensity={0.5} color="#db2777" />

        <FoldingWall imageSrc={imageSrc} />
        
        <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
        <Environment preset="city" />
        
        {/* Subtle camera movement limitation */}
        <OrbitControls 
          enableZoom={true} 
          minDistance={5} 
          maxDistance={20}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
          enablePan={false}
        />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="text-white">
          <h2 className="text-xl font-bold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500">Folding Reality</h2>
          <p className="text-xs text-zinc-400 mt-1">Move cursor to distort structure</p>
        </div>
        
        <button 
          onClick={onReset}
          className="pointer-events-auto px-6 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95"
        >
          Retake Photo
        </button>
      </div>
    </div>
  );
};