import './style.css';
import { initScene, morphToPeace } from './scene3d.js';
import { initTracking } from './tracking.js';

// Grab the video element (you can add <video id="webcam" autoplay></video> in index.html)
const videoElement = document.createElement('video');
videoElement.autoplay = true;
videoElement.style.display = 'none';
document.body.appendChild(videoElement);

// Start the 3D scene
initScene(document.body);

// Start gesture tracking
initTracking(videoElement, (gesture) => {
  console.log("Gesture detected:", gesture);
  if (gesture === "Victory") {
    morphToPeace(); // trigger particle morph
  }
});
