
import React, { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Vector3 } from 'three';
import { GameState, HandGesture, FruitType } from './types';
import GameManager from './components/GameManager';
import HandTracker from './components/HandTracker';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [gesture, setGesture] = useState<HandGesture>(HandGesture.NONE);
  const [selectedFruit, setSelectedFruit] = useState<'RANDOM' | FruitType>('RANDOM');
  
  const handPosRef = useRef<Vector3 | null>(null);

  const handleHandUpdate = useCallback((pos: Vector3, newGesture: HandGesture) => {
    handPosRef.current = pos;
    // Only update state if gesture changes to minimize App re-renders
    // The physics loop reads position directly from handPosRef
    setGesture(prev => {
        if (prev !== newGesture) return newGesture;
        return prev;
    });

    // Gesture-based controls for Start/Pause have been removed to prevent false positives.
    // Logic kept here commented out for reference if needed later.
    /*
    if (newGesture === HandGesture.CLOSED_FIST && (gameState === GameState.MENU || gameState === GameState.PAUSED || gameState === GameState.GAME_OVER)) {
      if (gameState === GameState.GAME_OVER) setScore(0);
      setGameState(GameState.PLAYING);
    }
    
    if (newGesture === HandGesture.OPEN_PALM && gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    }
    */
  }, [gameState]);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden font-sans select-none">
      
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 2]}>
          <color attach="background" args={['#111827']} />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <Environment preset="city" />

          <GameManager 
            gameState={gameState} 
            setGameState={setGameState}
            handPositionRef={handPosRef}
            gesture={gesture}
            score={score}
            setScore={setScore}
            selectedFruitType={selectedFruit}
          />
        </Canvas>
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-6 flex flex-col justify-between">
        <div className="flex flex-col md:flex-row justify-between items-start pointer-events-auto gap-4">
          <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl text-white border border-white/10 shadow-xl">
            <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
              FRUIT NINJA 3D
            </h1>
            <div className="mt-2 text-3xl font-mono text-yellow-400 font-bold">{score}</div>
            <div className="mt-1 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${gameState === GameState.PLAYING ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs uppercase tracking-widest text-gray-400">{gameState}</span>
            </div>
            <div className="mt-2 text-xs text-gray-400 border-t border-gray-700 pt-2">
              Gesture: <span className="font-bold text-white">{gesture.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl text-white border border-white/10 shadow-xl">
             <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Fruit Type</label>
             <select 
               className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
               value={selectedFruit}
               onChange={(e) => setSelectedFruit(e.target.value as any)}
             >
               <option value="RANDOM">🎲 Random</option>
               <option value={FruitType.APPLE}>🍎 Apple</option>
               <option value={FruitType.BANANA}>🍌 Banana</option>
               <option value={FruitType.WATERMELON}>🍉 Watermelon</option>
             </select>
             
             <div className="mt-4 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="bg-gray-700 p-1 rounded">☝️</span> <span>Point to Slice</span>
                </div>
             </div>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto w-full max-w-md px-4">
          {gameState === GameState.MENU && (
            <div className="animate-fade-in-up">
              <button 
                onClick={() => setGameState(GameState.PLAYING)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-2xl font-black italic py-4 rounded-2xl shadow-lg hover:shadow-pink-500/25 transition-all transform hover:scale-105"
              >
                PLAY GAME
              </button>
            </div>
          )}

          {gameState === GameState.GAME_OVER && (
             <div className="bg-black/90 p-8 rounded-3xl border-2 border-red-500 text-white shadow-2xl backdrop-blur-xl">
                <h2 className="text-5xl font-black text-red-500 mb-2 italic">SPLAT!</h2>
                <div className="text-gray-400 text-sm mb-6">GAME OVER</div>
                <div className="text-4xl font-mono text-yellow-400 mb-8">{score} pts</div>
                <button 
                  onClick={() => { setScore(0); setGameState(GameState.PLAYING); }}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  TRY AGAIN
                </button>
             </div>
          )}
          
          {gameState === GameState.PAUSED && (
            <div className="bg-black/80 p-6 rounded-xl text-white border border-white/20">
               <h2 className="text-2xl font-bold mb-4">PAUSED</h2>
               <button 
                 onClick={() => setGameState(GameState.PLAYING)}
                 className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition"
               >
                 RESUME
               </button>
            </div>
          )}
        </div>
      </div>

      <HandTracker onHandUpdate={handleHandUpdate} isGameActive={true} />
    </div>
  );
};

export default App;
