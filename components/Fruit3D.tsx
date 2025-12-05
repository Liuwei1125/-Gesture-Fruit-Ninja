
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { FruitEntity, FRUIT_CONFIG, FruitType } from '../types';

interface Fruit3DProps {
  fruit: FruitEntity;
}

const Fruit3D: React.FC<Fruit3DProps> = ({ fruit }) => {
  const meshRef = useRef<Mesh>(null);
  const config = FRUIT_CONFIG[fruit.type];

  useFrame(() => {
    if (meshRef.current) {
      // Sync position with physics simulation
      meshRef.current.position.copy(fruit.position);
      // Sync rotation
      meshRef.current.rotation.set(fruit.rotation.x, fruit.rotation.y, fruit.rotation.z);
    }
  });

  if (fruit.isSliced) return null;

  return (
    <mesh ref={meshRef} position={fruit.position} castShadow receiveShadow>
      {fruit.type === FruitType.APPLE && <sphereGeometry args={[config.radius, 32, 32]} />}
      {fruit.type === FruitType.BANANA && (
        // A crude banana approximation
        <capsuleGeometry args={[config.radius * 0.4, config.radius * 2, 8, 16]} />
      )}
      {fruit.type === FruitType.WATERMELON && <icosahedronGeometry args={[config.radius, 2]} />}
      {fruit.type === FruitType.BOMB && <dodecahedronGeometry args={[config.radius]} />}
      
      <meshStandardMaterial 
        color={config.color} 
        roughness={0.4} 
        metalness={0.1}
        emissive={fruit.type === FruitType.BOMB ? '#ff0000' : '#000000'}
        emissiveIntensity={fruit.type === FruitType.BOMB ? 0.8 : 0}
      />
    </mesh>
  );
};

export default Fruit3D;
