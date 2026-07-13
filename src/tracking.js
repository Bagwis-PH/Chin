import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

export async function initTracking(videoElement, onGestureFound) {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  const recognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
  });

  async function analyzeFrame() {
    const result = recognizer.recognizeForVideo(videoElement, Date.now());
    if (result.gestures.length > 0) {
      const gesture = result.gestures[0][0].categoryName;
      onGestureFound(gesture); // callback to main.js or scene3d.js
    }
    requestAnimationFrame(analyzeFrame);
  }

  analyzeFrame();
}
