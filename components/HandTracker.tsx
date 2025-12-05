import React, { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { HandGesture } from '../types';
import { setupMediaPipe } from '../services/mediapipeService';

interface HandTrackerProps {
  onHandUpdate: (pos: Vector3, gesture: HandGesture) => void;
  isGameActive: boolean;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface Results {
  multiHandLandmarks: Landmark[][];
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, isGameActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<any>(null);
  const requestRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!videoRef.current || handsRef.current) return;

    const onResults = (results: Results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // 1. Detect Gesture
        // Index Finger Tip
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        
        // Simple heuristic for gestures
        // Check if fingers are extended (y coordinate is less than lower joint)
        // Note: Y increases downwards in MediaPipe 2D
        const isIndexExtended = indexTip.y < landmarks[6].y;
        const isMiddleExtended = middleTip.y < landmarks[10].y;
        const isRingExtended = ringTip.y < landmarks[14].y;
        const isPinkyExtended = pinkyTip.y < landmarks[18].y;

        let gesture = HandGesture.NONE;

        if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
           gesture = HandGesture.OPEN_PALM;
        } else if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
           gesture = HandGesture.CLOSED_FIST;
        } else if (isIndexExtended) {
           gesture = HandGesture.POINTING;
        }

        // 2. Map coordinates to 3D Space
        // MediaPipe: x [0, 1], y [0, 1]. Three.js Viewport depends on camera Z.
        // Assuming standard camera at z=10, standard FOV, roughly:
        // We need to invert X because webcam is mirrored usually.
        // Let's normalize to [-1, 1] then scale to viewport world units.
        // We'll assume a viewport width of ~20 units at z=0.
        
        const x = (1 - indexTip.x) * 20 - 10; // Mirror X
        const y = (1 - indexTip.y) * 15 - 7.5; // Invert Y
        const z = 0;

        onHandUpdate(new Vector3(x, y, z), gesture);
      }
    };

    // Initialize MediaPipe
    const hands = setupMediaPipe(onResults);
    handsRef.current = hands;

    // Initialize Camera manually
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to load metadata
          await new Promise((resolve) => {
            if (videoRef.current) {
               videoRef.current.onloadedmetadata = resolve;
            }
          });
          await videoRef.current.play();
          
          processVideo();
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Camera access denied or unavailable.");
      }
    };

    const processVideo = async () => {
      if (videoRef.current && handsRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch (e) {
          // Ignore occasional send errors (e.g. if context lost)
        }
      }
      requestRef.current = requestAnimationFrame(processVideo);
    };

    startCamera();

    return () => {
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onHandUpdate]);

  return (
    <div className="fixed bottom-4 right-4 w-48 h-36 border-2 border-white/20 rounded-lg overflow-hidden shadow-lg z-50 bg-black">
      {/* Hidden video element for processing, visual feedback on canvas */}
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover transform -scale-x-100" // Mirror for user convenience
        playsInline 
        muted
      ></video>
      <div className="absolute top-1 left-2 text-xs text-white bg-black/50 px-1 rounded">
        {error ? <span className="text-red-500">{error}</span> : "Camera Feed"}
      </div>
    </div>
  );
};

export default HandTracker;