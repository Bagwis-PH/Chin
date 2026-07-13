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
          const gesture = result.gestures[0][0].categoryName;
          const palmCenter = result.landmarks[0][9]; // Center of hand
          const wrist = result.landmarks[0][0];      // Base of hand
          
          // Calculate the hand size to estimate distance from camera
          const handSize = Math.sqrt(
            Math.pow(palmCenter.x - wrist.x, 2) + 
            Math.pow(palmCenter.y - wrist.y, 2)
          );
          
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