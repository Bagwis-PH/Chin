import './style.css';
import { initScene, morphToPeace } from './scene3d.js';
import { initTracking } from './tracking.js';

// Grab the video element from index.html
const videoElement = document.getElementById('webcam');

// Start the 3D particle scene
initScene(document.body);

// Start gesture tracking
initTracking(videoElement, (gesture) => {
  console.log("Gesture detected:", gesture);
  if (gesture === "Victory") {
    morphToPeace(); // trigger particle morph into "PEACE"
  }
});
