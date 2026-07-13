import './style.css';
import { initScene, morphToPeace } from './scene3d.js';
import { initTracking } from './tracking.js';

const videoElement = document.getElementById('webcam');

// Ask for webcam access
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    videoElement.srcObject = stream;

    // Start the 3D particle scene
    initScene(document.body);

    // Start gesture tracking once the video is ready
    videoElement.onloadedmetadata = () => {
      initTracking(videoElement, (gesture) => {
        console.log("Gesture detected:", gesture);
        if (gesture === "Victory") {
          morphToPeace();
        }
      });
    };
  })
  .catch((err) => {
    console.error("Webcam access denied:", err);
  });
