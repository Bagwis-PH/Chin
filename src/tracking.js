import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

let recognizer = null;
let activeLoopId = null;

export async function initTracking(videoElement, onHandData) {
  if (activeLoopId) {
    cancelAnimationFrame(activeLoopId);
    activeLoopId = null;
  }

  if (!recognizer) {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    recognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
    });
  }

  function analyzeFrame() {
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      try {
        const result = recognizer.recognizeForVideo(videoElement, Date.now());
        
        if (result && result.gestures && result.gestures.length > 0) {
          let gesture = result.gestures[0][0].categoryName;
          const landmarks = result.landmarks[0];
          const palmCenter = landmarks[9]; // Center of hand
          const wrist = landmarks[0];      // Base of hand
          
          // Calculate the hand size to estimate distance from camera
          const handSize = Math.sqrt(
            Math.pow(palmCenter.x - wrist.x, 2) + 
            Math.pow(palmCenter.y - wrist.y, 2)
          );

          // Helper function to measure distance between two landmarks
          const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
          
          // Custom Heuristic for "Zero" and "Three" (OK Sign)
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const midTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];
          
          // Check if thumb and index are pinching (forming the hole)
          const isPinch = dist(thumbTip, indexTip) < (handSize * 0.6);
          
          // Check if the other three fingers are extended or curled
          // We compare the distance from finger tip to wrist against the knuckle to wrist
          const midExtended = dist(midTip, wrist) > dist(landmarks[9], wrist) * 1.5;
          const ringExtended = dist(ringTip, wrist) > dist(landmarks[13], wrist) * 1.5;
          const pinkyExtended = dist(pinkyTip, wrist) > dist(landmarks[17], wrist) * 1.5;

          if (isPinch) {
            if (midExtended && ringExtended && pinkyExtended) {
              gesture = "Three"; // OK Hand sign (3 fingers out)
            } else if (!midExtended && !ringExtended && !pinkyExtended) {
              gesture = "Zero";  // Fist with a hole (fingers tucked)
            }
          }
          
          onHandData({
            detected: true,
            gesture: gesture,
            x: palmCenter.x,
            y: palmCenter.y,
            z: handSize // Pass size as depth tracking
          });
        } else {
          onHandData({ detected: false });
        }
      } catch (err) {
        console.warn("MediaPipe frame skipped:", err);
      }
    }
    activeLoopId = requestAnimationFrame(analyzeFrame);
  }

  analyzeFrame();
}