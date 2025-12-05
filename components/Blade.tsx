
import React, { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3, TubeGeometry, Mesh, BufferGeometry } from 'three';

interface BladeProps {
  points: Vector3[];
  color: string;
}

const Blade: React.FC<BladeProps> = ({ points, color }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || points.length < 2) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }

    meshRef.current.visible = true;

    // Create a smooth curve from the points
    const curve = new CatmullRomCurve3(points);
    
    // Create tube geometry dynamically
    // Note: In a production app, we would optimize this to avoid recreating geometry every frame
    // by updating buffer attributes directly, but for this demo, this ensures smoothness.
    const geometry = new TubeGeometry(curve, points.length * 2, 0.1, 8, false);
    
    // Dispose old geometry to prevent memory leaks
    if (meshRef.current.geometry) {
      meshRef.current.geometry.dispose();
    }
    
    meshRef.current.geometry = geometry;
  });

  return (
    <mesh ref={meshRef}>
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
};

export default Blade;
