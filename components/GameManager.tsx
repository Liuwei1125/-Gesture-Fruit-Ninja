
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, MathUtils } from 'three';
import { FruitEntity, FruitType, GameState, GRAVITY, FRUIT_CONFIG, HandGesture, ParticleEntity } from '../types';
import Fruit3D from './Fruit3D';
import Blade from './Blade';

interface GameManagerProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  handPositionRef: React.MutableRefObject<Vector3 | null>; 
  gesture: HandGesture;
  score: number;
  setScore: (score: number | ((prev: number) => number)) => void;
  selectedFruitType: 'RANDOM' | FruitType;
}

const GameManager: React.FC<GameManagerProps> = ({
  gameState,
  setGameState,
  handPositionRef,
  gesture,
  setScore,
  selectedFruitType
}) => {
  // We use Refs for the game loop state to avoid react re-renders on every frame
  // State is only used to mount/unmount components
  const [fruitIds, setFruitIds] = useState<string[]>([]);
  const [particleIds, setParticleIds] = useState<string[]>([]);
  
  // The actual data
  const fruitsRef = useRef<Map<string, FruitEntity>>(new Map());
  const particlesRef = useRef<Map<string, ParticleEntity>>(new Map());
  
  const trailRef = useRef<Vector3[]>([]);
  const spawnTimerRef = useRef(0);
  const nextSpawnTimeRef = useRef(0.5); // Start soon
  
  const { viewport } = useThree();

  // Helper to sync state with refs strictly when keys change
  const syncState = () => {
    setFruitIds(Array.from(fruitsRef.current.keys()));
    setParticleIds(Array.from(particlesRef.current.keys()));
  };

  const spawnWave = (currentTime: number) => {
    const count = MathUtils.randInt(1, 3); // Spawn 1 to 3 fruits at once
    const newFruits: FruitEntity[] = [];

    for (let i = 0; i < count; i++) {
      // 1. Pick Type
      let type = selectedFruitType === 'RANDOM' 
        ? Object.values(FruitType)[Math.floor(Math.random() * (Object.values(FruitType).length))] as FruitType
        : selectedFruitType;
      
      if (selectedFruitType === 'RANDOM' && Math.random() < 0.15) type = FruitType.BOMB;

      // 2. Calculate Start Position (Bottom of screen, spread out)
      // Viewport width is roughly 20-30 units depending on aspect ratio
      const margin = 2;
      const x = MathUtils.randFloat(-viewport.width / 2 + margin, viewport.width / 2 - margin);
      const startPos = new Vector3(x, -viewport.height / 2 - 2, 0);

      // 3. Calculate Velocity to reach a nice height
      // We want them to peak around the top 30-70% of the screen
      const targetHeight = MathUtils.randFloat(viewport.height * 0.1, viewport.height * 0.4); 
      const distanceY = targetHeight - startPos.y;
      
      // Kinematics: v_f^2 = v_i^2 + 2*a*d => 0 = v_i^2 + 2*g*d => v_i = sqrt(-2*g*d)
      const vy = Math.sqrt(-2 * GRAVITY * distanceY);
      
      // Add slight randomness to X velocity to throw towards center or slightly chaotic
      const targetX = MathUtils.randFloat(-viewport.width / 4, viewport.width / 4);
      const flightTimeApprox = vy / Math.abs(GRAVITY) * 2; // Time to go up and down
      const vx = (targetX - x) / (flightTimeApprox * 0.7); // 0.7 to add some speed variation

      // 4. Create Entity
      const id = MathUtils.generateUUID();
      const newFruit: FruitEntity = {
        id,
        type,
        position: startPos,
        velocity: new Vector3(vx, vy, 0),
        rotation: new Vector3(0, 0, 0),
        rotationSpeed: new Vector3(
          MathUtils.randFloat(-2, 2), 
          MathUtils.randFloat(-2, 2), 
          MathUtils.randFloat(-2, 2)
        ),
        radius: FRUIT_CONFIG[type].radius,
        isSliced: false,
        spawnTime: currentTime
      };

      fruitsRef.current.set(id, newFruit);
    }
  };

  const createExplosion = (position: Vector3, color: string) => {
    for (let i = 0; i < 20; i++) {
      const id = MathUtils.generateUUID();
      particlesRef.current.set(id, {
        id,
        position: position.clone(),
        velocity: new Vector3(
          MathUtils.randFloat(-5, 5), 
          MathUtils.randFloat(-5, 5), 
          MathUtils.randFloat(-2, 2)
        ),
        color: color,
        life: 1.0,
        size: MathUtils.randFloat(0.1, 0.4)
      });
    }
  };

  useFrame((state, delta) => {
    const { clock } = state;
    const currentTime = clock.getElapsedTime();
    const handPosition = handPositionRef.current;

    // --- Trail Logic ---
    if (handPosition) {
      trailRef.current.push(handPosition.clone());
      if (trailRef.current.length > 12) trailRef.current.shift();
    } else {
      // Decay trail if no hand detected
      if (trailRef.current.length > 0) trailRef.current.shift();
    }

    // --- Game Logic ---
    if (gameState !== GameState.PLAYING) return;

    // 1. Spawning
    spawnTimerRef.current += delta;
    if (spawnTimerRef.current > nextSpawnTimeRef.current) {
      spawnWave(currentTime);
      spawnTimerRef.current = 0;
      nextSpawnTimeRef.current = MathUtils.randFloat(1.5, 3.0); // Next wave in 1.5 to 3 seconds
      syncState(); // Trigger render for new fruits
    }

    // 2. Physics & Collision
    let dirty = false;
    const fruitsToRemove: string[] = [];

    fruitsRef.current.forEach((fruit, id) => {
      // Apply Velocity
      fruit.position.addScaledVector(fruit.velocity, delta);
      // Apply Gravity
      fruit.velocity.y += GRAVITY * delta;
      // Apply Rotation
      fruit.rotation.addScaledVector(fruit.rotationSpeed, delta);

      // Despawn if fallen below screen
      if (fruit.position.y < -viewport.height / 2 - 5) {
        fruitsToRemove.push(id);
        dirty = true;
      }

      // Slice Detection
      if (!fruit.isSliced && handPosition && (gesture === HandGesture.POINTING || gesture === HandGesture.OPEN_PALM)) {
        // Simple sphere collision
        const dist = handPosition.distanceTo(fruit.position);
        // Slightly generous hit box
        if (dist < fruit.radius + 1.0) {
           if (fruit.type === FruitType.BOMB) {
             setGameState(GameState.GAME_OVER);
             createExplosion(fruit.position, '#ffffff');
           } else {
             fruit.isSliced = true; // Visual logic handled in Fruit3D (it returns null or splits)
             fruitsToRemove.push(id); // Remove immediately for now (or could change to sliced model)
             setScore(s => s + FRUIT_CONFIG[fruit.type].points);
             createExplosion(fruit.position, FRUIT_CONFIG[fruit.type].color);
             dirty = true;
           }
        }
      }
    });

    // Remove dead fruits
    fruitsToRemove.forEach(id => fruitsRef.current.delete(id));

    // 3. Particles Physics
    const particlesToRemove: string[] = [];
    particlesRef.current.forEach((p, id) => {
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.y += GRAVITY * 0.5 * delta; // Lighter gravity for particles
      p.life -= delta * 1.5; // Fade out speed
      if (p.life <= 0) {
        particlesToRemove.push(id);
        dirty = true;
      }
    });
    
    particlesToRemove.forEach(id => particlesRef.current.delete(id));

    if (dirty) syncState();
  });

  return (
    <>
      <Blade points={trailRef.current} color={gesture === HandGesture.POINTING ? "#00ffff" : "#ffffff"} />
      
      {/* 
        We use the map to render. 
        Note: The fruit objects inside the map are mutated by the loop above.
        Fruit3D reads these mutations via the ref passed to it or by value if we passed object.
        Since we pass the *object reference* `fruit={fruitEntity}`, Fruit3D can just read it.
      */}
      {fruitIds.map(id => {
        const fruit = fruitsRef.current.get(id);
        if (!fruit) return null;
        return <Fruit3D key={id} fruit={fruit} />;
      })}

      {particleIds.map(id => {
        const p = particlesRef.current.get(id);
        if (!p) return null;
        return (
          <mesh key={id} position={p.position}>
            <boxGeometry args={[p.size, p.size, p.size]} />
            <meshBasicMaterial color={p.color} transparent opacity={p.life} />
          </mesh>
        );
      })}
    </>
  );
};

export default GameManager;
