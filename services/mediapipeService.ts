
export const setupMediaPipe = (
  onResults: (results: any) => void
) => {
  // Access global classes loaded via script tags
  // @ts-ignore
  const Hands = window.Hands;

  if (!Hands) {
    console.error("MediaPipe Hands script not loaded");
    return null;
  }

  const hands = new Hands({
    locateFile: (file: string) => {
      // CRITICAL: Must match the version in index.html to avoid WASM errors
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
    },
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  hands.onResults(onResults);

  return hands;
};
