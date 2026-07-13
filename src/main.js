import './style.css';
import { initScene, setHandTarget } from './scene3d.js';
import { initTracking } from './tracking.js';

const videoElement = document.getElementById('webcam');
const cameraSelect = document.getElementById('cameraSelect');
const resetBtn = document.getElementById('resetBtn'); 

let currentStream = null;

let currentRawGesture = "None";
let stableGesture = "None";
let gestureBufferCount = 0;
const CONFIDENCE_THRESHOLD = 15; 

initScene(document.body);

resetBtn.addEventListener('click', () => {
  window.location.reload();
});

navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    stream.getTracks().forEach(track => track.stop());
    return navigator.mediaDevices.enumerateDevices();
  })
  .then((devices) => {
    cameraSelect.innerHTML = '';
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    if (videoDevices.length > 0) {
      startCamera(videoDevices[0].deviceId);
    }
  })
  .catch((err) => {
    console.error("Camera permission denied:", err);
    cameraSelect.innerHTML = '<option>Permission Denied</option>';
  });

function startCamera(deviceId) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    video: { deviceId: { exact: deviceId } }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      currentStream = stream;
      videoElement.srcObject = stream;

      videoElement.onloadedmetadata = () => {
        videoElement.play().then(() => {
          
          initTracking(videoElement, (handData) => {
            if (!handData || !handData.detected) {
              currentRawGesture = "None";
              stableGesture = "None";
              gestureBufferCount = 0;
              setHandTarget(0, 0, 'scatter', 0); 
              return;
            }

            const incomingGesture = handData.gesture || "None";

            if (incomingGesture === currentRawGesture) {
              gestureBufferCount++;
            } else {
              currentRawGesture = incomingGesture;
              gestureBufferCount = 1;
            }

            if (gestureBufferCount >= CONFIDENCE_THRESHOLD && stableGesture !== incomingGesture) {
              stableGesture = incomingGesture;
            }

            // ACTION HUB: Now catches 'Zero' and 'Three'
            if (stableGesture === "Victory") {
              setHandTarget(handData.x, handData.y, 'text', handData.z);
            } else if (stableGesture === "ILoveYou") {
              setHandTarget(handData.x, handData.y, 'ily', handData.z);
            } else if (stableGesture === "Open_Palm") {
              setHandTarget(handData.x, handData.y, 'navigate', handData.z); 
            } else if (stableGesture === "Closed_Fist") {
              setHandTarget(handData.x, handData.y, 'fist', handData.z); 
            } else if (stableGesture === "Zero") {
              setHandTarget(handData.x, handData.y, 'zero', handData.z); 
            } else if (stableGesture === "Three") {
              setHandTarget(handData.x, handData.y, 'three', handData.z); 
            } else {
              setHandTarget(0, 0, 'scatter', handData.z); 
            }
          });
          
        });
      };
    })
    .catch((err) => {
      console.error("Camera access failed:", err);
    });
}

cameraSelect.onchange = () => {
  startCamera(cameraSelect.value);
};