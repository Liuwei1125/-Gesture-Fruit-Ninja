
import { Vector3 } from 'three';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export enum FruitType {
  APPLE = 'APPLE',
  BANANA = 'BANANA',
  WATERMELON = 'WATERMELON',
  BOMB = 'BOMB'
}

export enum HandGesture {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM', // Pause
  CLOSED_FIST = 'CLOSED_FIST', // Start/Resume
  POINTING = 'POINTING' // Slice
}

export interface FruitEntity {
  id: string;
  type: FruitType;
  position: Vector3;
  velocity: Vector3;
  rotation: Vector3;
  rotationSpeed: Vector3;
  radius: number;
  isSliced: boolean;
  spawnTime: number;
}

export interface ParticleEntity {
  id: string;
  position: Vector3;
  velocity: Vector3;
  color: string;
  life: number;
  size: number;
}

export const FRUIT_CONFIG = {
  [FruitType.APPLE]: { color: '#ef4444', radius: 0.8, points: 10, geometry: 'sphere' },
  [FruitType.BANANA]: { color: '#eab308', radius: 1.0, points: 20, geometry: 'box' },
  [FruitType.WATERMELON]: { color: '#22c55e', radius: 1.2, points: 30, geometry: 'icosahedron' },
  [FruitType.BOMB]: { color: '#1f2937', radius: 1.0, points: -50, geometry: 'dodecahedron' },
};

// Physics Constants (Time based)
export const GRAVITY = -15.0; // Units per second squared
export const SLICE_THRESHOLD = 1.5; 
export const MAX_FRUITS = 10;
