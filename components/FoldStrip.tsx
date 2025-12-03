import React, { useRef, useMemo } from 'react';
import { useFrame, useThree, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

// Fix for TypeScript not recognizing R3F elements
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

interface FoldStripProps {
  index: number;
  totalStrips: number;
  texture: THREE.Texture;
  width: number;
  height: number;
  globalConfig: {
    maxFoldAngle: number; // in radians
  };
}

export const FoldStrip: React.FC<FoldStripProps> = ({ 
  index, 
  totalStrips, 
  texture, 
  width, 
  height,
  globalConfig
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport, pointer } = useThree();
  
  // Create a unique clone of the texture for this strip to adjust offset
  const stripTexture = useMemo(() => {
    const t = texture.clone();
    t.needsUpdate = true;
    // Set repeat to 1/N
    t.repeat.set(1 / totalStrips, 1);
    // Offset x to i/N
    t.offset.set(index / totalStrips, 0);
    return t;
  }, [texture, totalStrips, index]);

  const stripWidth = width / totalStrips;
  
  // Use a ref to store smoothed values for physics
  const targetRotation = useRef(0);
  const targetX = useRef(0);
  
  // Initial X position (centered)
  // The wall centers at x=0. Total width W.
  // Left edge is -W/2.
  // Strip i start X (flat) is -W/2 + i*stripWidth
  // We pivot from the center of the strip, so center is -W/2 + i*stripWidth + stripWidth/2
  const initialX = -width / 2 + (index * stripWidth) + (stripWidth / 2);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 1. Calculate Interaction Factor
    // Map mouse X (-1 to 1) to a fold intensity
    // Let's make the fold intensity higher when mouse is far from center
    // Or simulate "squeezing" the window
    const mouseX = pointer.x * viewport.width / 2;
    
    // Normalize mouse relative to screen width (-1 to 1)
    const normMouse = pointer.x;
    
    // "Accordion" effect:
    // Base fold is determined by mouse position. 
    // If mouse is at left edge, full fold left? No, let's make it symmetric-ish.
    // Let's make it responsive to the "cursor" position being a compressor.
    
    // Smooth pointer for less jitter
    const time = state.clock.getElapsedTime();
    
    // The "Fold" factor (0 to 1)
    // 0 = Flat
    // 1 = Max Fold
    // Let's vary it based on a sine wave + mouse X
    const wave = Math.sin(time * 0.5 + index * 0.1) * 0.1; 
    const mouseInfluence = (normMouse + 1) / 2; // 0 to 1
    
    // Variable fold strength across the wall to create "inconsistent" movement
    // Strips closer to the mouse might fold more, or less.
    // Let's create a wave of folding.
    const distToMouse = Math.abs(initialX - mouseX);
    const proximity = Math.max(0, 1 - distToMouse / (width * 0.8));
    
    // The main angle
    // Even strips rotate positive, Odd negative
    const dir = index % 2 === 0 ? 1 : -1;
    
    // Calculate angle. 
    // Base Angle + Mouse Interaction
    // We map mouse X to an overall compression level.
    const compression = Math.max(0, Math.min(1, Math.abs(pointer.x) * 1.5));
    
    const angle = dir * (globalConfig.maxFoldAngle * compression + (wave * 0.2));

    // Dampen the rotation
    targetRotation.current = THREE.MathUtils.lerp(targetRotation.current, angle, 10 * delta);
    meshRef.current.rotation.y = targetRotation.current;

    // 2. Calculate Position (The Hard Part: Connecting the edges)
    // If we simply rotate, gaps appear. We need to shift X to maintain connections.
    // However, rigorous connection physics is expensive.
    // Approximation:
    // New Total Width ~= Width * cos(abs(angle))
    // We shrink the distance from the center.
    
    const absAngle = Math.abs(targetRotation.current);
    const projectedWidth = stripWidth * Math.cos(absAngle);
    
    // Calculate new center position for this strip
    // Assuming uniform compression for the whole wall for visual consistency,
    // though the prompt asks for inconsistency.
    // Let's add an offset noise.
    
    const compressionRatio = Math.cos(absAngle);
    const newX = initialX * compressionRatio;
    
    // Add some Z-depth based on fold to make it pop 
    // Even strips pop out, odd strips pop in?
    // Pivot is center, so edges go in/out.
    // Let's push the whole strip slightly Z to avoid z-fighting if they overlap.
    const zOffset = Math.sin(absAngle) * (stripWidth * 0.25) * dir;

    // Apply strict damping to position for "weighty" feel
    targetX.current = THREE.MathUtils.lerp(targetX.current, newX, 8 * delta);
    
    meshRef.current.position.x = targetX.current;
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, zOffset, 8 * delta);
    
    // Extra: Tilt on X axis slightly based on mouse Y for 3D feel
    const tilt = (pointer.y * 0.2);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, tilt, 5 * delta);
  });

  return (
    <mesh ref={meshRef} position={[initialX, 0, 0]} castShadow receiveShadow>
      <planeGeometry args={[stripWidth, height, 1, 1]} />
      <meshStandardMaterial 
        map={stripTexture} 
        side={THREE.DoubleSide}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
};